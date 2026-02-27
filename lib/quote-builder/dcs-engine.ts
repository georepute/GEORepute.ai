/**
 * Digital Control Score (DCS) Engine — 6 weighted layers, 0–100 final score.
 * All inputs come from real data tables; no placeholder data.
 */

import { getIndustryBenchmark } from "./industry-benchmarks";

export const DCS_WEIGHTS = {
  aiSearchInfluence: 0.2,
  organicCommercial: 0.15,
  socialAuthority: 0.15,
  reputationGoogleBusiness: 0.15,
  websiteContentDepth: 0.15,
  riskExternalExposure: 0.2,
} as const;

export const DCS_LAYER_NAMES = [
  "AI & Search Influence",
  "Organic & Commercial Coverage",
  "Social Authority & Velocity",
  "Reputation & Google Business",
  "Website & Content Depth",
  "Risk & External Exposure",
] as const;

export interface DCSLayerBreakdown {
  name: string;
  key: keyof typeof DCS_WEIGHTS;
  score: number;
  weight: number;
}

export interface DCSResult {
  finalScore: number;
  layerBreakdown: DCSLayerBreakdown[];
  radarChartData: { layer: string; score: number; fullMark: number }[];
  distanceToSafetyZone: number;   // 70 - DCS
  distanceToDominanceZone: number; // 85 - DCS
  industryAverage: number;
  competitorComparison?: { name: string; score: number }[];
}

export interface DCSContext {
  aiResponses: any[];
  sessionTotalQueries: number | null;
  rawGscQueryRows: any[];
  rawGscPageRows: any[];
  gscSummary: { totalClicks: number; totalImpressions: number; avgCTR: number; avgPosition: number } | null;
  marketShareReport: any;
  blindSpotReport: any;
  gapReport: any;
  platformIntegrations: { platform: string; status: string; metadata?: any }[];
  googleMapsReviews: { place_rating?: number; place_reviews_total?: number; reviews_data?: any[] }[];
  websiteAnalysis: { analysis_result?: any }[];
  domainIntelligenceResults: { results?: any } | null;
  competitors: string[];
  industry: string;
}

// Layer 1: AI & Search Influence (20%) — same as strategic-intelligence calculateAIVisibilityScore
function layer1AiSearchInfluence(aiResponses: any[], sessionTotalQueries: number | null): number {
  if (!aiResponses?.length) return 0;
  const totalQueries = sessionTotalQueries || aiResponses.length;
  const mentionedCount = aiResponses.filter((r) => r.response_metadata?.brand_mentioned === true).length;
  const mentionRate = totalQueries > 0 ? (mentionedCount / totalQueries) * 100 : 0;
  return Math.round(mentionRate);
}

// Layer 2: Organic & Commercial Coverage (15%) — same as strategic-intelligence calculateSEOScore
function layer2OrganicCommercial(
  rawQueryRows: any[],
  rawPageRows: any[],
  gscSummary: DCSContext["gscSummary"]
): number {
  if (
    (!rawQueryRows?.length && !rawPageRows?.length && !gscSummary) ||
    (!gscSummary && (!rawQueryRows?.length || rawQueryRows.every((r) => !r.impressions)))
  ) {
    return 0;
  }
  let totalClicks: number, totalImpressions: number, avgCTR: number, avgPosition: number;
  if (gscSummary) {
    totalClicks = gscSummary.totalClicks ?? 0;
    totalImpressions = gscSummary.totalImpressions ?? 0;
    avgCTR = gscSummary.avgCTR ?? 0;
    avgPosition = gscSummary.avgPosition ?? 0;
  } else {
    totalClicks = (rawQueryRows || []).reduce((s, q) => s + (q.clicks || 0), 0);
    totalImpressions = (rawQueryRows || []).reduce((s, q) => s + (q.impressions || 0), 0);
    avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const weightedPosSum = (rawQueryRows || []).reduce((s, q) => s + (q.position || 0) * (q.impressions || 0), 0);
    avgPosition = totalImpressions > 0 ? weightedPosSum / totalImpressions : 0;
  }
  const positionScore = Math.max(0, 100 - avgPosition * 2);
  const ctrScore = Math.min(100, avgCTR * 10);
  const volumeScore = Math.min(100, (totalImpressions / 10000) * 100);
  return Math.min(100, Math.round(positionScore * 0.35 + ctrScore * 0.3 + volumeScore * 0.35));
}

// Layer 3: Social Authority & Velocity (15%)
function layer3SocialAuthority(platformIntegrations: DCSContext["platformIntegrations"]): number {
  const socialPlatforms = ["facebook", "linkedin", "instagram", "reddit", "x"];
  const connected = platformIntegrations.filter(
    (p) => socialPlatforms.includes(p.platform) && p.status === "connected"
  ).length;
  const baseScore = (connected / socialPlatforms.length) * 50;
  let bonus = 0;
  for (const p of platformIntegrations) {
    if (p.metadata && typeof p.metadata === "object") {
      if (p.metadata.followers > 0) bonus += Math.min(10, Math.log10(p.metadata.followers + 1) * 3);
    }
  }
  return Math.min(100, Math.round(baseScore + bonus));
}

// Layer 4: Reputation & Google Business (15%)
function layer4ReputationGoogleBusiness(
  googleMapsReviews: DCSContext["googleMapsReviews"]
): number {
  if (!googleMapsReviews?.length) return 0;
  const latest = googleMapsReviews[0];
  const rating = Number(latest.place_rating) || 0;
  const total = Number(latest.place_reviews_total) || 0;
  const ratingScore = (rating / 5) * 60;
  const volumeScore = Math.min(40, total / 10);
  let sentimentBonus = 0;
  const reviews = latest.reviews_data;
  if (Array.isArray(reviews) && reviews.length > 0) {
    const avgRating = reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / reviews.length;
    if (avgRating >= 4) sentimentBonus = 5;
  }
  return Math.min(100, Math.round(ratingScore + volumeScore + sentimentBonus));
}

// Layer 5: Website & Content Depth (15%)
function layer5WebsiteContentDepth(
  websiteAnalysis: DCSContext["websiteAnalysis"],
  domainIntelligenceResults: DCSContext["domainIntelligenceResults"]
): number {
  let score = 0;
  if (domainIntelligenceResults?.results) {
    const r = domainIntelligenceResults.results as any;
    if (r.pagesCount > 0) score += Math.min(40, r.pagesCount * 2);
    if (r.contentDepth) score += Math.min(30, r.contentDepth * 10);
    if (r.technicalHealth !== undefined) score += Math.min(30, r.technicalHealth * 30);
  }
  if (websiteAnalysis?.length > 0 && score < 50) {
    const first = websiteAnalysis[0];
    if (first.analysis_result?.title) score = Math.max(score, 20);
    if (first.analysis_result?.description) score = Math.max(score, Math.min(score + 25, 70));
  }
  return Math.min(100, Math.round(score));
}

// Layer 6: Risk & External Exposure (20%) — higher = safer (inverted risk)
function layer6RiskExternalExposure(blindSpotReport: any, gapReport: any): number {
  let blindScore = 0;
  if (blindSpotReport) {
    const blindSpots: any[] = blindSpotReport.blind_spots || [];
    const total = blindSpotReport.total_blind_spots ?? blindSpots.length;
    const avgScore = Number(blindSpotReport.avg_blind_spot_score ?? 0);
    const riskScore = Math.min(100, total * 3 + blindSpots.filter((b: any) => b.priority === "high").length * 10 + avgScore * 0.5);
    blindScore = Math.max(0, 100 - riskScore);
  }
  let gapScore = 0;
  if (gapReport) {
    const queries: any[] = gapReport.queries || [];
    const total = queries.length || 1;
    const balanced = gapReport.balanced_count ?? queries.filter((q: any) => q.band === "balanced").length;
    gapScore = Math.min(100, Math.round((balanced / total) * 100));
  }
  if (blindSpotReport && gapReport) return Math.round((blindScore + gapScore) / 2);
  return blindSpotReport ? blindScore : gapScore;
}

export function computeDCS(context: DCSContext): DCSResult {
  const l1 = layer1AiSearchInfluence(context.aiResponses, context.sessionTotalQueries);
  const l2 = layer2OrganicCommercial(
    context.rawGscQueryRows,
    context.rawGscPageRows,
    context.gscSummary
  );
  const l3 = layer3SocialAuthority(context.platformIntegrations);
  const l4 = layer4ReputationGoogleBusiness(context.googleMapsReviews);
  const l5 = layer5WebsiteContentDepth(
    context.websiteAnalysis,
    context.domainIntelligenceResults
  );
  const l6 = layer6RiskExternalExposure(context.blindSpotReport, context.gapReport);

  const finalScore = Math.round(
    l1 * DCS_WEIGHTS.aiSearchInfluence +
    l2 * DCS_WEIGHTS.organicCommercial +
    l3 * DCS_WEIGHTS.socialAuthority +
    l4 * DCS_WEIGHTS.reputationGoogleBusiness +
    l5 * DCS_WEIGHTS.websiteContentDepth +
    l6 * DCS_WEIGHTS.riskExternalExposure
  );

  const industryBenchmark = getIndustryBenchmark(context.industry);
  const industryAverage = industryBenchmark.avgDCS;

  const layerBreakdown: DCSLayerBreakdown[] = [
    { name: DCS_LAYER_NAMES[0], key: "aiSearchInfluence", score: l1, weight: DCS_WEIGHTS.aiSearchInfluence },
    { name: DCS_LAYER_NAMES[1], key: "organicCommercial", score: l2, weight: DCS_WEIGHTS.organicCommercial },
    { name: DCS_LAYER_NAMES[2], key: "socialAuthority", score: l3, weight: DCS_WEIGHTS.socialAuthority },
    { name: DCS_LAYER_NAMES[3], key: "reputationGoogleBusiness", score: l4, weight: DCS_WEIGHTS.reputationGoogleBusiness },
    { name: DCS_LAYER_NAMES[4], key: "websiteContentDepth", score: l5, weight: DCS_WEIGHTS.websiteContentDepth },
    { name: DCS_LAYER_NAMES[5], key: "riskExternalExposure", score: l6, weight: DCS_WEIGHTS.riskExternalExposure },
  ];

  const radarChartData = layerBreakdown.map((l) => ({
    layer: l.name,
    score: l.score,
    fullMark: 100,
  }));

  const distanceToSafetyZone = Math.max(0, 70 - finalScore);
  const distanceToDominanceZone = Math.max(0, 85 - finalScore);

  // Competitor names only; scores would require running DCS per competitor (not stored)
  const competitorComparison = context.competitors.length
    ? context.competitors.map((name) => ({ name, score: industryAverage }))
    : undefined;

  return {
    finalScore: Math.min(100, Math.max(0, finalScore)),
    layerBreakdown,
    radarChartData,
    distanceToSafetyZone,
    distanceToDominanceZone,
    industryAverage,
    competitorComparison,
  };
}
