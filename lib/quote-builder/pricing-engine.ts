/**
 * Dynamic Pricing Engine for Quote Builder.
 */

export const REPORT_ADDON_IDS = [
  "ai_vs_google_gap",
  "market_share_of_attention",
  "opportunity_blind_spots",
  "geo_visibility",
] as const;

export const REPORT_ADDON_PRICES: Record<string, number> = {
  ai_vs_google_gap: 300,
  market_share_of_attention: 400,
  opportunity_blind_spots: 350,
  geo_visibility: 450,
};

export interface PricingInput {
  complexityScore: number;
  numberOfMarkets: number;
  dcsGap: number;
  riskIndex: number;
  monitoringDepth: "basic" | "standard" | "deep";
  selectedReports: string[];
}

export interface PricingResult {
  basePriceMin: number;
  basePriceMax: number;
  reportAddOns: { reportId: string; amount: number }[];
  reportAddOnsTotal: number;
  riskPremium: number;
  marketMultiplier: number;
  suggestedMin: number;
  suggestedMax: number;
  breakdown: {
    base: string;
    reports: string;
    risk: string;
    markets: string;
  };
}

export function computePricing(input: PricingInput): PricingResult {
  const basePriceMin = Math.round(
    1500 +
    input.complexityScore * 20 +
    input.numberOfMarkets * 200 +
    Math.max(0, input.dcsGap) * 30
  );
  const basePriceMax = Math.round(basePriceMin * 1.4);

  const depthMultiplier =
    input.monitoringDepth === "deep" ? 1.3 : input.monitoringDepth === "standard" ? 1.15 : 1;
  const marketMultiplier = 1 + (input.numberOfMarkets > 3 ? (input.numberOfMarkets - 3) * 0.05 : 0);

  const reportAddOns = input.selectedReports
    .filter((id) => REPORT_ADDON_IDS.includes(id as any))
    .map((id) => ({ reportId: id, amount: REPORT_ADDON_PRICES[id] ?? 0 }));
  const reportAddOnsTotal = reportAddOns.reduce((s, r) => s + r.amount, 0);

  const riskPremium = input.riskIndex > 70 ? 0.15 : 0;

  let suggestedMin = (basePriceMin + reportAddOnsTotal) * depthMultiplier * marketMultiplier;
  let suggestedMax = (basePriceMax + reportAddOnsTotal) * depthMultiplier * marketMultiplier;
  if (riskPremium > 0) {
    suggestedMin *= 1 + riskPremium;
    suggestedMax *= 1 + riskPremium;
  }
  suggestedMin = Math.round(suggestedMin);
  suggestedMax = Math.round(suggestedMax);

  return {
    basePriceMin,
    basePriceMax,
    reportAddOns,
    reportAddOnsTotal,
    riskPremium: riskPremium * 100,
    marketMultiplier,
    suggestedMin,
    suggestedMax,
    breakdown: {
      base: "Base $" + basePriceMin + "-" + basePriceMax + "/mo",
      reports: reportAddOnsTotal ? "Reports +$" + reportAddOnsTotal + "/mo" : "No report add-ons",
      risk: riskPremium ? "Risk premium +" + riskPremium * 100 + "%" : "No risk premium",
      markets: marketMultiplier > 1 ? "Markets x" + marketMultiplier.toFixed(2) : "Single market",
    },
  };
}
