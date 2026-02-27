/**
 * Strategic Recommendation Engine — 4 modes (Stability, Growth, Strategic Control, Dominance).
 * Auto-selects primary from DCS + CPI; others as pricing anchors.
 */

export type StrategicMode = "stability" | "growth" | "strategic_control" | "dominance";

export interface ModeDefinition {
  id: StrategicMode;
  name: string;
  description: string;
  recommendedReports: string[];
  timeline: string;
  pricingAnchor: string;
}

export const STRATEGIC_MODES: ModeDefinition[] = [
  {
    id: "stability",
    name: "Stability Mode",
    description: "Maintain and protect current position. Optimize existing channels and guard against erosion.",
    recommendedReports: ["market_share_of_attention", "ai_vs_google_gap"],
    timeline: "Ongoing",
    pricingAnchor: "Lower retainer",
  },
  {
    id: "growth",
    name: "Growth Mode",
    description: "Expand visibility and market share. Capture opportunity clusters and improve AI presence.",
    recommendedReports: ["ai_vs_google_gap", "opportunity_blind_spots", "market_share_of_attention"],
    timeline: "3–6 months",
    pricingAnchor: "Mid retainer",
  },
  {
    id: "strategic_control",
    name: "Strategic Control Mode",
    description: "Close critical gaps and establish control. Address blind spots and competitive pressure.",
    recommendedReports: ["ai_vs_google_gap", "opportunity_blind_spots", "geo_visibility", "market_share_of_attention"],
    timeline: "6–12 months",
    pricingAnchor: "Higher retainer",
  },
  {
    id: "dominance",
    name: "Dominance Mode",
    description: "Maximum investment for market leadership. Full DCS layer coverage and multi-market expansion.",
    recommendedReports: ["ai_vs_google_gap", "market_share_of_attention", "opportunity_blind_spots", "geo_visibility"],
    timeline: "12+ months",
    pricingAnchor: "Premium retainer",
  },
];

export interface RecommendationInput {
  dcsScore: number;
  competitivePressureIndex: number;
  opportunityScore?: number;
}

export interface RecommendationResult {
  primaryMode: StrategicMode;
  allModes: ModeDefinition[];
  priorities: { area: string; reason: string; urgency: string }[];
  focusAreas: string[];
}

export function getRecommendation(input: RecommendationInput): RecommendationResult {
  const { dcsScore, competitivePressureIndex, opportunityScore = 0 } = input;

  const priorities: { area: string; reason: string; urgency: string }[] = [];
  const focusAreas: string[] = [];

  if (dcsScore >= 70 && competitivePressureIndex < 30) {
    return {
      primaryMode: "stability",
      allModes: STRATEGIC_MODES,
      priorities: [
        { area: "Maintain position", reason: "DCS in Safety Zone; focus on monitoring.", urgency: "low" },
      ],
      focusAreas: ["Ongoing optimization", "Competitive monitoring"],
    };
  }

  if (dcsScore >= 50 && dcsScore < 70) {
    return {
      primaryMode: "growth",
      allModes: STRATEGIC_MODES,
      priorities: [
        { area: "Expand visibility", reason: "Moderate DCS; opportunity to grow share.", urgency: "medium" },
      ],
      focusAreas: ["Opportunity capture", "AI visibility expansion"],
    };
  }

  if (dcsScore >= 30 && dcsScore < 50) {
    return {
      primaryMode: "strategic_control",
      allModes: STRATEGIC_MODES,
      priorities: [
        { area: "Close critical gaps", reason: "Significant DCS gap; blind spots and risk present.", urgency: "high" },
      ],
      focusAreas: ["Blind spot coverage", "Gap closure", "Risk mitigation"],
    };
  }

  if (competitivePressureIndex >= 60) {
    return {
      primaryMode: "strategic_control",
      allModes: STRATEGIC_MODES,
      priorities: [
        { area: "Competitive pressure", reason: "High competitive pressure; urgent action recommended.", urgency: "high" },
      ],
      focusAreas: ["Competitive response", "Share of voice", "Risk acceleration"],
    };
  }

  return {
    primaryMode: "dominance",
    allModes: STRATEGIC_MODES,
    priorities: [
      { area: "Market leadership", reason: "Aggressive investment to capture market.", urgency: "medium" },
    ],
    focusAreas: ["Full DCS coverage", "Multi-market expansion", "Premium retainer"],
  };
}
