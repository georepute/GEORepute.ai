import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffectiveUserId } from "@/hooks/useOrganizationContext";

export interface BrandMentionAnalysis {
  id: string;
  project_id: string;
  ai_platform: string;
  query_text?: string;
  mention_found?: boolean;
  mention_position?: number;
  competitor_mentions?: string[];
  sentiment_score?: number;
  relevance_score?: number;
  analysis_date: string;
  raw_response?: any;
  mention_context?: string;
  created_at: string;
  language_code?: string;
  country_code?: string | null;
}

export interface BrandAnalysisSession {
  id: string;
  project_id: string;
  session_name?: string;
  status?: string;
  total_queries?: number;
  completed_queries?: number;
  started_at?: string;
  completed_at?: string;
  results_summary?: any;
  created_at: string;
}

// Hook to get analysis results for a project (using REAL analysis data)
export const useBrandAnalysisResults = (projectId: string, sessionId?: string) => {
  return useQuery({
    queryKey: ["brand-analysis-results", projectId, sessionId],
    queryFn: async () => {
      if (sessionId && sessionId.startsWith('temp-')) {
        // If it's a temp ID, return empty array (session not yet created in DB)
        return [];
      }

      // Fetch all results using pagination to ensure we get everything
      // Supabase PostgREST has a default limit, so we need to paginate
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000; // Supabase max per page
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("ai_platform_responses")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (sessionId && !sessionId.startsWith('temp-')) {
          // CRITICAL: Only fetch results for THIS specific session
          // This ensures we only show results from the current analysis, not old cached data
          query = query.eq("session_id", sessionId);
          console.log(`[useBrandAnalysisResults] Filtering results by session_id: ${sessionId}`);
        } else {
          console.log(`[useBrandAnalysisResults] Fetching ALL results for project (no session filter)`);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          allData.push(...data);
          hasMore = data.length === pageSize; // If we got a full page, there might be more
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`[useBrandAnalysisResults] Fetched ${allData.length} total results for project ${projectId}${sessionId ? `, session ${sessionId}` : ''} (fetched in ${page} page${page !== 1 ? 's' : ''})`);
      
      // CRITICAL: Verify all results have the correct session_id if filtering by session
      if (sessionId && !sessionId.startsWith('temp-') && allData.length > 0) {
        const incorrectSessionIds = allData.filter(item => item.session_id !== sessionId);
        if (incorrectSessionIds.length > 0) {
          console.warn(`⚠️ WARNING: Found ${incorrectSessionIds.length} results with incorrect session_id! Expected: ${sessionId}`);
          console.warn(`  Sample incorrect session_ids:`, [...new Set(incorrectSessionIds.slice(0, 5).map(item => item.session_id))]);
        } else {
          console.log(`✓ Verified: All ${allData.length} results have the correct session_id: ${sessionId}`);
        }
      }
      
      // CRITICAL FIX: Limit to 200 results per platform to match the quota
      // Group by platform and limit each platform to 200 results (most recent first)
      const MAX_RESULTS_PER_PLATFORM = 200;
      const platformGroups = new Map<string, any[]>();
      
      // Group results by platform
      allData.forEach(item => {
        const platform = item.platform || 'unknown';
        if (!platformGroups.has(platform)) {
          platformGroups.set(platform, []);
        }
        platformGroups.get(platform)!.push(item);
      });
      
      // Limit each platform to MAX_RESULTS_PER_PLATFORM (already sorted by created_at desc)
      const limitedData: any[] = [];
      platformGroups.forEach((platformResults, platform) => {
        const limited = platformResults.slice(0, MAX_RESULTS_PER_PLATFORM);
        limitedData.push(...limited);
        if (platformResults.length > MAX_RESULTS_PER_PLATFORM) {
          console.log(`[useBrandAnalysisResults] Limited ${platform} results from ${platformResults.length} to ${MAX_RESULTS_PER_PLATFORM} (most recent)`);
        }
      });
      
      // Log breakdown by platform for debugging
      if (limitedData.length > 0) {
        const platformCounts = limitedData.reduce((acc, item) => {
          const platform = item.platform || 'unknown';
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log(`[useBrandAnalysisResults] Platform breakdown (after limiting to ${MAX_RESULTS_PER_PLATFORM} per platform):`, platformCounts);
        
        // Also log unique session_ids found (should only be one if filtering by session_id)
        if (sessionId && !sessionId.startsWith('temp-')) {
          const uniqueSessionIds = [...new Set(limitedData.map(item => item.session_id))];
          if (uniqueSessionIds.length > 1) {
            console.warn(`⚠️ WARNING: Found results from multiple sessions:`, uniqueSessionIds);
          }
        }
      }

      // Transform real AI platform data to match expected interface
      return limitedData.map((item: any) => {
        const metadata = item.response_metadata || {};
        
        // Parse response content - handle both plain text and JSON structured responses
        let responseContent = item.response;
        let sources = metadata.sources || [];
        
        // Try to parse if it's a JSON string (e.g., from Perplexity)
        if (typeof item.response === 'string') {
          try {
            const parsed = JSON.parse(item.response);
            if (parsed.content) {
              // It's a structured response with content and possibly citations
              responseContent = parsed.content;
              // Merge sources from both metadata and parsed response
              if (parsed.citations && Array.isArray(parsed.citations)) {
                sources = [...sources, ...parsed.citations];
              }
            }
          } catch (e) {
            // Not JSON, use as-is
            responseContent = item.response;
          }
        }
        
        // Normalize platform name: convert 'groq' to 'grok' for consistency
        const normalizedPlatform = item.platform?.toLowerCase() === 'groq' ? 'grok' : item.platform;
        
        return {
        id: item.id,
        project_id: item.project_id,
        ai_platform: normalizedPlatform,
        query_text: item.prompt,
          mention_found: metadata.brand_mentioned || false,
          mention_position: metadata.mention_position || null,
          competitor_mentions: metadata.competitors_found || [],
          sentiment_score: metadata.sentiment_score || null,
          relevance_score: null, // Not available in current implementation
        analysis_date: item.created_at,
        raw_response: { 
          content: responseContent,
          sources: sources
        },
          mention_context: metadata.mention_context || (responseContent?.substring(0, 200) + (responseContent?.length > 200 ? '...' : '')),
          language_code: item.language_code || 'en-US',
          country_code: item.country_code || null
        };
      }) as BrandMentionAnalysis[] || [];
    },
    enabled: !!projectId,
    staleTime: 0, // Always consider data stale to allow refetching (results update as batches complete)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchInterval: (query) => {
      // Check if session is running - if so, poll more frequently to get new results as batches complete
      // Note: We use query data state to determine if we should poll, since refetchInterval must be synchronous
      if (sessionId && !sessionId.startsWith('temp-')) {
        // If we have data and it seems like a running session, poll every 5 seconds
        // The actual status check happens in the queryFn
        return 5000; // 5 seconds for active sessions
      }
      return false; // Don't poll if no session or session is temp
    },
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });
};

// Hook to get analysis sessions for a project
export const useBrandAnalysisSessions = (projectId: string) => {
  return useQuery({
    queryKey: ["brand-analysis-sessions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_analysis_sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return data as BrandAnalysisSession[];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

// Hook to trigger a new analysis manually
export const useTriggerBrandAnalysis = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      platforms, 
      keywords, 
      competitors, 
      brandName,
      customQueries,
      useAIGenerated = true
    }: {
      projectId: string;
      platforms: string[];
      keywords: string[];
      competitors: string[];
      brandName: string;
      customQueries?: Array<{query: string, language: string, country?: string}>;
      useAIGenerated?: boolean;
    }) => {
      // Calculate total queries for temp session
      const aiQueryCount = useAIGenerated ? platforms.length * 8 : 0; // Rough estimate
      const manualQueryCount = customQueries?.length || 0;
      const totalQueriesEstimate = (aiQueryCount + manualQueryCount) * platforms.length;
      
      // Immediately create a session in the local cache to show "running" state
      // IMPORTANT: First remove any existing temp sessions to prevent accumulation
      queryClient.setQueryData(
        ["brand-analysis-sessions", projectId],
        (oldData: BrandAnalysisSession[] | undefined) => {
          // Filter out any existing temp sessions first
          const cleanedData = (oldData || []).filter(s => !s.id.startsWith('temp-'));
          
          const tempSession: BrandAnalysisSession = {
            id: `temp-${Date.now()}`,
            project_id: projectId,
            session_name: `Analysis ${new Date().toLocaleString()}`,
            status: 'running',
            started_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            total_queries: totalQueriesEstimate,
            completed_queries: 0
          };
          
          return [tempSession, ...cleanedData];
        }
      );
      
      const { data, error } = await supabase.functions.invoke('brand-analysis-processor', {
        body: {
          projectId,
          platforms,
          keywords,
          competitors,
          brandName,
          customQueries,
          useAIGenerated
        }
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // CRITICAL: Before invalidating, remove temp sessions from cache to prevent ghost running states
      queryClient.setQueryData(
        ["brand-analysis-sessions", variables.projectId],
        (oldData: BrandAnalysisSession[] | undefined) => {
          if (!oldData) return oldData;
          // Filter out temp sessions - the invalidate will fetch real sessions from DB
          return oldData.filter(s => !s.id.startsWith('temp-'));
        }
      );
      
      // Now invalidate to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["brand-analysis-results", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["brand-analysis-sessions", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["brand-analysis-projects"] });
      // Also refresh the single-project query used by ProjectDashboard (fixes Visibility Score staying at 0%)
      queryClient.invalidateQueries({ queryKey: ["brand-analysis-project", variables.projectId] });
      
      if (data.message && data.message.includes('background')) {
        toast({
          title: "Analysis Started!",
          description: `Processing ${data.total_queries} queries across ${data.platforms_analyzed.length} platforms in background. Check back in a few minutes.`,
          duration: 8000,
        });
      } else {
        toast({
          title: "Analysis Started!",
          description: "Brand visibility analysis is running. Results will appear shortly.",
        });
      }
    },
    onError: (error, variables) => {
      // CRITICAL: On error, also clean up temp sessions to prevent stuck "running" states
      queryClient.setQueryData(
        ["brand-analysis-sessions", variables.projectId],
        (oldData: BrandAnalysisSession[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(s => !s.id.startsWith('temp-'));
        }
      );
      
      toast({
        title: "Analysis Failed",
        description: "Failed to start brand visibility analysis. Please try again.",
        variant: "destructive",
      });
      console.error('Analysis trigger error:', error);
    },
  });
};

// Hook to get analysis stats for dashboard
export const useBrandAnalysisStats = (projectIds: string[]) => {
  return useQuery({
    queryKey: ["brand-analysis-stats", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) {
        return {
          totalMentions: 0,
          avgSentiment: 0,
          avgVisibility: 0,
          topPlatforms: [],
          recentTrend: 0
        };
      }

      // Find latest sessions per project (completed or running preferred)
      const { data: sessionsData } = await supabase
        .from('brand_analysis_sessions')
        .select('id, project_id, status, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      const latestByProject = new Map<string, any>();
      (sessionsData || []).forEach((s) => {
        if (!latestByProject.has(s.project_id)) {
          latestByProject.set(s.project_id, s);
        }
      });
      // Prefer completed/running if exists
      projectIds.forEach(pid => {
        const candidates = (sessionsData || []).filter(s => s.project_id === pid);
        const preferred = candidates.find(s => s.status === 'completed' || s.status === 'running') || candidates[0];
        if (preferred) latestByProject.set(pid, preferred);
      });

      const sessionIds = Array.from(latestByProject.values())
        .map((s: any) => s.id)
        .filter(Boolean)
        .filter((id: string) => !id.startsWith('temp-')); // Filter out temp session IDs

      let responseQuery = supabase
        .from("ai_platform_responses")
        .select("id, project_id, platform, response_metadata, created_at, session_id")
        .in("project_id", projectIds);

      if (sessionIds.length > 0) {
        responseQuery = responseQuery.in('session_id', sessionIds);
      }

      const { data: responseData, error } = await responseQuery;

      if (error || !responseData || responseData.length === 0) {
        return {
          totalMentions: 0,
          avgSentiment: 0,
          avgVisibility: 0,
          topPlatforms: [],
          recentTrend: 0
        };
      }

      // Total mentions (brand_mentioned true)
      const mentionsArray = responseData.filter(item => (item.response_metadata as any)?.brand_mentioned === true);
      const totalMentions = mentionsArray.length;

      // Average sentiment only for mentioned responses (to match internal)
      const sentimentValues = mentionsArray
        .map(item => (item.response_metadata as any)?.sentiment_score)
        .filter(score => score !== null && score !== undefined && !isNaN(score));
      const avgSentiment = sentimentValues.length
        ? Math.round((sentimentValues.reduce((acc: number, s: number) => acc + s, 0) / sentimentValues.length) * 100)
        : 0;

      // Average visibility (mention rate % across all responses)
      const totalResponses = responseData.length;
      const avgVisibility = totalResponses > 0 ? Math.round((totalMentions / totalResponses) * 100) : 0;

      // Top platforms by response volume (normalize grok/groq)
      const platformCounts = responseData.reduce((acc, row) => {
        if (row.platform) {
          // Normalize: convert 'groq' to 'grok' for consistency
          const normalizedPlatform = row.platform.toLowerCase() === 'groq' ? 'grok' : row.platform;
          (acc as any)[normalizedPlatform] = ((acc as any)[normalizedPlatform] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      const topPlatforms = Object.entries(platformCounts).sort(([, a], [, b]) => (b as number) - (a as number));

      // Recent trend based on last 7 days vs previous 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const recentData = responseData.filter(item => new Date(item.created_at) >= weekAgo);
      const previousData = responseData.filter(item => {
        const date = new Date(item.created_at);
        return date >= twoWeeksAgo && date < weekAgo;
      });

      const recentCount = recentData.length;
      const previousCount = previousData.length;
      const recentTrend = previousCount > 0
        ? Math.round(((recentCount - previousCount) / previousCount) * 100)
        : recentCount > 0 ? 100 : 0;

      return {
        totalMentions,
        avgSentiment,
        avgVisibility,
        topPlatforms,
        recentTrend,
      };
    },
    enabled: projectIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// Hook to get comparison data between two sessions
export const useSessionComparisonData = (
  projectId: string,
  sessionIdA: string | null,
  sessionIdB: string | null
) => {
  return useQuery({
    queryKey: ["session-comparison", projectId, sessionIdA, sessionIdB],
    queryFn: async () => {
      if (!sessionIdA || !sessionIdB) return null;

      // Fetch responses for both sessions in parallel
      const [responseA, responseB] = await Promise.all([
        supabase
          .from("ai_platform_responses")
          .select("*")
          .eq("project_id", projectId)
          .eq("session_id", sessionIdA),
        supabase
          .from("ai_platform_responses")
          .select("*")
          .eq("project_id", projectId)
          .eq("session_id", sessionIdB)
      ]);

      if (responseA.error || responseB.error) {
        throw new Error("Failed to fetch session data");
      }

      const dataA = responseA.data || [];
      const dataB = responseB.data || [];

      // Calculate metrics for session A
      const processSessionData = (data: any[]) => {
        const mentions = data.filter(r => (r.response_metadata as any)?.brand_mentioned === true).length;
        const total = data.length;
        const visibility = total > 0 ? (mentions / total) * 100 : 0;
        
        const sentimentValues = data
          .filter(r => (r.response_metadata as any)?.brand_mentioned)
          .map(r => (r.response_metadata as any)?.sentiment_score)
          .filter(s => s !== null && s !== undefined && !isNaN(s));
        const sentiment = sentimentValues.length > 0
          ? (sentimentValues.reduce((a: number, b: number) => a + b, 0) / sentimentValues.length) * 100
          : 0;

        // Platform breakdown (normalize grok/groq)
        const platforms: Record<string, { mentions: number; total: number; mentionRate: number }> = {};
        data.forEach(r => {
          // Normalize: convert 'groq' to 'grok' for consistency
          let platform = r.platform || 'unknown';
          if (platform.toLowerCase() === 'groq') platform = 'grok';
          
          if (!platforms[platform]) {
            platforms[platform] = { mentions: 0, total: 0, mentionRate: 0 };
          }
          platforms[platform].total++;
          if ((r.response_metadata as any)?.brand_mentioned) {
            platforms[platform].mentions++;
          }
        });
        Object.keys(platforms).forEach(p => {
          platforms[p].mentionRate = platforms[p].total > 0 
            ? platforms[p].mentions / platforms[p].total 
            : 0;
        });

        // Competitor mentions
        const competitors: Record<string, number> = {};
        data.forEach(r => {
          const comps = (r.response_metadata as any)?.competitors_found || [];
          comps.forEach((c: string) => {
            if (c) {
              competitors[c] = (competitors[c] || 0) + 1;
            }
          });
        });

        // Extract sources
        const sources: string[] = [];
        data.forEach(r => {
          const metadata = r.response_metadata as any;
          if (metadata?.sources) {
            metadata.sources.forEach((s: any) => {
              const url = typeof s === 'string' ? s : s?.url;
              if (url && !sources.includes(url)) {
                sources.push(url);
              }
            });
          }
        });

        return {
          mentions,
          totalQueries: total,
          visibility,
          sentiment,
          platforms,
          competitors,
          sources
        };
      };

      const sessionAData = processSessionData(dataA);
      const sessionBData = processSessionData(dataB);

      return {
        sessionA: {
          id: sessionIdA,
          date: '',
          ...sessionAData
        },
        sessionB: {
          id: sessionIdB,
          date: '',
          ...sessionBData
        },
        deltas: {
          visibility: sessionAData.visibility - sessionBData.visibility,
          mentions: sessionAData.mentions - sessionBData.mentions,
          sentiment: sessionAData.sentiment - sessionBData.sentiment,
          totalQueries: sessionAData.totalQueries - sessionBData.totalQueries
        }
      };
    },
    enabled: !!projectId && !!sessionIdA && !!sessionIdB,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};