import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domainUrl, language = "en", integrations = {} } = body;

    if (!domainUrl) {
      return NextResponse.json(
        { error: "domainUrl is required" },
        { status: 400 }
      );
    }

    // Validate domain URL format
    try {
      let normalizedUrl = domainUrl.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid domain URL format" },
        { status: 400 }
      );
    }

    // Extract domain name
    function extractDomainName(url: string): string {
      try {
        let cleanUrl = url.trim();
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
          cleanUrl = "https://" + cleanUrl;
        }
        const urlObj = new URL(cleanUrl);
        return urlObj.hostname.replace("www.", "");
      } catch {
        return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
      }
    }

    const domainName = extractDomainName(domainUrl);

    // Check GSC connection (mandatory)
    if (!integrations.gsc) {
      const { data: gscIntegrations } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "google_search_console")
        .eq("status", "connected")
        .single();

      if (!gscIntegrations) {
        return NextResponse.json(
          {
            error: "Google Search Console connection is required",
            code: "GSC_REQUIRED",
          },
          { status: 400 }
        );
      }
    }

    // Create job record (domain_intelligence_jobs table may have been removed)
    const { data: job, error: jobError } = await supabase
      .from("domain_intelligence_jobs")
      .insert({
        user_id: session.user.id,
        domain_url: domainUrl,
        domain_name: domainName,
        status: "pending",
        progress: {
          currentStep: "initializing",
          percentage: 0,
          steps: {},
        },
        language,
        integrations: {
          gsc: integrations.gsc ?? true,
          ga4: integrations.ga4 ?? false,
          gbp: integrations.gbp ?? false,
        },
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Error creating job:", jobError);
      const isTableMissing = jobError?.code === "42P01" || jobError?.message?.includes("does not exist");
      return NextResponse.json(
        {
          error: isTableMissing
            ? "Domain intelligence is being updated. Please try again later."
            : "Failed to create analysis job",
          code: isTableMissing ? "SERVICE_UNAVAILABLE" : undefined,
        },
        { status: isTableMissing ? 503 : 500 }
      );
    }

    // Step 1: Call crawler API first to crawl domain and extract keywords
    const baseUrl = new URL(request.url).origin;
    const crawlerResponse = await fetch(`${baseUrl}/api/geo-core/domain-crawler`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        domainUrl,
        jobId: job.id,
      }),
    });

    if (!crawlerResponse.ok) {
      const errorData = await crawlerResponse.json();
      console.error("Crawler error:", errorData);
      
      // Update job status to failed
      await supabase
        .from("domain_intelligence_jobs")
        .update({
          status: "failed",
          error_message: `Crawler failed: ${errorData.error || "Unknown error"}`,
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "Crawler failed", details: errorData.error },
        { status: 500 }
      );
    }

    const crawlerData = await crawlerResponse.json();
    console.log(`✅ Crawler completed: ${crawlerData.crawlData?.totalPages || 0} pages, ${crawlerData.keywords?.count || 0} keywords`);

    // Step 2: Get crawled data from database (it was stored by crawler)
    const { data: jobWithCrawlData } = await supabase
      .from("domain_intelligence_jobs")
      .select("results")
      .eq("id", job.id)
      .single();

    if (!jobWithCrawlData?.results?.crawl) {
      return NextResponse.json(
        { error: "Crawled data not found" },
        { status: 500 }
      );
    }

    // Step 3: Call domain-intelligence edge function with crawled data (async, don't wait)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Send crawled data to edge function for analysis
    fetch(`${supabaseUrl}/functions/v1/domain-intelligence`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: job.id,
        domainUrl,
        domainName,
        userId: session.user.id,
        language,
        integrations: job.integrations,
        crawlData: jobWithCrawlData.results.crawl, // Send crawled data
        keywords: jobWithCrawlData.results.keywords, // Send extracted keywords
      }),
    }).catch((error) => {
      console.error("Error triggering edge function:", error);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "processing",
      message: "Domain intelligence analysis started",
    });
  } catch (error: any) {
    console.error("Domain intelligence API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const { data: job, error } = await supabase
      .from("domain_intelligence_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", session.user.id)
      .single();

    if (error || !job) {
      const isTableMissing = error?.code === "42P01" || error?.message?.includes("does not exist");
      return NextResponse.json(
        { error: isTableMissing ? "Domain intelligence is being updated." : "Job not found" },
        { status: isTableMissing ? 503 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        results: job.results,
        error: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at,
      },
    });
  } catch (error: any) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
