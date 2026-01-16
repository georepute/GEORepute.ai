import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  Activity,
  Globe,
  Users,
  Hash,
  PlayCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  Settings,
  Download,
  ChevronDown,
  AlertTriangle,
  Eye,
  MessageSquare,
  X,
  History
} from "lucide-react";
import { AnalysisHistoryTab } from "@/components/brand-analysis/AnalysisHistoryTab";
import { SessionSelector } from "@/components/brand-analysis/SessionSelector";
import { SessionComparisonView } from "@/components/brand-analysis/SessionComparisonView";
import { useBrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisResults, useBrandAnalysisSessions, useTriggerBrandAnalysis, useSessionComparisonData } from "@/hooks/useBrandAnalysisResults";
import { usePromptSessions } from "@/hooks/usePromptTestResults";
import { PromptResultsTable } from "@/components/brand-analysis/PromptResultsTable";
import { CompetitiveMatrix } from "@/components/brand-analysis/CompetitiveMatrix";
import { PlatformPerformanceMatrix } from "@/components/brand-analysis/PlatformPerformanceMatrix";
import { MatrixActionCenter } from "@/components/brand-analysis/MatrixActionCenter";
import { BusinessIntelligenceDashboard } from "@/components/brand-analysis/BusinessIntelligenceDashboard";
import { CompetitorAnalysis } from "@/components/brand-analysis/CompetitorRanking";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Legend } from 'recharts';
import { useToast } from "@/components/ui/use-toast";
import { ProjectConfigDialog } from "@/components/brand-analysis/ProjectConfigDialog";
import { getBrandingContext } from "@/lib/services/exports/branding-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FreddieAvatar } from "@/components/dashboard/askfreddie/FreddieAvatar";
import React from "react";
import { MarkdownFormatter } from "@/components/brand-analysis/MarkdownFormatter";
import { BrandAnalysisAskFreddieTab } from "@/components/dashboard/brand-analysis/ask-freddie/BrandAnalysisAskFreddieTab";
import { useBrandAnalysisContext } from "@/hooks/useBrandAnalysisContext";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteMetadata } from "@/hooks/useWebsiteMetadata";
import { PlatformLogo } from "@/components/brand-analysis/PlatformLogo";
import { useBrandSummary } from "@/hooks/useBrandSummary";
import { BrandSummaryHeader } from "@/components/brand-analysis/BrandSummaryHeader";
import { SourcesTable } from "@/components/brand-analysis/SourcesTable";
import { HowWeGatherData } from "@/components/brand-analysis/HowWeGatherData";
import { useGeoCountries } from "@/hooks/useGeoCountries";
import { VisibilityScoreExplainer } from "@/components/brand-analysis/VisibilityScoreExplainer";
// Add this interface for the source prompts modal
interface SourcePromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: {
    url: string;
    title?: string;
    citations: number;
  } | null;
  prompts: Array<{
    query: string;
    platform: string;
    date: string;
  }>;
}

// Add the SourcePromptsModal component
const SourcePromptsModal: React.FC<SourcePromptsModalProps> = ({ 
  isOpen, 
  onClose, 
  source, 
  prompts 
}) => {
  if (!isOpen || !source) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-6xl w-full max-h-[95vh] flex flex-col mx-2 sm:mx-4">
        <div className="p-3 sm:p-4 border-b flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Prompts ({prompts.length})</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3 sm:p-4 border-b">
          <h4 className="font-medium text-sm sm:text-base break-words">{source.title || "Source"}</h4>
          <a 
            href={source.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs sm:text-sm text-primary hover:underline break-all block mt-1"
          >
            {source.url}
          </a>
          <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
            {source.citations} mentions across AI responses
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            {prompts.map((prompt, idx) => (
              <div key={idx} className="border rounded-md p-3 sm:p-4">
                <div className="mb-2">
                  <MarkdownFormatter content={prompt.query} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize w-fit">{prompt.platform}</Badge>
                  <span>{prompt.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DateGroup {
  results: any[];
  totalQueries: number;
  mentionedQueries: number;
  positiveSentiment: number;
  neutralSentiment: number;
  negativeSentiment: number;
  competitorMentions: Record<string, number>;
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [viewMode, setViewMode] = useState<'mentioned' | 'unmentioned'>("mentioned");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonSessionA, setComparisonSessionA] = useState<string | null>(null);
  const [comparisonSessionB, setComparisonSessionB] = useState<string | null>(null);

  // Track cancelled session IDs to immediately stop showing them as running
  const [cancelledSessionIds, setCancelledSessionIds] = useState<Set<string>>(new Set());

  // Exclude generic/non-competitor entities from competitor detection
  const EXCLUDED_COMPETITORS = new Set<string>([
    "google","microsoft","apple","amazon","facebook","meta","youtube","bing","twitter","x","linkedin","instagram","reddit","tiktok"
  ]);

// Add these new state variables:
  const [showSourcePromptsModal, setShowSourcePromptsModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{url: string; title?: string; citations: number; platforms?: string[]} | null>(null);
  const [sourcePrompts, setSourcePrompts] = useState<Array<{query: string; platform: string; date: string}>>([]);
  const { data: project, isLoading: projectLoading } = useBrandAnalysisProject(id!);
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useBrandAnalysisSessions(id!);
  // Filter out temp sessions when finding the latest session to prevent using cached placeholder data
  const latestSession = sessions.find(s => 
    !s.id.startsWith('temp-') && (s.status === 'completed' || s.status === 'running')
  ) || sessions.find(s => !s.id.startsWith('temp-')) || null;
  
  // Use selected session or fall back to latest
  // CRITICAL: Only show results for the active session to avoid showing old/cached data
  const activeSessionId = selectedSessionId || latestSession?.id;
  const { data: analysisResults = [], isLoading: resultsLoading, refetch: refetchResults } = useBrandAnalysisResults(id!, activeSessionId);
  
  // Log which session we're viewing results for
  React.useEffect(() => {
    if (activeSessionId) {
      console.log(`[ProjectDashboard] Viewing results for session: ${activeSessionId}, Total results: ${analysisResults.length}`);
    }
  }, [activeSessionId, analysisResults.length]);
  const { data: promptSessions = [] } = usePromptSessions(id!);
  const triggerAnalysis = useTriggerBrandAnalysis();
  const { toast } = useToast();
  
  // Session comparison data
  const { data: comparisonData, isLoading: comparisonLoading } = useSessionComparisonData(
    id!,
    comparisonSessionA,
    comparisonSessionB
  );
  
  // Get session objects for comparison view
  const sessionAObject = sessions.find(s => s.id === comparisonSessionA);
  const sessionBObject = sessions.find(s => s.id === comparisonSessionB);
  
  // Handle comparison trigger
  const handleStartComparison = (sessionIdA: string, sessionIdB: string) => {
    setComparisonSessionA(sessionIdA);
    setComparisonSessionB(sessionIdB);
    setComparisonMode(true);
  };
  
  const handleCloseComparison = () => {
    setComparisonMode(false);
    setComparisonSessionA(null);
    setComparisonSessionB(null);
  };
  
  const handleSwapSessions = () => {
    const temp = comparisonSessionA;
    setComparisonSessionA(comparisonSessionB);
    setComparisonSessionB(temp);
  };
  
  // Auto-start analysis if coming from project creation (only once)
  const hasAutoStarted = React.useRef(false);
  useEffect(() => {
    const state = location.state as { autoStartAnalysis?: boolean } | null;
    if (state?.autoStartAnalysis && project && !triggerAnalysis.isPending && !hasAutoStarted.current) {
      // Mark as started to prevent re-triggering on refresh
      hasAutoStarted.current = true;
      // Clear the state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
      
      // Start the analysis
      handleRunAnalysis();
    }
  }, [project, location.state]);
  const { data: websiteMetadata, isLoading: metadataLoading, isError: metadataError, error: metadataErrorObj } = useWebsiteMetadata(project?.website_url);
  const { data: brandSummary, isLoading: brandSummaryLoading, refetch: refetchBrandSummary } = useBrandSummary({
    url: project?.website_url || null,
    brandName: project?.brand_name || null,
    industry: project?.industry || null,
    keywords: project?.target_keywords || [],
  });
  
  // Brand Analysis Context for Freddie
  const brandAnalysisContext = useBrandAnalysisContext(id!);

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-3 shadow-lg">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.dataKey || pld.name} className="flex items-center" style={{ color: pld.fill || pld.stroke }}>
              <div style={{ backgroundColor: pld.fill || pld.stroke }} className="w-3 h-3 rounded-sm mr-2" />
              <span className="text-sm">{pld.name}: <strong>{pld.value}{pld.unit || ''}</strong></span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

// Add auto-refresh logic:

  // Track if we've already handled stale session to prevent duplicate updates
  const staleSessionHandledRef = React.useRef<string | null>(null);
  
  // Auto-refresh when there's a running session and check if it's still active
  React.useEffect(() => {
    // Filter out temp sessions (they have IDs starting with 'temp-') and cancelled sessions
    const runningSession = sessions.find(session => 
      session.status === 'running' && 
      !session.id.startsWith('temp-') && 
      !cancelledSessionIds.has(session.id)
    );
    
    if (runningSession) {
      // Check if the session is actually still running (not stale)
      const sessionStartTime = new Date(runningSession.started_at || new Date()).getTime();
      const currentTime = new Date().getTime();
      const sessionDuration = currentTime - sessionStartTime;
      
      // If session has been running for more than 10 minutes with no updates, consider it stale
      const isStaleSession = sessionDuration > 10 * 60 * 1000 && 
        (!runningSession.completed_queries || runningSession.completed_queries === 0);
      
      if (isStaleSession && staleSessionHandledRef.current !== runningSession.id) {
        // Mark this session as handled to prevent duplicate updates
        staleSessionHandledRef.current = runningSession.id;
        console.log('Detected stale session, marking as failed:', runningSession.id);
        
        // Mark the session as failed if it's stale
        supabase
          .from('brand_analysis_sessions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            results_summary: {
              error: 'Session timed out with no progress',
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', runningSession.id)
          .then(() => {
            refetchSessions();
            toast({
              title: "Analysis Failed",
              description: "The analysis session timed out. Please try again.",
              variant: "destructive"
            });
          });
      } else if (!isStaleSession) {
        // Set up auto-refresh for active sessions - update every second for live updates
        const interval = setInterval(() => {
          console.log('🔄 Auto-refreshing results and sessions for running analysis...');
          refetchResults();
          refetchSessions();
        }, 1000); // Refresh every 1 second for live updates during analysis
        
        return () => clearInterval(interval);
      }
    }
  }, [sessions, refetchResults, refetchSessions, toast, cancelledSessionIds]);

  // Scroll to top when component mounts
  React.useEffect(() => {
    window.scrollTo(0, 0);
    
    // Set summary as default tab if not already set
    if (!activeTab || activeTab === '') {
      setActiveTab('summary');
    }
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
 
  // Helper function to extract sources from different response formats (hoisted)
  function extractSources(rawResponse: any): any[] {
    if (!rawResponse) return [];
    
    // Check for structured sources in various formats
    let structuredSources: any[] = [];
    
    // Check common locations where sources might be stored
    if (rawResponse.sources && Array.isArray(rawResponse.sources)) {
      structuredSources = [...structuredSources, ...rawResponse.sources];
    }
    
    if (rawResponse.metadata?.sources && Array.isArray(rawResponse.metadata.sources)) {
      structuredSources = [...structuredSources, ...rawResponse.metadata.sources];
    }
    
    if (rawResponse.citations && Array.isArray(rawResponse.citations)) {
      structuredSources = [...structuredSources, ...rawResponse.citations];
    }
    
    // If we have structured sources, normalize them
    if (structuredSources.length > 0) {
      return structuredSources.map(source => {
        // Handle different source formats
        if (typeof source === 'string') {
          return { url: source };
        } else if (source && typeof source === 'object') {
          return {
            url: source.url || source.link || source.href || '',
            title: source.title || source.name || null,
            domain: source.domain || null
          };
        }
        return source;
      }).filter(source => source && source.url);
    }
    
    // If no structured sources found, try to extract from content
    if (rawResponse.content && typeof rawResponse.content === 'string') {
      const content = rawResponse.content;
      
      // Extract URLs using regex patterns
      const urlPatterns = [
        // Standard HTTP/HTTPS URLs
        /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
        // URLs without protocol but with www
        /www\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?/gi,
        // Domain.com patterns (common domains)
        /\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:com|org|net|edu|gov|io|co|ai|tech|app)(?:\/[^\s<>"{}|\\^`[\]]*)?/gi
      ];
      
      const foundUrls = new Set<string>();
      
      for (const pattern of urlPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(url => {
            // Clean and normalize URL
            let cleanUrl = url.trim().replace(/[.,;:!?)]$/, ''); // Remove trailing punctuation
            
            // Add protocol if missing
            if (!cleanUrl.match(/^https?:\/\//)) {
              cleanUrl = 'https://' + cleanUrl;
            }
            
            try {
              const urlObj = new URL(cleanUrl);
              // Filter out common non-source domains
              const domain = urlObj.hostname.toLowerCase();
              const excludedDomains = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
              
              if (!excludedDomains.some(excluded => domain.includes(excluded))) {
                foundUrls.add(cleanUrl);
              }
            } catch (e) {
              // Invalid URL, skip
            }
          });
        }
      }
      
      // Convert to source objects
      return Array.from(foundUrls).map(url => ({ url }));
    }
    
    return [];
  }

  const handleRunAnalysis = () => {
    if (!project) return;
    
    // Check if there's already a running session (exclude temp sessions which are just cache placeholders)
    const hasRunningSession = sessions.some(session => 
      session.status === 'running' && !session.id.startsWith('temp-')
    );
    if (hasRunningSession) {
      toast({
        title: "Analysis Already Running",
        description: "Please wait for the current analysis to complete before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    // Use stored query configuration from project
    const queryMode = project.query_generation_mode || 'ai-only';
    const manualQueries = project.manual_queries || [];
    
    // Validate configuration
    if (queryMode === 'manual' && manualQueries.length === 0) {
      toast({
        title: "No Queries Configured",
        description: "Please configure manual queries in Project Configuration before running analysis.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure we always have at least one platform in the array
    const platforms = (project.active_platforms && project.active_platforms.length > 0)
      ? project.active_platforms
      : ["chatgpt", "claude", "perplexity", "gemini"]; // Default platforms if none specified
    
    // Show initial toast
    toast({
      title: "Analysis Started!",
      description: `We're getting started. This can take up to 5-7 minutes to finalize results.`,
      duration: 10000,
    });
    
    // Determine if AI-generated queries should be used
    const useAIGenerated = queryMode === 'ai-only' || queryMode === 'both';
    const customQueries = queryMode === 'manual' || queryMode === 'both' ? manualQueries : [];
    
    triggerAnalysis.mutate({
      projectId: project.id,
      platforms,
      keywords: project.target_keywords || [],
      competitors: project.competitors || [],
      brandName: project.brand_name,
      customQueries: customQueries.length > 0 ? customQueries : undefined,
      useAIGenerated
    }, {
      onSuccess: (data) => {
        // Immediately refetch sessions to show the new running session
        refetchSessions();
        
        // Show background processing message if applicable
        if (data.message && data.message.includes('background')) {
          toast({
            title: "Analysis Started",
            description: `Processing ${data.total_queries} queries across ${data.platforms_analyzed.length} platforms in background. The dashboard will update automatically.`,
            duration: 8000,
          });
        } 
        // Show platform-specific messages
        else if (data.platforms_analyzed && data.platforms_analyzed.length > 0) {
          toast({
            title: "Analysis Running",
            description: `Analysis Starting for ${data.platforms_analyzed.length} platform(s): ${data.platforms_analyzed.join(', ')}`,
            variant: "default",
          });
        }
        
        // Show warnings about failed/skipped platforms
        if (data.failed_platforms && data.failed_platforms.length > 0) {
          toast({
            title: "Some Platforms Failed",
            description: `The following platforms failed: ${data.failed_platforms.join(', ')}. Check API keys.`,
            variant: "destructive",
          });
        }
        
        if (data.skipped_platforms && data.skipped_platforms.length > 0) {
          toast({
            title: "Platforms Skipped",
            description: `The following platforms were skipped due to missing API keys: ${data.skipped_platforms.join(', ')}`,
            variant: "destructive",
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to start analysis. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDownloadReport = async (format: 'csv' | 'json') => {
    if (!project || analysisResults.length === 0) {
      toast({
        title: "No Data Available",
        description: "Please run an analysis first to generate a report",
        variant: "destructive",
      });
      return;
    }

    // Show loading toast
    toast({
      title: "Preparing Report",
      description: "Generating your report, please wait...",
    });

    try {
      const reportContent = await generateReportContent(format);
      const blob = new Blob([reportContent], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.brand_name.replace(/\s+/g, '_')}_Brand_Analysis_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      toast({
        title: "Report Downloaded",
        description: `Your brand visibility report has been downloaded in ${format.toUpperCase()} format`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error Generating Report",
        description: "An error occurred while generating your report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add the function to handle viewing prompts for a source
  const handleViewSourcePrompts = (source: {url: string; title?: string; citations: number; platforms?: string[]}) => {
    // Find all prompts that mention this source
    const promptsWithSource = analysisResults
      .filter(result => {
        // Check if the result has sources and if any of them match the current source URL
        const sources = extractSources(result.raw_response);
        return sources.some((s: any) => {
          const sourceUrl = s.url || s;
          return sourceUrl === source.url;
        });
      })
      .map(result => ({
        query: result.query_text || 'Unknown query',
        platform: result.ai_platform || 'Unknown platform',
        date: formatDateTime(result.analysis_date)
      }));

    setSelectedSource(source);
    setSourcePrompts(promptsWithSource);
    setShowSourcePromptsModal(true);
  };

  // Helper to format CSV strings safely
  const toCsvField = (data: any): string => {
    const str = String(data ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Generate the CSV content for the report
  const generateReportContent = async (format: 'csv' | 'json') => {
    if (!project || analysisResults.length === 0) return '';

    // Get branding context for agency name
    const branding = await getBrandingContext();

    // --- Executive Summary Data ---
    const visibilityScore = Math.round(mentionRate * 100);
    const topPlatform = platformPerf[0];
    const worstPlatform = platformPerf[platformPerf.length - 1];
    const topCompetitor = competitorStats.list[0];

    // --- Main Report Data Structure ---
      const reportData = {
        project: {
          name: project.brand_name,
          industry: project.industry || 'Not specified',
        website: project.website_url,
        report_generated_at: new Date().toISOString(),
        generated_by: branding.isAgencyBranded ? branding.name : 'Outranker',
      },
      executive_summary: {
        title: "Executive Summary",
        visibility_score: `${visibilityScore}%`,
        key_finding_1: `Overall brand visibility is ${visibilityScore}%, indicating a ${visibilityScore > 70 ? 'strong' : visibilityScore > 40 ? 'moderate' : 'low'} presence in AI-driven search.`,
        key_finding_2: `Sentiment is generally ${avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral'} (${Math.round(avgSentiment * 100)}%).`,
        key_finding_3: `Best performing platform is ${topPlatform.platform} with ${Math.round(topPlatform.mentionRate * 100)}% visibility.`,
        key_finding_4: topCompetitor ? `Top competitor by mentions is ${topCompetitor.name} with ${topCompetitor.mentions} mentions.` : 'No significant competitor presence detected.',
      },
      key_metrics: {
        title: "Key Metrics",
        total_queries: totalQueries,
        brand_mentions: brandMentions,
        mention_rate: `${Math.round(mentionRate * 100)}%`,
        average_sentiment: `${Math.round(avgSentiment * 100)}%`,
        share_of_voice: `${Math.round(competitorStats.brandShare * 100)}%`,
      },
      platform_performance: {
        title: "Platform Performance",
        platforms: platformPerf.map(p => ({
          platform: p.platform,
          mention_rate: `${Math.round(p.mentionRate * 100)}%`,
          mentions: p.mentions,
          total_queries: p.queries,
          average_sentiment: `${Math.round(p.avgSentiment * 100)}%`,
        }))
      },
      competitive_landscape: {
        title: "Competitive Landscape",
        competitors: competitorStats.list.map(c => ({
          competitor: c.name,
          total_mentions: c.mentions,
          share_of_voice_impact: `${Math.round((c.mentions / (totalQueries || 1)) * 100)}%`,
        }))
      },
      strategic_recommendations: {
        title: "Strategic Recommendations",
        strengths: [
          `Leverage strong performance on ${topPlatform.platform} (${Math.round(topPlatform.mentionRate * 100)}%) by creating more content tailored for this platform.`,
          avgSentiment > 0.3 ? 'Capitalize on positive sentiment by highlighting customer testimonials and positive reviews in your content.' : 'Maintain current content strategy that results in neutral to positive sentiment.',
        ],
        opportunities: [
          worstPlatform && worstPlatform.mentionRate < 0.4 ? `Improve visibility on ${worstPlatform.platform}, where mention rate is only ${Math.round(worstPlatform.mentionRate * 100)}%.` : 'Ensure consistent visibility across all platforms.',
          topCompetitor && topCompetitor.mentions > brandMentions ? `Analyze content strategies of ${topCompetitor.name} to identify opportunities for outperforming them.` : 'Continue monitoring top competitors to maintain your lead in share of voice.',
          `Address the ${analysisResults.filter(r => !r.mention_found).length} queries where your brand was not mentioned to close content gaps.`
        ],
      },
      detailed_results: analysisResults.map(r => ({
        query: r.query_text,
        platform: r.ai_platform,
        brand_mentioned: r.mention_found ? 'Yes' : 'No',
        position: r.mention_position,
        sentiment: r.sentiment_score,
        competitors_mentioned: r.competitor_mentions?.join(', ') || 'None',
      }))
    };

    if (format === 'json') {
      return JSON.stringify(reportData, null, 2);
    }

    if (format === 'csv') {
      let csv = '';
      
      // Add branding info at the top
      const isAgencyMode = typeof localStorage !== 'undefined' && localStorage.getItem('agency_mode') === 'true';
      if (reportData.project.generated_by && (!isAgencyMode || branding.isAgencyBranded)) {
        csv += `Generated by,${toCsvField(reportData.project.generated_by)}\n\n`;
      }

      // --- Summary Section ---
      csv += `"${reportData.executive_summary.title}"\n`;
      csv += `Key Finding,Details\n`;
      csv += `${toCsvField('Visibility Score')},${toCsvField(reportData.executive_summary.visibility_score)}\n`;
      csv += `${toCsvField('Overall Finding')},${toCsvField(reportData.executive_summary.key_finding_1)}\n`;
      csv += `${toCsvField('Sentiment Finding')},${toCsvField(reportData.executive_summary.key_finding_2)}\n`;
      csv += `${toCsvField('Platform Finding')},${toCsvField(reportData.executive_summary.key_finding_3)}\n`;
      csv += `${toCsvField('Competitor Finding')},${toCsvField(reportData.executive_summary.key_finding_4)}\n\n`;

      // --- Key Metrics Section ---
      csv += `"${reportData.key_metrics.title}"\n`;
      csv += `Metric,Value\n`;
      csv += `Total Queries,${reportData.key_metrics.total_queries}\n`;
      csv += `Brand Mentions,${reportData.key_metrics.brand_mentions}\n`;
      csv += `Mention Rate,${reportData.key_metrics.mention_rate}\n`;
      csv += `Average Sentiment,${reportData.key_metrics.average_sentiment}\n`;
      csv += `Share of Voice,${reportData.key_metrics.share_of_voice}\n\n`;

      // --- Platform Performance Section ---
      csv += `"${reportData.platform_performance.title}"\n`;
      csv += `Platform,Mention Rate,Mentions,Total Queries,Average Sentiment\n`;
      reportData.platform_performance.platforms.forEach(p => {
        csv += `${toCsvField(p.platform)},${toCsvField(p.mention_rate)},${p.mentions},${p.total_queries},${toCsvField(p.average_sentiment)}\n`;
      });
      csv += '\n';

      // --- Competitive Landscape Section ---
      csv += `"${reportData.competitive_landscape.title}"\n`;
      csv += `Competitor,Total Mentions,Share of Voice Impact\n`;
      reportData.competitive_landscape.competitors.forEach(c => {
        csv += `${toCsvField(c.competitor)},${c.total_mentions},${toCsvField(c.share_of_voice_impact)}\n`;
      });
      csv += '\n';

      // --- Recommendations Section ---
      csv += `"${reportData.strategic_recommendations.title}"\n`;
      csv += `Type,Recommendation\n`;
      reportData.strategic_recommendations.strengths.forEach(s => {
        csv += `Strength,${toCsvField(s)}\n`;
      });
      reportData.strategic_recommendations.opportunities.forEach(o => {
        csv += `Opportunity,${toCsvField(o)}\n`;
      });
      csv += '\n';

      // --- Detailed Results ---
      csv += `"Detailed Results"\n`;
      if (reportData.detailed_results.length > 0) {
        const headers = Object.keys(reportData.detailed_results[0]);
        csv += headers.map(h => toCsvField(h)).join(',') + '\n';
        reportData.detailed_results.forEach(row => {
          csv += headers.map(h => toCsvField(row[h as keyof typeof row])).join(',') + '\n';
        });
      }

      return csv;
    }

    return '';
  };

  // Sentiment analysis chart data
  const sentimentData = analysisResults
    .filter(r => r.sentiment_score !== null && r.mention_found)
    .map(r => ({
      date: formatDate(r.analysis_date),
      sentiment: Math.round((r.sentiment_score || 0) * 100),
      platform: r.ai_platform
    }));

  // Generate analytics chart data based on time period
  const getAnalyticsData = (period: "daily" | "weekly" | "monthly") => {
    if (!analysisResults.length) {
      return {
        visibilityTrend: [],
        sentimentTrend: [],
        competitorTrend: [],
        topCompetitors: []
      };
    }
    const sortedResults = [...analysisResults].sort(
      (a, b) => new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime()
    );

    const userDefinedCompetitors: string[] = Array.isArray(project?.competitors) ? project!.competitors : [];

    const groupedByDate = sortedResults.reduce((acc, result) => {
      let dateKey = '';
      const date = new Date(result.analysis_date);
      if (period === "daily") {
        dateKey = date.toISOString().split('T')[0];
      } else if (period === "weekly") {
        const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
        dateKey = `Week ${weekNumber}, ${date.toLocaleString('default', { month: 'short' })}`;
      } else {
        dateKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      if (!acc[dateKey]) {
        acc[dateKey] = {
          results: [],
          totalQueries: 0,
          mentionedQueries: 0,
          positiveSentiment: 0,
          neutralSentiment: 0,
          negativeSentiment: 0,
          competitorMentions: {} as Record<string, number>
        };
      }
      acc[dateKey].results.push(result);
      acc[dateKey].totalQueries++;
      if (result.mention_found) acc[dateKey].mentionedQueries++;
      if (result.sentiment_score !== null && result.sentiment_score !== undefined) {
        if (result.sentiment_score > 0.2) acc[dateKey].positiveSentiment++;
        else if (result.sentiment_score < -0.2) acc[dateKey].negativeSentiment++;
        else acc[dateKey].neutralSentiment++;
      }
      
      // --- UNIFIED COMPETITOR DETECTION LOGIC ---
      const mentionedCompetitorsInResult = new Set<string>();

      // 1. Check structured `competitor_mentions`
      if (Array.isArray(result.competitor_mentions) && result.competitor_mentions.length > 0) {
        result.competitor_mentions.forEach(comp => {
          const lowerComp = (comp || '').toLowerCase();
          if (lowerComp && !EXCLUDED_COMPETITORS.has(lowerComp) && lowerComp !== (project?.brand_name || '').toLowerCase()) {
            mentionedCompetitorsInResult.add(comp);
          }
        });
      }

      // 2. Fallback to raw content search
      if (result.raw_response?.content && typeof result.raw_response.content === 'string') {
        const content = result.raw_response.content.toLowerCase();
        const allPossibleCompetitors = [...userDefinedCompetitors, 'hubspot', 'salesforce', 'pipedrive', 'zoho', 'monday', 'asana', 'trello', 'mailchimp', 'klaviyo', 'shopify', 'wix', 'squarespace', 'wordpress'];

        allPossibleCompetitors.forEach(comp => {
          const lowerComp = comp.toLowerCase();
          if (mentionedCompetitorsInResult.has(comp)) return; // Already found, don't re-check
          if (lowerComp && !EXCLUDED_COMPETITORS.has(lowerComp) && lowerComp !== (project?.brand_name || '').toLowerCase()) {
            if (content.includes(lowerComp)) {
              mentionedCompetitorsInResult.add(comp);
            }
          }
        });
      }

      // 3. Increment counts for the date group (once per result)
      mentionedCompetitorsInResult.forEach(competitor => {
          acc[dateKey].competitorMentions[competitor] = (acc[dateKey].competitorMentions[competitor] || 0) + 1;
        });
      // --- END UNIFIED LOGIC ---
      
      return acc;
    }, {} as Record<string, DateGroup>);
    
    // Consolidate competitor counts from the now-correct grouped data
    const competitorCounts = Object.values(groupedByDate).reduce((acc: Record<string, number>, group: DateGroup) => {
      for (const competitor in group.competitorMentions) {
        acc[competitor] = (acc[competitor] || 0) + group.competitorMentions[competitor];
      }
      return acc;
    }, {});

    const topCompetitors = Object.entries(competitorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name]) => name);

    const dateKeys = Object.keys(groupedByDate).sort((a, b) => {
      if (a.includes('-') && b.includes('-')) {
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return 0;
    });
    
    const visibilityTrend = dateKeys.map(date => {
      const group = groupedByDate[date];
      const visibility = group.totalQueries > 0 
        ? Math.round((group.mentionedQueries / group.totalQueries) * 100) 
        : 0;
      return { date, visibility, queries: group.totalQueries };
    });

    const sentimentTrend = dateKeys.map(date => {
      const group = groupedByDate[date];
      const total = group.positiveSentiment + group.neutralSentiment + group.negativeSentiment;
      return {
        date,
        positive: total > 0 ? Math.round((group.positiveSentiment / total) * 100) : 0,
        neutral: total > 0 ? Math.round((group.neutralSentiment / total) * 100) : 0,
        negative: total > 0 ? Math.round((group.negativeSentiment / total) * 100) : 0
      };
    });
    
    const competitorTrend = dateKeys.map(date => {
      const group = groupedByDate[date];
      const brandVisibility = group.totalQueries > 0 
        ? Math.round((group.mentionedQueries / group.totalQueries) * 100) 
        : 0;
      const result: any = { date, brand: brandVisibility };
      topCompetitors.forEach((competitor, index) => {
        const competitorKey = `competitor${index + 1}`;
        const mentions = group.competitorMentions[competitor] || 0;
        result[competitorKey] = group.totalQueries > 0 ? Math.round((mentions / group.totalQueries) * 100) : 0;
      });
      return result;
    });
    
    // Brand mentions count over time (actual count, not percentage)
    const brandMentionsTrend = dateKeys.map(date => {
      const group = groupedByDate[date];
      return {
        date,
        mentions: group.mentionedQueries,
        totalQueries: group.totalQueries,
        mentionRate: group.totalQueries > 0 ? Math.round((group.mentionedQueries / group.totalQueries) * 100) : 0
      };
    });
    
    return { visibilityTrend, sentimentTrend, competitorTrend, topCompetitors, brandMentionsTrend };
  };
  
  // Get chart data based on selected time period
  const analyticsData = useMemo(() => {
    return getAnalyticsData(timePeriod);
  }, [analysisResults, timePeriod]);

  // --- Begin: Enhanced Analytics Calculations ---
  const totalQueries = analysisResults.length;
  const brandMentions = analysisResults.filter(r => r.mention_found).length;
  const mentionRate = totalQueries > 0 ? brandMentions / totalQueries : 0;

  const mentionedWithSentiment = analysisResults.filter(r => r.mention_found && r.sentiment_score !== null && r.sentiment_score !== undefined);
  const avgSentiment = mentionedWithSentiment.length
    ? mentionedWithSentiment.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / mentionedWithSentiment.length
    : 0;

  // Platform performance breakdown - Filter to only include active platforms
  const platformPerf = React.useMemo(() => {
    const grouped: Record<string, { platform: string; queries: number; mentions: number; mentionRate: number; avgSentiment: number; sentimentCount: number; }>
      = {};
    
    // Get the platforms that were actually used in this analysis
    const activePlatforms = project?.active_platforms && Array.isArray(project.active_platforms) 
      ? project.active_platforms 
      : [];
    
    analysisResults.forEach(r => {
      const key = r.ai_platform || 'unknown';
      
      // Only include platforms that are in the active platforms list
      if (activePlatforms.length > 0 && !activePlatforms.includes(key)) {
        return; // Skip this platform if it's not in the active list
      }
      
      if (!grouped[key]) {
        grouped[key] = { platform: key, queries: 0, mentions: 0, mentionRate: 0, avgSentiment: 0, sentimentCount: 0 };
      }
      grouped[key].queries += 1;
      if (r.mention_found) grouped[key].mentions += 1;
      if (r.mention_found && r.sentiment_score !== null && r.sentiment_score !== undefined) {
        grouped[key].avgSentiment += r.sentiment_score || 0;
        grouped[key].sentimentCount += 1;
      }
    });
    return Object.values(grouped).map(g => ({
      platform: g.platform,
      queries: g.queries,
      mentions: g.mentions,
      mentionRate: g.queries > 0 ? g.mentions / g.queries : 0,
      avgSentiment: g.sentimentCount > 0 ? g.avgSentiment / g.sentimentCount : 0,
    })).sort((a, b) => b.mentionRate - a.mentionRate);
  }, [analysisResults, project?.active_platforms]);

  // Competitor share of voice (SoV) vs brand
  const competitorStats = React.useMemo(() => {
    const userDefinedCompetitors: string[] = Array.isArray(project?.competitors) ? project!.competitors : [];
    const competitorMentionsMap: Record<string, number> = {};

    // Initialize with user-defined competitors
    userDefinedCompetitors.forEach(name => {
        const lower = name.toLowerCase();
        if (!EXCLUDED_COMPETITORS.has(lower) && lower !== (project?.brand_name || '').toLowerCase()) {
            competitorMentionsMap[lower] = 0;
        }
    });

    analysisResults.forEach(r => {
        const mentionedInThisResult = new Set<string>();

        // Check structured competitor_mentions array first
        if (Array.isArray(r.competitor_mentions) && r.competitor_mentions.length > 0) {
            r.competitor_mentions.forEach(comp => {
                const lowerComp = (comp || '').toLowerCase();
                if (!lowerComp || EXCLUDED_COMPETITORS.has(lowerComp) || lowerComp === (project?.brand_name || '').toLowerCase()) return;
                mentionedInThisResult.add(lowerComp);
            });
        }

        // Fallback to checking raw content if structured data is empty
        if (mentionedInThisResult.size === 0 && r.raw_response?.content && typeof r.raw_response.content === 'string') {
            const content = r.raw_response.content.toLowerCase();
            const allPossibleCompetitors = [...userDefinedCompetitors, 'hubspot', 'salesforce', 'pipedrive', 'zoho', 'monday', 'asana', 'trello', 'mailchimp', 'klaviyo', 'shopify', 'wix', 'squarespace', 'wordpress'];
            
            allPossibleCompetitors.forEach(comp => {
                const lowerComp = comp.toLowerCase();
                if (EXCLUDED_COMPETITORS.has(lowerComp) || lowerComp === (project?.brand_name || '').toLowerCase()) return;
                if (content.includes(lowerComp)) {
                    mentionedInThisResult.add(lowerComp);
                }
            });
        }

        // Increment counts, ensuring one count per competitor per result
        mentionedInThisResult.forEach(competitorName => {
            competitorMentionsMap[competitorName] = (competitorMentionsMap[competitorName] || 0) + 1;
        });
    });

    const allCompetitors = Object.entries(competitorMentionsMap)
        .map(([name, mentions]) => ({ name, mentions }))
        .sort((a, b) => b.mentions - a.mentions);

    const totalCompetitorMentions = allCompetitors.reduce((sum, comp) => sum + comp.mentions, 0);
    const totalPool = brandMentions + totalCompetitorMentions;

    return {
        list: allCompetitors,
        brandShare: totalPool > 0 ? brandMentions / totalPool : 0,
        competitorsShare: totalPool > 0 ? totalCompetitorMentions / totalPool : 0,
        totalCompetitorMentions,
    };
}, [analysisResults, brandMentions, project?.competitors, project?.brand_name]);

  // Cross-platform consistency: for each query, fraction of platforms that mentioned the brand
  const crossPlatformConsistency = React.useMemo(() => {
    const byQuery: Record<string, { platforms: Set<string>; mentioningPlatforms: Set<string> }>
      = {};
    analysisResults.forEach(r => {
      const q = r.query_text || '';
      const p = r.ai_platform || 'unknown';
      if (!byQuery[q]) {
        byQuery[q] = { platforms: new Set<string>(), mentioningPlatforms: new Set<string>() };
      }
      byQuery[q].platforms.add(p);
      if (r.mention_found) byQuery[q].mentioningPlatforms.add(p);
    });
    const perQuery = Object.entries(byQuery).map(([query, data]) => {
      const denom = data.platforms.size || 1;
      const score = data.mentioningPlatforms.size / denom; // 1.0 = all platforms agree brand was mentioned
      return { query, platforms: data.platforms.size, mentioning: data.mentioningPlatforms.size, score };
    });
    const avgConsistency = perQuery.length
      ? perQuery.reduce((s, x) => s + x.score, 0) / perQuery.length
      : 0;
    const mostConsistent = perQuery
      .filter(x => x.score === 1 && x.platforms > 1)
      .slice(0, 5);
    const leastConsistent = perQuery
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
    return { avgConsistency, perQuery, mostConsistent, leastConsistent };
  }, [analysisResults]);

  // Rule-based insights (data-driven, no assumptions beyond the dataset)
  const insights: string[] = React.useMemo(() => {
    const list: string[] = [];
    if (totalQueries === 0) return ["No analysis results yet. Run an analysis to generate insights."];

    // Overall visibility
    list.push(
      `Your brand was mentioned in ${brandMentions} out of ${totalQueries} prompts (${Math.round(mentionRate*100)}%). ` +
      `This is calculated as brand mentions divided by total prompts.`
    );

    // Platform highlights
    const lowPlatforms = platformPerf.filter(p => p.mentionRate < Math.max(0.2, mentionRate * 0.8));
    if (lowPlatforms.length > 0) {
      const names = lowPlatforms.map(p => `${p.platform} (${Math.round(p.mentionRate*100)}%)`).join(', ');
      list.push(`Lower visibility on: ${names}. Logic: we flag platforms below 20% mention rate or 20% below your overall rate.`);
    }
    const topPlatforms = platformPerf.slice(0, 2).map(p => `${p.platform} (${Math.round(p.mentionRate*100)}%)`).join(', ');
    if (topPlatforms) list.push(`Strongest visibility by platform: ${topPlatforms}.`);

    // Sentiment
    list.push(
      `Average sentiment when you were mentioned is ${Math.round(avgSentiment*100)}% on a -100% to +100% scale. ` +
      `We average the sentiment scores only where your brand was mentioned.`
    );

    // Share of Voice
    if (project?.competitors && project.competitors.length > 0) {
      const topComp = competitorStats.list[0];
      const brandSharePct = Math.round(competitorStats.brandShare * 100);
      const compSharePct = Math.round(competitorStats.competitorsShare * 100);
      list.push(`Share of voice: Brand ${brandSharePct}% vs competitors ${compSharePct}% (sum of competitor mentions).`);
      if (topComp && topComp.mentions > brandMentions) {
        list.push(`Competitor leading by mentions: ${topComp.name} with ${topComp.mentions} mentions vs your ${brandMentions}.`);
      }
    }

    // Consistency
    list.push(
      `Cross-platform consistency score is ${Math.round(crossPlatformConsistency.avgConsistency*100)}% (higher is better). Calculation: For each query, we divide platforms that mentioned the brand by platforms that answered the query, then average across queries.`
    );

    return list;
  }, [totalQueries, brandMentions, mentionRate, platformPerf, avgSentiment, project?.competitors, competitorStats, crossPlatformConsistency]);
  // --- End: Enhanced Analytics Calculations ---

  // --- Begin: Language and Country Analytics ---
  // Language-wise analytics
  const languageAnalytics = React.useMemo(() => {
    const grouped: Record<string, { 
      language: string; 
      queries: number; 
      mentions: number; 
      mentionRate: number; 
      avgSentiment: number; 
      sentimentCount: number; 
      competitorCounts: Record<string, number>; // Track individual competitors
    }> = {};
    
    analysisResults.forEach(r => {
      const langCode = r.language_code || 'en-US';
      if (!grouped[langCode]) {
        grouped[langCode] = { 
          language: langCode, 
          queries: 0, 
          mentions: 0, 
          mentionRate: 0, 
          avgSentiment: 0, 
          sentimentCount: 0, 
          competitorCounts: {} 
        };
      }
      grouped[langCode].queries += 1;
      if (r.mention_found) grouped[langCode].mentions += 1;
      if (r.mention_found && r.sentiment_score !== null && r.sentiment_score !== undefined) {
        grouped[langCode].avgSentiment += r.sentiment_score || 0;
        grouped[langCode].sentimentCount += 1;
      }
      // Track individual competitor mentions
      if (r.competitor_mentions && Array.isArray(r.competitor_mentions)) {
        r.competitor_mentions.forEach(comp => {
          const compName = comp?.toLowerCase() || '';
          if (compName && compName !== (project?.brand_name || '').toLowerCase()) {
            grouped[langCode].competitorCounts[compName] = (grouped[langCode].competitorCounts[compName] || 0) + 1;
          }
        });
      }
    });
    
    return Object.values(grouped).map(g => {
      // Find top competitor for this language
      const topCompetitor = Object.entries(g.competitorCounts)
        .sort(([, a], [, b]) => b - a)[0];
      const topCompetitorMentions = topCompetitor ? topCompetitor[1] : 0;
      const topCompetitorName = topCompetitor ? topCompetitor[0] : null;
      const topCompetitorRate = g.queries > 0 ? topCompetitorMentions / g.queries : 0;
      
      return {
        language: g.language,
        queries: g.queries,
        mentions: g.mentions,
        mentionRate: g.queries > 0 ? g.mentions / g.queries : 0,
        avgSentiment: g.sentimentCount > 0 ? g.avgSentiment / g.sentimentCount : 0,
        topCompetitorName,
        topCompetitorMentions,
        topCompetitorRate
      };
    }).sort((a, b) => b.mentionRate - a.mentionRate);
  }, [analysisResults, project?.brand_name]);

  // Country-wise analytics
  const countryAnalytics = React.useMemo(() => {
    const grouped: Record<string, { 
      country: string; 
      queries: number; 
      mentions: number; 
      mentionRate: number; 
      avgSentiment: number; 
      sentimentCount: number; 
      competitorCounts: Record<string, number>; // Track individual competitors
    }> = {};
    
    analysisResults.forEach(r => {
      const countryCode = r.country_code || 'general';
      if (!grouped[countryCode]) {
        grouped[countryCode] = { 
          country: countryCode, 
          queries: 0, 
          mentions: 0, 
          mentionRate: 0, 
          avgSentiment: 0, 
          sentimentCount: 0, 
          competitorCounts: {} 
        };
      }
      grouped[countryCode].queries += 1;
      if (r.mention_found) grouped[countryCode].mentions += 1;
      if (r.mention_found && r.sentiment_score !== null && r.sentiment_score !== undefined) {
        grouped[countryCode].avgSentiment += r.sentiment_score || 0;
        grouped[countryCode].sentimentCount += 1;
      }
      // Track individual competitor mentions
      if (r.competitor_mentions && Array.isArray(r.competitor_mentions)) {
        r.competitor_mentions.forEach(comp => {
          const compName = comp?.toLowerCase() || '';
          if (compName && compName !== (project?.brand_name || '').toLowerCase()) {
            grouped[countryCode].competitorCounts[compName] = (grouped[countryCode].competitorCounts[compName] || 0) + 1;
          }
        });
      }
    });
    
    return Object.values(grouped).map(g => {
      // Find top competitor for this country
      const topCompetitor = Object.entries(g.competitorCounts)
        .sort(([, a], [, b]) => b - a)[0];
      const topCompetitorMentions = topCompetitor ? topCompetitor[1] : 0;
      const topCompetitorName = topCompetitor ? topCompetitor[0] : null;
      const topCompetitorRate = g.queries > 0 ? topCompetitorMentions / g.queries : 0;
      
      return {
        country: g.country,
        queries: g.queries,
        mentions: g.mentions,
        mentionRate: g.queries > 0 ? g.mentions / g.queries : 0,
        avgSentiment: g.sentimentCount > 0 ? g.avgSentiment / g.sentimentCount : 0,
        topCompetitorName,
        topCompetitorMentions,
        topCompetitorRate
      };
    }).sort((a, b) => b.mentionRate - a.mentionRate);
  }, [analysisResults, project?.brand_name]);

  // Language-Country combination analytics
  const languageCountryAnalytics = React.useMemo(() => {
    const grouped: Record<string, { language: string; country: string; queries: number; mentions: number; mentionRate: number; competitorMentions: number }> = {};
    
    analysisResults.forEach(r => {
      const langCode = r.language_code || 'en-US';
      const countryCode = r.country_code || 'general';
      const key = `${langCode}-${countryCode}`;
      
      if (!grouped[key]) {
        grouped[key] = { language: langCode, country: countryCode, queries: 0, mentions: 0, mentionRate: 0, competitorMentions: 0 };
      }
      grouped[key].queries += 1;
      if (r.mention_found) grouped[key].mentions += 1;
      if (r.competitor_mentions && Array.isArray(r.competitor_mentions)) {
        grouped[key].competitorMentions += r.competitor_mentions.length;
      }
    });
    
    return Object.values(grouped).map(g => ({
      language: g.language,
      country: g.country,
      queries: g.queries,
      mentions: g.mentions,
      mentionRate: g.queries > 0 ? g.mentions / g.queries : 0,
      competitorMentions: g.competitorMentions,
      competitorIntensity: g.queries > 0 ? g.competitorMentions / g.queries : 0
    })).sort((a, b) => b.mentionRate - a.mentionRate);
  }, [analysisResults]);
  // --- End: Language and Country Analytics ---

  if (projectLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-4">The brand visibility project you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/dashboard/brand-analysis">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Current running session - show progress bar immediately when analysis starts
  // IMPORTANT: Exclude temp sessions (IDs starting with 'temp-') to prevent ghost running states
  // Also check for 'preparing' status for the initial phase
  const runningSession = sessions.find(s => {
    // Accept 'running' or 'preparing' status
    if (s.status !== 'running' && s.status !== 'preparing') return false;
    // Skip temp sessions that exist only in React Query cache
    if (s.id.startsWith('temp-')) return false;
    // Skip sessions that have been cancelled locally (before DB refetch)
    if (cancelledSessionIds.has(s.id)) return false;
    // Show progress bar even when total_queries is 0 (still initializing)
    // This ensures the progress bar appears immediately when user clicks "Run Analysis"
    return true;
  });
  
  // Calculate progress for running session
  // Show 0% if no queries completed yet (preparing phase)
  const sessionProgress = runningSession 
    ? runningSession.total_queries && runningSession.total_queries > 0
      ? (runningSession.completed_queries || 0) / runningSession.total_queries * 100
      : 0 // Show 0% when preparing (total_queries not set yet)
    : 0;
  
  // Determine if we're in the preparing phase (no queries started yet)
  const isPreparingAnalysis = runningSession && 
    (!runningSession.total_queries || runningSession.total_queries <= 0 || 
     !runningSession.completed_queries || runningSession.completed_queries <= 0);

  // Prepare chart data
  const mentionsByPlatform = analysisResults.reduce((acc, result) => {
    const platform = result.ai_platform;
    if (!acc[platform]) acc[platform] = 0;
    if (result.mention_found) acc[platform]++;
    return acc;
  }, {} as Record<string, number>);

  const platformChartData = Object.entries(mentionsByPlatform).map(([platform, mentions]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    mentions
    }));

  const platformMentionRateData = platformPerf.map(p => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    "Mention Rate": Math.round(p.mentionRate * 100),
    // For tooltip context
    mentions: p.mentions,
    queries: p.queries,
    }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    } else {
      return `${Math.floor(seconds / 86400)}d ago`;
    }
  };

  // --- Chart Colors ---
  const COLORS = {
    brand: '#6366F1', // Indigo
    competitor1: '#A78BFA', // Violet
    competitor2: '#FBBF24', // Amber
    competitor3: '#F87171', // Red
    positive: '#34D399', // Emerald
    neutral: '#A8A29E', // Stone
    negative: '#F87171', // Red
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-full overflow-x-hidden space-y-3 md:space-y-4 px-3 md:px-6 py-3 md:py-4">
        {/* Header with Back Button and Brand Info */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border overflow-hidden">
          <div className="border-b px-3 md:px-6 py-3 flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="gap-1 text-muted-foreground hover:text-foreground p-1 md:p-2"
            >
              <Link to="/dashboard/brand-analysis" className="flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">Back to Projects</span>
              </Link>
            </Button>
            </div>
          
          <div className="p-3 md:p-6 flex flex-col lg:flex-row gap-3 md:gap-6">
            {/* Left column: Brand info */}
            <div className="flex-1 min-w-0">
              <BrandSummaryHeader 
                project={project}
                websiteMetadata={websiteMetadata}
                summary={brandSummary}
                loading={brandSummaryLoading || metadataLoading}
              />
            </div>

            {/* Right column: Key metrics and actions */}
            <div className="lg:w-[280px] flex-shrink-0 flex flex-col gap-3 md:gap-4">
              {/* Visibility Score - Match EXACT calculation from Results section */}
              {(() => {
                // CRITICAL: Use the EXACT same calculation logic as Results section
                // Results section shows: "Showing 70 of 1120 results (mentioned)"
                // We need to count unique prompts the same way to match that display
                
                // Count ALL unique prompts from analysisResults (this matches "1120 results" concept but as unique prompts)
                // This ensures we match what's shown in the Results section
                const allUniquePromptsSet = new Set<string>();
                const mentionedPromptsSet = new Set<string>();
                let mentionedResponses = 0;

                // Process ALL results - same logic as Results section
                for (const r of analysisResults) {
                  const q = (r.query_text || '').trim();
                  if (q) {
                    // Add to total unique prompts set (every unique query text)
                    allUniquePromptsSet.add(q);
                    
                    // If this response has mention_found === true, mark prompt as mentioned
                    // This matches the Results section logic where filtering by 'mentioned' shows these prompts
                    if (r.mention_found) {
                      mentionedPromptsSet.add(q);
                      mentionedResponses += 1;
                    }
                  }
                }

                // Use the EXACT same counts as Results section
                // Results section shows: "Showing 70 of 1120 results (mentioned)"
                const responsesTotal = analysisResults.length; // Total results (matches "1120" in Results)
                const responsesMentioned = mentionedResponses; // Mentioned results (matches "70" in Results)
                
                // Also calculate prompt-level metrics for the score calculation
                const promptsTotal = allUniquePromptsSet.size; // Total unique prompts
                const promptsMentioned = mentionedPromptsSet.size; // Mentioned unique prompts

                // Visibility Score = (Mentioned Results / Total Results) × 100
                // This matches the Results section display format
                const score = responsesTotal > 0
                  ? Math.round((responsesMentioned / responsesTotal) * 100)
                  : 0;
                
                console.log(`[Visibility Score] Displaying ${responsesMentioned} of ${responsesTotal} results (mentioned) = ${score}% (${promptsMentioned} mentioned prompts out of ${promptsTotal} total unique prompts)`);

                const radius = 45;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (score / 100) * circumference;

                return (
                  <div className="relative bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 border">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <h3 className="font-medium text-xs md:text-sm flex items-center gap-1">
                        Visibility Score
                        <VisibilityScoreExplainer
                          score={score}
                          promptsMentioned={promptsMentioned}
                          promptsTotal={promptsTotal}
                          responsesMentioned={responsesMentioned}
                          responsesTotal={responsesTotal}
                        />
                      </h3>
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Eye className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="relative w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16">
                        <svg className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 transform -rotate-90" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="visibilityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#a78bfa" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="10"
                            className="dark:stroke-gray-700"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="url(#visibilityGradient)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-base sm:text-lg font-bold">{score}%</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground break-words">
                          Your brand appears in{' '}
                          <span className="font-medium">
                            {responsesMentioned} of {responsesTotal}
                          </span>{' '}
                          prompts
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowConfigDialog(true)}
                  className="w-full justify-start text-xs sm:text-sm"
                >
                  <Settings className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Configure Project</span>
                </Button>
                <Button 
                  onClick={handleRunAnalysis}
                  disabled={triggerAnalysis.isPending || !!runningSession || sessionsLoading}
                  className="bg-primary hover:bg-primary/90 w-full justify-start text-xs sm:text-sm"
                  size="sm"
                >
                  {triggerAnalysis.isPending || sessionsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                      <span className="truncate">
                        {sessionsLoading ? 'Loading...' : 'Analysis Running...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Run Analysis</span>
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs sm:text-sm">
                      <Download className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Export Report</span>
                      <ChevronDown className="w-4 h-4 ml-auto flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem onClick={() => handleDownloadReport('csv')}>
                      Download as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadReport('json')}>
                      Download as JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Running Session Progress - Shows immediately when analysis starts */}
              {runningSession && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                        {isPreparingAnalysis ? 'Preparing Analysis...' : 'Analysis Running'}
                      </span>
                    </div>
                    {!isPreparingAnalysis && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2">
                        {Math.round(sessionProgress)}%
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: isPreparingAnalysis ? '5%' : `${sessionProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-blue-600 dark:text-blue-400 mt-1 gap-2">
                    <span className="truncate font-medium">
                      {isPreparingAnalysis 
                        ? 'Generating queries and connecting to AI platforms...'
                        : `${runningSession.completed_queries || 0} / ${runningSession.total_queries || 0} queries completed`
                      }
                    </span>
                    {!isPreparingAnalysis && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(sessionProgress)}%
                      </span>
                    )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                        onClick={async () => {
                          if (!runningSession) return;
                          
                          const sessionIdToCancel = runningSession.id;
                          
                          try {
                            console.log('Cancelling session:', sessionIdToCancel);
                            
                            // CRITICAL: Immediately mark this session as cancelled locally
                            // This stops the auto-refresh interval and hides the running box
                            setCancelledSessionIds(prev => new Set([...prev, sessionIdToCancel]));
                            
                            // Show cancellation in progress
                            toast({
                              title: "Cancelling...",
                              description: "Stopping the analysis process.",
                            });
                            
                            // Update the session status in database
                            const { error } = await supabase
                              .from('brand_analysis_sessions')
                              .update({
                                status: 'cancelled',
                                completed_at: new Date().toISOString(),
                                results_summary: {
                                  ...(runningSession.results_summary || {}),
                                  cancelled_at: new Date().toISOString(),
                                  cancelled_by_user: true
                                }
                              })
                              .eq('id', sessionIdToCancel);
                              
                            if (error) {
                              console.error('Error cancelling session:', error);
                              // Remove from cancelled set if DB update failed
                              setCancelledSessionIds(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(sessionIdToCancel);
                                return newSet;
                              });
                              toast({
                                title: "Cancellation Failed",
                                description: `Error: ${error.message}`,
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Refetch to get fresh data from the database
                            await Promise.all([
                              refetchSessions(),
                              refetchResults()
                            ]);
                            
                            toast({
                              title: "Analysis Cancelled",
                              description: "The analysis has been cancelled successfully.",
                            });
                          } catch (err) {
                            console.error('Error in cancel handler:', err);
                            // Remove from cancelled set on error
                            setCancelledSessionIds(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(sessionIdToCancel);
                              return newSet;
                            });
                            toast({
                              title: "Cancellation Error",
                              description: "An unexpected error occurred while cancelling.",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
              )}
                  </div>
                  </div>
                </div>

        {sessionsLoading && (
          <div className="text-center p-6 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin inline-block mr-2" />
            Loading analysis history...
            </div>
        )}

        {/* Key Metrics Dashboard - Redesigned */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {/* AI Platforms Card */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-3 md:p-4 lg:p-6">
              <div>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">AI Platforms</p>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-purple-600">
                    {project.active_platforms?.length || 0}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(project.active_platforms || []).map(p => {
                    const displayName = (p?.toLowerCase() === 'groq' || p?.toLowerCase() === 'grok') ? 'Grok' : p;
                    return (
                      <div key={p} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 min-w-0">
                        <PlatformLogo platform={p} size={16} />
                        <span className="text-xs font-medium capitalize truncate">{displayName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Mentions */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Mentions</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {analysisResults.filter(r => r.mention_found).length}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Across {[...new Set(analysisResults.map(r => r.ai_platform))].length} platforms
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                  <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Sentiment */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {analysisResults.filter(r => r.mention_found && r.sentiment_score).length > 0
                      ? Math.round((analysisResults.filter(r => r.mention_found && r.sentiment_score)
                          .reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / 
                          analysisResults.filter(r => r.mention_found && r.sentiment_score).length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Based on {analysisResults.filter(r => r.mention_found && r.sentiment_score).length} mentions
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitor Mentions */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Competitor Mentions</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                    {competitorStats.totalCompetitorMentions || 0}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {competitorStats.list.length > 0 ? `Top: ${competitorStats.list[0]?.name || 'None'}` : 'No competitors found'}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tab Navigation */}
        <Card className="shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-2 px-2 sm:px-0">
              <div className="flex flex-wrap gap-1 sm:gap-2">
              {[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'overview', label: 'Results', icon: BarChart3 },
                { id: 'competitors', label: 'Competitors', icon: Target },
                { id: 'sources', label: 'Sources', icon: Globe },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                { id: 'history', label: 'History', icon: History },
                { id: 'suggestions', label: 'Ask Freddie', icon: null },
                { id: 'platform-matrix', label: 'Matrix', icon: Activity }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  {tab.id === 'suggestions' ? (
                    <FreddieAvatar size="sm" className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    tab.icon && <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.id === 'overview' ? 'Results' : 
                     tab.id === 'platform-matrix' ? 'Matrix' :
                     tab.id === 'suggestions' ? 'Freddie' :
                     tab.label}
                  </span>
                </button>
              ))}
              </div>
              
              {/* Session Selector - show on relevant tabs */}
              {['summary', 'overview', 'competitors', 'sources', 'analytics'].includes(activeTab) && (
                <div className="py-2 pr-2 sm:pr-4">
                  <SessionSelector
                    sessions={sessions}
                    selectedSessionId={selectedSessionId}
                    onSelectSession={setSelectedSessionId}
                    latestSessionId={latestSession?.id}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-3 md:p-6">
            {/* Past Session Banner - Show on ALL tabs including history when a different session is selected */}
            {selectedSessionId && selectedSessionId !== latestSession?.id && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                  <History className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Viewing historical session from{' '}
                    <strong>
                      {new Date(sessions.find(s => s.id === selectedSessionId)?.started_at || sessions.find(s => s.id === selectedSessionId)?.created_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === 'history' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab('summary')}
                      className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Session Data
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedSessionId(null)}
                    className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    View Latest
                  </Button>
                </div>
              </div>
            )}
            
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="space-y-4 md:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Your Brand Visibility Report</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Easy-to-understand analysis of how your brand appears in AI search results
                  </p>
                </div>

                {/* Brand Summary Header - uses favicon and rich summary */}
                {project && (
                  <BrandSummaryHeader
                    project={project}
                    websiteMetadata={websiteMetadata}
                    summary={brandSummary}
                    loading={brandSummaryLoading}
                  />
                )}
                
                {/* Executive Summary Card */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-2 bg-primary/5">
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-primary" />
                      What This Means For Your Business
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-base">
    {analysisResults.length > 0 && Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100) < 40 ? 
        `Your brand "${project.brand_name}" is currently missing from many AI search results. This means potential customers using AI tools like ${platformPerf.slice(0, 2).map(p => p.platform).join(' or ')} may not see your business when asking relevant questions. With only a ${Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100)}% visibility score, there's significant room for improvement to ensure more people find your business.` : 
        analysisResults.length > 0 && Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100) < 70 ?
        `Your brand "${project.brand_name}" has moderate visibility in AI search results. When people ask questions related to your industry, AI tools like ${platformPerf.slice(0, 2).map(p => p.platform).join(' or ')} mention your business about ${Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100)}% of the time. This is a good foundation, but targeted improvements could significantly increase your visibility to potential customers.` :
        `Your brand "${project.brand_name}" has excellent visibility in AI search results. When people ask questions related to your industry, AI tools like ${platformPerf.slice(0, 2).map(p => p.platform).join(' or ')} mention your business about ${Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100)}% of the time. This strong presence helps ensure potential customers discover your business when using these AI tools.`
    }
    
    {competitorStats.brandShare < 0.5 && competitorStats.list.length > 0 ? 
        ` We've detected ${competitorStats.list.length} competitors in the analysis, with ${competitorStats.list[0].name} mentioned most frequently. Currently, competitors are mentioned more often than your brand, which represents a competitive challenge.` : 
        competitorStats.brandShare >= 0.5 && competitorStats.list.length > 0 ?
        ` We've detected ${competitorStats.list.length} competitors in the analysis, with ${competitorStats.list[0].name} mentioned most frequently. Your brand currently outperforms these competitors in AI visibility, giving you a competitive advantage.` :
        ''
    }
    
    {avgSentiment > 0.3 ? 
        ` When your brand is mentioned, the overall tone is positive, which helps build trust with potential customers.` : 
        avgSentiment < -0.3 ? 
        ` When your brand is mentioned, the overall tone tends to be negative, which may affect customer perception.` : 
        ` When your brand is mentioned, the overall tone is mostly neutral.`
    }
                  </p>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Visibility Score Summary - Simplified */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-1">
                        <Eye className="w-4 h-4 mr-2 text-primary" />
                        Your Visibility Score
                        <VisibilityScoreExplainer 
                          score={project?.visibility_score ?? 0}
                          promptsMentioned={project?.prompts_mentioned}
                          promptsTotal={project?.prompts_total}
                          responsesMentioned={project?.responses_mentioned}
                          responsesTotal={project?.responses_total}
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20">
                          {(() => {
                            const score = analysisResults.length > 0 
                              ? Math.min(100, Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100))
                              : 0;
                            const radius = 45;
                            const circumference = 2 * Math.PI * radius;
                            const offset = circumference - (score / 100) * circumference;
                            
                            return (
                              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                                <defs>
                                  <linearGradient id="summaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                  </linearGradient>
                                </defs>
                                <circle 
                                  cx="50" cy="50" r="45" 
                                  fill="none" 
                                  stroke="#e2e8f0" 
                                  strokeWidth="10"
                                  className="dark:stroke-gray-700" 
                                />
                                <circle 
                                  cx="50" cy="50" r="45" 
                                  fill="none" 
                                  stroke="url(#summaryGradient)" 
                                  strokeWidth="10" 
                                  strokeLinecap="round"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                  style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                                />
                              </svg>
                            );
                          })()}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold">
                              {analysisResults.length > 0 
                                ? Math.min(100, Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100))
                                : 0}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm">
                            <strong>What this means:</strong> When people ask AI tools questions related to your industry, your brand appears in {analysisResults.filter(r => r.mention_found).length} out of {analysisResults.length} responses.
                          </p>
                          <p className="text-sm mt-2 font-medium">
                            {analysisResults.length > 0 && 
                              Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100) < 40 ? 
                              "This score needs improvement to reach more potential customers." : 
                              analysisResults.length > 0 && 
                              Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100) < 70 ?
                              "This is a decent score with room for strategic improvements." :
                              "This is an excellent score that gives you a competitive edge."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Where Your Brand Performs Best */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-primary" />
                        Where Your Brand Performs Best
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 sm:space-y-4">
                        {platformPerf.slice(0, 3).map((platform) => (
                            <div key={platform.platform} className="flex items-center gap-2">
                                <div className="w-20 sm:w-24 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                    <PlatformLogo platform={platform.platform} size={14} />
                                    <span className="capitalize truncate">{platform.platform}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.round(platform.mentionRate * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="w-12 text-right text-sm font-medium">
                                    {Math.round(platform.mentionRate * 100)}%
                                </div>
                            </div>
                        ))}
                        <p className="text-sm">
                          <strong>What this means:</strong> This shows which AI tools mention your brand most often. Higher percentages mean more potential customers will discover your business on that platform.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Customer Perception */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                        Customer Perception
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Overall Impression</span>
                          <span className="text-sm font-medium">
                            {avgSentiment > 0.3 ? 'Positive' : avgSentiment < -0.3 ? 'Negative' : 'Neutral'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${avgSentiment > 0.3 ? 'bg-green-500' : avgSentiment < -0.3 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, (avgSentiment + 1) / 2 * 100))}%` }}
                          ></div>
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-sm">
                            <strong>What this means:</strong> This measures how positively or negatively your brand is portrayed when mentioned. Positive sentiment builds trust and credibility with potential customers.
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-sm font-medium text-green-600">
                                {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score > 0.3).length}
                              </div>
                              <div className="text-xs text-muted-foreground">Positive</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-amber-600">
                                {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score >= -0.3 && r.sentiment_score <= 0.3).length}
                              </div>
                              <div className="text-xs text-muted-foreground">Neutral</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-red-600">
                                {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score < -0.3).length}
                              </div>
                              <div className="text-xs text-muted-foreground">Negative</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Competitive Position */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Target className="w-4 h-4 mr-2 text-primary" />
                        Your Competitive Position
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <div className="w-24 text-sm truncate">{project.brand_name}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${Math.min(100, (brandMentions / Math.max(1, brandMentions + competitorStats.totalCompetitorMentions)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="w-16 text-right text-sm font-medium">
                            {brandMentions} mentions
                          </div>
                        </div>
                        
                        {/* Use all detected competitors, sorted by actual mentions */}
                        {competitorStats.list.slice(0, 3).map((competitor) => (
                          <div key={competitor.name} className="flex items-center">
                            <div className="w-24 text-sm truncate">{competitor.name}</div>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500" 
                                  style={{ width: `${Math.min(100, (competitor.mentions / Math.max(1, brandMentions + competitorStats.totalCompetitorMentions)) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="w-16 text-right text-sm font-medium">
                              {competitor.mentions} mentions
                            </div>
                          </div>
                        ))}
                        
                        {competitorStats.list.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {competitorStats.list.length - 3} more competitors. View all in the Competitors tab.
                          </p>
                        )}
                        
                        <p className="text-sm mt-2">
                          <strong>What this means:</strong> This shows how many times your brand is mentioned compared to competitors. Higher numbers mean you're more visible to potential customers than your competition.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Business Opportunities */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                      Business Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* What's Working Well */}
                      <div>
                        <h4 className="text-base font-medium mb-2 text-green-600">What's Working Well</h4>
                        <ul className="list-disc pl-5 text-sm space-y-2">
                          {platformPerf.length > 0 && (
                            <li>
                              <span className="font-medium">Strong performance on {platformPerf[0].platform}:</span> Your brand has {Math.round(platformPerf[0].mentionRate * 100)}% visibility on this platform, which means customers using this AI tool are more likely to discover your business.
                            </li>
                          )}
                          {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score > 0.3).length > 0 && (
                            <li>
                              <span className="font-medium">Positive brand perception:</span> Your brand has positive sentiment in {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score > 0.3).length} responses, which helps build trust with potential customers.
                            </li>
                          )}
                          {analysisResults.filter(r => r.mention_found && r.mention_position === 1).length > 0 && (
                            <li>
                              <span className="font-medium">Top-of-mind awareness:</span> Your brand is mentioned first in {analysisResults.filter(r => r.mention_found && r.mention_position === 1).length} responses, showing strong relevance in these topics.
                            </li>
                          )}
                          {competitorStats.brandShare > 0.5 && (
                            <li>
                              <span className="font-medium">Competitive advantage:</span> Your brand has a {Math.round(competitorStats.brandShare * 100)}% share of voice, outperforming competitors in visibility to potential customers.
                            </li>
                          )}
                        </ul>
                      </div>
                      
                      {/* Growth Opportunities */}
                      <div>
                        <h4 className="text-base font-medium mb-2 text-amber-600">Growth Opportunities</h4>
                        <ul className="list-disc pl-5 text-sm space-y-2">
                          {platformPerf.length > 1 && platformPerf[platformPerf.length - 1].mentionRate < 0.3 && (
                            <li>
                              <span className="font-medium">Improve visibility on {platformPerf[platformPerf.length - 1].platform}:</span> Your brand only has {Math.round(platformPerf[platformPerf.length - 1].mentionRate * 100)}% visibility on this platform, representing a significant opportunity to reach more customers.
                            </li>
                          )}
                          {competitorStats.list.length > 0 && competitorStats.list[0].mentions > brandMentions && (
                            <li>
                              <span className="font-medium">Outperform top competitor:</span> {competitorStats.list[0].name} currently has higher visibility ({competitorStats.list[0].mentions} mentions vs. your {brandMentions}). Studying their approach could help improve your competitive position.
                            </li>
                          )}
                          {analysisResults.filter(r => !r.mention_found).length > analysisResults.filter(r => r.mention_found).length && (
                            <li>
                              <span className="font-medium">Address content gaps:</span> Your brand is missing from {analysisResults.filter(r => !r.mention_found).length} relevant customer questions. Creating content that addresses these topics could significantly boost your visibility.
                            </li>
                          )}
                          {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score < -0.3).length > 0 && (
                            <li>
                              <span className="font-medium">Improve brand perception:</span> Your brand has negative sentiment in {analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score < -0.3).length} responses. Addressing these concerns could improve customer trust.
                            </li>
                          )}
                          {competitorStats.list.length > 1 && (
                            <li>
                              <span className="font-medium">Monitor multiple competitors:</span> We've detected {competitorStats.list.length} competitors mentioned alongside your brand. View the Competitors tab for a detailed analysis of each.
                            </li>
                          )}
                        </ul>
                      </div>
                      
                      {/* Next Steps */}
                      <div>
                        <h4 className="text-base font-medium mb-2">Recommended Next Steps</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-lg p-4 bg-primary/5">
                            <h5 className="font-medium mb-2 flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-primary" />
                              Create Targeted Content
                            </h5>
                            <p className="text-sm">Develop content that addresses the specific topics where your brand isn't currently mentioned to improve visibility.</p>
                          </div>
                          <div className="border rounded-lg p-4 bg-primary/5">
                            <h5 className="font-medium mb-2 flex items-center">
                              <Globe className="w-4 h-4 mr-2 text-primary" />
                              Platform-Specific Strategy
                            </h5>
                            <p className="text-sm">Focus on improving visibility on platforms where your brand has lower performance to reach more potential customers.</p>
                          </div>
                          <div className="border rounded-lg p-4 bg-primary/5">
                            <h5 className="font-medium mb-2 flex items-center">
                              <Target className="w-4 h-4 mr-2 text-primary" />
                              Competitive Analysis
                            </h5>
                            <p className="text-sm">Study how competitors are achieving visibility and adapt successful strategies to improve your position.</p>
                          </div>
                          <div className="border rounded-lg p-4 bg-primary/5">
                            <h5 className="font-medium mb-2 flex items-center">
                              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                              Sentiment Improvement
                            </h5>
                            <p className="text-sm">Address negative sentiment patterns by enhancing your brand messaging and customer experience.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <Button 
                          onClick={() => {
                            // Create a comprehensive context object for Freddie
                            const detailedContext = {
                              brandName: project.brand_name,
                              industry: project.industry || 'Not specified',
                              website: project.website_url,
                              
                              // Visibility metrics
                              visibilityScore: analysisResults.length > 0 
                                ? Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100)
                                : 0,
                              totalQueries: analysisResults.length,
                              mentionedQueries: analysisResults.filter(r => r.mention_found).length,
                              unmentiondQueries: analysisResults.filter(r => !r.mention_found).length,
                              
                              // Platform data
                              platforms: [...new Set(analysisResults.map(r => r.ai_platform))],
                              platformPerformance: platformPerf.map(p => ({
                                name: p.platform,
                                mentionRate: Math.round(p.mentionRate * 100),
                                queries: p.queries,
                                mentions: p.mentions,
                                avgSentiment: Math.round(p.avgSentiment * 100)
                              })),
                              bestPlatform: platformPerf.length > 0 ? {
                                name: platformPerf[0].platform,
                                mentionRate: Math.round(platformPerf[0].mentionRate * 100)
                              } : null,
                              worstPlatform: platformPerf.length > 1 ? {
                                name: platformPerf[platformPerf.length - 1].platform,
                                mentionRate: Math.round(platformPerf[platformPerf.length - 1].mentionRate * 100)
                              } : null,
                              
                              // Sentiment analysis
                              overallSentiment: Math.round(avgSentiment * 100),
                              sentimentBreakdown: {
                                positive: analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score > 0.3).length,
                                neutral: analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score >= -0.3 && r.sentiment_score <= 0.3).length,
                                negative: analysisResults.filter(r => r.mention_found && r.sentiment_score && r.sentiment_score < -0.3).length
                              },
                              
                              // Competitor analysis
                              competitorMetrics: {
                                brandShareOfVoice: Math.round(competitorStats.brandShare * 100),
                                competitorsShareOfVoice: Math.round(competitorStats.competitorsShare * 100),
                                totalCompetitorMentions: competitorStats.totalCompetitorMentions
                              },
                              topCompetitors: competitorStats.list.slice(0, 3).map(c => ({
                                name: c.name,
                                mentions: c.mentions,
                                mentionRate: Math.round((c.mentions / (analysisResults.length || 1)) * 100)
                              })),
                              
                              // Cross-platform consistency
                              crossPlatformConsistency: Math.round(crossPlatformConsistency.avgConsistency * 100),
                              
                              // Sample queries
                              topPerformingQueries: analysisResults
                                .filter(r => r.mention_found)
                                .sort((a, b) => (a.mention_position || 999) - (b.mention_position || 999))
                                .slice(0, 5)
                                .map(r => ({
                                  query: r.query_text,
                                  position: r.mention_position,
                                  platform: r.ai_platform,
                                  sentiment: r.sentiment_score ? Math.round(r.sentiment_score * 100) : null
                                })),
                              missedQueries: analysisResults
                                .filter(r => !r.mention_found)
                                .slice(0, 5)
                                .map(r => ({
                                  query: r.query_text,
                                  platform: r.ai_platform
                                }))
                            };
                            
                            // Store the context in localStorage
                            localStorage.setItem('brandAnalysisContext', JSON.stringify(detailedContext));
                            
                            // Navigate to Freddie tab
                            setActiveTab('suggestions');
                          }}
                          className="w-full"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Get Personalized Improvement Plan
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* How We Gather Data Section */}
                <HowWeGatherData />
              </div>
            )}

            {/* Analysis Results Tab (Ranked Prompts) */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {viewMode === 'mentioned' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      {viewMode === 'mentioned' ? 'Mentioned Prompts' : 'Unmentioned Prompts'} ({viewMode === 'mentioned' 
                        ? analysisResults.filter(r => r.mention_found).length
                        : analysisResults.filter(r => !r.mention_found).length})
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {viewMode === 'mentioned' 
                        ? 'Queries where your brand was mentioned by AI platforms'
                        : 'Queries where your brand was not mentioned by AI platforms'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md overflow-hidden">
                      <button 
                        className={`px-3 py-1 text-sm ${viewMode === 'mentioned' 
                          ? 'bg-primary text-white' 
                          : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                        onClick={() => setViewMode('mentioned')}
                      >
                        Mentioned Prompts
                      </button>
                      <button 
                        className={`px-3 py-1 text-sm ${viewMode === 'unmentioned' 
                          ? 'bg-primary text-white' 
                          : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                        onClick={() => setViewMode('unmentioned')}
                      >
                        Missed Prompts
                      </button>
                    </div>
                  </div>
              </div>
              
                <PromptResultsTable projectId={id!} viewMode={viewMode} sessionId={latestSession?.id} />
                </div>
        )}

            {/* AI Recommendations Tab */}
            {activeTab === "suggestions" && (
              <BrandAnalysisAskFreddieTab 
                projectId={id!} 
                initialContext={localStorage.getItem('brandAnalysisContext')}
              />
              )}
              
            {/* Competitors Ranking Tab */}
            {activeTab === "competitors" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Competitor Analysis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    How your competitors are performing across AI platforms (latest session)
                  </p>
              </div>
                <CompetitorAnalysis projectId={id!} sessionId={latestSession?.id} />
              </div>
              )}
              
            {/* Sources Ranking Tab */}
            {activeTab === "sources" && (
              <div className="space-y-6">
                <SourcesTable 
                  projectId={id!} 
                  analysisResults={analysisResults}
                  brandName={project?.brand_name || ""}
                  brandWebsite={project?.website_url || ""}
                  brandDescription={project?.industry || ""}
                  competitors={project?.competitors || []}
                />
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && !comparisonMode && (
              <AnalysisHistoryTab
                sessions={sessions}
                isLoading={sessionsLoading}
                onViewSession={(sessionId) => {
                  setSelectedSessionId(sessionId);
                  // Stay on history tab but scroll to top so user sees the session is selected
                  // The banner will show and they can navigate to any tab to see that session's data
                  toast({
                    title: "Session Selected",
                    description: "You can now view this session's data in any tab. Look for the amber banner above.",
                  });
                }}
                selectedSessionId={selectedSessionId}
                latestSessionId={latestSession?.id}
                onCompare={handleStartComparison}
              />
            )}
            
            {/* Comparison View */}
            {activeTab === "history" && comparisonMode && sessionAObject && sessionBObject && (
              <SessionComparisonView
                sessionA={sessionAObject}
                sessionB={sessionBObject}
                comparisonData={comparisonData || null}
                isLoading={comparisonLoading}
                onClose={handleCloseComparison}
                onSwapSessions={handleSwapSessions}
              />
            )}

            {/* AI Platform Matrix Tab */}
            {activeTab === "platform-matrix" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">AI Platform Matrix</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare performance across different AI platforms (latest session)
                  </p>
                </div>
                <PlatformPerformanceMatrix projectId={id!} sessionId={activeSessionId} />
                <MatrixActionCenter projectId={id!} sessionId={activeSessionId} />
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Brand Analytics</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track your brand visibility trends over time
                    </p>
                </div>
                  <div className="flex items-center gap-2">
                    {/* Time Period Selector */}
                    <div className="flex items-center gap-2 border rounded-md overflow-hidden">
                      <button
                        onClick={() => setTimePeriod('daily')}
                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                          timePeriod === 'daily'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-transparent text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setTimePeriod('weekly')}
                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                          timePeriod === 'weekly'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-transparent text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setTimePeriod('monthly')}
                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                          timePeriod === 'monthly'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-transparent text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownloadReport('csv')}>Download as CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadReport('json')}>Download as JSON</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Total Prompts Analyzed</p>
                      <p className="text-2xl font-bold">{totalQueries}</p>
                      <p className="text-xs text-muted-foreground mt-1">Count of all prompts in the latest session.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Brand Visibility</p>
                      <p className="text-2xl font-bold">{Math.round(mentionRate*100)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Formula: mentions / total prompts.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Avg Sentiment (Mentioned)</p>
                      <p className="text-2xl font-bold">{Math.round(avgSentiment*100)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Average of sentiment scores where brand was mentioned.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Share of Voice (Brand)</p>
                      <p className="text-2xl font-bold">{Math.round(competitorStats.brandShare*100)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Brand mentions / (brand + competitor mentions).</p>
                    </CardContent>
                  </Card>
              </div>

                {/* Actionable Insights */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Insights You Can Act On</CardTitle></CardHeader>
                  <CardContent className="pt-2">
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      {insights.map((text, idx) => (
                        <li key={idx}>{text}</li>
                      ))}
                    </ul>
            </CardContent>
          </Card>

                {/* Main Analytics Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Brand Mentions Over Time - Line Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Brand Mentions Over Time</CardTitle>
                        <p className="text-xs text-muted-foreground pt-1">Track the number of times your brand was mentioned over time ({timePeriod} view).</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsData.brandMentionsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="mentionsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.8} />
                                <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }}
                              label={{ value: 'Mentions', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                                      <p className="font-semibold">{data.date}</p>
                                      <p className="text-sm">Brand Mentions: <strong>{data.mentions}</strong></p>
                                      <p className="text-sm">Total Queries: {data.totalQueries}</p>
                                      <p className="text-sm">Mention Rate: {data.mentionRate}%</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="mentions"
                              stroke={COLORS.brand}
                              strokeWidth={2}
                              fill="url(#mentionsGradient)"
                              name="Brand Mentions"
                            />
                            <Line
                              type="monotone"
                              dataKey="mentions"
                              stroke={COLORS.brand}
                              strokeWidth={2}
                              dot={{ fill: COLORS.brand, r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Brand Mentions"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Visibility Trend Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Brand Visibility: How Often Your Brand Appears</CardTitle>
                        <p className="text-xs text-muted-foreground pt-1">This chart shows the percentage of AI queries where your brand was mentioned.</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.visibilityTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.8} />
                                            <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} />
                                    <Bar dataKey="visibility" name="Visibility" unit="%" radius={[4, 4, 0, 0]} fill="url(#brandGradient)" />
                                </BarChart>
                        </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

                  {/* Sentiment Mix Over Time - Stacked Bar Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Sentiment Analysis: How Your Brand is Perceived</CardTitle>
                        <p className="text-xs text-muted-foreground pt-1">This chart shows the emotional tone of the AI responses that mention your brand.</p>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.sentimentTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis unit="%" tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="positive" name="Positive" stackId="a" fill={COLORS.positive} unit="%" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="neutral" name="Neutral" stackId="a" fill={COLORS.neutral} unit="%" />
                                    <Bar dataKey="negative" name="Negative" stackId="a" fill={COLORS.negative} unit="%" radius={[0, 0, 4, 4]} />
                                </BarChart>
                        </ResponsiveContainer>
        </div>
                    </CardContent>
                  </Card>

                  {/* Platform Comparison */}
          <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Visibility by AI Platform</CardTitle>
                        <p className="text-xs text-muted-foreground pt-1">Which AI platforms mention your brand most often? This shows the Mention Rate for each.</p>
            </CardHeader>
                    <CardContent className="pt-2">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={platformMentionRateData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                    <YAxis type="category" dataKey="platform" tick={{ fontSize: 12 }} width={80} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} />
                                    <Bar dataKey="Mention Rate" name="Mention Rate" unit="%" radius={[0, 4, 4, 0]} fill={COLORS.brand} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
            </CardContent>
          </Card>

                  {/* Competitor Trend - Grouped Bar Chart */}
          <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Share of Voice: Your Brand vs. Competitors</CardTitle>
                        <p className="text-xs text-muted-foreground pt-1">This chart compares your brand's visibility against top competitors.</p>
            </CardHeader>
                    <CardContent className="pt-2">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.competitorTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="brand" name={project.brand_name} fill={COLORS.brand} unit="%" radius={[4, 4, 0, 0]} />
                                    {analyticsData.topCompetitors?.map((competitor, index) => {
                                        const colors = [COLORS.competitor1, COLORS.competitor2, COLORS.competitor3];
                                        return (
                                            <Bar key={competitor} dataKey={`competitor${index + 1}`} name={competitor} fill={colors[index % colors.length]} unit="%" radius={[4, 4, 0, 0]} />
                                        );
                                    })}
                                </BarChart>
                </ResponsiveContainer>
              </div>
                    </CardContent>
                  </Card>
          </div>

                {/* Language and Country Analytics Section */}
                {(languageAnalytics.length > 0 || countryAnalytics.length > 0) && (
                  <div className="space-y-6 mt-6">
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Global AI Visibility Analysis</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Track your brand visibility across different languages and countries
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Language-wise Brand Visibility */}
                      {languageAnalytics.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Brand Visibility by Language</CardTitle>
                            <p className="text-xs text-muted-foreground pt-1">
                              Mention rate and competitor intensity across different languages
                            </p>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={languageAnalytics.map(l => ({
                                  language: l.language,
                                  mentionRate: Math.round(l.mentionRate * 100),
                                  topCompetitorRate: Math.round(l.topCompetitorRate * 100),
                                  topCompetitorName: l.topCompetitorName || 'None',
                                  mentions: l.mentions,
                                  queries: l.queries
                                }))} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis 
                                    dataKey="language" 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 11 }}
                                  />
                                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                                  <Tooltip 
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                                            <p className="font-semibold">{data.language}</p>
                                            <p className="text-sm">Brand Mention Rate: {data.mentionRate}%</p>
                                            <p className="text-sm">Top Competitor ({data.topCompetitorName}): {data.topCompetitorRate}%</p>
                                            <p className="text-sm">Mentions: {data.mentions} / {data.queries} queries</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Legend />
                                  <Bar dataKey="mentionRate" name="Brand Mention Rate" fill={COLORS.brand} unit="%" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="topCompetitorRate" name="Top Competitor Rate" fill={COLORS.negative} unit="%" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Country-wise Brand Visibility */}
                      {countryAnalytics.length > 0 && countryAnalytics.some(c => c.country !== 'general') && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Brand Visibility by Country</CardTitle>
                            <p className="text-xs text-muted-foreground pt-1">
                              Mention rate and competitor intensity across different countries
                            </p>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={countryAnalytics.filter(c => c.country !== 'general').map(c => ({
                                  country: c.country,
                                  mentionRate: Math.round(c.mentionRate * 100),
                                  topCompetitorRate: Math.round(c.topCompetitorRate * 100),
                                  topCompetitorName: c.topCompetitorName || 'None',
                                  mentions: c.mentions,
                                  queries: c.queries
                                }))} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis 
                                    dataKey="country" 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 11 }}
                                  />
                                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                                  <Tooltip 
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                                            <p className="font-semibold">{data.country}</p>
                                            <p className="text-sm">Brand Mention Rate: {data.mentionRate}%</p>
                                            <p className="text-sm">Top Competitor ({data.topCompetitorName}): {data.topCompetitorRate}%</p>
                                            <p className="text-sm">Mentions: {data.mentions} / {data.queries} queries</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Legend />
                                  <Bar dataKey="mentionRate" name="Brand Mention Rate" fill={COLORS.brand} unit="%" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="topCompetitorRate" name="Top Competitor Rate" fill={COLORS.negative} unit="%" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Language Gaps Analysis */}
                    {languageAnalytics.length > 1 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Language-wise Gaps Analysis</CardTitle>
                          <p className="text-xs text-muted-foreground pt-1">
                            Identify which languages show strong brand visibility vs. where competitors dominate
                          </p>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-green-600">Strong Presence</h4>
                                <div className="space-y-2">
                                  {languageAnalytics
                                    .filter(l => l.mentionRate > 0.3 && l.topCompetitorRate < l.mentionRate && l.topCompetitorName)
                                    .slice(0, 5)
                                    .map(lang => (
                                      <div key={lang.language} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                        <span className="text-sm font-medium">{lang.language}</span>
                                        <div className="flex gap-4 text-xs">
                                          <span>Brand: {Math.round(lang.mentionRate * 100)}%</span>
                                          <span>Top: {Math.round(lang.topCompetitorRate * 100)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  {languageAnalytics.filter(l => l.mentionRate > 0.3 && l.topCompetitorRate < l.mentionRate && l.topCompetitorName).length === 0 && (
                                    <p className="text-sm text-muted-foreground">No languages with strong brand presence yet</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-red-600">Competitor Dominance</h4>
                                <div className="space-y-2">
                                  {languageAnalytics
                                    .filter(l => l.topCompetitorRate > l.mentionRate && l.topCompetitorRate > 0.2 && l.topCompetitorName)
                                    .slice(0, 5)
                                    .map(lang => (
                                      <div key={lang.language} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                        <span className="text-sm font-medium">{lang.language}</span>
                                        <div className="flex gap-4 text-xs">
                                          <span>Brand: {Math.round(lang.mentionRate * 100)}%</span>
                                          <span>Top: {Math.round(lang.topCompetitorRate * 100)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  {languageAnalytics.filter(l => l.topCompetitorRate > l.mentionRate && l.topCompetitorRate > 0.2 && l.topCompetitorName).length === 0 && (
                                    <p className="text-sm text-muted-foreground">No languages with competitor dominance detected</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Country Gaps Analysis */}
                    {countryAnalytics.length > 1 && countryAnalytics.some(c => c.country !== 'general') && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Country-wise Gaps Analysis</CardTitle>
                          <p className="text-xs text-muted-foreground pt-1">
                            Identify which countries show strong brand visibility vs. where competitors dominate
                          </p>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-green-600">Strong Presence</h4>
                                <div className="space-y-2">
                                  {countryAnalytics
                                    .filter(c => c.country !== 'general' && c.mentionRate > 0.3 && c.topCompetitorRate < c.mentionRate && c.topCompetitorName)
                                    .slice(0, 5)
                                    .map(country => (
                                      <div key={country.country} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                        <span className="text-sm font-medium">{country.country}</span>
                                        <div className="flex gap-4 text-xs">
                                          <span>Brand: {Math.round(country.mentionRate * 100)}%</span>
                                          <span>Top: {Math.round(country.topCompetitorRate * 100)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  {countryAnalytics.filter(c => c.country !== 'general' && c.mentionRate > 0.3 && c.topCompetitorRate < c.mentionRate && c.topCompetitorName).length === 0 && (
                                    <p className="text-sm text-muted-foreground">No countries with strong brand presence yet</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-red-600">Competitor Dominance</h4>
                                <div className="space-y-2">
                                  {countryAnalytics
                                    .filter(c => c.country !== 'general' && c.topCompetitorRate > c.mentionRate && c.topCompetitorRate > 0.2 && c.topCompetitorName)
                                    .slice(0, 5)
                                    .map(country => (
                                      <div key={country.country} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                        <span className="text-sm font-medium">{country.country}</span>
                                        <div className="flex gap-4 text-xs">
                                          <span>Brand: {Math.round(country.mentionRate * 100)}%</span>
                                          <span>Top: {Math.round(country.topCompetitorRate * 100)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  {countryAnalytics.filter(c => c.country !== 'general' && c.topCompetitorRate > c.mentionRate && c.topCompetitorRate > 0.2 && c.topCompetitorName).length === 0 && (
                                    <p className="text-sm text-muted-foreground">No countries with competitor dominance detected</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
          </div>
        )}

        {/* Project Configuration Dialog */}
        {project && showConfigDialog && (
          <ProjectConfigDialog
            project={project}
            isOpen={showConfigDialog}
            onClose={() => setShowConfigDialog(false)}
          />
        )}

        {/* Source Prompts Modal */}
        <SourcePromptsModal
          isOpen={showSourcePromptsModal}
          onClose={() => setShowSourcePromptsModal(false)}
          source={selectedSource}
          prompts={sourcePrompts}
        />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}