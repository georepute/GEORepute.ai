import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getIndustryBenchmark } from "@/lib/quote-builder/industry-benchmarks";

const MANDATORY_DISCLAIMER =
  "This proposal is based on publicly available data and comparative market benchmarks. It does not represent official search engine metrics and does not imply algorithm influence or guaranteed results.";

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
    const dealValueParam = searchParams.get("avgDealValue");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const { data: project } = await supabase
      .from("brand_analysis_projects")
      .select("id, industry, domain_id")
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
    const benchmark = getIndustryBenchmark(project.industry);
    const avgDealValue = dealValueParam ? parseFloat(dealValueParam) : benchmark.avgDealValue;
    const conversionRate = benchmark.avgConversionRate;

    let searchDemand = 0;
    let ctrBenchmark = benchmark.avgCTR / 100;

    if (domainId) {
      const [gscQueriesRes, gscAnalyticsRes] = await Promise.all([
        supabase
          .from("gsc_queries")
          .select("impressions")
          .eq("domain_id", domainId)
          .eq("user_id", session.user.id),
        supabase
          .from("gsc_analytics")
          .select("impressions, clicks")
          .eq("domain_id", domainId)
          .eq("user_id", session.user.id)
          .eq("data_type", "summary"),
      ]);

      const queryRows = (gscQueriesRes as any)?.data || [];
      const analyticsRows = (gscAnalyticsRes as any)?.data || [];

      if (analyticsRows.length > 0) {
        searchDemand = analyticsRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
        const totalClicks = analyticsRows.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
        const totalImpressions = analyticsRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
        if (totalImpressions > 0) {
          ctrBenchmark = totalClicks / totalImpressions;
        }
      }
      if (searchDemand === 0 && queryRows.length > 0) {
        searchDemand = queryRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
      }
    }

    const baseRevenue = searchDemand * ctrBenchmark * conversionRate * avgDealValue;
    const conservative = Math.round(baseRevenue * 0.5);
    const strategic = Math.round(baseRevenue * 1.0);
    const dominance = Math.round(baseRevenue * 1.5);

    const { data: opportunityReport } = domainId
      ? await supabase
          .from("opportunity_blind_spots_reports")
          .select("avg_cpc, revenue_at_risk")
          .eq("user_id", session.user.id)
          .eq("domain_id", domainId)
          .maybeSingle()
      : { data: null };

    return NextResponse.json({
      searchDemand,
      ctrBenchmark: Math.round(ctrBenchmark * 10000) / 100,
      conversionRate: Math.round(conversionRate * 10000) / 100,
      avgDealValue,
      revenueExposureWindow: {
        conservative,
        strategic,
        dominance,
      },
      advertisingComparison: opportunityReport
        ? { avgCpc: opportunityReport.avg_cpc, revenueAtRisk: opportunityReport.revenue_at_risk }
        : null,
      disclaimer: MANDATORY_DISCLAIMER,
    });
  } catch (error: any) {
    console.error("Revenue exposure error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
