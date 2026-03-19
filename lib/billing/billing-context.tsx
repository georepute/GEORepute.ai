"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface BillingContextState {
  hasPlan: boolean;
  planName: string | null;
  activeModules: string[];      // module names like "ai_visibility"
  purchasedReportSlugs: string[]; // report type names like "ai_search_presence"
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const BillingContext = createContext<BillingContextState>({
  hasPlan: false,
  planName: null,
  activeModules: [],
  purchasedReportSlugs: [],
  isLoading: true,
  refetch: async () => {},
});

export function BillingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<BillingContextState, "refetch">>({
    hasPlan: false,
    planName: null,
    activeModules: [],
    purchasedReportSlugs: [],
    isLoading: true,
  });

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/overview");
      if (!res.ok) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const data = await res.json();
      if (data.success) {
        const activeModuleNames = (data.activeModules || []).map((m: any) => m.name);

        // A report is accessible only when its monitoring subscription is active.
        // If the user stops paying, monitoring lapses and the report locks again.
        const activeMonitoringTypeIds = new Set(
          (data.monitoring || [])
            .filter((m: any) => m.status === "active" || m.status === "past_due")
            .map((m: any) => m.report_type_id)
            .filter(Boolean),
        );

        const purchasedSlugs = (data.reports || [])
          .filter(
            (r: any) =>
              r.status === "completed" && activeMonitoringTypeIds.has(r.report_type_id),
          )
          .map((r: any) => r.report_type_slug || r.report_type_id)
          .filter(Boolean);

        setState({
          hasPlan: !!data.subscription && data.subscription.status !== "canceled",
          planName: data.plan?.name || null,
          activeModules: activeModuleNames,
          purchasedReportSlugs: purchasedSlugs,
          isLoading: false,
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

  return (
    <BillingContext.Provider value={{ ...state, refetch: fetchBilling }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBillingContext() {
  return useContext(BillingContext);
}
