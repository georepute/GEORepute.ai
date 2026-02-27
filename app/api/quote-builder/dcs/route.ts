import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { computeDCS, type DCSContext } from "@/lib/quote-builder/dcs-engine";

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
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const { data: project } = await supabase
      .from("brand_analysis_projects")
      .select("id, brand_name, industry, website_url, domain_id, competitors")
      .eq("id", projectId)
      .eq("user_id", session.user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    let domainId: string | null = project.domain_id || null;
    let domainName = "";
    if (project.website_url) {
      domainName = project.website_url
        .replace(/https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .trim();
      if (!domainId && domainName) {
        const { data: domainRow } = await supabase
          .from("domains")
          .select("id")
          .or(`domain.ilike.%${domainName}%,domain.eq.${domainName}`)
          .limit(1)
          .maybeSingle();
        domainId = domainRow?.id || null;
      }
    }

    const [
      sessionRowsRes,
      marketShareRes,
      blindSpotRes,
      gapRes,
      gscQueriesRes,
      gscPagesRes,
      gscSummaryRes,
      platformIntegrationsRes,
      googleMapsRes,
      websiteAnalysisRes,
      domainIntelligenceRes,
    ] = await Promise.all([
      supabase
        .from("brand_analysis_sessions")
        .select("id, results_summary, total_queries")
        .eq("project_id", projectId)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(1),
      supabase
        .from("market_share_reports")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      domainId
        ? supabase
            .from("blind_spot_reports")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      domainId
        ? supabase
            .from("ai_google_gap_reports")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      domainId
        ? supabase
            .from("gsc_queries")
            .select("query, clicks, impressions, ctr, position")
            .eq("domain_id", domainId)
            .eq("user_id", session.user.id)
        : Promise.resolve({ data: null }),
      domainId
        ? supabase
            .from("gsc_pages")
            .select("page, clicks, impressions, ctr, position")
            .eq("domain_id", domainId)
            .eq("user_id", session.user.id)
        : Promise.resolve({ data: null }),
      domainId
        ? supabase
            .from("gsc_analytics")
            .select("clicks, impressions, ctr, position, date")
            .eq("domain_id", domainId)
            .eq("user_id", session.user.id)
            .eq("data_type", "summary")
            .order("date", { ascending: true })
        : Promise.resolve({ data: null }),
      supabase
        .from("platform_integrations")
        .select("platform, status, metadata")
        .eq("user_id", session.user.id),
      supabase
        .from("google_maps_reviews")
        .select("place_rating, place_reviews_total, reviews_data")
        .eq("user_id", session.user.id)
        .order("fetched_at", { ascending: false })
        .limit(5),
      supabase
        .from("brand_analysis_website_analysis")
        .select("analysis_result")
        .eq("project_id", projectId)
        .limit(5),
      domainName
        ? supabase
            .from("domain_intelligence_jobs")
            .select("results")
            .eq("user_id", session.user.id)
            .ilike("domain_name", `%${domainName}%`)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const sessionRows = sessionRowsRes.data || [];
    let aiResponses: any[] = [];
    let sessionTotalQueries: number | null = null;

    if (sessionRows.length > 0) {
      const latestSession = sessionRows[0];
      sessionTotalQueries =
        latestSession.results_summary?.total_queries ||
        latestSession.total_queries ||
        null;
      const { data: aiData } = await supabase
        .from("ai_platform_responses")
        .select("platform, prompt, response, response_metadata")
        .eq("project_id", projectId)
        .eq("session_id", latestSession.id)
        .order("created_at", { ascending: false });
      aiResponses = aiData || [];
      if (!sessionTotalQueries && aiResponses.length > 0) {
        sessionTotalQueries = aiResponses.length;
      }
    }

    const rawGscQueryRows = (gscQueriesRes as any)?.data || [];
    const rawGscPageRows = (gscPagesRes as any)?.data || [];
    const gscAnalyticsRows = (gscSummaryRes as any)?.data || [];

    let gscSummary: DCSContext["gscSummary"] = null;
    if (gscAnalyticsRows.length > 0) {
      const totalClicks = gscAnalyticsRows.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
      const totalImpressions = gscAnalyticsRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
      const weightedPosSum = gscAnalyticsRows.reduce(
        (s: number, r: any) => s + (r.position || 0) * (r.impressions || 0),
        0
      );
      gscSummary = {
        totalClicks,
        totalImpressions,
        avgCTR: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        avgPosition: totalImpressions > 0 ? parseFloat((weightedPosSum / totalImpressions).toFixed(1)) : 0,
      };
    }

    const context: DCSContext = {
      aiResponses,
      sessionTotalQueries,
      rawGscQueryRows,
      rawGscPageRows,
      gscSummary,
      marketShareReport: marketShareRes.data || null,
      blindSpotReport: blindSpotRes.data || null,
      gapReport: gapRes.data || null,
      platformIntegrations: (platformIntegrationsRes.data || []).map((p: any) => ({
        platform: p.platform,
        status: p.status || "disconnected",
        metadata: p.metadata,
      })),
      googleMapsReviews: (googleMapsRes.data || []).map((r: any) => ({
        place_rating: r.place_rating,
        place_reviews_total: r.place_reviews_total,
        reviews_data: r.reviews_data,
      })),
      websiteAnalysis: (websiteAnalysisRes.data || []).map((r: any) => ({
        analysis_result: r.analysis_result,
      })),
      domainIntelligenceResults: domainIntelligenceRes.data || null,
      competitors: Array.isArray(project.competitors) ? project.competitors : [],
      industry: project.industry || "Technology",
    };

    const result = computeDCS(context);

    return NextResponse.json({
      project: { id: project.id, brand_name: project.brand_name, industry: project.industry, domain: domainName || project.website_url },
      ...result,
    });
  } catch (error: any) {
    console.error("Quote builder DCS error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
