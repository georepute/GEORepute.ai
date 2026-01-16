"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useState, useEffect } from 'react';

// Helper hook to get current user ID
function useEffectiveUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    async function getUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    getUserId();
  }, []);
  
  return userId;
}

export interface BrandAnalysisProject {
  id: string;
  brand_name: string;
  website_url?: string;
  industry?: string;
  competitors?: string[];
  target_keywords?: string[];
  analysis_frequency: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_analysis_at?: string;
  total_mentions?: number; // prompt-level mentions from DB
  active_platforms?: string[]; // configured platforms from DB
  observed_platforms?: string[]; // platforms seen in results
  visibility_score?: number; // prompt-level visibility score from DB
  query_generation_mode?: 'ai-only' | 'manual' | 'both';
  manual_queries?: Array<{query: string, language: string, country?: string}>;
  target_languages?: string[];
  target_countries?: string[];
  // Prompt-level metrics from latest session
  prompts_total?: number;
  prompts_mentioned?: number;
  // Response-level metrics (diagnostic)
  responses_total?: number;
  responses_mentioned?: number;
}

export interface CreateProjectData {
  brandName: string;
  websiteUrl?: string;
  industry: string;
  competitors: string[];
  targetKeywords: string[];
  platforms: string[];
  languages?: string[];
  countries?: string[];
  frequency: string;
  queryGenerationMode?: 'ai-only' | 'manual' | 'both';
  manualQueries?: Array<{query: string, language: string, country?: string}>;
}

export const useBrandAnalysisProjects = () => {
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["brand-analysis-projects", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("brand_analysis_projects")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to include real computed fields from DB (no recomputing!)
      const projectsWithStats = await Promise.all(
        data.map(async (project): Promise<BrandAnalysisProject> => {
          // PRIORITY 1: Use project table values (updated directly after analysis - source of truth)
          // PRIORITY 2: Fall back to session's results_summary if project table doesn't have values
          let promptsTotal: number | null = (project.prompts_total as number) ?? null;
          let promptsMentioned: number | null = (project.prompts_mentioned as number) ?? null;
          let responsesTotal: number | null = (project.responses_total as number) ?? null;
          let responsesMentioned: number | null = (project.responses_mentioned as number) ?? null;
          
          // If project table doesn't have values, try to get from latest session
          if (promptsTotal === null || promptsMentioned === null) {
            const { data: latestSession } = await supabase
              .from("brand_analysis_sessions")
              .select("id, results_summary")
              .eq("project_id", project.id)
              .eq("status", "completed")
              .order("completed_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Extract prompt-level metrics from session's results_summary
            const resultsSummary = latestSession?.results_summary as Record<string, unknown> | null;
            if (promptsTotal === null) promptsTotal = (resultsSummary?.prompts_total as number) ?? null;
            if (promptsMentioned === null) promptsMentioned = (resultsSummary?.prompts_mentioned as number) ?? null;
            if (responsesTotal === null) responsesTotal = (resultsSummary?.responses_total as number) ?? null;
            if (responsesMentioned === null) responsesMentioned = (resultsSummary?.responses_mentioned as number) ?? null;
          }
          
          // Convert null to 0 for display, but keep track that we have values
          const finalPromptsTotal = promptsTotal ?? 0;
          const finalPromptsMentioned = promptsMentioned ?? 0;
          const finalResponsesTotal = responsesTotal ?? 0;
          const finalResponsesMentioned = responsesMentioned ?? 0;

          // Get observed platforms from recent analysis rows
          const { data: platforms } = await supabase
            .from("ai_platform_responses")
            .select("platform")
            .eq("project_id", project.id)
            .limit(50);

          const uniqueObserved = [...new Set(platforms?.map(p => p.platform) || [])];

          console.log(`Project ${project.brand_name} loaded with platforms:`, project.active_platforms);
          
          // Safely parse manual_queries from JSON
          let parsedManualQueries: Array<{query: string, language: string, country?: string}> = [];
          if (Array.isArray(project.manual_queries)) {
            parsedManualQueries = project.manual_queries as Array<{query: string, language: string, country?: string}>;
          }
          
          return {
            id: project.id,
            brand_name: project.brand_name,
            website_url: project.website_url,
            industry: project.industry,
            competitors: project.competitors,
            target_keywords: project.target_keywords,
            analysis_frequency: project.analysis_frequency,
            status: project.status,
            created_at: project.created_at,
            updated_at: project.updated_at,
            last_analysis_at: project.last_analysis_at,
            query_generation_mode: project.query_generation_mode as 'ai-only' | 'manual' | 'both' | undefined,
            manual_queries: parsedManualQueries,
            target_languages: project.target_languages,
            target_countries: project.target_countries,
            // Use project table prompt-level metrics (source of truth)
            total_mentions: finalPromptsMentioned,
            active_platforms: project.active_platforms || [],
            observed_platforms: uniqueObserved,
            // Calculate visibility score: prompt-level visibility (primary metric)
            visibility_score: finalPromptsTotal > 0 
              ? Math.round((finalPromptsMentioned / finalPromptsTotal) * 100) 
              : 0,
            // Prompt-level metrics (from project table or session fallback)
            prompts_total: promptsTotal, // Keep null if not available
            prompts_mentioned: promptsMentioned, // Keep null if not available
            responses_total: responsesTotal, // Keep null if not available
            responses_mentioned: responsesMentioned, // Keep null if not available
          };
        })
      );

      return projectsWithStats;
    },
    enabled: !!effectiveUserId,
  });
};

export const useBrandAnalysisProject = (id: string) => {
  const effectiveUserId = useEffectiveUserId();
  
  return useQuery({
    queryKey: ["brand-analysis-project", id, effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) {
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase
        .from("brand_analysis_projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", effectiveUserId)
        .single();

      if (error) {
        throw error;
      }

      // PRIORITY 1: Use project table values (updated directly after analysis - source of truth)
      // PRIORITY 2: Fall back to session's results_summary if project table doesn't have values
      let promptsTotal: number | null = (data.prompts_total as number) ?? null;
      let promptsMentioned: number | null = (data.prompts_mentioned as number) ?? null;
      let responsesTotal: number | null = (data.responses_total as number) ?? null;
      let responsesMentioned: number | null = (data.responses_mentioned as number) ?? null;
      
      // If project table doesn't have values, try to get from latest session
      if (promptsTotal === null || promptsMentioned === null) {
        const { data: latestSession } = await supabase
          .from("brand_analysis_sessions")
          .select("id, results_summary")
          .eq("project_id", data.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Extract prompt-level metrics from session's results_summary
        const resultsSummary = latestSession?.results_summary as Record<string, unknown> | null;
        if (promptsTotal === null) promptsTotal = (resultsSummary?.prompts_total as number) ?? null;
        if (promptsMentioned === null) promptsMentioned = (resultsSummary?.prompts_mentioned as number) ?? null;
        if (responsesTotal === null) responsesTotal = (resultsSummary?.responses_total as number) ?? null;
        if (responsesMentioned === null) responsesMentioned = (resultsSummary?.responses_mentioned as number) ?? null;
      }
      
      // Convert null to 0 for display, but keep track that we have values
      const finalPromptsTotal = promptsTotal ?? 0;
      const finalPromptsMentioned = promptsMentioned ?? 0;
      const finalResponsesTotal = responsesTotal ?? 0;
      const finalResponsesMentioned = responsesMentioned ?? 0;

      // Get observed platforms
      const { data: platforms } = await supabase
        .from("ai_platform_responses")
        .select("platform")
        .eq("project_id", data.id)
        .limit(50);

      const observedPlatforms = [...new Set(platforms?.map(p => p.platform) || [])];

      // Safely parse manual_queries from JSON
      let parsedManualQueries: Array<{query: string, language: string, country?: string}> = [];
      if (Array.isArray(data.manual_queries)) {
        parsedManualQueries = data.manual_queries as Array<{query: string, language: string, country?: string}>;
      }

      return {
        id: data.id,
        brand_name: data.brand_name,
        website_url: data.website_url,
        industry: data.industry,
        competitors: data.competitors,
        target_keywords: data.target_keywords,
        analysis_frequency: data.analysis_frequency,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_analysis_at: data.last_analysis_at,
        query_generation_mode: data.query_generation_mode as 'ai-only' | 'manual' | 'both' | undefined,
        manual_queries: parsedManualQueries,
        target_languages: data.target_languages,
        target_countries: data.target_countries,
        // Use project table prompt-level metrics (source of truth)
        total_mentions: finalPromptsMentioned,
        active_platforms: data.active_platforms || [],
        observed_platforms: observedPlatforms,
        // Calculate visibility score: prompt-level visibility (primary metric)
        visibility_score: finalPromptsTotal > 0 
          ? Math.round((finalPromptsMentioned / finalPromptsTotal) * 100) 
          : 0,
        // Prompt-level metrics (from project table or session fallback)
        prompts_total: promptsTotal, // Keep null if not available
        prompts_mentioned: promptsMentioned, // Keep null if not available
        responses_total: responsesTotal, // Keep null if not available
        responses_mentioned: responsesMentioned, // Keep null if not available
      };
    },
    enabled: !!id && !!effectiveUserId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

export const useCreateBrandAnalysisProject = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  
  return useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      console.log('Creating project with platforms:', projectData.platforms);
      
      const { data, error } = await supabase
        .from('brand_analysis_projects')
        .insert({
          user_id: effectiveUserId,
          brand_name: projectData.brandName,
          website_url: projectData.websiteUrl || null,
          industry: projectData.industry,
          competitors: projectData.competitors,
          target_keywords: projectData.targetKeywords,
          active_platforms: projectData.platforms,
          target_languages: projectData.languages || ['en-US'],
          target_countries: projectData.countries || [],
          analysis_frequency: projectData.frequency,
          status: 'active',
          query_generation_mode: projectData.queryGenerationMode || 'ai-only',
          manual_queries: projectData.manualQueries || []
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        throw error;
      }

      console.log('Project created successfully with platforms:', data.active_platforms);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-analysis-projects', effectiveUserId] });
      toast.success('Your brand visibility project has been created.');
    }
  });
};

export const useDeleteBrandAnalysisProject = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from("brand_analysis_projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", effectiveUserId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-analysis-projects", effectiveUserId] });
      toast.success("Brand visibility project deleted.");
    },
    onError: (error) => {
      toast.error("Failed to delete project. Please try again.");
      console.error('Project deletion error:', error);
    },
  });
};

export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();
  
  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await supabase
        .from("brand_analysis_projects")
        .update({ status })
        .eq("id", projectId)
        .eq("user_id", effectiveUserId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-analysis-projects", effectiveUserId] });
      toast({
        title: "Success!",
        description: "Project status updated.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update project status. Please try again.");
      console.error('Status update error:', error);
    },
  });
};