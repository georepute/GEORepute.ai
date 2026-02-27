import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRecommendation } from "@/lib/quote-builder/recommendation-engine";
import { computePricing, REPORT_ADDON_IDS } from "@/lib/quote-builder/pricing-engine";

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

async function fetchWithAuth(
  path: string,
  cookieHeader: string | null
): Promise<{ data?: any; error?: string }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || res.statusText };
  return { data };
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
    const statusFilter = searchParams.get("status");
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10) || 20);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    let query = supabase
      .from("quotes")
      .select("*, brand_analysis_projects(brand_name, website_url)", { count: "exact" })
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter && ["draft", "sent", "accepted", "rejected", "expired"].includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }

    const { data: quotes, error, count } = await query;

    if (error) {
      console.error("Quotes list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (quotes || []).map((q: any) => ({
      ...q,
      brand_name: q.brand_analysis_projects?.brand_name ?? null,
      website_url: q.brand_analysis_projects?.website_url ?? null,
      brand_analysis_projects: undefined,
    }));

    return NextResponse.json({ quotes: items, total: count ?? items.length });
  } catch (error: unknown) {
    console.error("Quote builder GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      project_id: projectId,
      client_name: clientName,
      client_email: clientEmail,
      contact_person: contactPerson,
      domain,
      mode = "quick",
      valid_until: validUntil,
      selected_reports: selectedReports = [],
      selected_markets: selectedMarkets = [],
      scope_adjustments: scopeAdjustments = {},
      avg_deal_value: avgDealValue,
    } = body;

    if (!projectId || !domain) {
      return NextResponse.json(
        { error: "project_id and domain are required" },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("brand_analysis_projects")
      .select("id, brand_name, industry, website_url, domain_id, keywords, competitors")
      .eq("id", projectId)
      .eq("user_id", session.user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const cookieHeader = request.headers.get("cookie");

    const [dcsRes, revenueRes, threatRes] = await Promise.all([
      fetchWithAuth(`/api/quote-builder/dcs?projectId=${encodeURIComponent(projectId)}`, cookieHeader),
      fetchWithAuth(
        `/api/quote-builder/revenue-exposure?projectId=${encodeURIComponent(projectId)}${avgDealValue != null ? `&avgDealValue=${avgDealValue}` : ""}`,
        cookieHeader
      ),
      fetchWithAuth(`/api/quote-builder/threat-engine?projectId=${encodeURIComponent(projectId)}`, cookieHeader),
    ]);

    if (dcsRes.error) {
      return NextResponse.json(
        { error: "DCS calculation failed: " + dcsRes.error },
        { status: 502 }
      );
    }
    if (revenueRes.error) {
      return NextResponse.json(
        { error: "Revenue exposure failed: " + revenueRes.error },
        { status: 502 }
      );
    }
    if (threatRes.error) {
      return NextResponse.json(
        { error: "Threat engine failed: " + threatRes.error },
        { status: 502 }
      );
    }

    const dcsData = dcsRes.data as {
      finalScore: number;
      layerBreakdown: { name: string; score: number }[];
      radarChartData: unknown[];
      competitorComparison: unknown[];
      distanceToSafetyZone: number;
      distanceToDominanceZone: number;
      project?: { domain?: string };
    };
    const revenueData = revenueRes.data as {
      searchDemand: number;
      ctrBenchmark: number;
      conversionRate: number;
      avgDealValue: number;
      revenueExposureWindow: { conservative: number; strategic: number; dominance: number };
      disclaimer: string;
    };
    const threatData = threatRes.data as {
      competitivePressureIndex: number;
      riskAccelerationIndicator: string;
      signals: Record<string, number>;
      disclaimer: string;
    };

    const recommendation = getRecommendation({
      dcsScore: dcsData.finalScore,
      competitivePressureIndex: threatData.competitivePressureIndex,
    });

    const monitoringDepth =
      (scopeAdjustments?.monitoringDepth as "basic" | "standard" | "deep") || "standard";
    const validReports = (selectedReports as string[]).filter((id: string) =>
      REPORT_ADDON_IDS.includes(id as any)
    );
    const numberOfMarkets = Array.isArray(selectedMarkets) ? Math.max(1, selectedMarkets.length) : 1;
    const keywords = (project.keywords as string[]) || [];
    const competitors = (project.competitors as string[]) || [];
    const complexityScore = Math.min(
      50,
      Math.round((keywords.length || 0) * 2 + (competitors.length || 0) * 5)
    );
    const dcsGap = Math.max(0, 70 - dcsData.finalScore);

    const pricingResult = computePricing({
      complexityScore,
      numberOfMarkets,
      dcsGap,
      riskIndex: threatData.competitivePressureIndex,
      monitoringDepth,
      selectedReports: validReports,
    });

    const totalMonthlyPrice =
      pricingResult.suggestedMin +
      Math.round((pricingResult.suggestedMax - pricingResult.suggestedMin) / 2);

    const { data: orgUser } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const insertPayload = {
      user_id: session.user.id,
      organization_id: orgUser?.organization_id ?? null,
      project_id: projectId,
      client_name: clientName ?? null,
      client_email: clientEmail ?? null,
      contact_person: contactPerson ?? null,
      domain,
      mode: ["quick", "advanced", "internal"].includes(mode) ? mode : "quick",
      status: "draft",
      valid_until: validUntil || null,
      dcs_snapshot: {
        finalScore: dcsData.finalScore,
        layerBreakdown: dcsData.layerBreakdown,
        radarChartData: dcsData.radarChartData,
        competitorComparison: dcsData.competitorComparison,
        distanceToSafetyZone: dcsData.distanceToSafetyZone,
        distanceToDominanceZone: dcsData.distanceToDominanceZone,
      },
      market_data: {},
      revenue_exposure: {
        searchDemand: revenueData.searchDemand,
        ctrBenchmark: revenueData.ctrBenchmark,
        conversionRate: revenueData.conversionRate,
        avgDealValue: revenueData.avgDealValue,
        revenueExposureWindow: revenueData.revenueExposureWindow,
        disclaimer: revenueData.disclaimer,
      },
      threat_data: {
        competitivePressureIndex: threatData.competitivePressureIndex,
        riskAccelerationIndicator: threatData.riskAccelerationIndicator,
        signals: threatData.signals,
        disclaimer: threatData.disclaimer,
      },
      recommendation: {
        primaryMode: recommendation.primaryMode,
        allModes: recommendation.allModes,
        priorities: recommendation.priorities,
        focusAreas: recommendation.focusAreas,
      },
      selected_reports: validReports,
      selected_markets: Array.isArray(selectedMarkets) ? selectedMarkets : [],
      scope_adjustments: scopeAdjustments,
      pricing_data: {
        basePriceMin: pricingResult.basePriceMin,
        basePriceMax: pricingResult.basePriceMax,
        reportAddOns: pricingResult.reportAddOns,
        reportAddOnsTotal: pricingResult.reportAddOnsTotal,
        riskPremium: pricingResult.riskPremium,
        marketMultiplier: pricingResult.marketMultiplier,
        suggestedMin: pricingResult.suggestedMin,
        suggestedMax: pricingResult.suggestedMax,
        breakdown: pricingResult.breakdown,
      },
      total_monthly_price: totalMonthlyPrice,
    };

    const { data: quote, error: insertError } = await supabase
      .from("quotes")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      console.error("Quote insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase.from("quote_activity_log").insert({
      quote_id: quote.id,
      user_id: session.user.id,
      action: "created",
      new_value: { status: "draft" },
    });

    return NextResponse.json({ quote });
  } catch (error: unknown) {
    console.error("Quote builder POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id: quoteId, ...updates } = body;

    if (!quoteId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const allowedKeys = [
      "client_name",
      "client_email",
      "contact_person",
      "valid_until",
      "status",
      "selected_reports",
      "selected_markets",
      "scope_adjustments",
      "price_override",
      "price_override_reason",
      "internal_notes",
      "margin_estimate",
      "win_probability",
      "total_monthly_price",
    ];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: "No allowed fields to update" }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("quotes")
      .select("id, status, price_override, total_monthly_price, proposal_version")
      .eq("id", quoteId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (sanitized.proposal_version === undefined) {
      sanitized.proposal_version = Math.max(1, (existing.proposal_version ?? 1) + 1);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("quotes")
      .update(sanitized)
      .eq("id", quoteId)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (updateErr) {
      console.error("Quote update error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const action =
      sanitized.price_override !== undefined ? "price_override" : sanitized.status !== undefined ? "status_changed" : "updated";
    await supabase.from("quote_activity_log").insert({
      quote_id: quoteId,
      user_id: session.user.id,
      action,
      old_value: existing,
      new_value: sanitized,
    });

    return NextResponse.json({ quote: updated });
  } catch (error: unknown) {
    console.error("Quote builder PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get("id");
    if (!quoteId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("id, status")
      .eq("id", quoteId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    if (quote.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft quotes can be deleted" },
        { status: 400 }
      );
    }

    const { error: deleteErr } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId)
      .eq("user_id", session.user.id);

    if (deleteErr) {
      console.error("Quote delete error:", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Quote builder DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
