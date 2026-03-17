/**
 * Maps dashboard routes to the billing requirement that must be met to access them.
 *
 * - "plan"       → any active plan is enough
 * - "module:xxx" → the named module must be active
 * - "report:xxx" → the named report type must be purchased
 * - "none"       → always accessible (billing, plan selection)
 */

export type AccessRequirement =
  | { type: "none" }
  | { type: "plan" }
  | { type: "module"; module: string; label: string }
  | { type: "report"; reportSlug: string; label: string };

// Routes that are always accessible, even without a plan
const UNRESTRICTED_ROUTES = [
  "/dashboard/billing",
  "/dashboard/select-plan",
];

// Routes that only require an active plan (Base features)
const PLAN_ONLY_ROUTES = [
  "/dashboard",
  "/dashboard/domains",
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/modules",
  "/dashboard/live-view",
  "/dashboard/google-search-console",
  "/dashboard/google-maps",
];

// Module → route prefixes
const MODULE_ROUTE_MAP: Record<string, { prefixes: string[]; label: string }> = {
  ai_visibility: {
    prefixes: ["/dashboard/ai-visibility", "/dashboard/action-plans"],
    label: "AI Visibility & AI Search Intelligence",
  },
  content_publishing: {
    prefixes: [
      "/dashboard/content-generator",
      "/dashboard/missed-prompts",
      "/dashboard/blog",
      "/dashboard/content",
    ],
    label: "Content & Publishing",
  },
  analytics_competitor: {
    prefixes: [
      "/dashboard/analytics",
      "/dashboard/gsc-analytics",
      "/dashboard/reports",
      "/dashboard/keyword-forecast",
      "/dashboard/keywords",
      "/dashboard/rankings",
    ],
    label: "Analytics & Competitor Intelligence",
  },
  reputation_monitoring: {
    prefixes: ["/dashboard/reputation"],
    label: "Reputation Monitoring",
  },
  opportunity_sales: {
    prefixes: [
      "/dashboard/quote-builder",
    ],
    label: "Opportunity & Sales Intelligence",
  },
};

// Report slug → route prefixes
const REPORT_ROUTE_MAP: Record<string, { prefixes: string[]; label: string }> = {
  ai_search_presence: {
    prefixes: ["/dashboard/ai-search-presence"],
    label: "AI Search Presence Report",
  },
  ai_vs_google_gap: {
    prefixes: ["/dashboard/ai-vs-google-gap"],
    label: "AI vs Google Gap Report",
  },
  market_share_of_attention: {
    prefixes: ["/dashboard/market-share-of-attention"],
    label: "Market Share of Attention Report",
  },
  geo_visibility: {
    prefixes: ["/dashboard/geo-visibility-market-coverage"],
    label: "GEO Visibility & Market Coverage Report",
  },
  opportunity_blind_spots: {
    prefixes: ["/dashboard/opportunity-blind-spots"],
    label: "Opportunity & Blind Spots Report",
  },
  strategic_blind_spots: {
    prefixes: ["/dashboard/strategic-blind-spots"],
    label: "Strategic Blind Spots Report",
  },
  regional_strength: {
    prefixes: ["/dashboard/regional-strength-comparison"],
    label: "Regional Strength Comparison Report",
  },
  global_visibility_matrix: {
    prefixes: ["/dashboard/global-visibility-matrix"],
    label: "Global Visibility Matrix Report",
  },
};

/**
 * Determine what billing requirement a given route needs.
 */
export function getRouteAccessRequirement(pathname: string): AccessRequirement {
  // Unrestricted
  if (UNRESTRICTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return { type: "none" };
  }

  // Report-gated routes
  for (const [slug, config] of Object.entries(REPORT_ROUTE_MAP)) {
    if (config.prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return { type: "report", reportSlug: slug, label: config.label };
    }
  }

  // Module-gated routes
  for (const [module, config] of Object.entries(MODULE_ROUTE_MAP)) {
    if (config.prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return { type: "module", module, label: config.label };
    }
  }

  // Plan-only routes (and any unlisted dashboard routes default to plan-required)
  return { type: "plan" };
}

/**
 * For sidebar: determine if a nav item's href should show a lock icon.
 * Returns the requirement, or null if accessible.
 */
export function getNavItemLockReason(
  href: string,
  activeModules: string[],
  purchasedReportSlugs: string[],
  hasPlan: boolean,
): AccessRequirement | null {
  const req = getRouteAccessRequirement(href);

  switch (req.type) {
    case "none":
      return null;
    case "plan":
      return hasPlan ? null : req;
    case "module":
      return activeModules.includes(req.module) ? null : req;
    case "report":
      return purchasedReportSlugs.includes(req.reportSlug) ? null : req;
  }
}

export { MODULE_ROUTE_MAP, REPORT_ROUTE_MAP, UNRESTRICTED_ROUTES };
