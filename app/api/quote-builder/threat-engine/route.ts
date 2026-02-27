import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RiskAccelerationLevel = "HIGH" | "MEDIUM" | "LOW";

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
      .select("id, domain_id")
      .eq("id", projectId)
      .eq("user_id", session.user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const domainId = project.domain_id;

    const [gapRes, marketShareRes, blindSpotRes, aiResponsesRes, googleMapsRes] = await Promise.all([
      domainId
        ? supabase
            .from("ai_google_gap_reports")
            .select("ai_risk_count, total_queries, seo_failure_count")
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("market_share_reports")
        .select("ai_mention_share_pct, market_share_score")
        .eq("user_id", session.user.id)
        .eq("project_id", projectId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      domainId
        ? supabase
            .from("blind_spot_reports")
            .select("ai_blind_spot_pct, total_blind_spots")
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("ai_platform_responses")
        .select("response_metadata")
        .eq("project_id", projectId)
        .limit(200),
      supabase
        .from("google_maps_reviews")
        .select("place_rating")
        .eq("user_id", session.user.id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const gapReport = gapRes.data;
    const marketShareReport = marketShareRes.data;
    const blindSpotReport = blindSpotRes.data;
    const aiResponses = (aiResponsesRes as any)?.data || [];
    const googleMaps = googleMapsRes.data;

    let aiNarrativeLoss = 0;
    if (gapReport && gapReport.total_queries > 0) {
      aiNarrativeLoss = (gapReport.ai_risk_count || 0) / gapReport.total_queries;
    }

    const competitiveShare = marketShareReport
      ? 100 - (marketShareReport.ai_mention_share_pct || 0)
      : 50;

    let sentimentRisk = 0;
    if (aiResponses.length > 0) {
      const withSentiment = aiResponses.filter((r: { response_metadata?: { sentiment?: number } }) => r.response_metadata?.sentiment != null);
      if (withSentiment.length > 0) {
        const avg =
          withSentiment.reduce((s: number, r: any) => s + (r.response_metadata.sentiment ?? 0), 0) /
          withSentiment.length;
        sentimentRisk = avg < 0 ? Math.min(100, Math.abs(avg) * 50) : 0;
      }
    }

    const reputationVulnerability = blindSpotReport?.ai_blind_spot_pct ?? 0;

    let reviewRisk = 0;
    if (googleMaps?.place_rating != null) {
      const rating = Number(googleMaps.place_rating);
      if (rating < 4) reviewRisk = (4 - rating) * 25;
    }

    const competitivePressureIndex = Math.round(
      aiNarrativeLoss * 25 +
        (competitiveShare / 100) * 25 +
        sentimentRisk * 0.2 +
        reputationVulnerability * 0.3 +
        reviewRisk * 0.2
    );

    const cpi = Math.min(100, Math.max(0, competitivePressureIndex));
    let riskAccelerationIndicator: RiskAccelerationLevel = "LOW";
    if (cpi >= 60) riskAccelerationIndicator = "HIGH";
    else if (cpi >= 35) riskAccelerationIndicator = "MEDIUM";

    return NextResponse.json({
      competitivePressureIndex: cpi,
      riskAccelerationIndicator,
      signals: {
        aiNarrativeLoss: Math.round(aiNarrativeLoss * 100),
        competitiveShare: Math.round(competitiveShare * 10) / 10,
        sentimentRisk: Math.round(sentimentRisk),
        reputationVulnerability: Math.round(reputationVulnerability * 10) / 10,
        reviewRisk: Math.round(reviewRisk),
      },
      disclaimer:
        "Projected DCS and risk indicators are estimates based on current data, not guarantees.",
    });
  } catch (error: any) {
    console.error("Threat engine error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
