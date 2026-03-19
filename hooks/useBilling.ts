"use client";

import { useState, useEffect, useCallback } from "react";

export type BillingFeature =
  | "ai_visibility"
  | "content_publishing"
  | "analytics_competitor"
  | "reputation_monitoring"
  | "opportunity_sales"
  | "prompt_monitoring"
  | "dashboard"
  | "domain_connection"
  | "settings"
  | "seat_management"
  | "view_reports"
  | "intelligence_signals";

const BASE_FEATURES: BillingFeature[] = [
  "dashboard",
  "domain_connection",
  "settings",
  "seat_management",
  "prompt_monitoring",
  "view_reports",
  "intelligence_signals",
];

const MODULE_FEATURE_MAP: Record<string, BillingFeature> = {
  ai_visibility: "ai_visibility",
  content_publishing: "content_publishing",
  analytics_competitor: "analytics_competitor",
  reputation_monitoring: "reputation_monitoring",
  opportunity_sales: "opportunity_sales",
};

interface BillingPlan {
  id: string;
  name: string;
  display_name: string;
  monthly_price_cents: number;
  domain_limit: number;
  features: string[];
}

interface BillingSubscription {
  id: string;
  status: string;
  current_period_end: string;
  commitment_end_date: string | null;
  cancel_at_period_end: boolean;
}

interface ActiveModule {
  id: string;
  module_id: string;
  name: string;
  display_name: string;
  monthly_price_cents: number;
}

interface Report {
  id: string;
  report_type: string;
  report_type_id: string;
  status: string;
  pdf_url: string | null;
  purchased_at: string;
}

interface BillingState {
  plan: BillingPlan | null;
  subscription: BillingSubscription | null;
  modules: ActiveModule[];
  reports: Report[];
  domainLimit: number;
  domainsUsed: number;
  isLoading: boolean;
  isWithinCommitment: boolean;
  hasSubscription: boolean;
}

export function useBilling() {
  const [state, setState] = useState<BillingState>({
    plan: null,
    subscription: null,
    modules: [],
    reports: [],
    domainLimit: 0,
    domainsUsed: 0,
    isLoading: true,
    isWithinCommitment: false,
    hasSubscription: false,
  });

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/overview");
      const data = await res.json();

      if (data.success) {
        setState({
          plan: data.plan,
          subscription: data.subscription,
          modules: data.activeModules || [],
          reports: data.reports || [],
          domainLimit: data.usage?.domain_limit || 0,
          domainsUsed: data.usage?.domains_used || 0,
          isLoading: false,
          isWithinCommitment: data.isWithinCommitment || false,
          hasSubscription: !!data.subscription,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const canAccess = useCallback(
    (feature: BillingFeature): boolean => {
      if (BASE_FEATURES.includes(feature)) {
        return state.plan !== null && state.subscription?.status !== "canceled";
      }

      const requiredModule = Object.entries(MODULE_FEATURE_MAP).find(
        ([, f]) => f === feature
      );
      if (requiredModule) {
        return state.modules.some((m) => m.name === requiredModule[0]);
      }

      return false;
    },
    [state.plan, state.subscription, state.modules]
  );

  const isLocked = useCallback(
    (feature: BillingFeature): boolean => {
      return !canAccess(feature);
    },
    [canAccess]
  );

  const getModuleNameForFeature = useCallback(
    (feature: BillingFeature): string | null => {
      const DISPLAY_NAMES: Record<string, string> = {
        ai_visibility: "AI Visibility & AI Search Intelligence",
        content_publishing: "Content & Publishing",
        analytics_competitor: "Analytics & Competitor Intelligence",
        reputation_monitoring: "Reputation Monitoring",
        opportunity_sales: "Opportunity & Sales Intelligence",
      };
      const entry = Object.entries(MODULE_FEATURE_MAP).find(
        ([, f]) => f === feature
      );
      return entry ? DISPLAY_NAMES[entry[0]] || null : null;
    },
    []
  );

  return {
    ...state,
    canAccess,
    isLocked,
    getModuleNameForFeature,
    refetch: fetchBilling,
  };
}
