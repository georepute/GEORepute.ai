import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateAnnualStrategicPlan } from "@/lib/ai/geoCore";

// ─── GET: load stored annual plan for a project ───────────────────────────────
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("annual_plans")
    .select("plan_data, generated_at")
    .eq("user_id", session.user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Error loading annual plan:", error);
    return NextResponse.json({ plan: null });
  }

  return NextResponse.json({ plan: data?.plan_data || null, generatedAt: data?.generated_at || null });
}

// ─── POST: generate + save annual plan ───────────────────────────────────────
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectId, intelligenceContext, domain, language } = body;
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  // ── Fetch project info ──────────────────────────────────────────────────────
  const { data: projectRow } = await supabase
    .from("brand_analysis_projects")
    .select("id, brand_name, industry, website_url, company_description, keywords, domain_id")
    .eq("id", projectId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const project = {
    name: projectRow?.brand_name || intelligenceContext?.project?.name || "Brand",
    industry: projectRow?.industry || intelligenceContext?.project?.industry || "General",
    website: projectRow?.website_url || domain || intelligenceContext?.project?.website || "",
    description: projectRow?.company_description || intelligenceContext?.project?.description || "",
    keywords: projectRow?.keywords || intelligenceContext?.project?.keywords || [],
  };

  // ── Fetch AI visibility data ────────────────────────────────────────────────
  let aiVisibilityData: any[] = [];
  let aiSessionSummary: { total_queries: number; total_mentions: number } | null = null;

  try {
    const { data: sessions } = await supabase
      .from("brand_analysis_sessions")
      .select("id, results_summary, total_queries")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      const latestSession = sessions[0];
      const sessionTotalQueries =
        latestSession.results_summary?.total_queries || latestSession.total_queries || 0;

      const { data: aiResponses } = await supabase
        .from("ai_platform_responses")
        .select("platform, prompt, response, gap_suggestion, response_metadata")
        .eq("project_id", projectId)
        .eq("session_id", latestSession.id);

      aiVisibilityData = aiResponses || [];
      const mentionedCount = aiVisibilityData.filter(
        (r: any) => r.response_metadata?.brand_mentioned === true
      ).length;
      const totalForRate = sessionTotalQueries || aiVisibilityData.length;
      aiSessionSummary = { total_queries: totalForRate, total_mentions: mentionedCount };
      console.log(`✅ AI visibility: ${mentionedCount}/${totalForRate} mention brand`);
    }
  } catch (e) {
    console.error("Error fetching AI visibility data:", e);
  }

  // ── Fetch GSC data (all rows, aggregated) ───────────────────────────────────
  let gscQueries: any[] = [];
  let gscPages: any[] = [];

  try {
    // Resolve domain_id — prefer project's stored domain_id, fallback to domains lookup
    let domainId: string | null = projectRow?.domain_id || null;

    if (!domainId) {
      const rawDomain = (project.website || domain || "")
        .replace(/https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .trim();

      if (rawDomain) {
        const { data: domainRow } = await supabase
          .from("domains")
          .select("id")
          .or(`domain.ilike.%${rawDomain}%,domain.eq.${rawDomain}`)
          .limit(1)
          .maybeSingle();
        domainId = domainRow?.id || null;
      }
    }

    if (domainId) {
      const [queriesRes, pagesRes] = await Promise.all([
        supabase
          .from("gsc_queries")
          .select("query, clicks, impressions, ctr, position")
          .eq("domain_id", domainId)
          .eq("user_id", session.user.id),
        supabase
          .from("gsc_pages")
          .select("page, clicks, impressions, ctr, position")
          .eq("domain_id", domainId)
          .eq("user_id", session.user.id),
      ]);

      // Aggregate by query name — identical to GSC Analytics page logic
      const queryMap = new Map<string, any>();
      for (const r of queriesRes.data || []) {
        const key = r.query;
        if (queryMap.has(key)) {
          const e = queryMap.get(key)!;
          e.clicks += r.clicks || 0;
          e.impressions += r.impressions || 0;
          e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
          e.position = (e.position + (r.position || 0)) / 2;
        } else {
          queryMap.set(key, {
            keyword: key,
            clicks: r.clicks || 0,
            impressions: r.impressions || 0,
            ctr: r.ctr || 0,
            position: r.position || 0,
          });
        }
      }
      gscQueries = Array.from(queryMap.values()).sort((a, b) => b.impressions - a.impressions);

      // Aggregate by page URL
      const pageMap = new Map<string, any>();
      for (const r of pagesRes.data || []) {
        const key = r.page;
        if (pageMap.has(key)) {
          const e = pageMap.get(key)!;
          e.clicks += r.clicks || 0;
          e.impressions += r.impressions || 0;
          e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
          e.position = (e.position + (r.position || 0)) / 2;
        } else {
          pageMap.set(key, {
            page: key,
            clicks: r.clicks || 0,
            impressions: r.impressions || 0,
            ctr: r.ctr || 0,
            position: r.position || 0,
          });
        }
      }
      gscPages = Array.from(pageMap.values()).sort((a, b) => b.clicks - a.clicks);
      console.log(`✅ GSC: ${gscQueries.length} unique queries, ${gscPages.length} unique pages`);
    }
  } catch (e) {
    console.error("Error fetching GSC data:", e);
  }

  // ── Generate the annual strategic plan ─────────────────────────────────────
  let plan;
  try {
    plan = await generateAnnualStrategicPlan({
      project,
      intelligenceContext,
      gscQueries: gscQueries.length > 0 ? gscQueries : undefined,
      gscPages: gscPages.length > 0 ? gscPages : undefined,
      aiVisibilityData: aiVisibilityData.length > 0 ? aiVisibilityData : undefined,
      aiSessionSummary: aiSessionSummary || undefined,
      language: language || "en",
    });
  } catch (err: any) {
    console.error("Annual plan generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate plan" }, { status: 500 });
  }

  // ── Upsert to annual_plans ──────────────────────────────────────────────────
  const { error: upsertError } = await supabase
    .from("annual_plans")
    .upsert(
      {
        user_id: session.user.id,
        project_id: projectId,
        plan_data: plan,
        generated_at: plan.generatedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" }
    );

  if (upsertError) {
    console.error("Error saving annual plan:", upsertError);
    // Still return the plan even if save failed
  } else {
    console.log(`✅ Annual plan saved for project ${projectId}`);
  }

  return NextResponse.json({ plan });
}
