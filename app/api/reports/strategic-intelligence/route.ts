import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface IntelligenceScores {
  aiVisibility: number;
  seoPresence: number;
  shareOfAttention: number;
  authorityScore: number;
  digitalControlScore: number;
  riskExposure: number;
  opportunityScore: number;
  competitivePosition: number;
  revenueReadiness: number;
  marketStructure: number;
}

// Uses identical logic to the AI Visibility page:
//   - mentions = responses where response_metadata.brand_mentioned === true
//   - denominator = session.results_summary.total_queries (planned) or actual response count
//   - score = Math.round((mentions / totalQueries) * 100)  — no multiplier
function calculateAIVisibilityScore(
  aiResponses: any[],
  sessionTotalQueries: number | null
): { score: number; details: any } {
  if (!aiResponses || aiResponses.length === 0) return { score: 0, details: null };

  const platforms = Array.from(new Set(aiResponses.map((r) => r.platform)));
  // Use the planned query count from the session (same denominator as AI Visibility page)
  const totalQueries = sessionTotalQueries || aiResponses.length;
  const mentionedCount = aiResponses.filter(
    (r) => r.response_metadata?.brand_mentioned === true
  ).length;
  const mentionRate = totalQueries > 0 ? (mentionedCount / totalQueries) * 100 : 0;

  const platformBreakdown = platforms.map((platform) => {
    const platformResponses = aiResponses.filter((r) => r.platform === platform);
    const mentioned = platformResponses.filter(
      (r) => r.response_metadata?.brand_mentioned === true
    ).length;
    return {
      platform,
      total: platformResponses.length,
      mentioned,
      rate: platformResponses.length > 0
        ? Math.round((mentioned / platformResponses.length) * 100)
        : 0,
    };
  });

  // Exact same formula as AI Visibility page
  const score = Math.round(mentionRate);

  return {
    score,
    details: {
      totalQueries,
      mentionedCount,
      mentionRate: Math.round(mentionRate),
      platformBreakdown,
      gapCount: totalQueries - mentionedCount,
    },
  };
}

// Aggregation mirrors gsc-analytics page's queries/pages API routes exactly:
//   1. Aggregate raw rows by query/page key (sum clicks+impressions, average position)
//   2. avgCTR = totalClicks / totalImpressions  (NOT average of row CTR values)
//   3. avgPosition = impression-weighted average  (NOT simple average)
// rawQueryRows / rawPageRows come directly from gsc_queries / gsc_pages tables
function calculateSEOScore(
  rawQueryRows: any[],
  rawPageRows: any[],
  gscSummary: any | null  // from gsc_analytics table (data_type='summary')
): { score: number; details: any } {
  if (
    (!rawQueryRows || rawQueryRows.length === 0) &&
    (!rawPageRows || rawPageRows.length === 0) &&
    !gscSummary
  ) {
    return { score: 0, details: null };
  }

  // ── Step 1: Aggregate gsc_queries rows by query text (matches queries API) ─
  const queryMap = new Map<string, any>();
  for (const row of rawQueryRows || []) {
    const key = row.query;
    if (queryMap.has(key)) {
      const e = queryMap.get(key)!;
      e.clicks += row.clicks || 0;
      e.impressions += row.impressions || 0;
      e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
      e.position = (e.position + (row.position || 0)) / 2; // simple avg (matches API)
    } else {
      queryMap.set(key, {
        query: key,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }
  }
  const queries = Array.from(queryMap.values()).sort((a, b) => b.clicks - a.clicks);

  // ── Step 2: Aggregate gsc_pages rows by page URL (matches pages API) ────────
  const pageMap = new Map<string, any>();
  for (const row of rawPageRows || []) {
    const key = row.page;
    if (pageMap.has(key)) {
      const e = pageMap.get(key)!;
      e.clicks += row.clicks || 0;
      e.impressions += row.impressions || 0;
      e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
      e.position = (e.position + (row.position || 0)) / 2;
    } else {
      pageMap.set(key, {
        page: key,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }
  }
  const pages = Array.from(pageMap.values()).sort((a, b) => b.clicks - a.clicks);

  // ── Step 3: Compute summary metrics matching the summary API ─────────────────
  // Prefer gsc_analytics summary (most accurate); fall back to aggregated queries
  let totalClicks: number;
  let totalImpressions: number;
  let avgCTR: number;
  let avgPosition: number;

  if (gscSummary) {
    // Exact same formulas as /analytics/summary route
    totalClicks = gscSummary.totalClicks ?? 0;
    totalImpressions = gscSummary.totalImpressions ?? 0;
    avgCTR = gscSummary.avgCTR ?? 0;           // already in % (e.g. 3.25)
    avgPosition = gscSummary.avgPosition ?? 0;
  } else {
    // Fall back to query aggregation
    totalClicks = queries.reduce((s, q) => s + q.clicks, 0);
    totalImpressions = queries.reduce((s, q) => s + q.impressions, 0);
    // avgCTR = totalClicks / totalImpressions (matches summary API)
    const rawAvgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    avgCTR = parseFloat((rawAvgCTR * 100).toFixed(2));
    // avgPosition = impression-weighted average (matches summary API)
    const weightedPosSum = queries.reduce((s, q) => s + q.position * q.impressions, 0);
    avgPosition = totalImpressions > 0 ? parseFloat((weightedPosSum / totalImpressions).toFixed(1)) : 0;
  }

  // ── Step 4: Compute SEO presence score ───────────────────────────────────────
  const positionScore = Math.max(0, 100 - avgPosition * 2);
  const ctrScore = Math.min(100, avgCTR * 10);  // avgCTR already in %, 10% CTR → 100
  const volumeScore = Math.min(100, (totalImpressions / 10000) * 100);

  const topRankingQueries = queries.filter((q) => q.position <= 10).length;
  const opportunityQueryCount = queries.filter((q) => q.impressions > 50 && q.position > 10).length;

  const score = Math.min(
    100,
    Math.round(positionScore * 0.35 + ctrScore * 0.3 + volumeScore * 0.35)
  );

  return {
    score,
    details: {
      // Values matching what GSC Analytics page displays
      totalClicks,
      totalImpressions,
      avgCTR,          // in % — e.g. 3.25 means 3.25%
      avgPosition,     // impression-weighted, matches summary API
      totalQueries: queries.length,
      totalPages: pages.length,
      topRankingQueries,
      opportunityQueryCount,
      topPerformingQueries: queries.slice(0, 10).map((q) => ({
        query: q.query,
        position: Math.round(q.position * 10) / 10,
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: parseFloat((q.ctr * 100).toFixed(2)),
      })),
      opportunityQueries: queries
        .filter((q) => q.impressions > 50 && q.position > 10)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10)
        .map((q) => ({
          query: q.query,
          position: Math.round(q.position * 10) / 10,
          impressions: q.impressions,
          clicks: q.clicks,
          ctr: parseFloat((q.ctr * 100).toFixed(2)),
        })),
      topPages: pages.slice(0, 10).map((p) => ({
        page: p.page,
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: parseFloat((p.ctr * 100).toFixed(2)),
        position: Math.round(p.position * 10) / 10,
      })),
    },
  };
}

// All field names match exactly what market-share-of-attention route stores in market_share_reports
// Displayed values (with toFixed(1)) match what the Market Share of Attention page shows
function calculateShareOfAttention(
  marketShareReport: any
): { score: number; details: any } {
  if (!marketShareReport) return { score: 0, details: null };

  // market_share_score = (0.6 × ai_mention_share_pct) + (0.4 × organic_share_pct)
  // Stored at 1 decimal precision — preserve it exactly
  const score = Math.round((marketShareReport.market_share_score || 0) * 10) / 10;

  return {
    score,
    details: {
      // Exact field names from market_share_reports table
      marketShareScore: score,                                                              // = market_share_score
      aiMentionShare: Math.round((marketShareReport.ai_mention_share_pct || 0) * 10) / 10,  // = ai_mention_share_pct
      weightedAIShare: Math.round((marketShareReport.weighted_ai_share_pct || 0) * 10) / 10, // = weighted_ai_share_pct
      aiRecommendationShare: Math.round((marketShareReport.ai_recommendation_share_pct || 0) * 10) / 10,
      organicShare: Math.round((marketShareReport.organic_share_pct || 0) * 10) / 10,       // = organic_share_pct
      isDefaultLeader: marketShareReport.is_default_leader || false,
      totalAIQueries: marketShareReport.total_ai_queries || 0,
      totalAIMentions: marketShareReport.total_ai_mentions || 0,
      engineBreakdown: marketShareReport.engine_breakdown || [],
      intentBreakdown: marketShareReport.intent_breakdown || {},
    },
  };
}

// All field names match the blind_spot_reports table and the strategic-blind-spots page display:
//   summary.totalBlindSpots = total_blind_spots column
//   summary.avgBlindSpotScore = avg_blind_spot_score column (toFixed(1) on page)
//   summary.aiBlindSpotPct = ai_blind_spot_pct column
//   per blind spot: blindSpotScore, demandScore, absenceScore (camelCase — stored in JSONB)
function calculateBlindSpotRisk(
  blindSpotReport: any
): { score: number; details: any } {
  if (!blindSpotReport) return { score: 0, details: null };

  const blindSpots: any[] = blindSpotReport.blind_spots || [];
  // Read from stored summary columns (same values the page shows)
  const totalBlindSpots = blindSpotReport.total_blind_spots ?? blindSpots.length;
  const avgBlindSpotScore = Number(blindSpotReport.avg_blind_spot_score ?? 0);
  const aiBlindSpotPct = Number(blindSpotReport.ai_blind_spot_pct ?? 0);

  const highPriority = blindSpots.filter((b: any) => b.priority === "high").length;
  const mediumPriority = blindSpots.filter((b: any) => b.priority === "medium").length;
  const lowPriority = blindSpots.filter((b: any) => b.priority === "low").length;

  // Risk coverage score: higher = better coverage (fewer blind spots)
  const riskScore = Math.min(
    100,
    Math.round(totalBlindSpots * 3 + highPriority * 10 + avgBlindSpotScore * 0.5)
  );

  return {
    score: Math.max(0, 100 - riskScore),
    details: {
      // Exact values the Blind Spots page shows in summary cards
      totalBlindSpots,                                        // = summary.totalBlindSpots
      avgBlindSpotScore: Math.round(avgBlindSpotScore * 10) / 10, // = summary.avgBlindSpotScore (toFixed(1))
      aiBlindSpotPct: Math.round(aiBlindSpotPct * 10) / 10,  // = summary.aiBlindSpotPct
      highPriority,
      mediumPriority,
      lowPriority,
      enginesUsed: blindSpotReport.engines_used || [],
      // JSONB blind_spots array uses camelCase (blindSpotScore, demandScore, absenceScore)
      topBlindSpots: [...blindSpots]
        .sort((a: any, b: any) => (b.blindSpotScore || 0) - (a.blindSpotScore || 0))
        .slice(0, 10)
        .map((b: any) => ({
          query: b.query,
          score: b.blindSpotScore,          // camelCase in JSONB
          demandScore: b.demandScore,
          absenceScore: b.absenceScore,
          priority: b.priority,
          volume: b.volume,
          llmMentions: b.llmMentions,
        })),
    },
  };
}

// All field names match the ai_google_gap_reports table and ai-vs-google-gap page display:
//   summary.aiRisk = ai_risk_count column
//   summary.moderateGap = moderate_gap_count column
//   summary.balanced = balanced_count column
//   summary.avgGapScore = avg_gap_score column
//   per query: googleScore, aiScore, gapScore, band, bandLabel (camelCase in JSONB)
function calculateGapAnalysisScore(
  gapReport: any
): { score: number; details: any } {
  if (!gapReport) return { score: 0, details: null };

  const queries: any[] = gapReport.queries || [];
  const total = queries.length || 1;

  // Read from stored summary columns (same values the page shows in summary cards)
  const aiRisk = gapReport.ai_risk_count ?? queries.filter((q: any) => q.band === "ai_risk").length;
  const moderateGap = gapReport.moderate_gap_count ?? queries.filter((q: any) => q.band === "moderate_gap").length;
  const balanced = gapReport.balanced_count ?? queries.filter((q: any) => q.band === "balanced").length;
  const seoOpportunity = gapReport.seo_opportunity_count ?? queries.filter((q: any) => q.band === "seo_opportunity").length;
  const seoFailure = gapReport.seo_failure_count ?? queries.filter((q: any) => q.band === "seo_failure").length;
  const avgGapScore = Number(gapReport.avg_gap_score ?? 0);

  // Score = % of balanced queries (higher is better)
  const score = Math.min(100, Math.round((balanced / total) * 100));

  return {
    score,
    details: {
      // Exact summary values the Gap page shows in its summary cards
      totalQueries: queries.length,
      avgGapScore,                   // = summary.avgGapScore
      aiRisk,                        // = summary.aiRisk
      moderateGap,                   // = summary.moderateGap
      balanced,                      // = summary.balanced
      seoOpportunity,                // = summary.seoOpportunity
      seoFailure,                    // = summary.seoFailure
      // JSONB 'queries' items use camelCase (set by ai-vs-google-gap route)
      topGaps: [...queries]
        .filter((q: any) => q.band === "ai_risk" || q.band === "moderate_gap")
        .sort((a: any, b: any) => Math.abs(b.gapScore || 0) - Math.abs(a.gapScore || 0))
        .slice(0, 10)
        .map((q: any) => ({
          query: q.query,
          gapScore: q.gapScore,        // camelCase in JSONB
          band: q.band,
          bandLabel: q.bandLabel,
          googleScore: q.googleScore,  // camelCase
          aiScore: q.aiScore,          // camelCase
          impressions: q.impressions,
          position: q.position,
        })),
    },
  };
}

function generateDecisionLogic(scores: IntelligenceScores): {
  priorities: { area: string; reason: string; urgency: string }[];
  focusAreas: string[];
  quarterlyThemes: { quarter: string; theme: string; focus: string }[];
} {
  const priorities: { area: string; reason: string; urgency: string }[] = [];
  const focusAreas: string[] = [];

  if (scores.aiVisibility < 40) {
    priorities.push({
      area: "AI Visibility Expansion",
      reason: "AI visibility score is critically low — brand is invisible on AI platforms",
      urgency: "critical",
    });
    focusAreas.push("AI-focused content and narrative expansion");
  }

  if (scores.seoPresence < 40) {
    priorities.push({
      area: "SEO & Technical Optimization",
      reason: "SEO presence score is low — organic visibility needs immediate improvement",
      urgency: "critical",
    });
    focusAreas.push("Technical and structural SEO improvements");
  }

  if (scores.authorityScore < 40) {
    priorities.push({
      area: "Authority & PR Strategy",
      reason: "Authority score is weak — brand needs external validation and backlinks",
      urgency: "high",
    });
    focusAreas.push("PR, backlinks, and external mentions strategy");
  }

  if (scores.riskExposure < 50) {
    priorities.push({
      area: "Risk Mitigation",
      reason: "High blind spot exposure detected — brand is absent from key AI conversations",
      urgency: "high",
    });
    focusAreas.push("Blind spot coverage and risk reduction");
  }

  if (scores.shareOfAttention < 30) {
    priorities.push({
      area: "Share of Attention Growth",
      reason: "Market share of attention is dangerously low compared to competitors",
      urgency: "critical",
    });
    focusAreas.push("Competitive content positioning and market share capture");
  }

  if (scores.opportunityScore > 60) {
    priorities.push({
      area: "Opportunity Monetization",
      reason: "Significant untapped opportunities detected — high-impression keywords with poor performance",
      urgency: "medium",
    });
    focusAreas.push("Funnel and conversion optimization for opportunity keywords");
  }

  if (scores.digitalControlScore < 50) {
    priorities.push({
      area: "Digital Control Enhancement",
      reason: "Low digital control score — brand narrative is not managed across platforms",
      urgency: "high",
    });
    focusAreas.push("Cross-platform brand narrative control");
  }

  priorities.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (
      (order[a.urgency as keyof typeof order] ?? 3) -
      (order[b.urgency as keyof typeof order] ?? 3)
    );
  });

  const quarterlyThemes = [
    {
      quarter: "Q1",
      theme: "Foundation & Audit",
      focus:
        priorities.length > 0
          ? priorities[0].area
          : "Baseline establishment and data collection",
    },
    {
      quarter: "Q2",
      theme: "Expansion & Growth",
      focus:
        priorities.length > 1
          ? priorities[1].area
          : "Content expansion and channel growth",
    },
    {
      quarter: "Q3",
      theme: "Authority & Market Positioning",
      focus:
        priorities.length > 2
          ? priorities[2].area
          : "Authority building and market positioning",
    },
    {
      quarter: "Q4",
      theme: "Market Control & Optimization",
      focus: "Performance optimization and market control consolidation",
    },
  ];

  return { priorities, focusAreas, quarterlyThemes };
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
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const { data: project } = await supabase
      .from("brand_analysis_projects")
      .select("id, brand_name, industry, website_url, company_description, domain_id, keywords, competitors")
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
    if (!domainId && project.website_url) {
      const rawDomain = project.website_url
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

    // ── AI Visibility: same query as AI Visibility page ──────────────────────
    // 1. Get latest completed session (brand_analysis_sessions)
    const { data: sessionRows } = await supabase
      .from("brand_analysis_sessions")
      .select("id, results_summary, total_queries")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(1);

    let aiResponses: any[] = [];
    let sessionTotalQueries: number | null = null;

    if (sessionRows && sessionRows.length > 0) {
      const latestSession = sessionRows[0];
      // Priority matches AI Visibility page:
      //   results_summary.total_queries → session.total_queries → actual response count
      sessionTotalQueries =
        latestSession.results_summary?.total_queries ||
        latestSession.total_queries ||
        null;

      // 2. Fetch all responses for that session (same columns AI Visibility page uses)
      const { data: aiData } = await supabase
        .from("ai_platform_responses")
        .select("platform, prompt, response, response_metadata")
        .eq("project_id", projectId)
        .eq("session_id", latestSession.id)
        .order("created_at", { ascending: false });
      aiResponses = aiData || [];

      // If sessionTotalQueries not in summary, fall back to response count
      if (!sessionTotalQueries && aiResponses.length > 0) {
        sessionTotalQueries = aiResponses.length;
      }
    }

    // ── Market Share: identical query to market-share-of-attention GET route ─
    // Filter: user_id + project_id, ORDER BY generated_at DESC
    // Does NOT require domainId — stored by project_id directly
    const { data: marketShareRow } = await supabase
      .from("market_share_reports")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("project_id", projectId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── Blind Spots: identical query to strategic-blind-spots GET route ───────
    // Filter: user_id + domain_id  (NOT project_id)
    const { data: blindSpotRow } = domainId
      ? await supabase
          .from("blind_spot_reports")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("domain_id", domainId)
          .maybeSingle()
      : { data: null };

    // ── Gap Analysis: identical query to ai-vs-google-gap GET route ──────────
    // Filter: user_id + domain_id
    const { data: gapRow } = domainId
      ? await supabase
          .from("ai_google_gap_reports")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("domain_id", domainId)
          .maybeSingle()
      : { data: null };

    // ── GSC: identical to gsc-analytics page fetch logic ─────────────────────
    // domain_id comes from brand_analysis_projects.domain_id (set by user in project setup)
    // Fetch ALL rows (no limit) — aggregation happens in calculateSEOScore below
    const [gscQueriesRes, gscPagesRes, gscSummaryRes] = await Promise.all([
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
      // gsc_analytics summary — same table as /analytics/summary route uses
      domainId
        ? supabase
            .from("gsc_analytics")
            .select("clicks, impressions, ctr, position, date")
            .eq("domain_id", domainId)
            .eq("user_id", session.user.id)
            .eq("data_type", "summary")
            .order("date", { ascending: true })
        : Promise.resolve({ data: null }),
    ]);

    const marketShareReport = marketShareRow || null;
    const blindSpotReport = blindSpotRow || null;
    const gapReport = gapRow || null;
    const rawGscQueryRows = (gscQueriesRes as any)?.data || [];
    const rawGscPageRows = (gscPagesRes as any)?.data || [];
    const gscAnalyticsRows = (gscSummaryRes as any)?.data || [];

    // Compute summary from gsc_analytics rows (matches /analytics/summary route formula)
    let gscSummary: any = null;
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
        // avgCTR = totalClicks / totalImpressions (matches summary API)
        avgCTR: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
        // avgPosition = impression-weighted (matches summary API)
        avgPosition: totalImpressions > 0 ? parseFloat((weightedPosSum / totalImpressions).toFixed(1)) : 0,
      };
    }

    // For legacy compat — used in old variable references below
    const gscQueries = rawGscQueryRows;
    const gscPages = rawGscPageRows;

    const aiVis = calculateAIVisibilityScore(aiResponses, sessionTotalQueries);
    const seo = calculateSEOScore(rawGscQueryRows, rawGscPageRows, gscSummary);
    const soa = calculateShareOfAttention(marketShareReport);
    const blindSpots = calculateBlindSpotRisk(blindSpotReport);
    const gapAnalysis = calculateGapAnalysisScore(gapReport);

    const authorityScore = Math.round(
      (aiVis.score * 0.3 + seo.score * 0.3 + soa.score * 0.4) * 0.8
    );
    const digitalControlScore = Math.round(
      (aiVis.score * 0.25 +
        seo.score * 0.25 +
        blindSpots.score * 0.25 +
        gapAnalysis.score * 0.25)
    );
    const opportunityScore = seo.details
      ? Math.min(
          100,
          (seo.details.opportunityQueryCount || 0) * 10 +
            (seo.details.opportunityQueries?.length || 0) * 15
        )
      : 0;

    const scores: IntelligenceScores = {
      aiVisibility: aiVis.score,
      seoPresence: seo.score,
      shareOfAttention: soa.score,
      authorityScore,
      digitalControlScore,
      riskExposure: blindSpots.score,
      opportunityScore,
      competitivePosition: soa.score,
      revenueReadiness: Math.round(
        (seo.score * 0.4 + aiVis.score * 0.3 + authorityScore * 0.3)
      ),
      marketStructure: soa.score,
    };

    const decisionLogic = generateDecisionLogic(scores);

    const intelligence = {
      project: {
        id: project.id,
        name: project.brand_name,
        industry: project.industry,
        website: project.website_url,
        description: project.company_description,
        keywords: project.keywords || [],
        competitors: project.competitors || [],
      },
      scores,
      reports: {
        executiveBrief: {
          available: true,
          overallHealth: Math.round(
            Object.values(scores).reduce((a, b) => a + b, 0) /
              Object.values(scores).length
          ),
          topStrengths: Object.entries(scores)
            .filter(([, v]) => v >= 60)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, v]) => ({
              area: k.replace(/([A-Z])/g, " $1").trim(),
              score: v,
            })),
          topWeaknesses: Object.entries(scores)
            .filter(([, v]) => v < 40)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .map(([k, v]) => ({
              area: k.replace(/([A-Z])/g, " $1").trim(),
              score: v,
            })),
        },
        aiVisibility: { available: aiResponses.length > 0, ...aiVis },
        seoAnalysis: {
          available: rawGscQueryRows.length > 0 || rawGscPageRows.length > 0 || !!gscSummary,
          ...seo,
        },
        shareOfAttention: {
          available: !!marketShareReport,
          ...soa,
        },
        riskMatrix: { available: !!blindSpotReport, ...blindSpots },
        competitiveAudit: {
          available: !!marketShareReport,
          score: soa.score,
          details: soa.details,
        },
        gapAnalysis: { available: !!gapReport, ...gapAnalysis },
        opportunityEngine: {
          available: (seo.details?.opportunityQueries?.length ?? 0) > 0,
          score: opportunityScore,
          details: {
            opportunityKeywords: seo.details?.opportunityQueries || [],
            totalOpportunities: seo.details?.opportunityQueryCount || 0,
          },
        },
        digitalControl: {
          available: true,
          score: digitalControlScore,
          details: {
            aiPresence: aiVis.score,
            seoPresence: seo.score,
            blindSpotCoverage: blindSpots.score,
            gapCoverage: gapAnalysis.score,
          },
        },
        revenueArchitecture: {
          available: seo.details != null,
          score: scores.revenueReadiness,
          details: {
            topConvertingQueries: seo.details?.topPerformingQueries || [],
            conversionOpportunities:
              seo.details?.opportunityQueries || [],
          },
        },
      },
      decisionLogic,
      dataCompleteness: {
        aiVisibility: aiResponses.length > 0,
        gscData: rawGscQueryRows.length > 0 || !!gscSummary,
        marketShare: !!marketShareReport,
        blindSpots: !!blindSpotReport,
        gapAnalysis: !!gapReport,
        completenessScore: [
          aiResponses.length > 0,
          rawGscQueryRows.length > 0 || !!gscSummary,
          !!marketShareReport,
          !!blindSpotReport,
          !!gapReport,
        ].filter(Boolean).length * 20,
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(intelligence, { status: 200 });
  } catch (error: any) {
    console.error("Strategic intelligence error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
