import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { computePricing, type PricingInput } from "@/lib/quote-builder/pricing-engine";

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
    const dcsScoreParam = searchParams.get("dcsScore");
    const riskIndexParam = searchParams.get("riskIndex");
    const selectedReportsParam = searchParams.get("selectedReports"); // comma-separated
    const numberOfMarketsParam = searchParams.get("numberOfMarkets");
    const monitoringDepthParam = searchParams.get("monitoringDepth");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const { data: project } = await supabase
      .from("brand_analysis_projects")
      .select("id, keywords, competitors")
      .eq("id", projectId)
      .eq("user_id", session.user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const keywords = (project.keywords as string[]) || [];
    const competitors = (project.competitors as string[]) || [];
    const complexityScore = Math.min(
      50,
      Math.round((keywords.length || 0) * 2 + (competitors.length || 0) * 5)
    );

    const dcsScore = dcsScoreParam != null ? Number(dcsScoreParam) : 50;
    const dcsGap = Math.max(0, 70 - dcsScore);
    const riskIndex = riskIndexParam != null ? Number(riskIndexParam) : 30;
    const numberOfMarkets = numberOfMarketsParam != null ? Math.max(1, parseInt(numberOfMarketsParam, 10)) : 1;
    const selectedReports = selectedReportsParam
      ? selectedReportsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const monitoringDepth =
      (monitoringDepthParam as "basic" | "standard" | "deep") || "standard";
    if (!["basic", "standard", "deep"].includes(monitoringDepth)) {
      return NextResponse.json(
        { error: "monitoringDepth must be basic, standard, or deep" },
        { status: 400 }
      );
    }

    const input: PricingInput = {
      complexityScore,
      numberOfMarkets,
      dcsGap,
      riskIndex,
      monitoringDepth,
      selectedReports,
    };

    const result = computePricing(input);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Quote builder pricing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
