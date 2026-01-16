"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface BrandAnalysisSource {
  id: string;
  project_id: string;
  session_id?: string | null;
  platforms: string[];
  url: string;
  domain: string;
  title?: string | null;
  occurrence_count: number;
  citation_count: number;
  metadata?: any;
  first_seen_at: string;
  last_seen_at: string;
}

export const useBrandAnalysisSources = (projectId?: string) => {
  return useQuery<BrandAnalysisSource[], Error>({
    queryKey: ["brand-analysis-sources", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_analysis_sources")
        .select("*")
        .eq("project_id", projectId!)
        .order("last_seen_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data || []) as BrandAnalysisSource[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
