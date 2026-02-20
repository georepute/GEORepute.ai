"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useLanguage } from "@/lib/language-context";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// @ts-ignore - pptxgenjs types may not be available
import PptxGenJS from 'pptxgenjs';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  PointElement,
  LineElement,
  BarController,
  PieController,
  DoughnutController,
} from 'chart.js';
import { 
  Target,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  LayoutGrid,
  Settings,
  Play,
  Plus,
  Search,
  TrendingUp,
  Eye,
  BarChart3,
  Globe,
  RefreshCw,
  Download,
  FileText,
  Activity,
  MessageSquare,
  Check,
  X,
  StopCircle,
  Trash2,
  MoreVertical,
  Send,
  Pencil,
  CheckCircle,
  XCircle,
  Trophy,
  AlertTriangle,
  Clock,
  History
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { CompetitorLogo } from '@/components/CompetitorLogo';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  PointElement,
  LineElement,
  BarController,
  PieController,
  DoughnutController
);

type ViewMode = 'projects' | 'form' | 'details';

interface Project {
  id: string;
  brand_name: string;
  industry: string;
  website_url?: string;
  active_platforms?: string[];
  competitors?: Array<string | { name: string; domain?: string }>;
  keywords?: string[];
  last_analysis_at?: string;
  created_at: string;
  company_description?: string;
  company_image_url?: string;
  gsc_enabled?: boolean;
  gsc_keywords_count?: number;
  last_gsc_sync?: string;
  brand_summary?: any;
  analysis_languages?: string[];
  analysis_countries?: string[];
  queries_per_platform?: number;
  query_mode?: 'auto' | 'manual' | 'auto_manual';
  manual_queries?: Array<{ text: string; language?: string; country?: string }>;
}

interface Session {
  id: string;
  project_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  completed_queries?: number;
  total_queries?: number;
  results_summary?: any;
  session_name?: string;
  started_at: string;
  completed_at?: string;
  competitor_analysis?: {
    competitor_data?: Array<{
      name: string;
      mentions: number;
      sentiment: number;
      relevance: number;
      platforms: string[];
      trends: { mentions_trend: number; sentiment_trend: number };
    }>;
    rankings?: Array<{
      name: string;
      rank: number;
      ranking_score: number;
      mentions: number;
      sentiment: number;
    }>;
    market_positions?: Array<{
      brand: string;
      market_share: number;
      sentiment_score: number;
      competitive_strength: number;
      positioning: 'leader' | 'challenger' | 'follower' | 'niche';
    }>;
    share_of_voice?: Array<{
      brand: string;
      mentions: number;
      share_percentage: number;
    }>;
    competitive_gaps?: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
    summary?: any;
  };
}

const normalizeUrl = (url: string) => {
  if (!url) return url;
  return url.match(/^https?:\/\//) ? url : `https://${url}`;
};

function AIVisibilityContent() {
  const { isRtl, t, language } = useLanguage();
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // View mode: 'projects' (list), 'form' (new analysis), 'details' (project details)
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("Marketing");
  // Competitors: separate manual vs AI-suggested so Regenerate doesn't wipe manual entries, and removing one doesn't affect the other
  const [manualCompetitors, setManualCompetitors] = useState<Array<string | { name: string; domain?: string }>>([]);
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<Array<string | { name: string; domain?: string }>>([]);
  const [manualKeywords, setManualKeywords] = useState<string[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const competitors = [...manualCompetitors, ...suggestedCompetitors];
  const keywords = [...manualKeywords, ...suggestedKeywords];
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["perplexity", "chatgpt"]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [hasAutoGeneratedAI, setHasAutoGeneratedAI] = useState(false);
  const [fetchGSCKeywords, setFetchGSCKeywords] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);
  const [checkingGSCStatus, setCheckingGSCStatus] = useState(false);
  const [analysisLanguages, setAnalysisLanguages] = useState<string[]>([]);
  const [analysisCountries, setAnalysisCountries] = useState<string[]>([]);
  const [queriesPerPlatform, setQueriesPerPlatform] = useState<number>(50);
  const [queryMode, setQueryMode] = useState<'auto' | 'manual' | 'auto_manual'>('auto');
  const [manualQueries, setManualQueries] = useState<Array<{ text: string; language?: string; country?: string }>>([]);
  const [newManualQueryText, setNewManualQueryText] = useState('');
  const [newManualQueryLanguage, setNewManualQueryLanguage] = useState('en-US');
  const [newManualQueryCountry, setNewManualQueryCountry] = useState('');
  const [availableDomains, setAvailableDomains] = useState<Array<{ id: string; domain: string; status: string }>>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);

  // Project details state
  const [projectSessions, setProjectSessions] = useState<Session[]>([]);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [projectResponses, setProjectResponses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [brandSummary, setBrandSummary] = useState<any>(null);
  const [loadingBrandSummary, setLoadingBrandSummary] = useState(false);
  const [resultsView, setResultsView] = useState<'mentioned' | 'missed'>('mentioned');
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);
  const [showAnalysisStartNotification, setShowAnalysisStartNotification] = useState(false);
  const [showAnalysisStartModal, setShowAnalysisStartModal] = useState(false);
  const [analysisStartInfo, setAnalysisStartInfo] = useState<any>(null);
  const [stoppingAnalysis, setStoppingAnalysis] = useState<string | null>(null);
  const [pausingAnalysis, setPausingAnalysis] = useState<string | null>(null);
  const [resumingAnalysis, setResumingAnalysis] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showProjectDetailsSettings, setShowProjectDetailsSettings] = useState(false);
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [viewResponseModal, setViewResponseModal] = useState<{ open: boolean; response: any; prompt: string } | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [configQueryMode, setConfigQueryMode] = useState<'auto' | 'manual' | 'auto_manual'>('auto');
  const [configManualQueries, setConfigManualQueries] = useState<Array<{ text: string; language?: string; country?: string; isManual?: boolean }>>([]);
  const [configPlatforms, setConfigPlatforms] = useState<string[]>([]);
  const [configProjectName, setConfigProjectName] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configLanguages, setConfigLanguages] = useState<string[]>([]);
  const [configCountries, setConfigCountries] = useState<string[]>([]);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);
  const [historyResponses, setHistoryResponses] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const [historySessionsLoading, setHistorySessionsLoading] = useState(false);
  
  // Domain Intelligence state
  const [domainIntelligenceJobs, setDomainIntelligenceJobs] = useState<any[]>([]);
  const [selectedDomainJob, setSelectedDomainJob] = useState<any | null>(null);

  const industries = [
    "Marketing", "Technology", "Healthcare", "Finance", "Education",
    "Retail", "Real Estate", "Legal", "Consulting", "Manufacturing",
    "Food & Beverage", "Travel & Hospitality", "Entertainment",
    "Sports & Fitness", "Non-Profit", "Other"
  ];

  // 12 languages supported for global analysis (query generation in selected language)
  const analysisLanguageOptions = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "he", label: "Hebrew" },
    { value: "ur", label: "Urdu" },
    { value: "de", label: "German" },
    { value: "fr", label: "French" },
    { value: "es", label: "Spanish" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "nl", label: "Dutch" },
    { value: "ja", label: "Japanese" },
    { value: "zh", label: "Chinese" },
  ];
  const analysisCountryOptions = [
    { value: "US", label: "United States" },
    { value: "GB", label: "United Kingdom" },
    { value: "CA", label: "Canada" },
    { value: "AU", label: "Australia" },
    { value: "IE", label: "Ireland" },
    { value: "NZ", label: "New Zealand" },
    { value: "ZA", label: "South Africa" },
    { value: "IN", label: "India" },
    { value: "PK", label: "Pakistan" },
    { value: "BD", label: "Bangladesh" },
    { value: "SG", label: "Singapore" },
    { value: "MY", label: "Malaysia" },
    { value: "PH", label: "Philippines" },
    { value: "VN", label: "Vietnam" },
    { value: "TH", label: "Thailand" },
    { value: "ID", label: "Indonesia" },
    { value: "HK", label: "Hong Kong" },
    { value: "TW", label: "Taiwan" },
    { value: "KR", label: "South Korea" },
    { value: "JP", label: "Japan" },
    { value: "CN", label: "China" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "IT", label: "Italy" },
    { value: "ES", label: "Spain" },
    { value: "NL", label: "Netherlands" },
    { value: "BE", label: "Belgium" },
    { value: "AT", label: "Austria" },
    { value: "CH", label: "Switzerland" },
    { value: "PL", label: "Poland" },
    { value: "SE", label: "Sweden" },
    { value: "NO", label: "Norway" },
    { value: "DK", label: "Denmark" },
    { value: "FI", label: "Finland" },
    { value: "PT", label: "Portugal" },
    { value: "GR", label: "Greece" },
    { value: "CZ", label: "Czech Republic" },
    { value: "RO", label: "Romania" },
    { value: "HU", label: "Hungary" },
    { value: "RU", label: "Russia" },
    { value: "UA", label: "Ukraine" },
    { value: "TR", label: "Turkey" },
    { value: "IL", label: "Israel" },
    { value: "AE", label: "United Arab Emirates" },
    { value: "SA", label: "Saudi Arabia" },
    { value: "EG", label: "Egypt" },
    { value: "QA", label: "Qatar" },
    { value: "KW", label: "Kuwait" },
    { value: "BH", label: "Bahrain" },
    { value: "OM", label: "Oman" },
    { value: "JO", label: "Jordan" },
    { value: "LB", label: "Lebanon" },
    { value: "BR", label: "Brazil" },
    { value: "MX", label: "Mexico" },
    { value: "AR", label: "Argentina" },
    { value: "CO", label: "Colombia" },
    { value: "CL", label: "Chile" },
    { value: "PE", label: "Peru" },
    { value: "VE", label: "Venezuela" },
    { value: "EC", label: "Ecuador" },
    { value: "NG", label: "Nigeria" },
    { value: "KE", label: "Kenya" },
    { value: "GH", label: "Ghana" },
    { value: "ET", label: "Ethiopia" },
    { value: "MA", label: "Morocco" },
    { value: "EU", label: "European Union (general)" },
  ];

  const platformOptions = [
    { id: "perplexity", name: "Perplexity", icon: "/images/perplexity.png" },
    { id: "chatgpt", name: "ChatGPT", icon: "/images/chatgpt.png" },
    { id: "gemini", name: "Gemini", icon: "/images/Gemini.png" },
    { id: "claude", name: "Claude", icon: "/images/claude.png" },
    { id: "groq", name: "Grok", icon: "/images/groq%20(1).png" },
  ];
  
  // Helper function to extract name and domain from competitor string/object
  // Handles: plain strings, JSON strings like '{"name":"X","domain":"x.com"}', or objects
  const parseCompetitorNameGlobal = (value: string | any): { name: string; domain?: string } => {
    if (!value) return { name: 'Unknown' };
    
    // If it's already a plain string (not JSON)
    if (typeof value === 'string') {
      // Check if it looks like JSON
      if (value.startsWith('{') && value.includes('"name"')) {
        try {
          const parsed = JSON.parse(value);
          return { name: parsed.name || value, domain: parsed.domain };
        } catch {
          return { name: value };
        }
      }
      return { name: value };
    }
    
    // If it's an object
    if (typeof value === 'object' && value.name) {
      return { name: value.name, domain: value.domain };
    }
    
    return { name: String(value) };
  };
  
  // Render competitor name as clickable link if domain exists
  const renderCompetitorLink = (value: string | any, isYourBrand: boolean = false, showBadge: boolean = false) => {
    const { name, domain } = parseCompetitorNameGlobal(value);
    const isBrand = name === selectedProject?.brand_name || isYourBrand;
    
    // For your brand, use the project's website_url if available
    const brandDomain = isBrand ? (selectedProject?.website_url || domain) : domain;
    
    const badge = isBrand && showBadge ? (
      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Your Brand</span>
    ) : null;
    
    if (brandDomain) {
      const url = brandDomain.startsWith('http') ? brandDomain : `https://${brandDomain}`;
      return (
        <>
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${isBrand ? 'font-semibold text-purple-700' : 'text-gray-900'} hover:underline`}
          >
            {name}
          </a>
          {badge}
        </>
      );
    }
    
    return (
      <span className={isBrand ? 'font-semibold text-purple-700' : 'text-gray-900'}>
        {name}
        {badge}
      </span>
    );
  };

  // Fetch projects and domain intelligence jobs on mount
  useEffect(() => {
    if (viewMode === 'projects' || !initialLoadDone) {
      fetchProjects();
      fetchDomainIntelligenceJobs();
    }
  }, [viewMode]);
  
  // Restore selected project from URL on initial load
  useEffect(() => {
    const projectId = searchParams.get('project');
    const tab = searchParams.get('tab');
    
    if (projectId && projects.length > 0 && !initialLoadDone) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        setViewMode('details');
        if (tab) {
          setActiveTab(tab);
        }
        // Fetch sessions and details for this project
        fetchProjectDetails(project.id);
      }
      setInitialLoadDone(true);
    } else if (projects.length > 0 && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [projects, searchParams, initialLoadDone]);

  // Check GSC connection status and load domains when form is shown
  useEffect(() => {
    if (viewMode === 'form') {
      checkGSCConnection();
      fetchAvailableDomains();
    }
  }, [viewMode]);

  const fetchAvailableDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/integrations/google-search-console/domains');
      if (response.ok) {
        const data = await response.json();
        const activeDomains = (data.domains || []).filter((d: any) => d.status === 'active' || d.status === 'verified' || d.gsc_integration?.verification_status === 'verified');
        setAvailableDomains(
          activeDomains.length > 0
            ? activeDomains.map((d: any) => ({ id: d.id, domain: d.domain, status: d.status }))
            : (data.domains || []).map((d: any) => ({ id: d.id, domain: d.domain, status: d.status }))
        );
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoadingDomains(false);
    }
  };

  const checkGSCConnection = async () => {
    try {
      setCheckingGSCStatus(true);
      const response = await fetch('/api/integrations/google-search-console');
      if (response.ok) {
        const data = await response.json();
        setGscConnected(data.connected || false);
        // If GSC is not connected, uncheck the checkbox
        if (!data.connected) {
          setFetchGSCKeywords(false);
        }
      }
    } catch (error) {
      console.error('Error checking GSC status:', error);
      setGscConnected(false);
      setFetchGSCKeywords(false);
    } finally {
      setCheckingGSCStatus(false);
    }
  };

  // Poll for running sessions
  useEffect(() => {
    if (viewMode === 'projects' || viewMode === 'details') {
      const runningProjects = projects.filter(p => {
        const session = projectSessions.find(s => s.project_id === p.id);
        return session?.status === 'running';
      });

      if (runningProjects.length > 0) {
        const interval = setInterval(() => {
          fetchProjects();
          if (selectedProject) {
            fetchProjectDetails(selectedProject.id);
          }
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [viewMode, projects, projectSessions, selectedProject]);

  // Fetch responses when switching to results tab (respect history selection)
  useEffect(() => {
    if (viewMode === 'details' && selectedProject) {
      if (historySessionId) {
        fetchProjectResponses(historySessionId);
        return;
      }
      const latestCompleted = projectSessions.find(s => s.project_id === selectedProject.id && s.status === 'completed');
      if (latestCompleted?.id) {
        setHistorySessionId(latestCompleted.id);
        fetchProjectResponses(latestCompleted.id);
      } else {
        const latestSession = projectSessions.find(s => s.project_id === selectedProject.id);
        if (latestSession?.id) {
          fetchProjectResponses(latestSession.id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, activeTab, projectSessions.length, viewMode, historySessionId]);

  // Auto-select latest completed session when sessions are loaded
  useEffect(() => {
    if (!selectedProject || projectSessions.length === 0) return;
    const latestCompleted = projectSessions.find(
      s => s.project_id === selectedProject.id && s.status === 'completed'
    );
    if (latestCompleted?.id && latestCompleted.id !== historySessionId) {
      setHistorySessionId(latestCompleted.id);
      setProjectStats(latestCompleted.results_summary || null);
    }
  }, [selectedProject?.id, projectSessions]);

  // Fetch brand summary when switching to summary tab
  useEffect(() => {
    if (viewMode === 'details' && selectedProject && activeTab === 'summary') {
      // Check if there's a running analysis
      const hasRunningSession = projectSessions.some(s => s.status === 'running');
      
      // Only fetch if we don't already have a summary showing
      // Keep showing existing summary during analysis - don't clear it
      if (!brandSummary && selectedProject.brand_summary) {
        // Use cached summary from database
        setBrandSummary(selectedProject.brand_summary);
      } else if (!brandSummary && !selectedProject.brand_summary && !hasRunningSession) {
        // Fetch new summary only if we don't have one and no analysis is running
        fetchBrandSummary();
      }
      // Note: Don't clear summary when analysis is running - we want to keep showing it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, activeTab, viewMode, selectedProject?.brand_summary, projectSessions]);

  // Debug: Log modal state changes
  useEffect(() => {
    if (viewResponseModal) {
      console.log('Modal state changed:', viewResponseModal);
    }
  }, [viewResponseModal]);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brand_analysis_projects')
        .select('*, brand_summary')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      // Fetch latest session for each project (prefer completed sessions for stats)
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        const { data: sessions, error: sessionsError } = await supabase
          .from('brand_analysis_sessions')
          .select('*')
          .in('project_id', projectIds)
          .order('started_at', { ascending: false });

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError);
        }

        // For the currently selected project, keep ALL sessions so history modal works.
        // For other projects, keep only the latest (prefer completed) for the project cards.
        const selectedId = selectedProject?.id;

        const latestSessions = projectIds.flatMap(projectId => {
          const projectSessions = (sessions || []).filter(s => s.project_id === projectId);
          
          if (projectSessions.length === 0) {
            console.log(`⚠️ No sessions found for project ${projectId}`);
            return [];
          }

          if (projectId === selectedId) {
            return projectSessions;
          }
          
          // First try to find a completed session (for accurate stats)
          const completedSessions = projectSessions.filter(s => s.status === 'completed');
          if (completedSessions.length > 0) {
            // Sort by started_at desc to get the most recent completed session
            const latestCompleted = completedSessions.sort((a, b) => 
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            )[0];
            
            console.log(`✅ Found completed session for project ${projectId} (${projectId.slice(0, 8)}...):`, {
              sessionId: latestCompleted.id,
              status: latestCompleted.status,
              mentions: latestCompleted.results_summary?.total_mentions || 0,
              totalQueries: latestCompleted.results_summary?.total_queries || 0,
              visibility: latestCompleted.results_summary ? 
                Math.round((latestCompleted.results_summary.total_mentions || 0) / (latestCompleted.results_summary.total_queries || 1) * 100) : 0,
              hasSummary: !!latestCompleted.results_summary
            });
            return [latestCompleted];
          }
          
          // Fallback to latest session if no completed session
          console.log(`⚠️ No completed session for project ${projectId}, using latest session:`, {
            sessionId: projectSessions[0].id,
            status: projectSessions[0].status,
            hasSummary: !!projectSessions[0].results_summary,
            mentions: projectSessions[0].results_summary?.total_mentions || 'N/A'
          });
          return [projectSessions[0]];
        });

        // Fetch all responses for all sessions at once to calculate accurate stats
        let finalSessions = latestSessions as Session[];
        const sessionIds = finalSessions.map(s => s.id);
        if (sessionIds.length > 0) {
          try {
            const { data: allResponses, error: responsesError } = await supabase
              .from('ai_platform_responses')
              .select('session_id, response_metadata')
              .in('session_id', sessionIds);

            if (responsesError) {
              console.error('Error fetching responses for stats calculation:', responsesError);
            } else if (allResponses && allResponses.length > 0) {
              // Calculate stats per session
              finalSessions = finalSessions.map((session) => {
                const sessionResponses = allResponses.filter(r => r.session_id === session.id);
                const totalResponses = sessionResponses.length;
                const mentionsCount = sessionResponses.filter(r => 
                  r.response_metadata && r.response_metadata.brand_mentioned === true
                ).length;

                // Update session with calculated stats if results_summary is missing or has zeros
                // IMPORTANT: Always preserve the original total_queries from results_summary (planned number)
                // Only update total_mentions, not total_queries, to ensure consistency with detailed view
                if (!session.results_summary || 
                    !session.results_summary.total_mentions || 
                    session.results_summary.total_mentions === 0) {
                  
                  // Preserve original total_queries if it exists, otherwise use session.total_queries or actual responses
                  const originalTotalQueries = session.results_summary?.total_queries || session.total_queries || (totalResponses > 0 ? totalResponses : 0);
                  
                  session.results_summary = {
                    ...(session.results_summary || {}),
                    total_mentions: mentionsCount,
                    // Always use the original planned total_queries, not the actual response count
                    total_queries: originalTotalQueries
                  };
                  
                  console.log(`📊 Calculated stats for session ${session.id}:`, {
                    mentions: mentionsCount,
                    totalQueries: originalTotalQueries,
                    visibility: originalTotalQueries > 0 
                      ? Math.round((mentionsCount / originalTotalQueries) * 100) 
                      : 0,
                    responsesFound: totalResponses
                  });
                } else {
                  console.log(`✅ Using existing summary for session ${session.id}:`, {
                    mentions: session.results_summary.total_mentions,
                    totalQueries: session.results_summary.total_queries
                  });
                }
                
                return session;
              });
            }
          } catch (error) {
            console.error('Error calculating stats from responses:', error);
          }
        }

        console.log(`📊 Setting ${finalSessions.length} sessions for ${projectIds.length} projects`);
        setProjectSessions(finalSessions);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string, preserveBrandSummary: boolean = false) => {
    try {
      // Only clear brand summary when switching to a DIFFERENT project
      // Don't clear when refreshing the same project (e.g., during analysis)
      const isSameProject = selectedProject?.id === projectId;
      if (!preserveBrandSummary && !isSameProject) {
        setBrandSummary(null);
      }
      
      // Fetch project (including brand_summary)
      const { data: project, error: projectError } = await supabase
        .from('brand_analysis_projects')
        .select('*, brand_summary, brand_summary_updated_at')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setSelectedProject(project);
      if (project.queries_per_platform != null) {
        setQueriesPerPlatform(Math.min(50, Math.max(1, project.queries_per_platform)));
      }
      
      // Fetch sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (sessionsError) throw sessionsError;
      setProjectSessions(sessions || []);

      // Set brand summary from project data if available and we don't already have one showing
      // Keep showing existing brand summary during analysis
      if (project.brand_summary && !brandSummary) {
        setBrandSummary(project.brand_summary);
      }

      // Calculate stats from latest completed session
      const latestCompleted = sessions?.find(s => s.status === 'completed');
      const wasRunning = projectSessions.find(s => s.project_id === projectId && s.status === 'running');
      const newAnalysisJustCompleted = wasRunning && latestCompleted && wasRunning.id === latestCompleted.id;
      
      if (latestCompleted) {
        // Auto-select latest completed session on initial load or when a new analysis completes
        if (!historySessionId || newAnalysisJustCompleted) {
          setHistorySessionId(latestCompleted.id);
        }

        // Set stats if available
        if (latestCompleted.results_summary) {
          setProjectStats(latestCompleted.results_summary);
        } else {
          setProjectStats(null);
        }
        
        // Show notification if analysis just completed
        if (wasRunning && latestCompleted.status === 'completed') {
          setShowCompletionNotification(true);
          setTimeout(() => setShowCompletionNotification(false), 5000);
        }
        
        // Always fetch responses for the latest completed session
        if (latestCompleted.id) {
          console.log('Fetching responses for completed session:', latestCompleted.id);
          await fetchProjectResponses(latestCompleted.id);
        }
      } else {
        // If no completed session, try to fetch from latest session (even if running)
        const latestSession = sessions?.[0];
        if (latestSession?.id) {
          console.log('No completed session, fetching from latest session:', latestSession.id);
          await fetchProjectResponses(latestSession.id);
        }
        setProjectStats(null);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchProjectResponses = async (sessionId: string) => {
    try {
      console.log('Fetching responses from ai_platform_responses table for session:', sessionId);
      const { data: responses, error } = await supabase
        .from('ai_platform_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching responses:', error);
        throw error;
      }
      
      console.log('Fetched responses:', responses?.length || 0, 'responses');
      if (responses && responses.length > 0) {
        console.log('Sample response:', {
          id: responses[0].id,
          platform: responses[0].platform,
          prompt: responses[0].prompt?.substring(0, 50),
          hasResponse: !!responses[0].response,
          hasMetadata: !!responses[0].response_metadata
        });
      }
      
      setProjectResponses(responses || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      setProjectResponses([]);
    }
  };

  const fetchBrandSummary = async () => {
    if (!selectedProject || !selectedProject.website_url || !selectedProject.brand_name) {
      setBrandSummary(null);
      return;
    }

    setLoadingBrandSummary(true);
    try {
      // Always fetch a fresh summary from the edge function (no cache)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/brand-analysis-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          url: normalizeUrl(selectedProject.website_url || ''),
          brandName: selectedProject.brand_name,
          industry: selectedProject.industry || '',
          keywords: selectedProject.keywords || []
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch brand summary');
      }

      const data = await response.json();
      setBrandSummary(data);
      
      // Refresh project data to get the newly saved summary
      if (selectedProject.id) {
        const { data: updatedProject } = await supabase
          .from('brand_analysis_projects')
          .select('brand_summary, brand_summary_updated_at')
          .eq('id', selectedProject.id)
          .single();
        
        if (updatedProject) {
          setSelectedProject({ ...selectedProject, ...updatedProject });
        }
      }
      
      console.log('✅ Brand summary loaded:', data);
    } catch (error) {
      console.error('Error fetching brand summary:', error);
      setBrandSummary(null);
    } finally {
      setLoadingBrandSummary(false);
    }
  };

  const getProjectSession = (projectId: string): Session | null => {
    return projectSessions.find(s => s.project_id === projectId) || null;
  };

  const fetchHistorySessions = async (projectId: string) => {
    setHistorySessionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });
      if (error) throw error;
      setHistorySessions((data || []) as Session[]);
    } catch (error) {
      console.error('Error fetching history sessions:', error);
      setHistorySessions([]);
    } finally {
      setHistorySessionsLoading(false);
    }
  };

  const fetchHistorySessionResponses = async (sessionId: string) => {
    setHistoryLoading(true);
    setHistorySessionId(sessionId);
    try {
      const { data: responses, error } = await supabase
        .from('ai_platform_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryResponses(responses || []);
    } catch (error) {
      console.error('Error fetching history responses:', error);
      setHistoryResponses([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistorySession = async (sessionId: string) => {
    setHistorySessionId(sessionId);
    const session = historySessions.find(s => s.id === sessionId) || projectSessions.find(s => s.id === sessionId);
    if (session?.results_summary) {
      setProjectStats(session.results_summary);
    }
    await fetchProjectResponses(sessionId);
    setShowHistoryModal(false);
  };

  const fetchDomainIntelligenceJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('domain_intelligence_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDomainIntelligenceJobs(data || []);
    } catch (error) {
      console.error('Error fetching domain intelligence jobs:', error);
      setDomainIntelligenceJobs([]);
    }
  };

  const getDomainIntelligenceStats = (job: any) => {
    if (!job?.results) {
      console.log('⚠️ No results found for job:', job?.id);
      return { mentions: 0, visibility: 0, sentiment: 0 };
    }

    const aiVisibility = job.results.aiVisibility || {};
    console.log('📊 AI Visibility data:', {
      hasAiVisibility: !!job.results.aiVisibility,
      totalQueries: aiVisibility.total_queries,
      totalMentions: aiVisibility.total_mentions,
      overallScore: aiVisibility.overallScore,
      platforms: Object.keys(aiVisibility.platforms || aiVisibility.platform_results || {})
    });

    const totalQueries = aiVisibility.total_queries || 0;
    const mentions = aiVisibility.total_mentions || 0;
    const visibility = totalQueries > 0 ? (mentions / totalQueries) * 100 : (aiVisibility.overallScore || 0);

    return {
      mentions,
      visibility: Math.round(visibility),
      sentiment: aiVisibility.avg_sentiment || 0
    };
  };

  const getProjectStats = (projectId: string) => {
    const session = getProjectSession(projectId);
    
    // Log for debugging
    if (!session) {
      console.log(`No session found for project ${projectId}`);
      return { mentions: 0, visibility: 0, sentiment: 0 };
    }
    
    // Allow stats from completed sessions, or from latest session if it has summary data
    if (session.status === 'completed' || (session.results_summary && session.results_summary.total_mentions !== undefined)) {
    const summary = session.results_summary || {};
    const totalQueries = summary.total_queries || 0;
    const mentions = summary.total_mentions || 0;
    const visibility = totalQueries > 0 ? (mentions / totalQueries) * 100 : 0;
      
      const stats = {
      mentions,
      visibility: Math.round(visibility),
      sentiment: summary.avg_sentiment || 0
    };
      
      console.log(`Stats for project ${projectId}:`, {
        status: session.status,
        mentions: stats.mentions,
        visibility: stats.visibility,
        hasSummary: !!session.results_summary
      });
      
      return stats;
    }
    
    console.log(`Session for project ${projectId} not ready:`, {
      status: session.status,
      hasSummary: !!session.results_summary
    });
    
    return { mentions: 0, visibility: 0, sentiment: 0 };
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the analysis for "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingProject(projectId);
    setOpenDropdown(null);

    try {
      // Delete the project (cascade will delete related sessions and responses)
      const { error } = await supabase
        .from('brand_analysis_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      // Refresh projects list
      await fetchProjects();
      
      // If the deleted project was selected, go back to projects view
      if (selectedProject?.id === projectId) {
        setViewMode('projects');
        setSelectedProject(null);
        router.push('/dashboard/ai-visibility', { scroll: false });
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Failed to delete project: ${error.message}`);
    } finally {
      setDeletingProject(null);
    }
  };

  const handleAnalyze = async () => {
      if (!brandName.trim() || !websiteUrl.trim() || !industry) {
        alert("Please fill in all required fields");
        return;
      }

    if (selectedPlatforms.length === 0) {
      alert("Please select at least one AI platform");
      return;
    }

    setIsAnalyzing(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase configuration missing");
      }

      // Step 1: Create/update project first (without description/image yet)
      const response = await fetch("/api/ai-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          websiteUrl,
          industry,
          keywords,
          competitors: competitors.map(c => typeof c === 'string' ? c : { name: c.name, domain: c.domain }),
          platforms: selectedPlatforms,
          companyDescription: '',
          companyImageUrl: '',
          fetchGSCKeywords,
          analysisLanguages,
          analysisCountries,
          queriesPerPlatform: Math.min(50, Math.max(1, queriesPerPlatform)),
          queryMode,
          manualQueries,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      // Step 2: Call brand-analysis-summary to get description and favicon (replaces crawler)
      console.log('📊 Generating brand summary...');
      let companyDescription = '';
      let companyImageUrl = '';

      try {
        const summaryResponse = await fetch(`${supabaseUrl}/functions/v1/brand-analysis-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            projectId: data.projectId,
            url: normalizeUrl(websiteUrl),
            brandName: brandName,
            industry: industry || '',
            keywords: keywords || []
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          console.log('✅ Brand summary generated successfully');
          
          // Extract truncated overview (5 lines) for card display
          if (summaryData.summary?.overview) {
            companyDescription = summaryData.summary.overview
              .split('\n')
              .slice(0, 5)
              .join('\n');
          }
          companyImageUrl = summaryData.favicon || '';
          
          // Update project with truncated overview and favicon for cards
          // The full summary is already saved in brand_summary column by the edge function
          if (companyDescription || companyImageUrl) {
            await supabase
              .from('brand_analysis_projects')
              .update({
                company_description: companyDescription,
                company_image_url: companyImageUrl,
              })
              .eq('id', data.projectId);
          }
        } else {
          console.warn('⚠️ Brand summary generation failed, continuing without description/image');
        }
      } catch (summaryError) {
        console.error('❌ Error generating brand summary:', summaryError);
        // Continue even if summary generation fails
      }

      // Refresh projects and open the new project so user can run analysis immediately
      await fetchProjects();
      const { data: newProject } = await supabase
        .from('brand_analysis_projects')
        .select('*')
        .eq('id', data.projectId)
        .single();
      if (newProject) {
        setSelectedProject(newProject);
        setViewMode('details');
        router.push(`/dashboard/ai-visibility?project=${data.projectId}`, { scroll: false });
        await fetchProjectDetails(data.projectId);
      } else {
        setViewMode('projects');
      }
      
    // Reset form
    setCurrentStep(1);
    setBrandName("");
    setWebsiteUrl("");
    setIndustry("Marketing");
    setManualCompetitors([]);
    setSuggestedCompetitors([]);
    setManualKeywords([]);
    setSuggestedKeywords([]);
    setSelectedPlatforms(["perplexity", "chatgpt"]);
    setHasAutoGeneratedAI(false);
    setFetchGSCKeywords(false);
    setAnalysisLanguages([]);
    setAnalysisCountries([]);
    setQueriesPerPlatform(50);
    setQueryMode('auto');
    setManualQueries([]);
    setNewManualQueryText('');
    setNewManualQueryLanguage('en-US');
    setNewManualQueryCountry('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunAnalysis = async (project: Project) => {
    if (!project.active_platforms || project.active_platforms.length === 0) {
      alert("Please configure at least one AI platform for this project");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Get Supabase URL and session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to run analysis");
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase configuration missing");
      }

      // Step 1: Generate a fresh brand summary (requires URL and brand name)
      console.log('📊 Generating fresh brand summary...');
      let summaryData = null;
      const normalizedUrl = normalizeUrl(project.website_url || '');
      if (normalizedUrl && project.brand_name) {
        try {
          const summaryResponse = await fetch(`${supabaseUrl}/functions/v1/brand-analysis-summary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              projectId: project.id,
              url: normalizedUrl,
              brandName: project.brand_name,
              industry: project.industry || '',
              keywords: project.keywords || []
            }),
          });

          if (summaryResponse.ok) {
            summaryData = await summaryResponse.json();
            console.log('✅ Brand summary generated successfully');
            
            setBrandSummary(summaryData);
            
            if (summaryData.summary?.overview) {
              const truncatedOverview = summaryData.summary.overview
                .split('\n')
                .slice(0, 5)
                .join('\n');
              
              await supabase
                .from('brand_analysis_projects')
                .update({
                  company_description: truncatedOverview,
                  company_image_url: summaryData.favicon || null,
                })
                .eq('id', project.id);
            }
          } else {
            console.warn('⚠️ Brand summary generation failed, continuing with analysis');
          }
        } catch (summaryError) {
          console.error('❌ Error generating brand summary:', summaryError);
        }
      } else {
        console.log('⏭️ Skipping brand summary — no website URL or brand name available');
      }

      // Step 2: Call the brand-analysis edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/brand-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          platforms: project.active_platforms,
          language: language || 'en',
          languages: project.analysis_languages ?? [],
          countries: project.analysis_countries ?? [],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Analysis failed to start");
      }

      // If analysis already running for this project, show same modal and refresh so UI shows "running"
      if (data.alreadyRunning) {
        setAnalysisStartInfo({ ...data, message: data.message || "Analysis already running for this project." });
        setShowAnalysisStartModal(true);
        setShowAnalysisStartNotification(true);
        setTimeout(() => setShowAnalysisStartNotification(false), 5000);
        await fetchProjects();
        if (selectedProject?.id === project.id) {
          await fetchProjectDetails(project.id, true);
        }
        return;
      }

      // Store analysis info and show modal
      setAnalysisStartInfo(data);
      setShowAnalysisStartModal(true);

      // Show notification banner
      setShowAnalysisStartNotification(true);
      setTimeout(() => setShowAnalysisStartNotification(false), 5000);

      // Note: Don't clear brand summary - we want to keep showing it during analysis

      // Refresh projects to show updated status
      await fetchProjects();
      
      // If this project is selected, refresh its details but preserve brand summary
      if (selectedProject?.id === project.id) {
        await fetchProjectDetails(project.id, true);
      }
    } catch (error: any) {
      console.error('Error starting analysis:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openConfigureModal = async (project: Project, responsesFromState?: any[]) => {
    setSelectedProject(project);
    let responses = responsesFromState ?? [];
    if (responses.length === 0) {
      const { data: sessions } = await supabase
        .from('brand_analysis_sessions')
        .select('id')
        .eq('project_id', project.id)
        .order('started_at', { ascending: false })
        .limit(1);
      const sessionId = sessions?.[0]?.id;
      if (sessionId) {
        const { data: res } = await supabase
          .from('ai_platform_responses')
          .select('*')
          .eq('session_id', sessionId);
        responses = res || [];
      }
    }
    const manualList = Array.isArray(project.manual_queries)
      ? project.manual_queries.map((q: any) => ({
          text: (typeof q === 'string' ? q : q?.text ?? '').trim(),
          language: typeof q === 'object' && q?.language ? q.language : undefined,
          country: typeof q === 'object' && q?.country ? q.country : undefined,
        }))
      : [];
    const manualTextSet = new Set(manualList.map((m) => m.text));
    let initialQueries: Array<{ text: string; language?: string; country?: string; isManual?: boolean }> = [];
    if (responses.length > 0) {
      const seen = new Set<string>();
      responses.forEach((r: any) => {
        const p = r.prompt?.trim?.();
        if (p && !seen.has(p)) {
          seen.add(p);
          const manualEntry = manualList.find((m) => m.text === p);
          const isManual = manualTextSet.has(p);
          initialQueries.push({
            text: p,
            language: manualEntry?.language,
            country: manualEntry?.country,
            isManual,
          });
        }
      });
    }
    if (initialQueries.length === 0) {
      initialQueries = manualList.map((m) => ({ ...m, isManual: true }));
    }
    setConfigQueryMode((project.query_mode as 'auto' | 'manual' | 'auto_manual') || 'auto');
    setConfigManualQueries(initialQueries);
    setConfigPlatforms(project.active_platforms?.length ? [...project.active_platforms] : ['perplexity', 'chatgpt']);
    setConfigProjectName(project.brand_name || '');
    setConfigLanguages(Array.isArray(project.analysis_languages) ? [...project.analysis_languages] : []);
    setConfigCountries(Array.isArray(project.analysis_countries) ? [...project.analysis_countries] : []);
    if (responses.length > 0 && initialQueries.length > 0) {
      setConfigQueryMode('manual');
    }
    setShowConfigureModal(true);
  };

  const handleSaveConfigure = async () => {
    if (!selectedProject?.id) return;
    setConfigSaving(true);
    try {
      const originalLanguages = new Set(selectedProject.analysis_languages ?? []);
      const originalCountries = new Set(selectedProject.analysis_countries ?? []);
      const hasNewLanguages = configLanguages.some(lang => !originalLanguages.has(lang));
      const hasNewCountries = configCountries.some(country => !originalCountries.has(country));

      // When new languages/countries are added, use auto_manual so the edge function
      // generates new queries in the new languages alongside existing manual ones
      const effectiveQueryMode = (hasNewLanguages || hasNewCountries) ? 'auto_manual' : 'manual';

      const res = await fetch('/api/ai-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          brandName: configProjectName.trim() || selectedProject.brand_name,
          queryMode: effectiveQueryMode,
          manualQueries: configManualQueries
            .filter((q) => q.text.trim())
            .map(({ text, language, country }) => ({ text, language, country })),
          platforms: configPlatforms.length > 0 ? configPlatforms : selectedProject.active_platforms,
          analysisLanguages: configLanguages,
          analysisCountries: configCountries,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      await fetchProjectDetails(selectedProject.id, true);
      await fetchProjects();
      setShowConfigureModal(false);

      if (hasNewLanguages || hasNewCountries) {
        const updatedProject: Project = {
          ...selectedProject,
          brand_name: configProjectName.trim() || selectedProject.brand_name,
          analysis_languages: configLanguages,
          analysis_countries: configCountries,
          active_platforms: configPlatforms.length > 0 ? configPlatforms : selectedProject.active_platforms,
          manual_queries: configManualQueries
            .filter(q => q.text.trim())
            .map(({ text, language, country }) => ({ text, language, country })),
        };
        handleRunAnalysis(updatedProject);
      }
    } catch (e: any) {
      console.error('Save configure error:', e);
      alert(e?.message || 'Failed to save project');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleProjectClick = (project: Project) => {
    setBrandSummary(null);
    setHistorySessionId(null);
    setSelectedProject(project);
    fetchProjectDetails(project.id);
    setViewMode('details');
    router.push(`/dashboard/ai-visibility?project=${project.id}`, { scroll: false });
  };

  const handleStopAnalysis = async (sessionId: string, projectId: string) => {
    if (!confirm('Are you sure you want to stop this analysis? Progress will be saved but no new queries will be processed.')) {
        return;
      }

    setStoppingAnalysis(sessionId);
      try {
      const { error } = await supabase
          .from('brand_analysis_sessions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          results_summary: {
            cancelled: true,
            cancelled_at: new Date().toISOString(),
            partial_results: true
          }
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Refresh data
      await fetchProjects();
      if (selectedProject && selectedProject.id === projectId) {
        await fetchProjectDetails(projectId);
      }
    } catch (error) {
      console.error('Error stopping analysis:', error);
      alert('Failed to stop analysis. Please try again.');
    } finally {
      setStoppingAnalysis(null);
    }
  };

  const handlePauseAnalysis = async (sessionId: string, projectId: string) => {
    setPausingAnalysis(sessionId);
    setShowProjectDetailsSettings(false);
    try {
      const { error } = await supabase
        .from('brand_analysis_sessions')
        .update({
          status: 'paused',
          results_summary: {
            paused: true,
            paused_at: new Date().toISOString(),
            partial_results: true
          }
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Refresh data
      await fetchProjects();
      if (selectedProject && selectedProject.id === projectId) {
        await fetchProjectDetails(projectId);
      }
    } catch (error) {
      console.error('Error pausing analysis:', error);
      alert('Failed to pause analysis. Please try again.');
    } finally {
      setPausingAnalysis(null);
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (!selectedProject) return;
    
    setShowExportDropdown(false);
    
    try {
      const latestSession = projectSessions.find(s => s.project_id === selectedProject.id && s.status === 'completed');
      if (!latestSession) {
        alert('No completed analysis found. Please wait for the analysis to complete.');
        return;
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      const lineHeight = 6;

      const PURPLE = { r: 147, g: 51, b: 234 };       // #9333ea
      const PURPLE_DARK = { r: 107, g: 33, b: 168 };   // #6b21a8
      const GRAY_700 = { r: 55, g: 65, b: 81 };
      const GRAY_500 = { r: 107, g: 114, b: 128 };
      const GRAY_400 = { r: 156, g: 163, b: 175 };
      const GREEN = { r: 16, g: 185, b: 129 };
      const RED = { r: 239, g: 68, b: 68 };
      const BLUE = { r: 59, g: 130, b: 246 };
      const AMBER = { r: 245, g: 158, b: 11 };

      // ---------- Preload GeoRepute logo ----------
      let geoReputeLogoData: string | null = null;
      try {
        const logoImg = document.createElement('img') as HTMLImageElement;
        logoImg.crossOrigin = 'anonymous';
        geoReputeLogoData = await new Promise<string | null>((resolve) => {
          const t = setTimeout(() => resolve(null), 4000);
          logoImg.onload = () => {
            clearTimeout(t);
            try {
              const c = document.createElement('canvas');
              c.width = 400; c.height = 400;
              const ctx = c.getContext('2d');
              if (!ctx) { resolve(null); return; }
              ctx.drawImage(logoImg, 0, 0, 400, 400);
              resolve(c.toDataURL('image/png', 0.95));
            } catch { resolve(null); }
          };
          logoImg.onerror = () => { clearTimeout(t); resolve(null); };
          logoImg.src = '/logo.png';
        });
      } catch { /* ignore */ }

      // ---------- Preload brand logo ----------
      const LOGO_PDF_SIZE_PX = 240;
      const upscaleLogoForPdf = (dataUrl: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const img = document.createElement('img') as HTMLImageElement;
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = LOGO_PDF_SIZE_PX;
              canvas.height = LOGO_PDF_SIZE_PX;
              const ctx = canvas.getContext('2d');
              if (!ctx) { resolve(dataUrl); return; }
              ctx.drawImage(img, 0, 0, LOGO_PDF_SIZE_PX, LOGO_PDF_SIZE_PX);
              resolve(canvas.toDataURL('image/png', 0.95));
            } catch { resolve(dataUrl); }
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
      };

      const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
        const tryFetch = async (fetchUrl: string): Promise<string | null> => {
          try {
            const resp = await fetch(fetchUrl, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(5000) });
            if (!resp.ok) return null;
            const blob = await resp.blob();
            return await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result as string);
              reader.onerror = () => rej(new Error('read failed'));
              reader.readAsDataURL(blob);
            });
          } catch { return null; }
        };
        let dataUrl = await tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (!dataUrl) dataUrl = await tryFetch(url);
        if (dataUrl) return upscaleLogoForPdf(dataUrl);
        return new Promise((resolve) => {
          const img = document.createElement('img') as HTMLImageElement;
          img.crossOrigin = 'anonymous';
          const t = setTimeout(() => resolve(null), 5000);
          img.onload = () => {
            clearTimeout(t);
            try {
              const c = document.createElement('canvas');
              c.width = LOGO_PDF_SIZE_PX; c.height = LOGO_PDF_SIZE_PX;
              const ctx = c.getContext('2d');
              if (ctx) { ctx.drawImage(img, 0, 0, LOGO_PDF_SIZE_PX, LOGO_PDF_SIZE_PX); resolve(c.toDataURL('image/png', 0.95)); }
              else resolve(null);
            } catch { resolve(null); }
          };
          img.onerror = () => { clearTimeout(t); resolve(null); };
          img.src = url;
        });
      };

      let brandLogoData: string | null = null;
      if (selectedProject.company_image_url) {
        try { brandLogoData = await loadImageAsDataUrl(selectedProject.company_image_url); } catch { /* ignore */ }
      }

      // ---------- Helper: header / footer on every page ----------
      const HEADER_HEIGHT = 18;
      const FOOTER_HEIGHT = 14;
      const contentTop = margin + HEADER_HEIGHT;
      const contentBottom = pageHeight - FOOTER_HEIGHT;

      const addPageHeader = () => {
        doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
        doc.rect(0, 0, pageWidth, 14, 'F');
        if (geoReputeLogoData) {
          try { doc.addImage(geoReputeLogoData, 'PNG', margin, 2.5, 9, 9); } catch { /* ignore */ }
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('GEORepute.ai', geoReputeLogoData ? margin + 11 : margin, 8.5);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('AI Visibility Intelligence Platform', pageWidth - margin, 8.5, { align: 'right' });
        doc.setDrawColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
        doc.setLineWidth(0.5);
        doc.line(0, 14, pageWidth, 14);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      };

      const addPageFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 10;
        doc.setDrawColor(GRAY_400.r, GRAY_400.g, GRAY_400.b);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.text('Confidential - Generated by GEORepute.ai', margin, footerY);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, footerY, { align: 'right' });
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      };

      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > contentBottom) {
          doc.addPage();
          addPageHeader();
          yPos = contentTop;
        }
      };

      // ---------- Helpers: styled drawing ----------
      const drawSectionTitle = (title: string) => {
        checkPageBreak(14);
        doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
        doc.roundedRect(margin, yPos - 1, contentWidth, 8, 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 4, yPos + 5);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        yPos += 11;
      };

      const drawSubsectionTitle = (title: string) => {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
        doc.text(title, margin, yPos);
        yPos += 1.5;
        doc.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b);
        doc.setLineWidth(0.4);
        doc.line(margin, yPos, margin + doc.getTextWidth(title), yPos);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        yPos += 4;
      };

      const drawKeyValue = (label: string, value: string, indent: number = 0) => {
        checkPageBreak(lineHeight);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.text(label, margin + indent, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.text(value, margin + indent + doc.getTextWidth(label) + 2, yPos);
        yPos += lineHeight;
      };

      const drawMetricCard = (x: number, y: number, w: number, h: number, label: string, value: string, color: { r: number; g: number; b: number }) => {
        doc.setFillColor(color.r, color.g, color.b);
        doc.roundedRect(x, y, w, h, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text(label, x + w / 2, y + 5, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + w / 2, y + 14, { align: 'center' });
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      };

      const drawTableHeader = (cols: { x: number; label: string }[], endX: number) => {
        doc.setFillColor(245, 243, 255);
        doc.rect(cols[0].x, yPos - 4, endX - cols[0].x, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
        cols.forEach(c => doc.text(c.label, c.x, yPos));
        yPos += 1;
        doc.setDrawColor(PURPLE.r, PURPLE.g, PURPLE.b);
        doc.setLineWidth(0.4);
        doc.line(cols[0].x, yPos, endX, yPos);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        yPos += 4;
      };

      const drawTableRow = (cols: { x: number; text: string; wrap?: boolean; maxWidth?: number }[], endX: number, isAlternate: boolean) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const rowLineH = 3.5;
        let maxLines = 1;
        const colLines: string[][] = cols.map((c, i) => {
          const nextX = i < cols.length - 1 ? cols[i + 1].x : endX;
          const colW = (c.maxWidth != null ? c.maxWidth : Math.max(1, nextX - c.x - 2));
          const lines: string[] = doc.splitTextToSize(c.text || '', colW);
          if (c.wrap) {
            if (lines.length > maxLines) maxLines = lines.length;
            return lines.slice(0, 5);
          }
          return [lines[0] || ''];
        });
        maxLines = Math.min(Math.max(maxLines, 1), 5);
        const rowH = maxLines * rowLineH + 3;
        checkPageBreak(rowH + 2);
        if (isAlternate) {
          doc.setFillColor(250, 250, 255);
          doc.rect(cols[0].x, yPos - 3.5, endX - cols[0].x, rowH, 'F');
        }
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        colLines.forEach((lines, i) => {
          let lineY = yPos;
          lines.forEach((line) => {
            doc.text(line, cols[i].x, lineY);
            lineY += rowLineH;
          });
        });
        yPos += rowH - 2;
        doc.setDrawColor(230, 230, 235);
        doc.setLineWidth(0.1);
        doc.line(cols[0].x, yPos, endX, yPos);
        yPos += 2.5;
      };

      // ---------- Chart helper ----------
      const createChartImage = async (
        type: 'pie' | 'bar' | 'stackedBar' | 'horizontalBar' | 'groupedBar' | 'groupedHorizontalBar' | 'multiDatasetBar',
        data: any,
        labels: string[],
        title: string,
        width: number = 700,
        height: number = 400
      ): Promise<string | null> => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          let chartConfig: any;
          const chartColors = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'];
          const titleOpts = { display: true, text: title, font: { size: 15, weight: 'bold' as const }, color: '#1f2937', padding: { bottom: 15 } };
          const legendOpts = { display: true, position: 'top' as const, labels: { font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' as const } };

          if (type === 'pie') {
            const arr = data as { name: string; value: number }[];
            chartConfig = {
              type: 'doughnut',
              data: {
                labels,
                datasets: [{ data: arr.map(d => d.value), backgroundColor: arr.map((_, i) => chartColors[i % chartColors.length]), borderColor: '#ffffff', borderWidth: 3 }],
              },
              options: {
                responsive: false, maintainAspectRatio: false,
                plugins: { title: titleOpts, legend: { display: true, position: 'right', labels: { font: { size: 12 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
              },
            };
          } else if (type === 'bar') {
            const values = (data as number[]).map(d => (typeof d === 'object' && d !== null && 'value' in d) ? (d as { value: number }).value : d);
            chartConfig = {
              type: 'bar',
              data: { labels, datasets: [{ label: title, data: values, backgroundColor: chartColors.slice(0, labels.length), borderRadius: 6, borderSkipped: false }] },
              options: { responsive: false, maintainAspectRatio: false, plugins: { title: titleOpts, legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } },
            };
          } else if (type === 'stackedBar') {
            const { mentioned, missed } = data as { mentioned: number[]; missed: number[] };
            chartConfig = {
              type: 'bar',
              data: { labels, datasets: [
                { label: 'Mentioned', data: mentioned, backgroundColor: '#10b981', borderRadius: 4, borderSkipped: false },
                { label: 'Not Mentioned', data: missed, backgroundColor: '#ef4444', borderRadius: 4, borderSkipped: false },
              ] },
              options: { responsive: false, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: '#f3f4f6' } } }, plugins: { title: titleOpts, legend: legendOpts } },
            };
          } else if (type === 'horizontalBar') {
            const items = data as { name: string; value: number; isBrand?: boolean }[];
            chartConfig = {
              type: 'bar',
              data: { labels: items.map(d => d.name), datasets: [{ label: 'Visibility %', data: items.map(d => d.value), backgroundColor: items.map(d => d.isBrand ? '#9333ea' : '#3b82f6'), borderRadius: 6, borderSkipped: false }] },
              options: { indexAxis: 'y' as const, responsive: false, maintainAspectRatio: false, plugins: { title: titleOpts, legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#f3f4f6' } }, y: { grid: { display: false } } } },
            };
          } else if (type === 'groupedBar') {
            const datasets = (data as { label: string; values: number[]; color: string }[]).map(ds => ({
              label: ds.label, data: ds.values, backgroundColor: ds.color, borderRadius: 4, borderSkipped: false,
            }));
            chartConfig = {
              type: 'bar',
              data: { labels, datasets },
              options: { responsive: false, maintainAspectRatio: false, plugins: { title: titleOpts, legend: legendOpts }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } },
            };
          } else if (type === 'groupedHorizontalBar') {
            const datasets = (data as { label: string; values: number[]; color: string }[]).map(ds => ({
              label: ds.label, data: ds.values, backgroundColor: ds.color, borderRadius: 4, borderSkipped: false,
            }));
            chartConfig = {
              type: 'bar',
              data: { labels, datasets },
              options: { indexAxis: 'y' as const, responsive: false, maintainAspectRatio: false, plugins: { title: titleOpts, legend: legendOpts }, scales: { x: { beginAtZero: true, grid: { color: '#f3f4f6' } }, y: { grid: { display: false } } } },
            };
          } else if (type === 'multiDatasetBar') {
            const dsInput = data as { label: string; values: number[]; color: string }[];
            const datasets = dsInput.map(ds => ({ label: ds.label, data: ds.values, backgroundColor: ds.color, borderRadius: 6, borderSkipped: false }));
            chartConfig = {
              type: 'bar',
              data: { labels, datasets },
              options: { responsive: false, maintainAspectRatio: false, plugins: { title: titleOpts, legend: legendOpts }, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } },
            };
          } else {
            return null;
          }

          const chart = new Chart(ctx, chartConfig);
          await new Promise(resolve => setTimeout(resolve, 500));
          const imageData = canvas.toDataURL('image/png', 0.95);
          chart.destroy();
          canvas.remove();
          return imageData;
        } catch (error) {
          console.error('Error creating chart:', error);
          return null;
        }
      };

      // =====================================================
      //  PAGE 1 — COVER PAGE
      // =====================================================
      // Purple gradient header block
      doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
      doc.rect(0, 0, pageWidth, 90, 'F');
      doc.setFillColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
      doc.rect(0, 0, pageWidth, 50, 'F');

      // GeoRepute logo on cover
      if (geoReputeLogoData) {
        try { doc.addImage(geoReputeLogoData, 'PNG', margin, 12, 22, 22); } catch { /* ignore */ }
      }
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('GEORepute.ai', geoReputeLogoData ? margin + 26 : margin, 27);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('AI Visibility Intelligence Platform', geoReputeLogoData ? margin + 26 : margin, 35);

      // Report title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Visibility Report', margin, 63);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedProject.brand_name, margin, 74);
      const websiteSource = selectedProject.website_url || brandSummary?.sourceUrl || '';
      const extractDomain = (url: string) => {
        if (!url) return '';
        try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch { return url.replace(/^https?:\/\//, '').split('/')[0]; }
      };
      const coverDomain = extractDomain(websiteSource);
      if (coverDomain) {
        doc.setFontSize(10);
        doc.setTextColor(220, 220, 255);
        doc.text(coverDomain, margin, 81);
        doc.setTextColor(255, 255, 255);
      }

      // Thin accent line
      doc.setFillColor(245, 158, 11);
      doc.rect(margin, 84, 40, 2, 'F');

      // Brand logo on cover (right side)
      if (brandLogoData) {
        try { doc.addImage(brandLogoData, 'PNG', pageWidth - margin - 30, 55, 28, 28); } catch { /* ignore */ }
      }

      // Report metadata below header
      yPos = 105;
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const analysisDate = latestSession.completed_at
        ? new Date(latestSession.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : reportDate;

      const metaDomain = coverDomain || 'N/A';
      const metaWebsite = websiteSource || 'N/A';

      const metaItems = [
        ['Brand:', selectedProject.brand_name],
        ['Domain:', metaDomain],
        ['Industry:', selectedProject.industry],
        ['Website:', metaWebsite],
        ['Platforms:', (selectedProject.active_platforms || []).join(', ') || 'N/A'],
        ['Analysis Date:', analysisDate],
        ['Report Generated:', reportDate],
      ];
      metaItems.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.text(label, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.text(value, margin + 40, yPos);
        yPos += 7;
      });

      // Company description on cover
      const overview = brandSummary?.summary?.overview || selectedProject.company_description;
      if (overview) {
        yPos += 3;
        doc.setFillColor(245, 243, 255);
        const descLines = doc.splitTextToSize(overview, contentWidth - 10);
        const visibleLines = descLines.slice(0, 8);
        const descBlockH = visibleLines.length * 4.5 + 10;
        doc.roundedRect(margin, yPos, contentWidth, descBlockH, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
        doc.text('About ' + selectedProject.brand_name, margin + 5, yPos + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.setFontSize(8);
        let descY = yPos + 10;
        visibleLines.forEach((line: string) => {
          doc.text(line, margin + 5, descY);
          descY += 4.5;
        });
        yPos += descBlockH + 3;
      }

      // Confidential notice on cover
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(GRAY_400.r, GRAY_400.g, GRAY_400.b);
      doc.text('This report is confidential and intended solely for the authorized recipient.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text('Generated by GEORepute.ai - AI Visibility Intelligence Platform', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // =====================================================
      //  PAGE 2 — EXECUTIVE SUMMARY
      // =====================================================
      doc.addPage();
      addPageHeader();
      yPos = contentTop;

      drawSectionTitle('Executive Summary');

      // Key metrics
      const totalMentions = projectStats?.total_mentions || projectResponses.filter(r => r.response_metadata?.brand_mentioned).length || 0;
      const totalQueries = projectStats?.total_queries || projectResponses.length || 0;
      const visibilityScore = totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : 0;

      const sentiments = projectResponses
        .filter(r => r.response_metadata?.sentiment_score !== null)
        .map(r => r.response_metadata.sentiment_score);
      const positive = sentiments.filter((s: number) => s > 0.3).length;
      const negative = sentiments.filter((s: number) => s < -0.3).length;
      const neutral = sentiments.filter((s: number) => s >= -0.3 && s <= 0.3).length;
      const avgSentiment = sentiments.length > 0
        ? (sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length).toFixed(2)
        : 'N/A';

      const platformsUsed = [...new Set(projectResponses.map(r => r.platform))];

      // Metric cards row
      const cardW = (contentWidth - 9) / 4;
      const cardH = 20;
      drawMetricCard(margin, yPos, cardW, cardH, 'Visibility Score', `${visibilityScore}%`, PURPLE);
      drawMetricCard(margin + cardW + 3, yPos, cardW, cardH, 'Total Mentions', `${totalMentions}/${totalQueries}`, BLUE);
      drawMetricCard(margin + (cardW + 3) * 2, yPos, cardW, cardH, 'Avg Sentiment', String(avgSentiment), sentiments.length > 0 && Number(avgSentiment) > 0 ? GREEN : sentiments.length > 0 && Number(avgSentiment) < 0 ? RED : GRAY_500);
      drawMetricCard(margin + (cardW + 3) * 3, yPos, cardW, cardH, 'Platforms', `${platformsUsed.length}`, PURPLE_DARK);
      yPos += cardH + 5;

      // Sentiment breakdown
      if (sentiments.length > 0) {
        drawSubsectionTitle('Sentiment Breakdown');
        const sentTotal = sentiments.length;
        const sentBarWidth = contentWidth;
        const sentBarH = 8;
        const posW = (positive / sentTotal) * sentBarWidth;
        const neuW = (neutral / sentTotal) * sentBarWidth;
        const negW = (negative / sentTotal) * sentBarWidth;
        doc.setFillColor(GREEN.r, GREEN.g, GREEN.b);
        doc.roundedRect(margin, yPos, posW || 0.1, sentBarH, posW > 2 ? 2 : 0, posW > 2 ? 2 : 0, 'F');
        doc.setFillColor(GRAY_400.r, GRAY_400.g, GRAY_400.b);
        doc.rect(margin + posW, yPos, neuW, sentBarH, 'F');
        doc.setFillColor(RED.r, RED.g, RED.b);
        if (negW > 2) doc.roundedRect(margin + posW + neuW, yPos, negW, sentBarH, 2, 2, 'F');
        else doc.rect(margin + posW + neuW, yPos, negW, sentBarH, 'F');
        yPos += sentBarH + 3;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GREEN.r, GREEN.g, GREEN.b);
        doc.text(`Positive: ${positive} (${sentTotal > 0 ? Math.round((positive / sentTotal) * 100) : 0}%)`, margin, yPos);
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.text(`Neutral: ${neutral} (${sentTotal > 0 ? Math.round((neutral / sentTotal) * 100) : 0}%)`, margin + contentWidth / 3, yPos);
        doc.setTextColor(RED.r, RED.g, RED.b);
        doc.text(`Negative: ${negative} (${sentTotal > 0 ? Math.round((negative / sentTotal) * 100) : 0}%)`, margin + (contentWidth * 2) / 3, yPos);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        yPos += 5;
      }

      // Platform performance summary
      if (platformsUsed.length > 0) {
        drawSubsectionTitle('Platform Performance Overview');
        const platCols = [
          { x: margin, label: 'Platform' },
          { x: margin + 50, label: 'Queries' },
          { x: margin + 80, label: 'Mentions' },
          { x: margin + 110, label: 'Mention Rate' },
          { x: margin + 145, label: 'Avg Sentiment' },
        ];
        const platEndX = margin + contentWidth;
        drawTableHeader(platCols, platEndX);

        platformsUsed.forEach((platform, idx) => {
          checkPageBreak(8);
          const pResponses = projectResponses.filter(r => r.platform === platform);
          const pMentions = pResponses.filter(r => r.response_metadata?.brand_mentioned).length;
          const pRate = pResponses.length > 0 ? Math.round((pMentions / pResponses.length) * 100) : 0;
          const pSentiments = pResponses.filter(r => r.response_metadata?.sentiment_score != null).map(r => r.response_metadata.sentiment_score);
          const pAvgSent = pSentiments.length > 0 ? (pSentiments.reduce((a: number, b: number) => a + b, 0) / pSentiments.length).toFixed(2) : 'N/A';
          const platformOption = platformOptions.find(p => p.id === platform);
          drawTableRow([
            { x: margin, text: platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1) },
            { x: margin + 50, text: pResponses.length.toString() },
            { x: margin + 80, text: pMentions.toString() },
            { x: margin + 110, text: `${pRate}%` },
            { x: margin + 145, text: pAvgSent.toString() },
          ], platEndX, idx % 2 === 1);
        });
        yPos += 2;
      }

      // Results summary - avg sentiment, etc.
      if (latestSession.results_summary) {
        const summary = latestSession.results_summary;
        if (summary.avg_sentiment !== undefined) {
          drawKeyValue('Average Sentiment Score: ', `${summary.avg_sentiment}%`);
        }
      }

      // =====================================================
      //  BRAND OVERVIEW (from brandSummary)
      // =====================================================
      if (brandSummary?.summary) {
        checkPageBreak(30);
        drawSectionTitle('Brand Overview');
        const bs = brandSummary.summary;
        if (bs.overview) {
          const overviewLines = doc.splitTextToSize(bs.overview, contentWidth);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          overviewLines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin, yPos);
            yPos += 5;
          });
          yPos += 2;
        }
        const brandDetails = [
          ['Industry:', bs.industry],
          ['Founded:', bs.founded_year],
          ['Headquarters:', bs.headquarters],
          ['Business Model:', bs.business_model],
          ['Typical Clients:', bs.typical_clients],
          ['Brand Essence:', bs.brand_essence],
          ['Key Offerings:', bs.key_offerings],
        ].filter(([, val]) => val && val !== 'unknown');
        if (brandDetails.length > 0) {
          drawSubsectionTitle('Brand Details');
          brandDetails.forEach(([label, value]) => {
            const valStr = String(value);
            if (valStr.length > 100) {
              drawKeyValue(label, '');
              const valLines = doc.splitTextToSize(valStr, contentWidth - 5);
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              valLines.slice(0, 4).forEach((line: string) => {
                checkPageBreak(5);
                doc.text(line, margin + 3, yPos);
                yPos += 4.5;
              });
              yPos += 2;
            } else {
              drawKeyValue(label, valStr);
            }
          });
        }
      }

      // =====================================================
      //  VISUAL ANALYTICS — CHARTS
      // =====================================================
      const chartH = 70;
      try {
        if (projectResponses.length > 0) {
          checkPageBreak(20);
          drawSectionTitle('Visual Analytics');

          // Chart 1: Sentiment Distribution
          if (sentiments.length > 0) {
            const sentimentData = [
              { name: 'Positive', value: positive },
              { name: 'Neutral', value: neutral },
              { name: 'Negative', value: negative },
            ].filter(item => item.value > 0);

            if (sentimentData.length > 0) {
              checkPageBreak(chartH + 5);
              const chartImage = await createChartImage('pie', sentimentData, sentimentData.map(d => d.name), 'Sentiment Distribution', 700, 400);
              if (chartImage) {
                doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
                yPos += chartH + 4;
              }
            }
          }

          // Chart 2: Platform Performance
          const platformChartData = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
            const pResp = projectResponses.filter(r => r.platform === platform);
            const pMent = pResp.filter(r => r.response_metadata?.brand_mentioned).length;
            const rate = pResp.length > 0 ? Math.round((pMent / pResp.length) * 100) : 0;
            const opt = platformOptions.find(p => p.id === platform);
            return { platform: opt?.name || platform.charAt(0).toUpperCase() + platform.slice(1), mentionRate: rate };
          }).sort((a, b) => b.mentionRate - a.mentionRate);

          if (platformChartData.length > 0) {
            checkPageBreak(chartH + 5);
            const chartImage = await createChartImage('bar', platformChartData.map(p => p.mentionRate), platformChartData.map(p => p.platform), 'Platform Performance (Mention Rate %)', 700, 400);
            if (chartImage) {
              doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
              yPos += chartH + 4;
            }
          }

          // Chart 3: Platform Comparison (stacked)
          const stackCompData = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
            const pResp = projectResponses.filter(r => r.platform === platform);
            const mentions = pResp.filter(r => r.response_metadata?.brand_mentioned).length;
            const opt = platformOptions.find(p => p.id === platform);
            return { platform: opt?.name || platform.charAt(0).toUpperCase() + platform.slice(1), mentioned: mentions, missed: pResp.length - mentions };
          });
          if (stackCompData.length > 0) {
            checkPageBreak(chartH + 5);
            const chartImage = await createChartImage('stackedBar', { mentioned: stackCompData.map(p => p.mentioned), missed: stackCompData.map(p => p.missed) }, stackCompData.map(p => p.platform), 'Platform Comparison (Mentioned vs Not Mentioned)', 700, 400);
            if (chartImage) {
              doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
              yPos += chartH + 4;
            }
          }

          // Chart 4: Competitor vs Brand Visibility
          const brandMentions = projectResponses.filter(r => r.response_metadata?.brand_mentioned).length;
          const totalQueriesChart = projectResponses.length;
          const brandVisibility = totalQueriesChart > 0 ? Math.round((brandMentions / totalQueriesChart) * 100) : 0;
          const competitorMentionCount: Record<string, number> = {};
          projectResponses.forEach((response) => {
            const competitorsRaw = response.response_metadata?.competitors_found || [];
            const competitorNames = competitorsRaw.map((comp: string | { name: string }) => {
              if (typeof comp === 'string') {
                if (comp.startsWith('{') && comp.includes('name')) {
                  try { return JSON.parse(comp).name || comp; } catch { return comp; }
                }
                return comp;
              }
              return (comp as { name: string })?.name || String(comp);
            }).filter(Boolean);
            ([...new Set(competitorNames)] as string[]).forEach((c) => {
              competitorMentionCount[c] = (competitorMentionCount[c] || 0) + 1;
            });
          });
          const comparisonChartData = [
            { name: selectedProject?.brand_name || 'Your Brand', value: brandVisibility, isBrand: true },
            ...Object.entries(competitorMentionCount)
              .map(([name, mentions]) => ({ name, value: totalQueriesChart > 0 ? Math.round((mentions / totalQueriesChart) * 100) : 0, isBrand: false }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10),
          ].filter(d => d.value > 0 || d.isBrand);
          if (comparisonChartData.length > 0) {
            checkPageBreak(chartH + 5);
            const chartImage = await createChartImage('horizontalBar', comparisonChartData, [], 'Competitor vs Brand Visibility (%)', 700, 400);
            if (chartImage) {
              doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
              yPos += chartH + 4;
            }
          }

          // Chart 5: Platform Sentiment Analysis (grouped bar — mention rate + avg sentiment per platform)
          const platformSentimentData = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
            const pResp = projectResponses.filter(r => r.platform === platform);
            const pMent = pResp.filter(r => r.response_metadata?.brand_mentioned).length;
            const rate = pResp.length > 0 ? Math.round((pMent / pResp.length) * 100) : 0;
            const pSent = pResp.filter(r => r.response_metadata?.sentiment_score != null).map(r => r.response_metadata.sentiment_score);
            const avgSent = pSent.length > 0 ? Math.round((pSent.reduce((a: number, b: number) => a + b, 0) / pSent.length) * 100) : 0;
            const opt = platformOptions.find(p => p.id === platform);
            return { platform: opt?.name || platform.charAt(0).toUpperCase() + platform.slice(1), rate, avgSent };
          }).sort((a, b) => b.rate - a.rate);

          if (platformSentimentData.length > 1) {
            checkPageBreak(chartH + 5);
            const chartImage = await createChartImage('groupedBar', [
              { label: 'Mention Rate %', values: platformSentimentData.map(d => d.rate), color: '#9333ea' },
              { label: 'Avg Sentiment %', values: platformSentimentData.map(d => Math.max(0, d.avgSent)), color: '#10b981' },
            ], platformSentimentData.map(d => d.platform), 'Platform: Mention Rate vs Sentiment', 700, 400);
            if (chartImage) {
              doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
              yPos += chartH + 4;
            }
          }

          // Chart 6: Top Competitor Mentions (bar chart — how many times each competitor appears)
          const topCompetitors = Object.entries(competitorMentionCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
          if (topCompetitors.length > 0) {
            checkPageBreak(chartH + 5);
            const chartImage = await createChartImage('bar', topCompetitors.map(([, v]) => v), topCompetitors.map(([n]) => n.length > 18 ? n.substring(0, 16) + '..' : n), 'Top Competitor Mentions (Count)', 700, 400);
            if (chartImage) {
              doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
              yPos += chartH + 4;
            }
          }

          // Chart 7: Share of Voice (pie chart from competitor_analysis)
          const sovData = latestSession.competitor_analysis?.share_of_voice;
          if (sovData && sovData.length > 0) {
            const sovPieData = sovData.slice(0, 10).map((sov: any) => {
              const { name } = parseCompetitorNameGlobal(sov.brand);
              return { name, value: sov.share_percentage || sov.mentions || 0 };
            }).filter((d: { name: string; value: number }) => d.value > 0);
            if (sovPieData.length > 0) {
              checkPageBreak(chartH + 5);
              const chartImage = await createChartImage('pie', sovPieData, sovPieData.map((d: { name: string }) => d.name), 'Share of Voice', 700, 400);
              if (chartImage) {
                doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
                yPos += chartH + 4;
              }
            }
          }

          // Chart 8: Competitive Strength Analysis (grouped horizontal bar — market share, sentiment, strength)
          const mpData = latestSession.competitor_analysis?.market_positions;
          if (mpData && mpData.length > 0) {
            const mpLabels: string[] = [];
            const marketShareVals: number[] = [];
            const sentimentVals: number[] = [];
            const strengthVals: number[] = [];
            mpData.slice(0, 8).forEach((pos: any) => {
              const { name } = parseCompetitorNameGlobal(pos.brand);
              mpLabels.push(name.length > 18 ? name.substring(0, 16) + '..' : name);
              marketShareVals.push(Math.round(pos.market_share < 1 ? pos.market_share * 100 : pos.market_share));
              sentimentVals.push(Math.round(pos.sentiment_score < 1 ? pos.sentiment_score * 100 : pos.sentiment_score));
              strengthVals.push(Math.round(pos.competitive_strength < 1 ? pos.competitive_strength * 100 : pos.competitive_strength));
            });
            checkPageBreak(chartH + 5);
            const chartImage = await createChartImage('groupedHorizontalBar', [
              { label: 'Market Share %', values: marketShareVals, color: '#3b82f6' },
              { label: 'Sentiment %', values: sentimentVals, color: '#10b981' },
              { label: 'Competitive Strength %', values: strengthVals, color: '#9333ea' },
            ], mpLabels, 'Competitive Strength Analysis', 700, 400);
            if (chartImage) {
              doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartH);
              yPos += chartH + 4;
            }
          }

          // Chart 9: Sentiment Score Distribution (color-coded bar per range)
          if (sentiments.length > 3) {
            const buckets = [
              { label: 'Very Negative', min: -1, max: -0.6, count: 0, color: '#dc2626' },
              { label: 'Negative', min: -0.6, max: -0.3, count: 0, color: '#ef4444' },
              { label: 'Slightly Neg.', min: -0.3, max: 0, count: 0, color: '#f97316' },
              { label: 'Slightly Pos.', min: 0, max: 0.3, count: 0, color: '#84cc16' },
              { label: 'Positive', min: 0.3, max: 0.6, count: 0, color: '#10b981' },
              { label: 'Very Positive', min: 0.6, max: 1.01, count: 0, color: '#059669' },
            ];
            sentiments.forEach((s: number) => {
              for (const b of buckets) { if (s >= b.min && s < b.max) { b.count++; break; } }
            });
            const filledBuckets = buckets.filter(b => b.count > 0);
            if (filledBuckets.length > 1) {
              checkPageBreak(chartH + 5);
              const canvas = document.createElement('canvas');
              canvas.width = 700; canvas.height = 400;
              const ctxH = canvas.getContext('2d');
              if (ctxH) {
                ctxH.fillStyle = '#ffffff';
                ctxH.fillRect(0, 0, 700, 400);
                const histChart = new Chart(ctxH, {
                  type: 'bar',
                  data: {
                    labels: filledBuckets.map(b => b.label),
                    datasets: [{
                      label: 'Responses',
                      data: filledBuckets.map(b => b.count),
                      backgroundColor: filledBuckets.map(b => b.color),
                      borderRadius: 6,
                      borderSkipped: false,
                    }],
                  },
                  options: {
                    responsive: false, maintainAspectRatio: false,
                    plugins: {
                      title: { display: true, text: 'Sentiment Score Distribution', font: { size: 15, weight: 'bold' }, color: '#1f2937', padding: { bottom: 15 } },
                      legend: { display: false },
                    },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Responses', font: { size: 12 } }, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } },
                  },
                });
                await new Promise(resolve => setTimeout(resolve, 500));
                const histImg = canvas.toDataURL('image/png', 0.95);
                histChart.destroy();
                canvas.remove();
                doc.addImage(histImg, 'PNG', margin, yPos, contentWidth, chartH);
                yPos += chartH + 4;
              }
            }
          }
        }
      } catch (chartError) {
        console.error('Error generating charts:', chartError);
      }

      // =====================================================
      //  TOP PERFORMING QUERIES
      // =====================================================
      const topQueries = projectResponses.filter(r => r.response_metadata?.brand_mentioned).slice(0, 10);
      if (topQueries.length > 0) {
        checkPageBreak(30);
        drawSectionTitle('Top Performing Queries');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.text('Queries where your brand was successfully mentioned by AI platforms.', margin, yPos);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        yPos += 6;

        topQueries.forEach((response, idx) => {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const promptText = response.prompt || 'N/A';
          const maxPromptW = contentWidth - 14;
          const promptLines = doc.splitTextToSize(promptText, maxPromptW);
          const lineH = 4;
          const blockH = promptLines.length * lineH + 8;
          checkPageBreak(blockH);
          const isAlt = idx % 2 === 1;
          if (isAlt) {
            doc.setFillColor(250, 250, 255);
            doc.rect(margin, yPos - 3, contentWidth, blockH, 'F');
          }
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
          doc.text(`#${idx + 1}`, margin + 2, yPos);
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          let lineY = yPos;
          promptLines.forEach((line: string) => {
            doc.text(line, margin + 12, lineY);
            lineY += lineH;
          });
          yPos = lineY + 2;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
          const platformOption = platformOptions.find(p => p.id === response.platform);
          const platName = platformOption?.name || response.platform;
          const sentScore = response.response_metadata?.sentiment_score;
          const sentLabel = sentScore != null ? ` | Sentiment: ${sentScore.toFixed(2)}` : '';
          doc.text(`Platform: ${platName}${sentLabel}`, margin + 12, yPos);
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          yPos += 5;
        });
        yPos += 1;
      }

      // =====================================================
      //  KEYWORDS ANALYSIS
      // =====================================================
      const keywords = selectedProject.keywords || [];
      const brandKeywords = brandSummary?.summary?.keywords?.branded || [];
      const nonBrandedKeywords = brandSummary?.summary?.keywords?.nonBranded || [];
      if (keywords.length > 0 || brandKeywords.length > 0 || nonBrandedKeywords.length > 0) {
        checkPageBreak(25);
        drawSectionTitle('Keywords Analysis');

        if (keywords.length > 0) {
          drawSubsectionTitle(`All Keywords (${keywords.length})`);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const kwText = keywords.join('  |  ');
          const kwLines = doc.splitTextToSize(kwText, contentWidth);
          kwLines.slice(0, 6).forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin, yPos);
            yPos += 5;
          });
          yPos += 1;
        }
        if (brandKeywords.length > 0) {
          drawSubsectionTitle(`Branded Keywords (${brandKeywords.length})`);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(PURPLE.r, PURPLE.g, PURPLE.b);
          const bkText = brandKeywords.join('  |  ');
          const bkLines = doc.splitTextToSize(bkText, contentWidth);
          bkLines.slice(0, 4).forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin, yPos);
            yPos += 5;
          });
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          yPos += 1;
        }
        if (nonBrandedKeywords.length > 0) {
          drawSubsectionTitle(`Non-Branded Keywords (${nonBrandedKeywords.length})`);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
          const nbText = nonBrandedKeywords.join('  |  ');
          const nbLines = doc.splitTextToSize(nbText, contentWidth);
          nbLines.slice(0, 4).forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin, yPos);
            yPos += 5;
          });
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          yPos += 1;
        }
      }

      // =====================================================
      //  COMPETITOR ANALYSIS
      // =====================================================
      if (latestSession.competitor_analysis) {
        checkPageBreak(20);
        drawSectionTitle('Competitor Analysis');

        // Rankings table
        if (latestSession.competitor_analysis.rankings && latestSession.competitor_analysis.rankings.length > 0) {
          drawSubsectionTitle('Competitor Rankings');
          const rankCols = [
            { x: margin, label: '#' },
            { x: margin + 10, label: 'Competitor' },
            { x: margin + 75, label: 'Domain' },
            { x: margin + 120, label: 'Mentions' },
            { x: margin + 148, label: 'Score' },
          ];
          const rankEndX = margin + contentWidth;
          drawTableHeader(rankCols, rankEndX);

          latestSession.competitor_analysis.rankings.slice(0, 10).forEach((rank: any, idx: number) => {
            checkPageBreak(8);
            let competitorName = '';
            let competitorDomain = '';
            if (typeof rank.name === 'string') {
              try { const p = JSON.parse(rank.name); competitorName = p.name || rank.name; competitorDomain = p.domain || ''; } catch { competitorName = rank.name; }
            } else if (rank.name && typeof rank.name === 'object') {
              competitorName = rank.name.name || rank.name; competitorDomain = rank.name.domain || '';
            } else { competitorName = String(rank.name || 'N/A'); }
            if (competitorName.length > 40) competitorName = competitorName.substring(0, 37) + '...';
            if (competitorDomain.length > 25) competitorDomain = competitorDomain.substring(0, 22) + '...';

            drawTableRow([
              { x: margin, text: (idx + 1).toString() },
              { x: margin + 10, text: competitorName },
              { x: margin + 75, text: competitorDomain || 'N/A' },
              { x: margin + 120, text: rank.mentions?.toString() || '0' },
              { x: margin + 148, text: rank.ranking_score?.toFixed(2) || '0.00' },
            ], rankEndX, idx % 2 === 1);
          });
          yPos += 2;
        }

        // Market Positioning table
        if (latestSession.competitor_analysis.market_positions && latestSession.competitor_analysis.market_positions.length > 0) {
          checkPageBreak(20);
          drawSubsectionTitle('Market Positioning');
          const mpCols = [
            { x: margin, label: 'Brand' },
            { x: margin + 50, label: 'Positioning' },
            { x: margin + 95, label: 'Market Share' },
            { x: margin + 130, label: 'Sentiment' },
            { x: margin + 155, label: 'Strength' },
          ];
          const mpEndX = margin + contentWidth;
          drawTableHeader(mpCols, mpEndX);

          latestSession.competitor_analysis.market_positions.slice(0, 10).forEach((pos: any, idx: number) => {
            checkPageBreak(8);
            const { name: bn } = parseCompetitorNameGlobal(pos.brand);
            drawTableRow([
              { x: margin, text: bn.substring(0, 35) },
              { x: margin + 50, text: (pos.positioning || 'N/A').substring(0, 25) },
              { x: margin + 95, text: `${typeof pos.market_share === 'number' ? (pos.market_share < 1 ? Math.round(pos.market_share * 100) : Math.round(pos.market_share)) : 0}%` },
              { x: margin + 130, text: pos.sentiment_score != null ? (pos.sentiment_score < 1 ? pos.sentiment_score.toFixed(2) : pos.sentiment_score.toFixed(1)) : 'N/A' },
              { x: margin + 155, text: pos.competitive_strength != null ? `${Math.round((pos.competitive_strength < 1 ? pos.competitive_strength * 100 : pos.competitive_strength))}%` : 'N/A' },
            ], mpEndX, idx % 2 === 1);
          });
          yPos += 2;
        }

        // Share of Voice table
        if (latestSession.competitor_analysis.share_of_voice && latestSession.competitor_analysis.share_of_voice.length > 0) {
          checkPageBreak(20);
          drawSubsectionTitle('Share of Voice');
          const sovCols = [
            { x: margin, label: 'Brand' },
            { x: margin + 70, label: 'Mentions' },
            { x: margin + 110, label: 'Share %' },
          ];
          const sovEndX = margin + contentWidth;
          drawTableHeader(sovCols, sovEndX);

          latestSession.competitor_analysis.share_of_voice.slice(0, 10).forEach((sov: any, idx: number) => {
            checkPageBreak(8);
            const { name: bn } = parseCompetitorNameGlobal(sov.brand);
            drawTableRow([
              { x: margin, text: bn.substring(0, 45) },
              { x: margin + 70, text: sov.mentions?.toString() || '0' },
              { x: margin + 110, text: `${sov.share_percentage || 0}%` },
            ], sovEndX, idx % 2 === 1);
          });
          yPos += 2;
        }

        // Competitive Gaps & Recommendations
        if (latestSession.competitor_analysis.competitive_gaps && latestSession.competitor_analysis.competitive_gaps.length > 0) {
          checkPageBreak(25);
          drawSubsectionTitle('Competitive Gaps & Recommendations');

          latestSession.competitor_analysis.competitive_gaps.forEach((gap: any, idx: number) => {
            checkPageBreak(22);
            const severityColor = gap.severity === 'high' ? RED : gap.severity === 'medium' ? AMBER : BLUE;
            doc.setFillColor(severityColor.r, severityColor.g, severityColor.b);
            doc.rect(margin, yPos - 3, 2, 16, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(severityColor.r, severityColor.g, severityColor.b);
            doc.text(`${(gap.severity || '').toUpperCase()} PRIORITY`, margin + 5, yPos);
            doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
            doc.setFont('helvetica', 'normal');
            doc.text((gap.type || '').replace('_', ' ').toUpperCase(), margin + 40, yPos);
            yPos += 4;
            doc.setFontSize(8);
            doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
            const descLines = doc.splitTextToSize(gap.description || '', contentWidth - 10);
            descLines.slice(0, 2).forEach((line: string) => {
              checkPageBreak(4.5);
              doc.text(line, margin + 5, yPos);
              yPos += 4.5;
            });
            if (gap.recommendation) {
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
              const recLines = doc.splitTextToSize('Recommendation: ' + gap.recommendation, contentWidth - 10);
              recLines.slice(0, 2).forEach((line: string) => {
                checkPageBreak(4.5);
                doc.text(line, margin + 5, yPos);
                yPos += 4.5;
              });
              doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
            }
            yPos += 2;
          });
        }
      }

      // =====================================================
      //  APPLY HEADERS & FOOTERS TO ALL PAGES
      // =====================================================
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        addPageFooter(i, totalPages);
      }
      // Ensure page 1 (cover) doesn't get header but re-apply footer style
      doc.setPage(1);
      // Cover page already has its own footer

      // Save PDF
      const fileName = `AI_Visibility_Report_${selectedProject.brand_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF: ' + (error instanceof Error ? error.message : 'Unknown error. Please try again.'));
    }
  };

  const handleExportCSV = async () => {
    if (!selectedProject) return;
    
    setShowExportDropdown(false);
    
    try {
      const latestSession = projectSessions.find(s => s.project_id === selectedProject.id && s.status === 'completed');
      if (!latestSession) {
        alert('No completed analysis found. Please wait for the analysis to complete.');
        return;
      }

      // Prepare CSV data
      const csvRows: string[] = [];

      // Header
      csvRows.push('AI Visibility Report');
      csvRows.push(`Brand: ${selectedProject.brand_name}`);
      csvRows.push(`Industry: ${selectedProject.industry}`);
      csvRows.push(`Website: ${selectedProject.website_url || 'N/A'}`);
      csvRows.push(`Generated: ${new Date().toLocaleString()}`);
      csvRows.push('');

      // Visibility Score
      const totalMentions = projectStats?.total_mentions || projectResponses.filter(r => r.response_metadata?.brand_mentioned).length || 0;
      const totalQueries = projectStats?.total_queries || projectResponses.length || 0;
      const visibilityScore = totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : 0;
      
      csvRows.push('Visibility Score');
      csvRows.push(`Score,${visibilityScore}%`);
      csvRows.push(`Total Mentions,${totalMentions}`);
      csvRows.push(`Total Queries,${totalQueries}`);
      csvRows.push('');

      // Analytics / Chart data (same as Analytics tab)
      if (projectResponses.length > 0) {
        const sentiments = projectResponses
          .filter(r => r.response_metadata?.sentiment_score !== null)
          .map(r => r.response_metadata.sentiment_score);
        const positive = sentiments.filter(s => s > 0.3).length;
        const negative = sentiments.filter(s => s < -0.3).length;
        const neutral = sentiments.filter(s => s >= -0.3 && s <= 0.3).length;
        csvRows.push('Sentiment Distribution');
        csvRows.push('Sentiment,Count,Percentage');
        const totalSent = sentiments.length;
        if (totalSent > 0) {
          csvRows.push(`Positive,${positive},${Math.round((positive / totalSent) * 100)}%`);
          csvRows.push(`Neutral,${neutral},${Math.round((neutral / totalSent) * 100)}%`);
          csvRows.push(`Negative,${negative},${Math.round((negative / totalSent) * 100)}%`);
        }
        csvRows.push('');

        csvRows.push('Platform Performance');
        csvRows.push('Platform,Mentions,Total Queries,Mention Rate %');
        Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
          const platformResponses = projectResponses.filter(r => r.platform === platform);
          const mentions = platformResponses.filter(r => r.response_metadata?.brand_mentioned).length;
          const total = platformResponses.length;
          const rate = total > 0 ? Math.round((mentions / total) * 100) : 0;
          const platformOption = platformOptions.find(p => p.id === platform);
          const platformName = platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1);
          csvRows.push(`${platformName},${mentions},${total},${rate}%`);
        });
        csvRows.push('');

        csvRows.push('Platform Comparison (Mentioned vs Not Mentioned)');
        csvRows.push('Platform,Mentioned,Not Mentioned,Total');
        Array.from(new Set(projectResponses.map(r => r.platform))).forEach((platform) => {
          const platformResponses = projectResponses.filter(r => r.platform === platform);
          const mentions = platformResponses.filter(r => r.response_metadata?.brand_mentioned).length;
          const total = platformResponses.length;
          const platformOption = platformOptions.find(p => p.id === platform);
          const platformName = platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1);
          csvRows.push(`${platformName},${mentions},${total - mentions},${total}`);
        });
        csvRows.push('');

        const brandMentionsCSV = projectResponses.filter(r => r.response_metadata?.brand_mentioned).length;
        const totalQueriesCSV = projectResponses.length;
        const brandVisibilityCSV = totalQueriesCSV > 0 ? Math.round((brandMentionsCSV / totalQueriesCSV) * 100) : 0;
        const competitorMentionCountCSV: Record<string, number> = {};
        projectResponses.forEach((response) => {
          const competitorsRaw = response.response_metadata?.competitors_found || [];
          const competitorNames = competitorsRaw.map((comp: string | { name: string }) => {
            if (typeof comp === 'string') {
              if (comp.startsWith('{') && comp.includes('name')) {
                try { return JSON.parse(comp).name || comp; } catch { return comp; }
              }
              return comp;
            }
            return (comp as { name: string })?.name || String(comp);
          }).filter(Boolean);
          ([...new Set(competitorNames)] as string[]).forEach((c) => {
            competitorMentionCountCSV[c] = (competitorMentionCountCSV[c] || 0) + 1;
          });
        });
        csvRows.push('Competitor vs Brand Visibility');
        csvRows.push('Brand,Visibility %,Mentions,Total Queries');
        csvRows.push(`${selectedProject?.brand_name || 'Your Brand'},${brandVisibilityCSV}%,${brandMentionsCSV},${totalQueriesCSV}`);
        Object.entries(competitorMentionCountCSV)
          .map(([name, mentions]) => ({ name, visibility: totalQueriesCSV > 0 ? Math.round((mentions / totalQueriesCSV) * 100) : 0, mentions, totalQueries: totalQueriesCSV }))
          .sort((a, b) => b.visibility - a.visibility)
          .slice(0, 15)
          .forEach((row) => csvRows.push(`${row.name},${row.visibility}%,${row.mentions},${row.totalQueries}`));
        csvRows.push('');
      }

      // Results Summary
      if (latestSession.results_summary) {
        csvRows.push('Results Summary');
        const summary = latestSession.results_summary;
        if (summary.avg_sentiment !== undefined) {
          csvRows.push(`Average Sentiment,${summary.avg_sentiment}%`);
        }
        if (summary.platform_breakdown) {
          csvRows.push('Platform Breakdown');
          csvRows.push('Platform,Mentions');
          Object.entries(summary.platform_breakdown).forEach(([platform, data]: [string, any]) => {
            csvRows.push(`${platform},${data.mentions || 0}`);
          });
        }
        csvRows.push('');
      }

      // Competitor Rankings
      if (latestSession.competitor_analysis?.rankings && latestSession.competitor_analysis.rankings.length > 0) {
        csvRows.push('Competitor Rankings');
        csvRows.push('Rank,Name,Mentions,Ranking Score,Sentiment');
        latestSession.competitor_analysis.rankings.forEach((rank: any, idx: number) => {
          csvRows.push(`${idx + 1},${rank.name},${rank.mentions},${rank.ranking_score},${rank.sentiment || 'N/A'}`);
        });
        csvRows.push('');
      }

      // Market Positioning
      if (latestSession.competitor_analysis?.market_positions && latestSession.competitor_analysis.market_positions.length > 0) {
        csvRows.push('Market Positioning');
        csvRows.push('Brand,Positioning,Market Share,Sentiment Score,Competitive Strength');
        latestSession.competitor_analysis.market_positions.forEach((pos: any) => {
          csvRows.push(`${pos.brand},${pos.positioning},${pos.market_share}%,${pos.sentiment_score},${pos.competitive_strength}`);
        });
        csvRows.push('');
      }

      // Share of Voice
      if (latestSession.competitor_analysis?.share_of_voice && latestSession.competitor_analysis.share_of_voice.length > 0) {
        csvRows.push('Share of Voice');
        csvRows.push('Brand,Mentions,Share Percentage');
        latestSession.competitor_analysis.share_of_voice.forEach((sov: any) => {
          csvRows.push(`${sov.brand},${sov.mentions},${sov.share_percentage}%`);
        });
        csvRows.push('');
      }

      // AI Platform Responses
      if (projectResponses.length > 0) {
        csvRows.push('AI Platform Responses');
        csvRows.push('Platform,Query,Brand Mentioned,Sentiment,Response Preview');
        projectResponses.slice(0, 100).forEach((response: any) => {
          const platform = response.platform || 'Unknown';
          const query = (response.query || '').replace(/,/g, ';').substring(0, 100);
          const mentioned = response.response_metadata?.brand_mentioned ? 'Yes' : 'No';
          const sentiment = response.response_metadata?.sentiment_score || 'N/A';
          const preview = (response.response_text || '').replace(/,/g, ';').replace(/\n/g, ' ').substring(0, 200);
          csvRows.push(`${platform},${query},${mentioned},${sentiment},${preview}`);
        });
      }

      // Convert to CSV string and download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `AI_Visibility_Report_${selectedProject.brand_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportPPT = async () => {
    if (!selectedProject) return;
    
    setShowExportDropdown(false);
    
    try {
      const latestSession = projectSessions.find(s => s.project_id === selectedProject.id && s.status === 'completed');
      if (!latestSession) {
        alert('No completed analysis found. Please wait for the analysis to complete.');
        return;
      }

      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      
      // Set presentation properties
      pptx.author = 'GeoRepute.ai';
      pptx.company = 'GeoRepute.ai';
      pptx.title = `AI Visibility Report - ${selectedProject.brand_name}`;
      pptx.subject = 'AI Visibility Analysis';

      // Slide 1: Title Slide with Logo
      const titleSlide = pptx.addSlide();
      
      // Add logo if available (convert to base64 first)
      if (selectedProject.company_image_url) {
        try {
          // Convert image URL to base64
          const logoBase64 = await new Promise<string | null>((resolve) => {
            const img = document.createElement('img') as HTMLImageElement;
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              try {
                const size = 256;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, size, size);
                  const base64 = canvas.toDataURL('image/png', 0.95);
                  resolve(base64);
                } else {
                  resolve(null);
                }
              } catch (error) {
                console.error('Error converting logo to base64:', error);
                resolve(null);
              }
            };
            
            img.onerror = () => {
              // Try fetch method as fallback
              const imageUrl = selectedProject.company_image_url;
              if (imageUrl) {
                fetch(imageUrl, { mode: 'cors', credentials: 'omit' })
                  .then(response => response.blob())
                  .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                  })
                  .catch(() => resolve(null));
              } else {
                resolve(null);
              }
            };
            
            const imageUrl = selectedProject.company_image_url;
            if (imageUrl) {
              img.src = imageUrl;
            } else {
              resolve(null);
            }
          });
          
          if (logoBase64) {
            titleSlide.addImage({
              data: logoBase64,
              x: 7.5,
              y: 0.5,
              w: 1.5,
              h: 1.5,
            });
          }
        } catch (error) {
          console.error('Error adding logo to PPT:', error);
        }
      }

      titleSlide.addText('AI Visibility Report', {
        x: 1,
        y: 2,
        w: 8,
        h: 1,
        fontSize: 44,
        bold: true,
        color: '363636',
      });

      titleSlide.addText(selectedProject.brand_name, {
        x: 1,
        y: 3.2,
        w: 8,
        h: 0.8,
        fontSize: 32,
        color: '9333ea',
      });

      titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: 1,
        y: 4.5,
        w: 8,
        h: 0.5,
        fontSize: 14,
        color: '666666',
      });

      // Slide 2: Project Information
      const infoSlide = pptx.addSlide();
      infoSlide.addText('Project Information', {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.6,
        fontSize: 32,
        bold: true,
        color: '363636',
      });

      const infoData = [
        [{ text: 'Brand Name' }, { text: selectedProject.brand_name }],
        [{ text: 'Industry' }, { text: selectedProject.industry }],
        [{ text: 'Website' }, { text: selectedProject.website_url || 'N/A' }],
        [{ text: 'Platforms' }, { text: selectedProject.active_platforms?.join(', ') || 'N/A' }],
      ];

      infoSlide.addTable(infoData, {
        x: 0.5,
        y: 1.2,
        w: 9,
        colW: [2.5, 6.5],
        border: { type: 'solid', color: 'CCCCCC', pt: 1 },
        fill: { color: 'F5F5F5' },
        fontSize: 14,
      });

      // Add company description if available
      if (selectedProject.company_description) {
        infoSlide.addText('Company Description', {
          x: 0.5,
          y: 3.5,
          w: 9,
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: '363636',
        });

        infoSlide.addText(selectedProject.company_description, {
          x: 0.5,
          y: 4.2,
          w: 9,
          h: 1.5,
          fontSize: 12,
          color: '666666',
          wrap: true,
        });
      }

      // Slide 3: Visibility Score
      const visibilitySlide = pptx.addSlide();
      visibilitySlide.addText('Visibility Score', {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.6,
        fontSize: 32,
        bold: true,
        color: '363636',
      });

      const totalMentions = projectStats?.total_mentions || projectResponses.filter(r => r.response_metadata?.brand_mentioned).length || 0;
      const totalQueries = projectStats?.total_queries || projectResponses.length || 0;
      const visibilityScore = totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : 0;

      // Large visibility score
      visibilitySlide.addText(`${visibilityScore}%`, {
        x: 3,
        y: 1.5,
        w: 4,
        h: 1.5,
        fontSize: 72,
        bold: true,
        color: '9333ea',
        align: 'center',
      });

      visibilitySlide.addText(`Your brand appears in ${totalMentions} of ${totalQueries} prompts`, {
        x: 1,
        y: 3.5,
        w: 8,
        h: 0.6,
        fontSize: 18,
        color: '666666',
        align: 'center',
      });

      // Results Summary
      if (latestSession.results_summary) {
        const summarySlide = pptx.addSlide();
        summarySlide.addText('Results Summary', {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.6,
          fontSize: 32,
          bold: true,
          color: '363636',
        });

        const summaryData: any[] = [];
        const summary = latestSession.results_summary;
        
        if (summary.avg_sentiment !== undefined) {
          summaryData.push([{ text: 'Average Sentiment' }, { text: `${summary.avg_sentiment}%` }]);
        }
        summaryData.push([{ text: 'Total Mentions' }, { text: totalMentions.toString() }]);
        summaryData.push([{ text: 'Total Queries' }, { text: totalQueries.toString() }]);
        summaryData.push([{ text: 'Visibility Score' }, { text: `${visibilityScore}%` }]);

        if (summary.platform_breakdown) {
          summarySlide.addText('Platform Breakdown', {
            x: 0.5,
            y: 2.5,
            w: 9,
            h: 0.5,
            fontSize: 20,
            bold: true,
            color: '363636',
          });

          const platformData = [[{ text: 'Platform' }, { text: 'Mentions' }]];
          Object.entries(summary.platform_breakdown).forEach(([platform, data]: [string, any]) => {
            platformData.push([{ text: platform }, { text: (data.mentions || 0).toString() }]);
          });

          summarySlide.addTable(platformData, {
            x: 0.5,
            y: 3.2,
            w: 9,
            colW: [4.5, 4.5],
            border: { type: 'solid', color: 'CCCCCC', pt: 1 },
            fill: { color: 'F5F5F5' },
            fontSize: 14,
          });
        } else {
          summarySlide.addTable(summaryData, {
            x: 2,
            y: 2,
            w: 6,
            colW: [3, 3],
            border: { type: 'solid', color: 'CCCCCC', pt: 1 },
            fill: { color: 'F5F5F5' },
            fontSize: 14,
          });
        }
      }

      // Competitor Analysis Slides
      if (latestSession.competitor_analysis) {
        // Competitor Rankings
        if (latestSession.competitor_analysis.rankings && latestSession.competitor_analysis.rankings.length > 0) {
          const rankingsSlide = pptx.addSlide();
          rankingsSlide.addText('Competitor Rankings', {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: '363636',
          });

          const rankingsData = [[{ text: 'Rank' }, { text: 'Name' }, { text: 'Domain' }, { text: 'Mentions' }, { text: 'Score' }]];
          latestSession.competitor_analysis.rankings.slice(0, 10).forEach((rank: any, idx: number) => {
            // Parse competitor name (handle both string and object formats)
            let competitorName = '';
            let competitorDomain = '';
            
            if (typeof rank.name === 'string') {
              try {
                const parsed = JSON.parse(rank.name);
                if (parsed.name) {
                  competitorName = parsed.name;
                  competitorDomain = parsed.domain || 'N/A';
                } else {
                  competitorName = rank.name;
                  competitorDomain = 'N/A';
                }
              } catch {
                competitorName = rank.name;
                competitorDomain = 'N/A';
              }
            } else if (rank.name && typeof rank.name === 'object') {
              competitorName = rank.name.name || rank.name;
              competitorDomain = rank.name.domain || 'N/A';
            } else {
              competitorName = String(rank.name || 'N/A');
              competitorDomain = 'N/A';
            }
            
            rankingsData.push([
              { text: (idx + 1).toString() },
              { text: competitorName },
              { text: competitorDomain },
              { text: rank.mentions?.toString() || '0' },
              { text: rank.ranking_score?.toFixed(2) || 'N/A' },
            ]);
          });

          rankingsSlide.addTable(rankingsData, {
            x: 0.5,
            y: 1.2,
            w: 9,
            colW: [0.8, 3, 2, 1.5, 1.7],
            border: { type: 'solid', color: 'CCCCCC', pt: 1 },
            fill: { color: 'F5F5F5' },
            fontSize: 11,
          });
        }

        // Market Positioning
        if (latestSession.competitor_analysis.market_positions && latestSession.competitor_analysis.market_positions.length > 0) {
          const positioningSlide = pptx.addSlide();
          positioningSlide.addText('Market Positioning', {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: '363636',
          });

          const positioningData = [[{ text: 'Brand' }, { text: 'Positioning' }, { text: 'Market Share' }, { text: 'Sentiment' }]];
          latestSession.competitor_analysis.market_positions.slice(0, 10).forEach((pos: any) => {
            // Parse brand name
            const { name: brandName } = parseCompetitorNameGlobal(pos.brand);
            positioningData.push([
              { text: brandName },
              { text: pos.positioning || 'N/A' },
              { text: `${pos.market_share || 0}%` },
              { text: pos.sentiment_score?.toFixed(1) || 'N/A' },
            ]);
          });

          positioningSlide.addTable(positioningData, {
            x: 0.5,
            y: 1.2,
            w: 9,
            colW: [2.5, 2.5, 2, 2],
            border: { type: 'solid', color: 'CCCCCC', pt: 1 },
            fill: { color: 'F5F5F5' },
            fontSize: 12,
          });
        }

        // Share of Voice
        if (latestSession.competitor_analysis.share_of_voice && latestSession.competitor_analysis.share_of_voice.length > 0) {
          const sovSlide = pptx.addSlide();
          sovSlide.addText('Share of Voice', {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: '363636',
          });

          const sovData = [[{ text: 'Brand' }, { text: 'Mentions' }, { text: 'Share %' }]];
          latestSession.competitor_analysis.share_of_voice.slice(0, 10).forEach((sov: any) => {
            // Parse brand name
            const { name: brandName } = parseCompetitorNameGlobal(sov.brand);
            sovData.push([
              { text: brandName },
              { text: sov.mentions?.toString() || '0' },
              { text: `${sov.share_percentage || 0}%` },
            ]);
          });

          sovSlide.addTable(sovData, {
            x: 0.5,
            y: 1.2,
            w: 9,
            colW: [5, 2, 2],
            border: { type: 'solid', color: 'CCCCCC', pt: 1 },
            fill: { color: 'F5F5F5' },
            fontSize: 12,
          });
        }
      }

      // Generate charts using Chart.js (same as PDF)
      if (projectResponses.length > 0) {
        const createChartImagePPT = async (
          type: 'pie' | 'bar' | 'stackedBar' | 'horizontalBar',
          data: any,
          labels: string[],
          title: string,
          width: number = 600,
          height: number = 400
        ): Promise<string | null> => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            let chartConfig: any;
            if (type === 'pie') {
              const arr = data as { name: string; value: number }[];
              chartConfig = {
                type: 'doughnut',
                data: {
                  labels,
                  datasets: [{
                    label: title,
                    data: arr.map(d => d.value),
                    backgroundColor: arr.map((_, i) => ['#10b981', '#6b7280', '#ef4444', '#9333ea', '#3b82f6', '#f59e0b'][i % 6]),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                  }],
                },
                options: { responsive: false, maintainAspectRatio: false, plugins: { title: { display: true, text: title, font: { size: 16, weight: 'bold' } }, legend: { display: true, position: 'right' } } },
              };
            } else if (type === 'bar') {
              const values = (data as number[]).map(d => (typeof d === 'object' && d !== null && 'value' in d) ? (d as { value: number }).value : d);
              chartConfig = {
                type: 'bar',
                data: { labels, datasets: [{ label: title, data: values, backgroundColor: '#9333ea', borderColor: '#ffffff', borderWidth: 2 }] },
                options: { responsive: false, maintainAspectRatio: false, plugins: { title: { display: true, text: title, font: { size: 16, weight: 'bold' } }, legend: { display: false } } },
              };
            } else if (type === 'stackedBar') {
              const { mentioned, missed } = data as { mentioned: number[]; missed: number[] };
              chartConfig = {
                type: 'bar',
                data: {
                  labels,
                  datasets: [
                    { label: 'Mentioned', data: mentioned, backgroundColor: '#10b981', borderColor: '#ffffff', borderWidth: 1 },
                    { label: 'Not Mentioned', data: missed, backgroundColor: '#ef4444', borderColor: '#ffffff', borderWidth: 1 },
                  ],
                },
                options: { responsive: false, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { title: { display: true, text: title, font: { size: 16, weight: 'bold' } }, legend: { display: true, position: 'top' } } },
              };
            } else if (type === 'horizontalBar') {
              const items = data as { name: string; value: number; isBrand?: boolean }[];
              chartConfig = {
                type: 'bar',
                data: {
                  labels: items.map(d => d.name),
                  datasets: [{ label: 'Visibility %', data: items.map(d => d.value), backgroundColor: items.map(d => d.isBrand ? '#9333ea' : '#3b82f6'), borderColor: '#ffffff', borderWidth: 1 }],
                },
                options: { indexAxis: 'y' as const, responsive: false, maintainAspectRatio: false, plugins: { title: { display: true, text: title, font: { size: 16, weight: 'bold' } }, legend: { display: false } } },
              };
            } else {
              return null;
            }
            const chart = new Chart(ctx, chartConfig);
            await new Promise(resolve => setTimeout(resolve, 500));
            const imageData = canvas.toDataURL('image/png', 0.95);
            chart.destroy();
            canvas.remove();
            return imageData;
          } catch (error) {
            console.error('Error creating chart:', error);
            return null;
          }
        };

        // Chart 1: Sentiment Distribution (Pie Chart)
        const sentiments = projectResponses
          .filter(r => r.response_metadata?.sentiment_score !== null)
          .map(r => r.response_metadata.sentiment_score);
        const positive = sentiments.filter(s => s > 0.3).length;
        const negative = sentiments.filter(s => s < -0.3).length;
        const neutral = sentiments.filter(s => s >= -0.3 && s <= 0.3).length;
        const total = sentiments.length;

        if (total > 0) {
          const sentimentData = [
            { name: 'Positive', value: positive },
            { name: 'Neutral', value: neutral },
            { name: 'Negative', value: negative },
          ].filter(item => item.value > 0);

          if (sentimentData.length > 0) {
            const chartImage = await createChartImagePPT(
              'pie',
              sentimentData,
              sentimentData.map(d => d.name),
              'Sentiment Distribution',
              600,
              400
            );

            if (chartImage) {
              const chartSlide = pptx.addSlide();
              chartSlide.addText('Sentiment Distribution', {
                x: 0.5,
                y: 0.3,
                w: 9,
                h: 0.5,
                fontSize: 24,
                bold: true,
                color: '363636',
              });
              chartSlide.addImage({
                data: chartImage,
                x: 1,
                y: 1.2,
                w: 8,
                h: 4.5,
              });
              console.log('✓ Added Sentiment Distribution chart to PPT');
            }
          }
        }

        // Chart 2: Platform Performance (Bar Chart)
        const platformDataPPT = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
          const platformResponses = projectResponses.filter(r => r.platform === platform);
          const mentions = platformResponses.filter(r => r.response_metadata?.brand_mentioned).length;
          const total = platformResponses.length;
          const mentionRate = total > 0 ? (mentions / total) * 100 : 0;
          const platformOption = platformOptions.find(p => p.id === platform);
          return {
            platform: platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1),
            mentionRate: Math.round(mentionRate),
          };
        }).sort((a, b) => b.mentionRate - a.mentionRate);

        if (platformDataPPT.length > 0) {
          const chartImage = await createChartImagePPT(
            'bar',
            platformDataPPT.map(p => p.mentionRate),
            platformDataPPT.map(p => p.platform),
            'Platform Performance (Mention Rate %)',
            600,
            400
          );

          if (chartImage) {
            const chartSlide = pptx.addSlide();
            chartSlide.addText('Platform Performance', {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.5,
              fontSize: 24,
              bold: true,
              color: '363636',
            });
            chartSlide.addImage({
              data: chartImage,
              x: 1,
              y: 1.2,
              w: 8,
              h: 4.5,
            });
            console.log('✓ Added Platform Performance chart to PPT');
          }
        }

        // Chart 3: Platform Comparison (Stacked Bar)
        const comparisonDataPPT = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
          const platformResponses = projectResponses.filter(r => r.platform === platform);
          const mentions = platformResponses.filter(r => r.response_metadata?.brand_mentioned).length;
          const total = platformResponses.length;
          const platformOption = platformOptions.find(p => p.id === platform);
          return {
            platform: platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1),
            mentioned: mentions,
            missed: total - mentions,
          };
        });
        if (comparisonDataPPT.length > 0) {
          const stackedImage = await createChartImagePPT(
            'stackedBar',
            { mentioned: comparisonDataPPT.map(p => p.mentioned), missed: comparisonDataPPT.map(p => p.missed) },
            comparisonDataPPT.map(p => p.platform),
            'Platform Comparison (Mentioned vs Not Mentioned)',
            600,
            400
          );
          if (stackedImage) {
            const chartSlide = pptx.addSlide();
            chartSlide.addText('Platform Comparison', {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.5,
              fontSize: 24,
              bold: true,
              color: '363636',
            });
            chartSlide.addImage({ data: stackedImage, x: 1, y: 1.2, w: 8, h: 4.5 });
            console.log('✓ Added Platform Comparison chart to PPT');
          }
        }

        // Chart 4: Competitor vs Brand Visibility (Horizontal Bar)
        const brandMentionsPPT = projectResponses.filter(r => r.response_metadata?.brand_mentioned).length;
        const totalQueriesPPT = projectResponses.length;
        const brandVisibilityPPT = totalQueriesPPT > 0 ? Math.round((brandMentionsPPT / totalQueriesPPT) * 100) : 0;
        const competitorMentionCountPPT: Record<string, number> = {};
        projectResponses.forEach((response) => {
          const competitorsRaw = response.response_metadata?.competitors_found || [];
          const competitorNames = competitorsRaw.map((comp: string | { name: string }) => {
            if (typeof comp === 'string') {
              if (comp.startsWith('{') && comp.includes('name')) {
                try { return JSON.parse(comp).name || comp; } catch { return comp; }
              }
              return comp;
            }
            return (comp as { name: string })?.name || String(comp);
          }).filter(Boolean);
          ([...new Set(competitorNames)] as string[]).forEach((c) => {
            competitorMentionCountPPT[c] = (competitorMentionCountPPT[c] || 0) + 1;
          });
        });
        const comparisonChartDataPPT = [
          { name: selectedProject?.brand_name || 'Your Brand', value: brandVisibilityPPT, isBrand: true },
          ...Object.entries(competitorMentionCountPPT)
            .map(([name, mentions]) => ({ name, value: totalQueriesPPT > 0 ? Math.round((mentions / totalQueriesPPT) * 100) : 0, isBrand: false }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10),
        ].filter(d => d.value > 0 || d.isBrand);
        if (comparisonChartDataPPT.length > 0) {
          const horizImage = await createChartImagePPT(
            'horizontalBar',
            comparisonChartDataPPT,
            [],
            'Competitor vs Brand Visibility (%)',
            600,
            400
          );
          if (horizImage) {
            const chartSlide = pptx.addSlide();
            chartSlide.addText('Competitor vs Brand Visibility', {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.5,
              fontSize: 24,
              bold: true,
              color: '363636',
            });
            chartSlide.addImage({ data: horizImage, x: 1, y: 1.2, w: 8, h: 4.5 });
            console.log('✓ Added Competitor vs Brand Visibility chart to PPT');
          }
        }
      }

      // Save PowerPoint
      const fileName = `AI_Visibility_Report_${selectedProject.brand_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pptx`;
      await pptx.writeFile({ fileName });
    } catch (error) {
      console.error('Error exporting PowerPoint:', error);
      alert('Failed to export PowerPoint: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleResumeAnalysis = async (sessionId: string, projectId: string) => {
    setResumingAnalysis(sessionId);
    setShowProjectDetailsSettings(false);
    try {
      // Get the session data to resume
      const { data: sessionData, error: fetchError } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Get the project data
      const { data: projectData, error: projectError } = await supabase
        .from('brand_analysis_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Update session status to running
      const { error: updateError } = await supabase
        .from('brand_analysis_sessions')
        .update({
          status: 'running',
          results_summary: {
            ...sessionData.results_summary,
            resumed: true,
            resumed_at: new Date().toISOString()
          }
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Get the user's access token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        throw new Error('No authentication token available');
      }

      // Call the brand-analysis edge function to resume
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const response = await fetch(`${supabaseUrl}/functions/v1/brand-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          action: 'resume',
          sessionId: sessionId,
          projectId: projectId,
          brandName: projectData.brand_name,
          websiteUrl: projectData.website_url,
          industry: projectData.industry,
          platforms: projectData.active_platforms,
          competitors: projectData.competitors,
          keywords: projectData.keywords,
          companyDescription: projectData.company_description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resume analysis');
      }

      // Refresh data
      await fetchProjects();
      if (selectedProject && selectedProject.id === projectId) {
        await fetchProjectDetails(projectId);
      }
    } catch (error: any) {
      console.error('Error resuming analysis:', error);
      alert(`Failed to resume analysis: ${error.message}`);
      
      // Revert status back to paused if resume failed
      await supabase
        .from('brand_analysis_sessions')
        .update({ status: 'paused' })
        .eq('id', sessionId);
    } finally {
      setResumingAnalysis(null);
    }
  };

  const handleNewAnalysis = () => {
    setViewMode('form');
    setCurrentStep(1);
    setHasAutoGeneratedAI(false);
    setFetchGSCKeywords(false);
  };

  const handleBack = () => {
    if (viewMode === 'details') {
      setViewMode('projects');
      setSelectedProject(null);
      setSelectedDomainJob(null);
      // Clear URL params when going back to projects list
      router.push('/dashboard/ai-visibility', { scroll: false });
    } else if (viewMode === 'form' && currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!brandName.trim() || !websiteUrl.trim() || !industry) {
        alert("Please fill in all required fields");
          return;
        }
      
      // Generate AI suggestions BEFORE moving to Step 2 (only once per session)
      if (!hasAutoGeneratedAI) {
        setHasAutoGeneratedAI(true);
        
        // Start generating AI suggestions
        await generateAISuggestions();
        
        // After generation completes, move to Step 2
        if (currentStep < totalSteps) {
          setCurrentStep(currentStep + 1);
        }
      } else {
        // If already generated, just move to next step
        if (currentStep < totalSteps) {
          setCurrentStep(currentStep + 1);
        }
      }
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const addCompetitor = () => {
    const trimmed = newCompetitor.trim();
    if (trimmed) {
      const nameMatch = (c: string | { name: string }) => (typeof c === 'string' ? c : c.name) === trimmed;
      const exists = manualCompetitors.some(nameMatch) || suggestedCompetitors.some(nameMatch);
      if (!exists) {
        setManualCompetitors(prev => [...prev, trimmed]);
        setNewCompetitor("");
      }
    }
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !manualKeywords.includes(trimmed) && !suggestedKeywords.includes(trimmed)) {
      setManualKeywords(prev => [...prev, trimmed]);
      setNewKeyword("");
    }
  };

  // Generate AI-powered suggestions for competitors and keywords
  const generateAISuggestions = async () => {
    // Validate that Step 1 is complete
    if (!brandName.trim() || !websiteUrl.trim() || !industry) {
      alert("Please complete Brand Setup (Step 1) first before generating AI suggestions.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      console.log('🤖 Generating AI suggestions...');
      
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName,
          websiteUrl: normalizeUrl(websiteUrl),
          industry,
          language,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate suggestions');
      }

      const data = await response.json();

      if (data.success) {
        // Update only AI-suggested lists so manually added competitors/keywords are preserved
        if (data.competitors && data.competitors.length > 0) {
          setSuggestedCompetitors(data.competitors);
        } else {
          setSuggestedCompetitors([]);
        }
        if (data.keywords && data.keywords.length > 0) {
          setSuggestedKeywords(data.keywords);
        } else {
          setSuggestedKeywords([]);
        }

        console.log(`✅ Generated ${data.competitors?.length ?? 0} suggested competitors and ${data.keywords?.length ?? 0} suggested keywords`);
      } else {
        throw new Error('No suggestions generated');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate AI suggestions. Please try again or enter manually.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Calculate overall stats
  const projectsWithStats = projects.map(p => ({ project: p, stats: getProjectStats(p.id) }));
  const projectsWithSentiment = projectsWithStats.filter(ps => ps.stats.sentiment !== 0);
  
  const overallStats = {
    totalMentions: projectsWithStats.reduce((sum, ps) => sum + ps.stats.mentions, 0),
    activePlatforms: new Set(projects.flatMap(p => p.active_platforms || [])).size,
    avgVisibility: projects.length > 0 
      ? Math.round(projectsWithStats.reduce((sum, ps) => sum + ps.stats.visibility, 0) / projects.length)
      : 0,
    avgSentiment: projectsWithSentiment.length > 0
      ? Math.round(projectsWithSentiment.reduce((sum, ps) => sum + ps.stats.sentiment, 0) / projectsWithSentiment.length)
      : 0,
  };

  // Render Projects List View
  if (viewMode === 'projects') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between" dir={isRtl ? 'rtl' : 'ltr'}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{t.dashboard.aiVisibility.title}</h1>
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-gray-600">{t.dashboard.aiVisibility.subtitle}</p>
            </div>
            <button
              onClick={handleNewAnalysis}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t.dashboard.aiVisibility.newAnalysis}
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
              <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <Search className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">{overallStats.totalMentions}</span>
              </div>
              <p className="text-sm text-gray-600">{t.dashboard.aiVisibility.totalMentions}</p>
              <p className="text-xs text-gray-500 mt-1">{t.dashboard.aiVisibility.acrossAllBrands}</p>
            </div>
            <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
              <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <Target className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">{overallStats.activePlatforms}</span>
              </div>
              <p className="text-sm text-gray-600">{t.dashboard.aiVisibility.aiPlatforms}</p>
              <p className="text-xs text-gray-500 mt-1">{t.dashboard.aiVisibility.activePlatforms.toLowerCase()}</p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <Eye className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900">{overallStats.avgVisibility}%</span>
              </div>
              <p className="text-sm text-gray-600">{t.dashboard.aiVisibility.avgVisibility}</p>
              <p className="text-xs text-gray-500 mt-1">{t.dashboard.aiVisibility.mentionRate}</p>
            </div>
            <div className={`bg-white border-2 rounded-lg p-6 ${
              overallStats.avgSentiment > 30 ? 'border-green-200' :
              overallStats.avgSentiment < -30 ? 'border-red-200' :
              'border-gray-200'
            }`}>
              <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <BarChart3 className={`w-5 h-5 ${
                  overallStats.avgSentiment > 30 ? 'text-green-600' :
                  overallStats.avgSentiment < -30 ? 'text-red-600' :
                  'text-gray-400'
                }`} />
                <span className="text-2xl font-bold text-gray-900">{overallStats.avgSentiment}%</span>
              </div>
              <p className="text-sm text-gray-600">{t.dashboard.aiVisibility.avgSentiment}</p>
              <p className="text-xs text-gray-500 mt-1">
                {overallStats.avgSentiment > 30 ? 'Positive' :
                 overallStats.avgSentiment < -30 ? 'Negative' :
                 'Neutral'}
              </p>
            </div>
          </div>

          {/* Projects Grid */}
          <div dir={isRtl ? 'rtl' : 'ltr'}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t.dashboard.aiVisibility.yourBrandProjects} ({projects.length})
            </h2>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.dashboard.common.noData}</h3>
                <p className="text-gray-600 mb-4">{t.dashboard.aiVisibility.subtitle}</p>
                <button
                  onClick={handleNewAnalysis}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {t.dashboard.aiVisibility.newAnalysis}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => {
                  const session = getProjectSession(project.id);
                  const stats = getProjectStats(project.id);
                  
                  // Debug logging for each project card
                  if (session) {
                    console.log(`🎴 Rendering card for project ${project.brand_name} (${project.id.slice(0, 8)}...):`, {
                      sessionId: session.id,
                      status: session.status,
                      hasSummary: !!session.results_summary,
                      mentions: session.results_summary?.total_mentions || 0,
                      visibility: session.results_summary ? 
                        Math.round((session.results_summary.total_mentions || 0) / (session.results_summary.total_queries || 1) * 100) : 0,
                      statsFromFunction: stats
                    });
                  } else {
                    console.log(`⚠️ No session found for project ${project.brand_name} (${project.id.slice(0, 8)}...)`);
                  }
                  
                  const isRunning = session?.status === 'running';
                  const isPaused = session?.status === 'paused';
                  const isCancelled = session?.status === 'cancelled';
                  const progress = session && session.total_queries 
            ? Math.round((session.completed_queries || 0) / session.total_queries * 100)
            : 0;

                  return (
                    <div
                      key={project.id}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleProjectClick(project)}
                    >
                      {/* Brand Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Use brand_summary.favicon if available, fallback to company_image_url */}
                          {(project.brand_summary?.favicon || project.company_image_url) ? (
                            <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1.5 flex-shrink-0">
                              <img 
                                src={project.brand_summary?.favicon || project.company_image_url} 
                                alt={project.brand_name}
                                className="w-full h-full object-contain"
                                style={{ imageRendering: 'auto' }}
                                onError={(e) => {
                                  // Fallback to initial if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            </div>
                          ) : null}
                          <div className={`w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center ${(project.brand_summary?.favicon || project.company_image_url) ? 'hidden' : ''}`}>
                            <span className="text-xl font-bold text-purple-600">
                              {project.brand_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{project.brand_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {isRunning ? (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  {t.dashboard.aiVisibility.analysisRunning}
                                </span>
                              ) : isCancelled ? (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs flex items-center gap-1">
                                  <X className="w-3 h-3" />
                                  {t.dashboard.aiVisibility.analysisFailed}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">{t.dashboard.aiVisibility.active}</span>
                              )}
                              <span className="text-xs text-gray-500 capitalize">{project.industry}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === project.id ? null : project.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            disabled={deletingProject === project.id}
                          >
                            {deletingProject === project.id ? (
                              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                            ) : (
                              <Settings className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            )}
                          </button>
                          {openDropdown === project.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(null);
                                }}
                              />
                              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                                {/* Pause/Resume Analysis - only show when analysis is running or paused */}
                                {isRunning && session?.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      handlePauseAnalysis(session.id, project.id);
                                    }}
                                    disabled={pausingAnalysis === session.id}
                                    className={`w-full flex items-center gap-2 px-4 py-2 ${isRtl ? 'text-right' : 'text-left'} text-amber-600 hover:bg-amber-50 transition-colors`}
                                  >
                                    {pausingAnalysis === session.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <StopCircle className="w-4 h-4" />
                                    )}
                                    <span>Pause Analysis</span>
                                  </button>
                                )}
                                {isPaused && session?.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      handleResumeAnalysis(session.id, project.id);
                                    }}
                                    disabled={resumingAnalysis === session.id}
                                    className={`w-full flex items-center gap-2 px-4 py-2 ${isRtl ? 'text-right' : 'text-left'} text-green-600 hover:bg-green-50 transition-colors`}
                                  >
                                    {resumingAnalysis === session.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                    <span>Resume Analysis</span>
                                  </button>
                                )}
                                {/* Edit / Configure Project */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdown(null);
                                    openConfigureModal(project);
                                  }}
                                  className={`w-full flex items-center gap-2 px-4 py-2 ${isRtl ? 'text-right' : 'text-left'} text-gray-700 hover:bg-gray-50 transition-colors`}
                                >
                                  <Settings className="w-4 h-4" />
                                  <span>Edit</span>
                                </button>
                                {/* Delete Project */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id, project.brand_name);
                                  }}
                                  className={`w-full flex items-center gap-2 px-4 py-2 ${isRtl ? 'text-right' : 'text-left'} text-red-600 hover:bg-red-50 transition-colors`}
                                  disabled={deletingProject === project.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>{t.dashboard.aiVisibility.deleteProject}</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Company Description - Use brand_summary.overview (truncated to 5 lines) if available, fallback to company_description */}
                      {(project.brand_summary?.summary?.overview || project.company_description) && (
                        <div className="text-sm text-gray-600 mb-3 line-clamp-5">
                          {project.brand_summary?.summary?.overview 
                            ? project.brand_summary.summary.overview.split('\n').slice(0, 5).join('\n')
                            : project.company_description?.split('\n').slice(0, 3).join(' ')}
                        </div>
                      )}

                      {/* Date */}
                      <div className="text-xs text-gray-500 mb-4">
                        {session?.started_at 
                          ? new Date(session.started_at).toLocaleDateString()
                          : project.last_analysis_at
                          ? new Date(project.last_analysis_at).toLocaleDateString()
                          : t.dashboard.aiVisibility.noAnalysisYet}
                      </div>

                      {/* Progress Bar for Running */}
                      {isRunning && (
                        <div className="mb-4">
                          <div className={`flex items-center justify-between text-xs text-gray-600 mb-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span>{t.dashboard.aiVisibility.progress}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Progress Bar for Paused */}
                      {isPaused && (
                        <div className="mb-4">
                          <div className={`flex items-center justify-between text-xs mb-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <StopCircle className="w-3 h-3" />
                              Paused
                            </span>
                            <span className="text-gray-600">{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600">{t.dashboard.aiVisibility.mentions}</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {(() => {
                              // Use session data directly if available, fallback to stats
                              if (session?.results_summary?.total_mentions !== undefined) {
                                return session.results_summary.total_mentions || 0;
                              }
                              return stats.mentions || 0;
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">{t.dashboard.aiVisibility.visibility}</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {(() => {
                              // Use stats.visibility which is calculated consistently in getProjectStats
                              // This ensures the card shows the same visibility as the detailed view
                              return stats.visibility > 0 ? `${stats.visibility}%` : '0%';
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Platforms */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-600 mb-2">{t.dashboard.aiVisibility.activePlatforms}</div>
                        <div className="flex flex-wrap gap-2">
                          {(project.active_platforms || []).slice(0, 5).map((platform) => {
                            const platformOption = platformOptions.find(p => p.id === platform);
                            return (
                              <span
                                key={platform}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize flex items-center gap-1"
                                title={platformOption?.name || platform}
                              >
                                {platformOption?.icon ? (
                                  <Image 
                                    src={platformOption.icon} 
                                    alt={platformOption.name} 
                                    width={16} 
                                    height={16} 
                                    className="w-4 h-4 object-contain"
                                    quality={75}
                                  />
                                ) : (
                                  platform
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {isRunning && session?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopAnalysis(session.id, project.id);
                            }}
                            disabled={stoppingAnalysis === session.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {stoppingAnalysis === session.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t.dashboard.aiVisibility.stopping}
                              </>
                            ) : (
                              <>
                                <StopCircle className="w-4 h-4" />
                                {t.dashboard.aiVisibility.stop}
                              </>
                            )}
                          </button>
                        )}
                        {isPaused && session?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResumeAnalysis(session.id, project.id);
                            }}
                            disabled={resumingAnalysis === session.id}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resumingAnalysis === session.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Resuming...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Resume
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectClick(project);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" />
                          {t.dashboard.aiVisibility.viewResults}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Domain Intelligence Jobs Grid */}
            {domainIntelligenceJobs.length > 0 && (
              <div dir={isRtl ? 'rtl' : 'ltr'} className="mt-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Domain Intelligence Scans ({domainIntelligenceJobs.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {domainIntelligenceJobs.map((job) => {
                    const stats = getDomainIntelligenceStats(job);
                    const domainName = job.domain_name || job.domain_url || 'Unknown Domain';
                    
                    return (
                      <div
                        key={job.id}
                        className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedDomainJob(job);
                          setViewMode('details');
                        }}
                      >
                        {/* Domain Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Globe className="w-6 h-6 text-blue-600" />
          </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{domainName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                  Completed
                                </span>
                                <span className="text-xs text-gray-500">
                                  {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-600">{t.dashboard.aiVisibility.mentions}</div>
                            <div className="text-2xl font-bold text-gray-900">{stats.mentions}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{t.dashboard.aiVisibility.visibility}</div>
                            <div className="text-2xl font-bold text-gray-900">
                              {stats.visibility > 0 ? `${stats.visibility}%` : '0%'}
                            </div>
                          </div>
                        </div>

                        {/* Key Insights */}
                        {job.results && (
                          <div className="space-y-2 mb-4">
                            {job.results.keywords?.all?.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <span className="font-semibold">Keywords:</span> {job.results.keywords.all.length} found
                              </div>
                            )}
                            {job.results.competitors?.all?.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <span className="font-semibold">Competitors:</span> {job.results.competitors.all.length} identified
                              </div>
                            )}
                            {job.results.strengths?.length > 0 && (
                              <div className="text-xs text-green-600">
                                <span className="font-semibold">Strengths:</span> {job.results.strengths.length} identified
                              </div>
                            )}
                          </div>
                        )}

                        {/* View Results Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDomainJob(job);
                            setViewMode('details');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" />
                          View Full Results
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Domain Intelligence Details View
  if (viewMode === 'details' && selectedDomainJob) {
    const job = selectedDomainJob;
    const stats = getDomainIntelligenceStats(job);
    const domainName = job.domain_name || job.domain_url || 'Unknown Domain';
    const results = job.results || {};

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedDomainJob(null);
              setViewMode('projects');
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>

          {/* Domain Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{domainName}</h1>
                    <p className="text-sm text-gray-600 mt-1">{job.domain_url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    Completed
                  </span>
                  <span className="text-sm text-gray-500">
                    Completed: {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t.dashboard.aiVisibility.mentions}</div>
                <div className="text-3xl font-bold text-gray-900">{stats.mentions}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{t.dashboard.aiVisibility.visibility}</div>
                <div className="text-3xl font-bold text-gray-900">{stats.visibility}%</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Keywords Found</div>
                <div className="text-3xl font-bold text-gray-900">{results.keywords?.all?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <div className="flex space-x-1 p-4">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('keywords')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'keywords'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Keywords
                </button>
                <button
                  onClick={() => setActiveTab('competitors')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'competitors'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Competitors
                </button>
                <button
                  onClick={() => setActiveTab('aiVisibility')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'aiVisibility'
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  AI Visibility
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {results.strengths && results.strengths.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Strengths</h3>
                      <ul className="list-disc list-inside space-y-2">
                        {results.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.weaknesses && results.weaknesses.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Weaknesses</h3>
                      <ul className="list-disc list-inside space-y-2">
                        {results.weaknesses.map((weakness: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.recommendedActions && results.recommendedActions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommended Actions</h3>
                      <ul className="list-disc list-inside space-y-2">
                        {results.recommendedActions.map((action: any, idx: number) => (
                          <li key={idx} className="text-gray-700">
                            {typeof action === 'string' ? action : action.action || action.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'keywords' && (
                <div className="space-y-4">
                  {results.keywords?.all && results.keywords.all.length > 0 ? (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">All Keywords ({results.keywords.all.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {results.keywords.all.map((keyword: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      {results.keywords.branded && results.keywords.branded.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Branded Keywords ({results.keywords.branded.length})</h3>
                          <div className="flex flex-wrap gap-2">
                            {results.keywords.branded.map((keyword: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {results.keywords.nonBranded && results.keywords.nonBranded.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Non-Branded Keywords ({results.keywords.nonBranded.length})</h3>
                          <div className="flex flex-wrap gap-2">
                            {results.keywords.nonBranded.map((keyword: string, idx: number) => (
                              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No keywords found.</p>
                      <p className="text-sm text-gray-500 mt-2">Keywords will be extracted during the domain intelligence scan.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'competitors' && (
                <div className="space-y-4">
                  {results.competitors?.all && results.competitors.all.length > 0 ? (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">All Competitors ({results.competitors.all.length})</h3>
                        <div className="space-y-2">
                          {results.competitors.all.map((competitor: string | { name: string; domain?: string }, idx: number) => {
                            const competitorName = typeof competitor === 'string' ? competitor : competitor.name;
                            return (
                              <div key={idx} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <span className="text-gray-900 font-medium">{competitorName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {results.competitors.organic && results.competitors.organic.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Organic Competitors ({results.competitors.organic.length})</h3>
                          <div className="space-y-2">
                            {results.competitors.organic.map((competitor: string | { name: string; domain?: string }, idx: number) => {
                              const competitorName = typeof competitor === 'string' ? competitor : competitor.name;
                              return (
                                <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                                  <span className="text-blue-900 font-medium">{competitorName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No competitors identified.</p>
                      <p className="text-sm text-gray-500 mt-2">Competitors will be identified during the domain intelligence scan.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'aiVisibility' && (
                <div className="space-y-4">
                  {results.aiVisibility && Object.keys(results.aiVisibility).length > 0 ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Visibility Results</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Total Mentions</div>
                            <div className="text-2xl font-bold text-gray-900">{results.aiVisibility.total_mentions || 0}</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Total Queries</div>
                            <div className="text-2xl font-bold text-gray-900">{results.aiVisibility.total_queries || 0}</div>
                          </div>
                        </div>
                        {results.aiVisibility.platform_results && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Platform Performance</h4>
                            <div className="space-y-2">
                              {Object.entries(results.aiVisibility.platform_results).map(([platform, data]: [string, any]) => (
                                <div key={platform} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 capitalize">{platform}</span>
                                    <span className="text-gray-600">{data.mentions || 0} mentions</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">No AI visibility data available.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Project Details View
  if (viewMode === 'details' && selectedProject) {
    const latestSession = projectSessions[0];
    const isRunning = latestSession?.status === 'running';
    const isPaused = latestSession?.status === 'paused';
    const progress = latestSession && latestSession.total_queries 
      ? Math.round((latestSession.completed_queries || 0) / latestSession.total_queries * 100)
      : 0;
    const activeSession = historySessionId
      ? projectSessions.find(s => s.id === historySessionId) || latestSession
      : (projectSessions.find(s => s.status === 'completed') || latestSession);
    const defaultCompletedSession = projectSessions.find(s => s.project_id === selectedProject.id && s.status === 'completed');
    const isViewingHistory = historySessionId != null && defaultCompletedSession != null && historySessionId !== defaultCompletedSession.id;

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto">
          {/* Analysis Start Notification Banner */}
          {showAnalysisStartNotification && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <div className="text-sm font-semibold text-blue-900">Analysis Started!</div>
                    <div className="text-xs text-blue-700">Your analysis is running in the background</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalysisStartNotification(false)}
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>

          {/* Project Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Use brand_summary.favicon if available, fallback to company_image_url */}
                  {(brandSummary?.favicon || selectedProject.company_image_url) ? (
                    <div className="w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1.5 flex-shrink-0">
                      <img 
                        src={brandSummary?.favicon || selectedProject.company_image_url} 
                        alt={selectedProject.brand_name}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'auto' }}
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    </div>
                  ) : null}
                  <div className={`w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center ${(brandSummary?.favicon || selectedProject.company_image_url) ? 'hidden' : ''}`}>
                    <span className="text-xl font-bold text-purple-600">
                      {selectedProject.brand_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedProject.brand_name}</h1>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm capitalize">
                      {selectedProject.industry}
                    </span>
                  </div>
                </div>
                {selectedProject.website_url && (
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <Globe className="w-4 h-4" />
                    <span>{selectedProject.website_url}</span>
                  </div>
                )}
                {/* Brand Overview from brand-analysis-summary edge function */}
                {(brandSummary?.summary?.overview || selectedProject.company_description) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-semibold text-gray-700 mb-1">About {selectedProject.brand_name}</div>
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      {brandSummary?.summary?.overview || selectedProject.company_description}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-sm text-gray-500">
                  Updated {selectedProject.last_analysis_at 
                    ? new Date(selectedProject.last_analysis_at).toLocaleString()
                    : new Date(selectedProject.created_at).toLocaleString()}
                </div>
                {/* Settings Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowProjectDetailsSettings(!showProjectDetailsSettings)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                  </button>
                  {showProjectDetailsSettings && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowProjectDetailsSettings(false)}
                      />
                      <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                        {/* Pause/Resume Analysis - only show when analysis is running or paused */}
                        {(() => {
                          const latestSession = projectSessions.find(s => s.project_id === selectedProject?.id);
                          const isRunning = latestSession?.status === 'running';
                          const isPaused = latestSession?.status === 'paused';
                          
                          if (isRunning || isPaused) {
                            return isPaused ? (
                              <button
                                onClick={() => latestSession && handleResumeAnalysis(latestSession.id, selectedProject.id)}
                                disabled={resumingAnalysis === latestSession?.id}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-green-600 hover:bg-green-50 transition-colors"
                              >
                                {resumingAnalysis === latestSession?.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                                <span>Resume Analysis</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => latestSession && handlePauseAnalysis(latestSession.id, selectedProject.id)}
                                disabled={pausingAnalysis === latestSession?.id}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                {pausingAnalysis === latestSession?.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <StopCircle className="w-4 h-4" />
                                )}
                                <span>Pause Analysis</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                        {/* Delete Project */}
                        <button
                          onClick={() => {
                            setShowProjectDetailsSettings(false);
                            handleDeleteProject(selectedProject.id, selectedProject.brand_name);
                          }}
                          disabled={deletingProject === selectedProject.id}
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {deletingProject === selectedProject.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>Delete Project</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Platforms/LLMs */}
            {selectedProject.active_platforms && selectedProject.active_platforms.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-700">AI Platforms Selected for Analysis:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.active_platforms.map((platform) => {
                    const platformOption = platformOptions.find(p => p.id === platform);
                    return (
                      <div
                        key={platform}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg"
                      >
                        {platformOption?.icon ? (
                          <Image 
                            src={platformOption.icon} 
                            alt={platformOption.name} 
                            width={20} 
                            height={20} 
                            className="w-5 h-5 object-contain"
                            quality={75}
                          />
                        ) : (
                          <span className="text-lg">🤖</span>
                        )}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {platformOption?.name || platform}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-sm text-gray-600 mb-2">AI Platforms</div>
                  <div className="text-3xl font-bold text-gray-900 mb-3">
                    {projectStats?.platforms_analyzed?.length || new Set(projectResponses.map(r => r.platform)).size || selectedProject.active_platforms?.length || 0}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      const platforms = projectStats?.platforms_analyzed || Array.from(new Set(projectResponses.map(r => r.platform))) || selectedProject.active_platforms || [];
                      return platforms.slice(0, 4).map((platform: string) => {
                        const platformOption = platformOptions.find(p => p.id === platform);
                        return (
                          <span key={platform} className="text-sm flex items-center" title={platformOption?.name || platform}>
                            {platformOption?.icon ? (
                              <Image 
                                src={platformOption.icon} 
                                alt={platformOption.name} 
                                width={16} 
                                height={16} 
                                className="w-4 h-4 object-contain"
                                quality={75}
                              />
                            ) : (
                              platform
                            )}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-sm text-gray-600 mb-2">Total Mentions</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {projectStats?.total_mentions || projectResponses.filter(r => r.response_metadata?.brand_mentioned).length || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Across {projectStats?.platforms_analyzed?.length || new Set(projectResponses.map(r => r.platform)).size || 0} platforms
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-sm text-gray-600 mb-2">Avg Sentiment</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {(() => {
                      const sentiments = projectResponses
                        .filter(r => r.response_metadata?.brand_mentioned && r.response_metadata?.sentiment_score !== null)
                        .map(r => r.response_metadata.sentiment_score);
                      if (sentiments.length === 0) return '0%';
                      const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
                      return `${Math.round(avgSentiment * 100)}%`;
                    })()}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Based on {projectResponses.filter(r => r.response_metadata?.brand_mentioned && r.response_metadata?.sentiment_score !== null).length || 0} mentions
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="text-sm text-gray-600 mb-2">Competitor Mentions</div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {(() => {
                      const competitorMentions = projectResponses.reduce((total, response) => {
                        const competitors = response.response_metadata?.competitors_found || [];
                        return total + competitors.length;
                      }, 0);
                      return competitorMentions;
                    })()}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {(() => {
                      const competitorMap: Record<string, number> = {};
                      projectResponses.forEach((response) => {
                        const competitors = response.response_metadata?.competitors_found || [];
                        competitors.forEach((comp: string | { name: string; domain?: string }) => {
                          // Handle both string, JSON string, and object formats
                          let compName: string;
                          if (typeof comp === 'string') {
                            if (comp.startsWith('{') && comp.includes('name')) {
                              try {
                                compName = JSON.parse(comp).name || comp;
                              } catch {
                                compName = comp;
                              }
                            } else {
                              compName = comp;
                            }
                          } else {
                            compName = comp?.name || String(comp);
                          }
                          if (compName) {
                            competitorMap[compName] = (competitorMap[compName] || 0) + 1;
                          }
                        });
                      });
                      const topCompetitor = Object.entries(competitorMap).sort((a, b) => b[1] - a[1])[0];
                      return topCompetitor ? `Top: ${topCompetitor[0]}` : 'Top: -';
                    })()}
                  </div>
                </div>
              </div>

              {/* Viewing historical session banner */}
              {isViewingHistory && activeSession && (
                <div className="mb-4 flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <History className="w-4 h-4 shrink-0" />
                    <span>
                      Viewing: <strong>{activeSession.session_name || 'Analysis Session'}</strong>
                      {' '}&mdash;{' '}
                      {new Date(activeSession.started_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setHistorySessionId(null);
                      if (defaultCompletedSession) {
                        setProjectStats(defaultCompletedSession.results_summary || null);
                        fetchProjectResponses(defaultCompletedSession.id);
                      }
                    }}
                    className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to latest
                  </button>
                </div>
              )}

              {/* Tabs */}
              <div className="bg-white rounded-lg border border-gray-200" dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="border-b border-gray-200 flex overflow-x-auto">
                  {[
                    { id: 'summary', label: t.dashboard.aiVisibility.summary, icon: FileText },
                    { id: 'results', label: t.dashboard.aiVisibility.results, icon: BarChart3 },
                    { id: 'competitors', label: t.dashboard.aiVisibility.competitors, icon: Target },
                    { id: 'sources', label: t.dashboard.aiVisibility.sources, icon: Globe },
                    { id: 'analytics', label: t.dashboard.sidebar.analytics, icon: Activity },
                    { id: 'keywords', label: t.dashboard.aiVisibility.keywords, icon: Search },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'summary' && (
                    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
                      {loadingBrandSummary ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
                          <span className="ml-4 text-gray-600">Loading brand summary...</span>
                        </div>
                      ) : brandSummary?.summary ? (
                        <>
                          {/* Brand Overview */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Overview</h3>
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              {brandSummary.favicon && (
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1.5 flex-shrink-0">
                                    <img 
                                      src={brandSummary.favicon} 
                                      alt="Brand favicon" 
                                      className="w-full h-full object-contain"
                                      style={{ imageRendering: 'auto' }}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-gray-900">{selectedProject?.brand_name}</h4>
                                    {brandSummary.sourceUrl && (
                                      <a 
                                        href={brandSummary.sourceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline"
                                      >
                                        {brandSummary.sourceUrl}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {brandSummary.summary.overview}
                              </p>
                            </div>
                          </div>

                          {/* Brand Details Grid */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Industry</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {brandSummary.summary.industry !== 'unknown' ? brandSummary.summary.industry : 'N/A'}
                                </div>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Founded Year</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {brandSummary.summary.founded_year !== 'unknown' ? brandSummary.summary.founded_year : 'N/A'}
                                </div>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Headquarters</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {brandSummary.summary.headquarters !== 'unknown' ? brandSummary.summary.headquarters : 'N/A'}
                                </div>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Business Model</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {brandSummary.summary.business_model !== 'unknown' ? brandSummary.summary.business_model : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Additional Information */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                            <div className="space-y-4">
                              {brandSummary.summary.typical_clients && brandSummary.summary.typical_clients !== 'unknown' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="text-sm font-medium text-gray-700 mb-2">Typical Clients</div>
                                  <div className="text-gray-600">{brandSummary.summary.typical_clients}</div>
                                </div>
                              )}
                              {brandSummary.summary.brand_essence && brandSummary.summary.brand_essence !== 'unknown' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="text-sm font-medium text-gray-700 mb-2">Brand Essence</div>
                                  <div className="text-gray-600">{brandSummary.summary.brand_essence}</div>
                                </div>
                              )}
                              {brandSummary.summary.key_offerings && brandSummary.summary.key_offerings !== 'unknown' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="text-sm font-medium text-gray-700 mb-2">Key Offerings</div>
                                  <div className="text-gray-600">{brandSummary.summary.key_offerings}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {brandSummary.lastUpdated && (
                            <div className="text-xs text-gray-500 text-center">
                              Last updated: {new Date(brandSummary.lastUpdated).toLocaleString()}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>No brand summary available</p>
                          {(!selectedProject?.website_url || !selectedProject?.brand_name) && (
                            <p className="text-sm mt-2">Please ensure the project has a website URL and brand name.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'results' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {(() => {
                            const filteredResponses = resultsView === 'mentioned'
                              ? projectResponses.filter(r => r.response_metadata?.brand_mentioned)
                              : projectResponses.filter(r => !r.response_metadata?.brand_mentioned);
                            
                            // Group by prompt to count unique prompts
                            const uniquePrompts = new Set(
                              filteredResponses.map(r => r.prompt?.trim().toLowerCase() || '').filter(Boolean)
                            );
                            
                            return resultsView === 'mentioned'
                              ? `Mentioned Prompts (${uniquePrompts.size})`
                              : `Missed Prompts (${uniquePrompts.size})`;
                          })()}
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setResultsView('mentioned')}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              resultsView === 'mentioned'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Mentioned Prompts
                          </button>
                          <button 
                            onClick={() => setResultsView('missed')}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              resultsView === 'missed'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Missed Prompts
                          </button>
                        </div>
                      </div>
                      
                      {projectResponses.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>No Analysis Results</p>
                          {latestSession?.status === 'running' && (
                            <p className="text-sm mt-2">Analysis is still running. Results will appear here when complete.</p>
                          )}
                          {activeSession?.status === 'completed' && (
                            <div className="mt-4">
                              <p className="text-sm text-gray-600 mb-2">No responses found in database.</p>
                              <button
                                onClick={() => {
                                  if (activeSession?.id) {
                                    fetchProjectResponses(activeSession.id);
                                  }
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                              >
                                Refresh Responses
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const filteredResponses = resultsView === 'mentioned'
                              ? projectResponses.filter(r => r.response_metadata?.brand_mentioned)
                              : projectResponses.filter(r => !r.response_metadata?.brand_mentioned);

                            if (filteredResponses.length === 0) {
                              return (
                                <div className="text-center py-8 text-gray-500">
                                  <p>
                                    {resultsView === 'mentioned'
                                      ? `No brand mentions found in ${projectResponses.length} responses`
                                      : `All ${projectResponses.length} prompts mentioned your brand!`
                                    }
                                  </p>
                                </div>
                              );
                            }

                            // Group responses by prompt (same question)
                            const groupedByPrompt: Record<string, typeof filteredResponses> = {};
                            filteredResponses.forEach((response) => {
                              const promptKey = response.prompt?.trim().toLowerCase() || '';
                              if (!groupedByPrompt[promptKey]) {
                                groupedByPrompt[promptKey] = [];
                              }
                              groupedByPrompt[promptKey].push(response);
                            });

                            // Helper function to get model badge color
                            const getModelBadgeColor = (platform: string) => {
                              const platformLower = platform?.toLowerCase() || '';
                              if (platformLower.includes('claude')) return 'bg-orange-100 text-orange-800';
                              if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'bg-green-100 text-green-800';
                              if (platformLower.includes('gemini')) return 'bg-blue-100 text-blue-800';
                              if (platformLower.includes('perplexity')) return 'bg-purple-100 text-purple-800';
                              if (platformLower.includes('groq') || platformLower.includes('grok')) return 'bg-pink-100 text-pink-800';
                              return 'bg-gray-100 text-gray-800';
                            };

                            // Helper function to get model display name
                            const getModelDisplayName = (platform: string) => {
                              const platformLower = platform?.toLowerCase() || '';
                              if (platformLower.includes('claude')) return 'Claude';
                              if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'GPT';
                              if (platformLower.includes('gemini')) return 'Gemini';
                              if (platformLower.includes('perplexity')) return 'Perplexity';
                              if (platformLower.includes('groq') || platformLower.includes('grok')) return 'Groq';
                              return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Unknown';
                            };

                            return Object.entries(groupedByPrompt).map(([promptKey, responses]) => {
                              const firstResponse = responses[0];
                              const uniquePrompt = firstResponse.prompt;

                              return (
                                <div
                                  key={promptKey}
                                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                  {/* Query Section - Show once at top */}
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-sm font-medium text-gray-700">Query:</div>
                                      {resultsView === 'missed' && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Store data in sessionStorage for the edit page
                                            const editData = {
                                              prompt: uniquePrompt,
                                              responses: responses.map(r => ({
                                                id: r.id,
                                                platform: r.platform,
                                                response: r.response,
                                                response_metadata: r.response_metadata
                                              })),
                                              projectId: selectedProject?.id,
                                              brandName: selectedProject?.brand_name,
                                              industry: selectedProject?.industry,
                                              keywords: selectedProject?.keywords || [],
                                              competitors: selectedProject?.competitors || []
                                            };
                                            sessionStorage.setItem('editPromptData', JSON.stringify(editData));
                                            router.push('/dashboard/content?source=ai-visibility&step=content-generation');
                                          }}
                                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                                          title="Generate new optimized content for this prompt"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                          Generate New Content
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                      {uniquePrompt}
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <div className="flex items-center justify-end mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      resultsView === 'mentioned'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {resultsView === 'mentioned' ? 'Brand Mentioned' : 'Brand Not Mentioned'}
                                    </span>
                                  </div>

                                  {/* All Responses from Different Models */}
                                  <div className="space-y-3">
                                    {responses.map((response) => (
                                      <div
                                        key={response.id}
                                        className="border-l-2 border-gray-200 pl-3 py-2 bg-gray-50 rounded-r"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getModelBadgeColor(response.platform)}`}>
                                            {getModelDisplayName(response.platform)}
                                          </span>
                                          {resultsView === 'mentioned' && response.response_metadata?.sentiment_score !== null && (
                                            <span className={`px-2 py-1 rounded text-xs ${
                                              response.response_metadata.sentiment_score > 0.3
                                                ? 'bg-green-100 text-green-800'
                                                : response.response_metadata.sentiment_score < -0.3
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                              Sentiment: {response.response_metadata.sentiment_score?.toFixed(2)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 text-sm text-gray-700 line-clamp-3">
                                            {response.response}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              console.log('View button clicked', { response: response.id, prompt: uniquePrompt });
                                              setViewResponseModal({ open: true, response, prompt: uniquePrompt });
                                            }}
                                            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                                            title="View full response"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>
                                        </div>
                                        {resultsView === 'mentioned' && response.response_metadata?.sources && response.response_metadata.sources.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="text-xs font-medium text-gray-600 mb-1">Sources:</div>
                                            <div className="flex flex-wrap gap-2">
                                              {response.response_metadata.sources.slice(0, 3).map((source: any, idx: number) => (
                                                <a
                                                  key={idx}
                                                  href={source.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 hover:underline truncate max-w-xs"
                                                >
                                                  {source.domain || source.url}
                                                </a>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'competitors' && (
                    <div className="space-y-6">
                      {/* Advanced Competitor Analysis Section */}
                      {(() => {
                        const competitorAnalysis = activeSession?.competitor_analysis;
                        
                        if (competitorAnalysis && competitorAnalysis.rankings && competitorAnalysis.rankings.length > 0) {
                          return (
                            <div className="space-y-6">
                              {/* Rankings Section */}
                              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  <Trophy className="w-5 h-5 text-purple-600" />
                                  Competitor Rankings
                                </h3>
                                <div className="space-y-3">
                                  {competitorAnalysis.rankings.slice(0, 5).map((competitor: any, idx: number) => {
                                    const { name } = parseCompetitorNameGlobal(competitor.name);
                                    const isYourBrand = name === selectedProject?.brand_name;
                                    return (
                                      <div key={competitor.name} className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-4">
                                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                            idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-300'
                                          }`}>
                                            {competitor.rank}
                                          </span>
                                          <div>
                                            {renderCompetitorLink(competitor.name, isYourBrand, true)}
                                            <div className="text-sm text-gray-500">{competitor.mentions} mentions</div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-lg font-semibold text-gray-900">{Math.round(competitor.ranking_score * 100)}%</div>
                                          <div className="text-xs text-gray-500">Overall Score</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {/* Market Position Section */}
                              {competitorAnalysis.market_positions && competitorAnalysis.market_positions.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-purple-600" />
                                    Market Positioning
                                  </h3>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    {['leader', 'challenger', 'follower', 'niche'].map((position) => {
                                      const count = competitorAnalysis.market_positions?.filter((p: any) => p.positioning === position).length || 0;
                                      const brands = competitorAnalysis.market_positions?.filter((p: any) => p.positioning === position).map((p: any) => parseCompetitorNameGlobal(p.brand).name) || [];
                                      return (
                                        <div key={position} className={`rounded-lg p-4 text-center ${
                                          position === 'leader' ? 'bg-green-50 border border-green-200' :
                                          position === 'challenger' ? 'bg-blue-50 border border-blue-200' :
                                          position === 'follower' ? 'bg-yellow-50 border border-yellow-200' :
                                          'bg-gray-50 border border-gray-200'
                                        }`}>
                                          <div className="text-2xl font-bold">{count}</div>
                                          <div className="text-sm capitalize font-medium">{position}s</div>
                                          <div className="text-xs text-gray-500 mt-1 truncate" title={brands.join(', ')}>
                                            {brands.slice(0, 2).join(', ')}{brands.length > 2 ? '...' : ''}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="space-y-2">
                                    {competitorAnalysis.market_positions?.map((pos: any) => {
                                      const { name } = parseCompetitorNameGlobal(pos.brand);
                                      return (
                                        <div key={pos.brand} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                              pos.positioning === 'leader' ? 'bg-green-100 text-green-800' :
                                              pos.positioning === 'challenger' ? 'bg-blue-100 text-blue-800' :
                                              pos.positioning === 'follower' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {pos.positioning}
                                            </span>
                                            {renderCompetitorLink(pos.brand, name === selectedProject?.brand_name, false)}
                                          </div>
                                          <div className="flex items-center gap-4 text-sm">
                                            <span className="text-gray-600">{Math.round(pos.market_share * 100)}% share</span>
                                            <span className="text-gray-600">{Math.round(pos.sentiment_score * 100)}% sentiment</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Share of Voice Section */}
                              {competitorAnalysis.share_of_voice && competitorAnalysis.share_of_voice.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-purple-600" />
                                    Share of Voice
                                  </h3>
                                  <div className="space-y-3">
                                    {competitorAnalysis.share_of_voice.map((sov: any) => {
                                      const { name } = parseCompetitorNameGlobal(sov.brand);
                                      const isYourBrand = name === selectedProject?.brand_name;
                                      return (
                                        <div key={sov.brand} className="space-y-1">
                                          <div className="flex justify-between text-sm">
                                            {renderCompetitorLink(sov.brand, isYourBrand, false)}
                                            <span className="font-medium">{sov.share_percentage}%</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                              className={`h-2 rounded-full ${isYourBrand ? 'bg-purple-600' : 'bg-indigo-400'}`}
                                              style={{ width: `${Math.min(sov.share_percentage, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Competitive Gaps Section */}
                              {competitorAnalysis.competitive_gaps && competitorAnalysis.competitive_gaps.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    Competitive Gaps & Recommendations
                                  </h3>
                                  <div className="space-y-3">
                                    {competitorAnalysis.competitive_gaps.map((gap: any, idx: number) => (
                                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                                        gap.severity === 'high' ? 'bg-red-50 border-red-500' :
                                        gap.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                                        'bg-blue-50 border-blue-500'
                                      }`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                            gap.severity === 'high' ? 'bg-red-100 text-red-800' :
                                            gap.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                          }`}>
                                            {gap.severity.toUpperCase()} PRIORITY
                                          </span>
                                          <span className="text-xs text-gray-500 capitalize">{gap.type.replace('_', ' ')}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">{gap.description}</p>
                                        <p className="text-sm text-gray-600 italic">💡 {gap.recommendation}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Original Competitor Mentions Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitor Mentions</h3>
                        {projectResponses.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No competitor data available</p>
                            <p className="text-sm mt-2">Run an analysis to see competitor mentions</p>
                          </div>
                        ) : (() => {
                          // Aggregate competitor mentions from all responses
                          const competitorData: Record<string, {
                            mentions: number;
                            contexts: string[];
                            sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
                            platforms: Set<string>;
                            comparisons: number;
                          }> = {};

                          projectResponses.forEach((response) => {
                            const metadata = response.response_metadata;
                            if (metadata?.competitors_found && Array.isArray(metadata.competitors_found)) {
                              metadata.competitors_found.forEach((comp: string | { name: string; domain?: string }) => {
                                // Handle both string, JSON string, and object formats
                                let competitor: string;
                                if (typeof comp === 'string') {
                                  // Check if it's a JSON string
                                  if (comp.startsWith('{') && comp.includes('name')) {
                                    try {
                                      competitor = JSON.parse(comp).name || comp;
                                    } catch {
                                      competitor = comp;
                                    }
                                  } else {
                                    competitor = comp;
                                  }
                                } else {
                                  competitor = comp?.name || '';
                                }
                                if (!competitor) return;
                                
                                if (!competitorData[competitor]) {
                                  competitorData[competitor] = {
                                    mentions: 0,
                                    contexts: [],
                                    sentiment: 'neutral',
                                    platforms: new Set(),
                                    comparisons: 0
                                  };
                                }
                                competitorData[competitor].mentions++;
                                competitorData[competitor].platforms.add(response.platform);
                                
                                const competitorContext = metadata.competitor_contexts?.[competitor];
                                if (competitorContext?.context) {
                                  competitorData[competitor].contexts.push(competitorContext.context);
                                }
                                if (competitorContext?.direct_comparison) {
                                  competitorData[competitor].comparisons++;
                                }
                                if (competitorContext?.sentiment) {
                                  competitorData[competitor].sentiment = competitorContext.sentiment;
                                }
                              });
                            }
                          });

                          const competitors = Object.entries(competitorData).sort((a, b) => b[1].mentions - a[1].mentions);

                          return competitors.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                              <p>No competitors mentioned in responses</p>
                              {selectedProject?.competitors && Array.isArray(selectedProject.competitors) && selectedProject.competitors.length > 0 && (
                                <div className="text-sm mt-2">
                                  <span className="text-gray-600">Tracked competitors: </span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedProject.competitors.map((comp, idx) => {
                                      // Handle different formats: string, JSON string, or object
                                      let compName: string;
                                      let compDomain: string | undefined;
                                      
                                      if (typeof comp === 'string') {
                                        // Check if it's a JSON string that needs parsing
                                        if (comp.startsWith('{') && comp.includes('name')) {
                                          try {
                                            const parsed = JSON.parse(comp);
                                            compName = parsed.name || comp;
                                            compDomain = parsed.domain;
                                          } catch {
                                            compName = comp;
                                          }
                                        } else {
                                          compName = comp;
                                        }
                                      } else if (comp && typeof comp === 'object') {
                                        compName = comp.name || 'Unknown';
                                        compDomain = comp.domain;
                                      } else {
                                        compName = String(comp);
                                      }
                                      
                                      return (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                                          <CompetitorLogo name={compName} domain={compDomain} size={16} />
                                          {compName}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {competitors.map(([competitor, data]) => (
                                <div key={competitor} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{competitor}</h4>
                                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                        <span>{data.mentions} mentions</span>
                                        <span>{data.platforms.size} platforms</span>
                                        {data.comparisons > 0 && (
                                          <span className="text-purple-600">{data.comparisons} direct comparisons</span>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      data.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                      data.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                      data.sentiment === 'mixed' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {data.sentiment}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {Array.from(data.platforms).map((platform) => {
                                      const platformOption = platformOptions.find(p => p.id === platform);
                                      return (
                                        <span key={platform} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize flex items-center gap-1">
                                          {platformOption?.icon ? (
                                            <Image 
                                              src={platformOption.icon} 
                                              alt={platformOption.name} 
                                              width={14} 
                                              height={14} 
                                              className="w-3.5 h-3.5 object-contain"
                                              quality={75}
                                            />
                                          ) : null}
                                          {platform}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  {data.contexts.length > 0 && (
                                    <div>
                                      <div className="text-sm font-medium text-gray-700 mb-2">Mention Context:</div>
                                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                        {data.contexts[0]}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  {activeTab === 'sources' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sources & Citations</h3>
                        {projectResponses.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No sources available</p>
                            <p className="text-sm mt-2">Sources will appear here when analysis completes</p>
                          </div>
                        ) : (() => {
                          // Aggregate all sources from responses
                          const sourcesMap: Record<string, {
                            url: string;
                            domain: string;
                            title?: string;
                            mentions: number;
                            platforms: Set<string>;
                            contexts: string[];
                          }> = {};

                          projectResponses.forEach((response) => {
                            const sources = response.response_metadata?.sources || [];
                            sources.forEach((source: any) => {
                              const key = source.url || source.domain;
                              if (key) {
                                if (!sourcesMap[key]) {
                                  sourcesMap[key] = {
                                    url: source.url || `https://${source.domain}`,
                                    domain: source.domain || new URL(source.url).hostname,
                                    title: source.title,
                                    mentions: 0,
                                    platforms: new Set(),
                                    contexts: []
                                  };
                                }
                                sourcesMap[key].mentions++;
                                sourcesMap[key].platforms.add(response.platform);
                              }
                            });
                          });

                          const sources = Object.values(sourcesMap).sort((a, b) => b.mentions - a.mentions);

                          return sources.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                              <p>No sources found in responses</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {sources.map((source, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline font-medium"
                                      >
                                        {source.title || source.domain}
                                      </a>
                                      <div className="text-xs text-gray-500 mt-1">{source.domain}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-gray-900">{source.mentions}</div>
                                      <div className="text-xs text-gray-500">mentions</div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {Array.from(source.platforms).map((platform) => {
                                      const platformOption = platformOptions.find(p => p.id === platform);
                                      return (
                                        <span key={platform} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize flex items-center gap-1">
                                          {platformOption?.icon ? (
                                            <Image 
                                              src={platformOption.icon} 
                                              alt={platformOption.name} 
                                              width={14} 
                                              height={14} 
                                              className="w-3.5 h-3.5 object-contain"
                                              quality={75}
                                            />
                                          ) : null}
                                          {platform}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics & Insights</h3>
                        {projectResponses.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>No analytics data available</p>
                            <p className="text-sm mt-2">Run an analysis to see analytics</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Sentiment Distribution - Pie Chart */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h4 className="text-md font-semibold text-gray-900 mb-4">Sentiment Distribution</h4>
                              {(() => {
                                const sentiments = projectResponses
                                  .filter(r => r.response_metadata?.sentiment_score !== null)
                                  .map(r => r.response_metadata.sentiment_score);
                                const positive = sentiments.filter(s => s > 0.3).length;
                                const negative = sentiments.filter(s => s < -0.3).length;
                                const neutral = sentiments.filter(s => s >= -0.3 && s <= 0.3).length;
                                const total = sentiments.length;

                                const sentimentData = [
                                  { name: 'Positive', value: positive, color: '#10b981', percentage: total > 0 ? Math.round((positive / total) * 100) : 0 },
                                  { name: 'Neutral', value: neutral, color: '#6b7280', percentage: total > 0 ? Math.round((neutral / total) * 100) : 0 },
                                  { name: 'Negative', value: negative, color: '#ef4444', percentage: total > 0 ? Math.round((negative / total) * 100) : 0 },
                                ].filter(item => item.value > 0);

                                if (sentimentData.length === 0) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <p>No sentiment data available</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <ResponsiveContainer width="100%" height={300}>
                                      <PieChart>
                                        <Pie
                                          data={sentimentData}
                                          cx="50%"
                                          cy="50%"
                                          labelLine={false}
                                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                                          outerRadius={100}
                                          fill="#8884d8"
                                          dataKey="value"
                                        >
                                          {sentimentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                      </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col justify-center space-y-4">
                                      {sentimentData.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${item.color}15` }}>
                                          <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="font-medium text-gray-900">{item.name}</span>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                                            <div className="text-xs text-gray-500">{item.percentage}%</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Platform Performance - Bar Chart */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h4 className="text-md font-semibold text-gray-900 mb-4">Platform Performance</h4>
                              {(() => {
                                const platformData = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
                                  const platformResponses = projectResponses.filter(r => r.platform === platform);
                                  const mentions = platformResponses.filter(r => r.response_metadata?.brand_mentioned).length;
                                  const total = platformResponses.length;
                                  const mentionRate = total > 0 ? (mentions / total) * 100 : 0;
                                  const platformOption = platformOptions.find(p => p.id === platform);
                                  
                                  return {
                                    platform: platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1),
                                    mentions,
                                    total,
                                    mentionRate: Math.round(mentionRate),
                                    icon: platformOption?.icon || null
                                  };
                                }).sort((a, b) => b.mentionRate - a.mentionRate);

                                if (platformData.length === 0) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <p>No platform data available</p>
                                    </div>
                                  );
                                }

                                return (
                                  <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={platformData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis 
                                        dataKey="platform" 
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                      />
                                      <YAxis 
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                        label={{ value: 'Mention Rate (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                                      />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: '#fff', 
                                          border: '1px solid #e5e7eb', 
                                          borderRadius: '8px',
                                          padding: '8px'
                                        }}
                                        formatter={(value: number, name: string) => {
                                          if (name === 'mentionRate') return [`${value}%`, 'Mention Rate'];
                                          if (name === 'mentions') return [`${value}`, 'Mentions'];
                                          return [value, name];
                                        }}
                                      />
                                      <Legend />
                                      <Bar 
                                        dataKey="mentionRate" 
                                        fill="#9333ea" 
                                        radius={[8, 8, 0, 0]}
                                        name="Mention Rate (%)"
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                );
                              })()}
                            </div>

                            {/* Platform Comparison - Stacked Bar Chart */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h4 className="text-md font-semibold text-gray-900 mb-4">Platform Comparison</h4>
                              {(() => {
                                const comparisonData = Array.from(new Set(projectResponses.map(r => r.platform))).map((platform) => {
                                  const platformResponses = projectResponses.filter(r => r.platform === platform);
                                  const mentions = platformResponses.filter(r => r.response_metadata?.brand_mentioned).length;
                                  const total = platformResponses.length;
                                  const missed = total - mentions;
                                  const platformOption = platformOptions.find(p => p.id === platform);
                                  
                                  return {
                                    platform: platformOption?.name || platform.charAt(0).toUpperCase() + platform.slice(1),
                                    mentioned: mentions,
                                    missed: missed,
                                    total: total
                                  };
                                });

                                if (comparisonData.length === 0) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <p>No comparison data available</p>
                                    </div>
                                  );
                                }

                                return (
                                  <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={comparisonData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis 
                                        dataKey="platform" 
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                      />
                                      <YAxis 
                                        stroke="#6b7280"
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                        label={{ value: 'Number of Queries', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                                      />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: '#fff', 
                                          border: '1px solid #e5e7eb', 
                                          borderRadius: '8px',
                                          padding: '8px'
                                        }}
                                      />
                                      <Legend />
                                      <Bar 
                                        dataKey="mentioned" 
                                        stackId="a" 
                                        fill="#10b981" 
                                        name="Mentioned"
                                        radius={[0, 0, 0, 0]}
                                      />
                                      <Bar 
                                        dataKey="missed" 
                                        stackId="a" 
                                        fill="#ef4444" 
                                        name="Not Mentioned"
                                        radius={[8, 8, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                );
                              })()}
                            </div>

                            {/* Competitor vs Brand Visibility Comparison */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h4 className="text-md font-semibold text-gray-900 mb-4">Competitor vs Brand Visibility</h4>
                              {(() => {
                                // Calculate brand visibility
                                const brandMentions = projectResponses.filter(r => r.response_metadata?.brand_mentioned).length;
                                const totalQueries = projectResponses.length;
                                const brandVisibility = totalQueries > 0 ? Math.round((brandMentions / totalQueries) * 100) : 0;

                                // Calculate competitor visibility (how many responses mention each competitor)
                                const competitorMentionCount: Record<string, number> = {};
                                
                                projectResponses.forEach((response) => {
                                  const competitorsRaw = response.response_metadata?.competitors_found || [];
                                  // Extract competitor names, handling both string and object formats
                                  const competitorNames = competitorsRaw.map((comp: string | { name: string; domain?: string }) => {
                                    if (typeof comp === 'string') {
                                      if (comp.startsWith('{') && comp.includes('name')) {
                                        try {
                                          return JSON.parse(comp).name || comp;
                                        } catch {
                                          return comp;
                                        }
                                      }
                                      return comp;
                                    }
                                    return comp?.name || String(comp);
                                  }).filter(Boolean);
                                  // Track unique competitors per response to avoid double counting
                                  const uniqueCompetitors = [...new Set(competitorNames)] as string[];
                                  uniqueCompetitors.forEach((competitor: string) => {
                                    competitorMentionCount[competitor] = (competitorMentionCount[competitor] || 0) + 1;
                                  });
                                });

                                // Build comparison data - visibility is (mentions / total queries) * 100
                                const comparisonData = [
                                  {
                                    name: selectedProject?.brand_name || 'Your Brand',
                                    visibility: brandVisibility,
                                    mentions: brandMentions,
                                    totalQueries: totalQueries,
                                    isBrand: true
                                  },
                                  ...Object.entries(competitorMentionCount)
                                    .map(([competitor, mentions]) => ({
                                      name: competitor,
                                      visibility: totalQueries > 0 ? Math.round((mentions / totalQueries) * 100) : 0,
                                      mentions: mentions,
                                      totalQueries: totalQueries,
                                      isBrand: false
                                    }))
                                    .sort((a, b) => b.visibility - a.visibility)
                                    .slice(0, 10) // Top 10 competitors
                                ];

                                if (comparisonData.length <= 1) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <p>No competitor data available for comparison</p>
                                      <p className="text-sm mt-2">Competitors will appear here once they are mentioned in responses</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-4">
                                    <ResponsiveContainer width="100%" height={400}>
                                      <BarChart data={comparisonData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                          type="number"
                                          stroke="#6b7280"
                                          tick={{ fill: '#6b7280', fontSize: 12 }}
                                        />
                                        <YAxis 
                                          type="category"
                                          dataKey="name"
                                          stroke="#6b7280"
                                          tick={{ fill: '#6b7280', fontSize: 12 }}
                                          width={150}
                                        />
                                        <Tooltip 
                                          contentStyle={{ 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '8px',
                                            padding: '8px'
                                          }}
                                          formatter={(value: number, name: string, props: any) => {
                                            if (name === 'visibility') {
                                              return [`${value}%`, 'Visibility Score'];
                                            }
                                            if (name === 'mentions') {
                                              return [`${value}`, 'Mentions'];
                                            }
                                            if (name === 'totalQueries') {
                                              return [`${value}`, 'Total Queries'];
                                            }
                                            return [value, name];
                                          }}
                                          labelFormatter={(label) => `Brand: ${label}`}
                                        />
                                        <Legend />
                                        <Bar 
                                          dataKey="visibility" 
                                          name="Visibility Score"
                                          radius={[0, 8, 8, 0]}
                                        >
                                          {comparisonData.map((entry, index) => (
                                            <Cell 
                                              key={`cell-${index}`} 
                                              fill={entry.isBrand ? '#9333ea' : '#3b82f6'} 
                                            />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                    
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="text-sm text-gray-600 mb-1">Your Brand</div>
                                        <div className="text-2xl font-bold text-purple-600">
                                          {brandVisibility}%
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {brandMentions} of {totalQueries} queries
                                        </div>
                                      </div>
                                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="text-sm text-gray-600 mb-1">Top Competitor</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                          {comparisonData.length > 1 && !comparisonData[1].isBrand 
                                            ? `${comparisonData[1].visibility}%` 
                                            : 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {comparisonData.length > 1 && !comparisonData[1].isBrand 
                                            ? `${comparisonData[1].name}` 
                                            : 'No competitors'}
                                        </div>
                                      </div>
                                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="text-sm text-gray-600 mb-1">Avg Competitor</div>
                                        <div className="text-2xl font-bold text-gray-700">
                                          {(() => {
                                            const competitors = comparisonData.filter(d => !d.isBrand);
                                            if (competitors.length === 0) return 'N/A';
                                            const avg = competitors.reduce((sum, c) => sum + c.visibility, 0) / competitors.length;
                                            return `${Math.round(avg)}%`;
                                          })()}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {comparisonData.filter(d => !d.isBrand).length} competitors
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Top Queries */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h4 className="text-md font-semibold text-gray-900 mb-4">Top Performing Queries</h4>
                              <div className="space-y-2">
                                {projectResponses
                                  .filter(r => r.response_metadata?.brand_mentioned)
                                  .slice(0, 5)
                                  .map((response, idx) => (
                                    <div key={response.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-400">#{idx + 1}</span>
                                            <span className="text-sm font-medium text-gray-900 line-clamp-1">
                                              {response.prompt}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="capitalize">{response.platform}</span>
                                            {response.response_metadata?.sentiment_score !== null && (
                                              <span className={`${
                                                response.response_metadata.sentiment_score > 0.3 ? 'text-green-600' :
                                                response.response_metadata.sentiment_score < -0.3 ? 'text-red-600' :
                                                'text-gray-600'
                                              }`}>
                                                Sentiment: {response.response_metadata.sentiment_score.toFixed(2)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                {projectResponses.filter(r => r.response_metadata?.brand_mentioned).length === 0 && (
                                  <div className="text-center py-8 text-gray-500 text-sm">
                                    No brand mentions found
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            
                            {/* Market Position Chart - Advanced Competitor Analysis */}
                            {(() => {
                              const competitorAnalysis = activeSession?.competitor_analysis;
                              
                              if (competitorAnalysis?.market_positions && competitorAnalysis.market_positions.length > 0) {
                                const positionData = competitorAnalysis.market_positions.map((pos: any) => {
                                  const { name } = parseCompetitorNameGlobal(pos.brand);
                                  return {
                                    name: name,
                                    marketShare: Math.round(pos.market_share * 100),
                                    sentiment: Math.round(pos.sentiment_score * 100),
                                    strength: Math.round(pos.competitive_strength * 100),
                                    positioning: pos.positioning,
                                    isBrand: name === selectedProject?.brand_name
                                  };
                                });
                                
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                      <Target className="w-5 h-5 text-purple-600" />
                                      Competitive Strength Analysis
                                    </h4>
                                    <ResponsiveContainer width="100%" height={350}>
                                      <BarChart data={positionData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                          type="number" 
                                          domain={[0, 100]}
                                          stroke="#6b7280"
                                          tick={{ fill: '#6b7280', fontSize: 12 }}
                                        />
                                        <YAxis 
                                          type="category"
                                          dataKey="name"
                                          stroke="#6b7280"
                                          tick={{ fill: '#6b7280', fontSize: 12 }}
                                          width={120}
                                        />
                                        <Tooltip 
                                          contentStyle={{ 
                                            backgroundColor: '#fff', 
                                            border: '1px solid #e5e7eb', 
                                            borderRadius: '8px',
                                            padding: '12px'
                                          }}
                                          formatter={(value: number, name: string) => {
                                            const label = name === 'marketShare' ? 'Market Share' : 
                                                          name === 'sentiment' ? 'Sentiment' : 'Competitive Strength';
                                            return [`${value}%`, label];
                                          }}
                                        />
                                        <Legend />
                                        <Bar dataKey="marketShare" name="Market Share" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="sentiment" name="Sentiment" fill="#10b981" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="strength" name="Competitive Strength" fill="#9333ea" radius={[0, 4, 4, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {activeTab === 'keywords' && (
                    <KeywordsTab selectedProject={selectedProject} />
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Visibility Score */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Visibility Score</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {(() => {
                    const totalMentions = projectStats?.total_mentions || projectResponses.filter(r => r.response_metadata?.brand_mentioned).length || 0;
                    const totalQueries = projectStats?.total_queries || projectResponses.length || 0;
                    if (totalQueries > 0) {
                      return Math.round((totalMentions / totalQueries) * 100);
                    }
                    return 0;
                  })()}%
                </div>
                <p className="text-sm text-gray-600">
                  Your brand appears in {projectStats?.total_mentions || projectResponses.filter(r => r.response_metadata?.brand_mentioned).length || 0} of {projectStats?.total_queries || projectResponses.length || 0} prompts
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => selectedProject && openConfigureModal(selectedProject, projectResponses)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configure Project
                </button>
                <button
                  onClick={() => { if (selectedProject) fetchHistorySessions(selectedProject.id); setShowHistoryModal(true); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <History className="w-4 h-4" />
                  Analysis History
                </button>
                <div className="relative" ref={exportDropdownRef}>
                  <button 
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                    <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showExportDropdown && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <button
                        onClick={handleExportPDF}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>Export as PDF</span>
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                      >
                        <FileText className="w-4 h-4 text-green-600" />
                        <span>Export as CSV</span>
                      </button>
                      <button
                        onClick={handleExportPPT}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Export as PowerPoint</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Show Run Analysis / Resume button when not running */}
                {!isRunning && (
                  isPaused && latestSession ? (
                    <button
                      onClick={() => handleResumeAnalysis(latestSession.id, selectedProject.id)}
                      disabled={resumingAnalysis === latestSession.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resumingAnalysis === latestSession.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Resuming...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Resume Analysis
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!selectedProject) return;
                        handleRunAnalysis(selectedProject);
                      }}
                      disabled={isAnalyzing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Run Analysis
                        </>
                      )}
                    </button>
                  )
                )}

              </div>

              {/* Analysis Start Notification */}
              {showAnalysisStartNotification && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <div className="text-sm font-semibold text-blue-900">Analysis Started!</div>
                      <div className="text-xs text-blue-700">Your analysis is running in the background</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Completion Notification */}
              {showCompletionNotification && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-sm font-semibold text-green-900">Analysis Complete!</div>
                      <div className="text-xs text-green-700">Results are now available</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Configure Project modal – show prompts from last analysis, edit, save, then run again */}
              {showConfigureModal && selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !configSaving && setShowConfigureModal(false)}>
                  <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Configure Project</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Prompts used in your last analysis are shown below. Edit them, then Save. When you click Run Analysis, these prompts will be used again.
                      </p>
                    </div>
                    <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Project name</label>
                        <p className="text-xs text-gray-500 mb-2">Display name for this project (e.g. brand or company name).</p>
                        <input
                          type="text"
                          value={configProjectName}
                          onChange={(e) => setConfigProjectName(e.target.value)}
                          placeholder="e.g. Dr kroman"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">AI platforms for re-analysis</label>
                        <p className="text-xs text-gray-500 mb-2">Choose which LLMs to run when you click Run Analysis.</p>
                        <div className="flex flex-wrap gap-3">
                          {platformOptions.map((platform) => (
                            <label
                              key={platform.id}
                              className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                                configPlatforms.includes(platform.id)
                                  ? 'border-purple-600 bg-purple-50'
                                  : 'border-gray-300 bg-white hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={configPlatforms.includes(platform.id)}
                                onChange={() => {
                                  if (configPlatforms.includes(platform.id)) {
                                    setConfigPlatforms(configPlatforms.filter((p) => p !== platform.id));
                                  } else {
                                    setConfigPlatforms([...configPlatforms, platform.id]);
                                  }
                                }}
                                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              {platform.icon ? (
                                <Image src={platform.icon} alt={platform.name} width={20} height={20} className="w-5 h-5 object-contain" quality={75} />
                              ) : null}
                              <span className="font-medium text-gray-900">{platform.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {/* Language & Region Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Languages for Analysis</h3>
                          <p className="text-xs text-gray-500 mb-2">Select languages to generate queries in. Analysis will run in these languages.</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {configLanguages.map((code) => {
                              const opt = analysisLanguageOptions.find((o) => o.value === code);
                              return (
                                <span key={code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg text-xs">
                                  {opt?.label ?? code}
                                  <button type="button" onClick={() => setConfigLanguages(configLanguages.filter((c) => c !== code))} className="text-teal-600 hover:text-teal-800">
                                    &times;
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v && !configLanguages.includes(v)) setConfigLanguages([...configLanguages, v]);
                              e.target.value = "";
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                          >
                            <option value="">Select language...</option>
                            {analysisLanguageOptions.filter((o) => !configLanguages.includes(o.value)).map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Countries/Regions</h3>
                          <p className="text-xs text-gray-500 mb-2">Select countries for geography-specific queries.</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {configCountries.map((code) => {
                              const opt = analysisCountryOptions.find((o) => o.value === code);
                              return (
                                <span key={code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-lg text-xs">
                                  {opt?.label ?? code}
                                  <button type="button" onClick={() => setConfigCountries(configCountries.filter((c) => c !== code))} className="text-cyan-600 hover:text-cyan-800">
                                    &times;
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v && !configCountries.includes(v)) setConfigCountries([...configCountries, v]);
                              e.target.value = "";
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                          >
                            <option value="">Select country...</option>
                            {analysisCountryOptions.filter((o) => !configCountries.includes(o.value)).map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Prompts used during analysis</label>
                        <p className="text-xs text-gray-500 mb-2">All prompts will run in the languages and regions selected above.</p>
                        {(configLanguages.length > 0 || configCountries.length > 0) && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                            {configLanguages.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-teal-600" />
                                {configLanguages.map(c => analysisLanguageOptions.find(o => o.value === c)?.label ?? c).join(', ')}
                              </span>
                            )}
                            {configLanguages.length > 0 && configCountries.length > 0 && (
                              <span className="text-gray-300">|</span>
                            )}
                            {configCountries.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-cyan-600" />
                                {configCountries.map(c => analysisCountryOptions.find(o => o.value === c)?.label ?? c).join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                          {configManualQueries.map((q, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <textarea
                                value={q.text}
                                onChange={(e) => setConfigManualQueries((prev) => prev.map((p, j) => (j === i ? { ...p, text: e.target.value } : p)))}
                                placeholder="Prompt text..."
                                rows={2}
                                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                              />
                              <button
                                type="button"
                                onClick={() => setConfigManualQueries((prev) => prev.filter((_, j) => j !== i))}
                                className="self-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                title="Remove prompt"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfigManualQueries((prev) => [...prev, { text: '', isManual: true }])}
                          className="mt-2 flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add prompt
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                      <button
                        onClick={() => setShowConfigureModal(false)}
                        disabled={configSaving}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                        <button
                          onClick={handleSaveConfigure}
                          disabled={configSaving || !configProjectName.trim() || configManualQueries.every((q) => !q.text.trim()) || configPlatforms.length === 0}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                        {configSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis History Modal */}
              {showHistoryModal && selectedProject && (() => {
                const defaultSessionId = defaultCompletedSession?.id;
                const currentlyViewingId = historySessionId || defaultSessionId;
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                      {/* Header */}
                      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                              <History className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
                              <p className="text-xs text-gray-500">
                                {historySessionsLoading ? 'Loading...' : `${historySessions.length} session${historySessions.length !== 1 ? 's' : ''}`} for {selectedProject.brand_name}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => setShowHistoryModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/80 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Session List */}
                      <div className="px-6 py-4 overflow-y-auto flex-1">
                        {historySessionsLoading ? (
                          <div className="text-center py-16 text-gray-400">
                            <RefreshCw className="w-10 h-10 mx-auto mb-4 text-purple-300 animate-spin" />
                            <p className="font-medium text-gray-500">Loading sessions...</p>
                          </div>
                        ) : historySessions.length === 0 ? (
                          <div className="text-center py-16 text-gray-400">
                            <History className="w-14 h-14 mx-auto mb-4 text-gray-200" />
                            <p className="font-medium text-gray-500">No analysis sessions yet</p>
                            <p className="text-sm mt-1">Run an analysis to see history here</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...historySessions].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()).map((session, idx) => {
                              const isCurrentlyViewing = currentlyViewingId === session.id;
                              const isLatest = idx === 0;
                              const prog = session.total_queries && session.total_queries > 0
                                ? Math.round(((session.completed_queries || 0) / session.total_queries) * 100)
                                : 0;
                              const mentions = session.results_summary?.total_mentions || 0;
                              const totalQ = session.results_summary?.total_queries || session.total_queries || 0;
                              const mentionRate = totalQ > 0 ? ((mentions / totalQ) * 100).toFixed(1) : '0';

                              return (
                                <div
                                  key={session.id}
                                  className={`group relative rounded-xl border transition-all cursor-pointer ${
                                    isCurrentlyViewing
                                      ? 'border-purple-300 bg-purple-50 ring-1 ring-purple-200'
                                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                  }`}
                                  onClick={() => session.status === 'completed' && handleViewHistorySession(session.id)}
                                >
                                  <div className="px-4 py-3.5">
                                    {/* Top row: title + badges */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        {session.status === 'completed' ? (
                                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                        ) : session.status === 'running' ? (
                                          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                                        ) : session.status === 'paused' ? (
                                          <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        )}
                                        <span className="font-medium text-gray-900 text-sm truncate">
                                          {session.session_name || 'Analysis Session'}
                                        </span>
                                        {isLatest && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-600">
                                            Latest
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {isCurrentlyViewing && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-600 text-white">
                                            <Eye className="w-3 h-3" />
                                            Active
                                          </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                          session.status === 'completed' ? 'bg-green-100 text-green-700'
                                            : session.status === 'running' ? 'bg-blue-100 text-blue-700'
                                            : session.status === 'paused' ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                          {session.status}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Date row */}
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(session.started_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        {' '}
                                        {new Date(session.started_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {session.completed_at && (
                                        <span className="text-gray-400">
                                          &rarr; {new Date(session.completed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>

                                    {/* Stats row for completed */}
                                    {session.status === 'completed' && (
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                                          <BarChart3 className="w-3 h-3 text-gray-500" />
                                          {totalQ} queries
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                                          <Eye className="w-3 h-3 text-gray-500" />
                                          {mentions} mentions
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                                          <TrendingUp className="w-3 h-3 text-gray-500" />
                                          {mentionRate}% rate
                                        </div>
                                        {session.results_summary?.platforms_analyzed && (
                                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                                            <Globe className="w-3 h-3 text-gray-500" />
                                            {session.results_summary.platforms_analyzed.length} platforms
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Progress bar for running */}
                                    {session.status === 'running' && (
                                      <div>
                                        <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${prog}%` }} />
                                        </div>
                                        <span className="text-[11px] text-blue-600 mt-1">{prog}% &mdash; {session.completed_queries || 0}/{session.total_queries || 0}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Hover arrow for completed, non-viewing sessions */}
                                  {session.status === 'completed' && !isCurrentlyViewing && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ArrowRight className="w-4 h-4 text-purple-400" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                        <button
                          onClick={() => setShowHistoryModal(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Running Status */}
              {isRunning && latestSession?.id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Progress</span>
                    <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-2 mb-3">
                    Processing {latestSession.completed_queries || 0} of {latestSession.total_queries || 0} queries
                  </div>
                  <button
                    onClick={() => handleStopAnalysis(latestSession.id, selectedProject!.id)}
                    disabled={stoppingAnalysis === latestSession.id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {stoppingAnalysis === latestSession.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <StopCircle className="w-4 h-4" />
                        Stop Analysis
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Paused Status */}
              {isPaused && latestSession?.id && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StopCircle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">Analysis Paused</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-semibold text-amber-600">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mb-3">
                    {latestSession.completed_queries || 0} of {latestSession.total_queries || 0} queries completed
                  </div>
                  <button
                    onClick={() => handleResumeAnalysis(latestSession.id, selectedProject!.id)}
                    disabled={resumingAnalysis === latestSession.id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resumingAnalysis === latestSession.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Resume Analysis
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Start Modal */}
        {showAnalysisStartModal && analysisStartInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Analysis Started</h2>
                  <button
                    onClick={() => {
                      setShowAnalysisStartModal(false);
                      setAnalysisStartInfo(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {analysisStartInfo.alreadyRunning && analysisStartInfo.message && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">{analysisStartInfo.message}</p>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        {analysisStartInfo.alreadyRunning ? "Analysis already in progress" : "Analysis is running in the background"}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {analysisStartInfo.alreadyRunning
                        ? "You can close this window. Results will update when the current run completes."
                        : "Your brand analysis has started successfully. You can close this window and continue working. Results will be available when the analysis completes."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Platforms</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {analysisStartInfo.platforms_count || analysisStartInfo.platforms_analyzed?.length || 0}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(analysisStartInfo.platforms_analyzed || []).map((platform: string) => {
                          const platformOption = platformOptions.find(p => p.id === platform);
                          return (
                            <span key={platform} className="text-xs px-2 py-1 bg-white rounded border border-gray-200 flex items-center gap-1">
                              {platformOption?.icon ? (
                                <Image 
                                  src={platformOption.icon} 
                                  alt={platformOption.name} 
                                  width={16} 
                                  height={16} 
                                  className="w-4 h-4 object-contain"
                                  quality={75}
                                />
                              ) : null}
                              {platformOption?.name || platform}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Total Queries</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {analysisStartInfo.total_queries || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Across all platforms
                      </div>
                    </div>
                  </div>

                  {analysisStartInfo.estimated_completion && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-sm font-semibold text-purple-900 mb-1">Estimated Completion</div>
                      <div className="text-sm text-purple-700">
                        {new Date(analysisStartInfo.estimated_completion).toLocaleString()}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Session Information</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Session ID: <span className="font-mono text-gray-900">{analysisStartInfo.sessionId ?? analysisStartInfo.session_id ?? "—"}</span></div>
                      <div>Status: <span className="text-blue-600 font-semibold">Running</span></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowAnalysisStartModal(false);
                      setAnalysisStartInfo(null);
                    }}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* View Response Modal for Details View */}
      {viewResponseModal?.open && viewResponseModal?.response && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            zIndex: 99999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewResponseModal(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Full Response</h3>
              <button
                onClick={() => setViewResponseModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Query:</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {viewResponseModal.prompt}
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium capitalize ${
                    viewResponseModal.response.platform?.toLowerCase().includes('claude') ? 'bg-orange-100 text-orange-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('chatgpt') || viewResponseModal.response.platform?.toLowerCase().includes('gpt') ? 'bg-green-100 text-green-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('gemini') ? 'bg-blue-100 text-blue-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('perplexity') ? 'bg-purple-100 text-purple-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('groq') ? 'bg-pink-100 text-pink-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewResponseModal.response.platform?.toLowerCase().includes('claude') ? 'Claude' :
                     viewResponseModal.response.platform?.toLowerCase().includes('chatgpt') || viewResponseModal.response.platform?.toLowerCase().includes('gpt') ? 'GPT' :
                     viewResponseModal.response.platform?.toLowerCase().includes('gemini') ? 'Gemini' :
                     viewResponseModal.response.platform?.toLowerCase().includes('perplexity') ? 'Perplexity' :
                     viewResponseModal.response.platform?.toLowerCase().includes('groq') ? 'Groq' :
                     viewResponseModal.response.platform || 'Unknown'}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-700 mb-2">Response:</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded max-h-80 overflow-y-auto">
                  {viewResponseModal.response.response}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setViewResponseModal(null)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  // Render Form View (existing form code)
  const steps = [
    { id: 1, title: "Brand Setup", description: "Basic brand information", icon: LayoutGrid },
    { id: 2, title: "Competitive Intelligence", description: "Competitors and keywords", icon: Target },
    { id: 3, title: "Platform Selection", description: "Choose AI platforms to monitor", icon: Settings },
    { id: 4, title: "Query Configuration", description: "Auto or manual queries", icon: Search },
    { id: 5, title: "Review & Launch", description: "Review settings and start analysis", icon: Play },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto mb-8">
        <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setViewMode('projects')}
            className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t.dashboard.common.back}
          </button>
        </div>
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isActive 
                      ? 'bg-purple-600 text-white' 
                      : isCompleted
                      ? 'bg-purple-400 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-semibold mb-1 ${
                      isActive ? 'text-purple-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-100 rounded-2xl p-8 shadow-xl">
          {/* Step 1: Brand Setup */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t.dashboard.aiVisibility.brandName} *
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={t.dashboard.aiVisibility.brandName}
                  className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isRtl ? 'text-right' : 'text-left'}`}
                  dir="ltr"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">
                    {t.dashboard.aiVisibility.website} *
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/domains')}
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add domain
                  </button>
                </div>
                <div className="relative">
                  {loadingDomains ? (
                    <div className="w-full px-4 py-3 bg-gray-50 text-gray-400 border border-gray-300 rounded-lg flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading domains...
                    </div>
                  ) : availableDomains.length > 0 ? (
                    <select
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none pr-10"
                    >
                      <option value="">Select a domain</option>
                      {availableDomains.map((d) => (
                        <option key={d.id} value={d.domain}>{d.domain}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="example.com"
                      className={`w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isRtl ? 'text-right' : 'text-left'}`}
                      dir="ltr"
                    />
                  )}
                  {availableDomains.length > 0 && !loadingDomains && (
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  )}
                </div>
                {availableDomains.length === 0 && !loadingDomains && (
                  <p className="text-xs text-gray-500 mt-1">No domains found. Add domains in <span className="text-purple-600 font-medium">Domain Management</span> or enter manually.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t.dashboard.aiVisibility.industry} *
                </label>
                <div className="relative">
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none pr-10"
                  >
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Competitive Intelligence */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* AI-Powered Suggestions */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">✨ AI-Powered Suggestions</h3>
                      <p className="text-sm text-gray-600">
                        {isGeneratingAI 
                          ? "Generating competitors and keywords..." 
                          : competitors.length > 0 || keywords.length > 0
                          ? "AI has generated suggestions below. Edit them or click Regenerate for new ones."
                          : "AI will generate competitors and keywords automatically. You can edit the results below."
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={generateAISuggestions}
                    disabled={isGeneratingAI || !brandName.trim() || !websiteUrl.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isGeneratingAI ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {competitors.length > 0 || keywords.length > 0 ? 'Regenerate' : 'Generate'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Competitors (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t.dashboard.aiVisibility.competitors}
                </label>
                <div className={`flex gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="text"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                    placeholder={t.dashboard.aiVisibility.addCompetitor}
                    className={`flex-1 px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isRtl ? 'text-right' : 'text-left'}`}
                    dir="ltr"
                  />
                  <button
                    onClick={addCompetitor}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {t.dashboard.common.add}
                  </button>
                </div>
                {competitors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {competitors.map((competitor, idx) => {
                      const competitorName = typeof competitor === 'string' ? competitor : competitor.name;
                      const competitorDomain = typeof competitor === 'string' ? undefined : competitor.domain;
                      const isManual = idx < manualCompetitors.length;
                      const listIndex = isManual ? idx : idx - manualCompetitors.length;
                      const competitorKey = isManual ? `manual-${listIndex}-${competitorName}` : `suggested-${listIndex}-${competitorName}`;
                      const onRemove = () => {
                        if (isManual) {
                          setManualCompetitors(prev => prev.filter((_, i) => i !== listIndex));
                        } else {
                          setSuggestedCompetitors(prev => prev.filter((_, i) => i !== listIndex));
                        }
                      };
                      return (
                        <span
                          key={competitorKey}
                          className="px-3 py-1.5 bg-gray-200 text-gray-900 rounded-lg flex items-center gap-2"
                        >
                          <CompetitorLogo
                            name={competitorName}
                            domain={competitorDomain}
                            size={20}
                            className="flex-shrink-0"
                          />
                          <span className="text-sm font-medium">{competitorName}</span>
                          <button
                            onClick={onRemove}
                            type="button"
                            className="text-gray-400 hover:text-gray-600 ml-auto flex-shrink-0 flex items-center justify-center"
                            style={{ fontSize: '18px', lineHeight: 1, width: '18px', height: '18px' }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Target Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t.dashboard.aiVisibility.keywords}
                </label>
                <div className={`flex gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder={t.dashboard.aiVisibility.addKeyword}
                    className={`flex-1 px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isRtl ? 'text-right' : 'text-left'}`}
                    dir="ltr"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {t.dashboard.common.add}
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => {
                      const isManual = idx < manualKeywords.length;
                      const listIndex = isManual ? idx : idx - manualKeywords.length;
                      const onRemove = () => {
                        if (isManual) {
                          setManualKeywords(prev => prev.filter((_, i) => i !== listIndex));
                        } else {
                          setSuggestedKeywords(prev => prev.filter((_, i) => i !== listIndex));
                        }
                      };
                      return (
                        <span
                          key={`${isManual ? 'manual' : 'suggested'}-${listIndex}-${keyword}`}
                          className="px-3 py-1 bg-gray-200 text-gray-900 rounded-lg flex items-center gap-2"
                        >
                          {keyword}
                          <button
                            onClick={onRemove}
                            type="button"
                            className="text-gray-400 hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Platform Selection + Languages & Regions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Select Languages for Global Analysis - shown first so visible without scrolling */}
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Select Languages for Global Analysis</h3>
                <p className="text-sm text-gray-600 mb-3">Track your brand visibility across different languages and regions. {analysisLanguageOptions.length} languages supported (e.g. English, Hebrew, Urdu, German, French, Spanish, and more).</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {analysisLanguages.map((code) => {
                    const opt = analysisLanguageOptions.find((o) => o.value === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-lg text-sm"
                      >
                        {opt?.label ?? code}
                        <button
                          type="button"
                          onClick={() => setAnalysisLanguages(analysisLanguages.filter((c) => c !== code))}
                          className="text-teal-600 hover:text-teal-800"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && !analysisLanguages.includes(v)) setAnalysisLanguages([...analysisLanguages, v]);
                    e.target.value = "";
                  }}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                >
                  <option value="">Select languages to monitor</option>
                  {analysisLanguageOptions.filter((o) => !analysisLanguages.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Select Countries/Regions for Analysis */}
              <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Select Countries/Regions for Analysis</h3>
                <p className="text-sm text-gray-600 mb-2">Track your brand visibility in specific countries and regions.</p>
                <p className="text-xs text-gray-500 mb-3">Select countries to generate geography-specific queries. If none selected, queries will be general (not country-specific).</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {analysisCountries.map((code) => {
                    const opt = analysisCountryOptions.find((o) => o.value === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-100 text-cyan-800 rounded-lg text-sm"
                      >
                        {opt?.label ?? code}
                        <button
                          type="button"
                          onClick={() => setAnalysisCountries(analysisCountries.filter((c) => c !== code))}
                          className="text-cyan-600 hover:text-cyan-800"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && !analysisCountries.includes(v)) setAnalysisCountries([...analysisCountries, v]);
                    e.target.value = "";
                  }}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                >
                  <option value="">Select countries...</option>
                  {analysisCountryOptions.filter((o) => !analysisCountries.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-3">
                  Each platform will have up to {queriesPerPlatform} queries distributed across {Math.max(1, analysisLanguages.length)} language(s) and {Math.max(1, analysisCountries.length)} region(s). Total: {selectedPlatforms.length} platform(s) × {queriesPerPlatform} = {selectedPlatforms.length * queriesPerPlatform} queries.
                </p>
              </div>

              {/* Queries per platform (Step 3) */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Queries per AI platform
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  How many queries to run on each selected platform. Distributed equally across the selected language(s) and region(s). Maximum 50 per platform.
                </p>
                <select
                  value={queriesPerPlatform}
                  onChange={(e) => setQueriesPerPlatform(Number(e.target.value))}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                >
                  {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((n) => (
                    <option key={n} value={n}>{n} queries per platform</option>
                  ))}
                </select>
              </div>

              {/* Select AI Platforms */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-900 mb-4">
                  Select AI Platforms
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {platformOptions.map((platform) => (
                    <label
                      key={platform.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-300 bg-white hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => {
                          if (selectedPlatforms.includes(platform.id)) {
                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                          } else {
                            setSelectedPlatforms([...selectedPlatforms, platform.id]);
                          }
                        }}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      {platform.icon ? (
                        <Image 
                          src={platform.icon} 
                          alt={platform.name} 
                          width={24} 
                          height={24} 
                          className="w-6 h-6 object-contain"
                          quality={75}
                        />
                      ) : null}
                      <span className={`font-medium ${
                        selectedPlatforms.includes(platform.id) ? "text-purple-900" : "text-gray-900"
                      }`}>
                        {platform.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Query Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose how queries are built for AI visibility. Queries per platform: {queriesPerPlatform} (max 50). Total runs: {selectedPlatforms.length} × {queriesPerPlatform} = {selectedPlatforms.length * queriesPerPlatform}.
                </p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer">
                    <input
                      type="radio"
                      name="queryMode"
                      checked={queryMode === 'auto'}
                      onChange={() => setQueryMode('auto')}
                      className="mt-1 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Auto-generated queries only</span>
                      <p className="text-sm text-gray-500">System generates up to {queriesPerPlatform} queries per platform, distributed across your selected language(s) and region(s).</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer">
                    <input
                      type="radio"
                      name="queryMode"
                      checked={queryMode === 'manual'}
                      onChange={() => setQueryMode('manual')}
                      className="mt-1 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Manual queries only</span>
                      <p className="text-sm text-gray-500">You add all queries below (max {queriesPerPlatform} per platform).</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer">
                    <input
                      type="radio"
                      name="queryMode"
                      checked={queryMode === 'auto_manual'}
                      onChange={() => setQueryMode('auto_manual')}
                      className="mt-1 text-purple-600"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Auto + manual</span>
                      <p className="text-sm text-gray-500">Combine generated and your queries; total max {queriesPerPlatform} per platform.</p>
                    </div>
                  </label>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Total Queries Summary</div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-gray-700">Platforms: {selectedPlatforms.length}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-700">Languages: {analysisLanguages.length || 1}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-700">Manual queries: {manualQueries.length}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {queryMode === 'manual' ? Math.min(manualQueries.length, queriesPerPlatform) : queriesPerPlatform}
                    </span>
                    <span className="text-gray-600">queries per platform (max {queriesPerPlatform})</span>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Add Manual Queries</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <textarea
                      value={newManualQueryText}
                      onChange={(e) => setNewManualQueryText(e.target.value)}
                      placeholder="Query text..."
                      rows={2}
                      className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={newManualQueryLanguage}
                      onChange={(e) => setNewManualQueryLanguage(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {analysisLanguageOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <select
                      value={newManualQueryCountry}
                      onChange={(e) => setNewManualQueryCountry(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">No country</option>
                      {analysisCountryOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const text = newManualQueryText.trim();
                        if (!text) return;
                        if (manualQueries.length >= queriesPerPlatform) return;
                        setManualQueries((q) => [...q, { text, language: newManualQueryLanguage, country: newManualQueryCountry || undefined }]);
                        setNewManualQueryText('');
                      }}
                      disabled={!newManualQueryText.trim() || manualQueries.length >= queriesPerPlatform}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                    >
                      + Add Query
                    </button>
                  </div>
                  {manualQueries.length > 0 && (
                    <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {manualQueries.map((q, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm bg-white border border-gray-200 rounded px-2 py-1">
                          <span className="truncate flex-1">{q.text}</span>
                          <span className="text-gray-400 shrink-0">{q.language || 'en-US'}{q.country ? ` · ${q.country}` : ''}</span>
                          <button
                            type="button"
                            onClick={() => setManualQueries((prev) => prev.filter((_, j) => j !== i))}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            aria-label="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Launch */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Settings</h3>
                <div>
                  <span className="text-sm font-medium text-gray-600">Brand Name:</span>
                  <p className="text-gray-900">{brandName || "Not set"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Website URL:</span>
                  <p className="text-gray-900">{websiteUrl || "Not set"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Industry:</span>
                  <p className="text-gray-900">{industry}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Competitors:</span>
                  <p className="text-gray-900">
                    {competitors.length > 0 
                      ? competitors.map(c => {
                          if (typeof c === 'string') {
                            // Check if it's a JSON string
                            if (c.startsWith('{') && c.includes('name')) {
                              try {
                                return JSON.parse(c).name || c;
                              } catch {
                                return c;
                              }
                            }
                            return c;
                          }
                          return c?.name || String(c);
                        }).join(", ")
                      : "None"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Keywords:</span>
                  <p className="text-gray-900">{keywords.length > 0 ? keywords.join(", ") : "None"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Platforms:</span>
                  <p className="text-gray-900">{selectedPlatforms.map(p => platformOptions.find(opt => opt.id === p)?.name).join(", ")}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Languages (for queries):</span>
                  <p className="text-gray-900">
                    {analysisLanguages.length > 0
                      ? analysisLanguages.map((c) => analysisLanguageOptions.find((o) => o.value === c)?.label ?? c).join(", ")
                      : "Default (general)"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Countries/Regions (for queries):</span>
                  <p className="text-gray-900">
                    {analysisCountries.length > 0
                      ? analysisCountries.map((c) => analysisCountryOptions.find((o) => o.value === c)?.label ?? c).join(", ")
                      : "General (not country-specific)"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Query mode:</span>
                  <p className="text-gray-900">
                    {queryMode === 'auto' && 'Auto-generated only'}
                    {queryMode === 'manual' && `Manual only (${manualQueries.length} queries)`}
                    {queryMode === 'auto_manual' && `Auto + manual (${manualQueries.length} manual)`}
                  </p>
                </div>
              </div>

              {/* Google Search Console Option */}
              <div className={`bg-gradient-to-r rounded-xl p-6 border-2 ${
                gscConnected 
                  ? 'from-blue-50 to-purple-50 border-blue-200' 
                  : 'from-gray-50 to-gray-100 border-gray-300'
              }`}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id="fetchGSC"
                    checked={fetchGSCKeywords}
                    onChange={(e) => setFetchGSCKeywords(e.target.checked)}
                    disabled={!gscConnected || checkingGSCStatus}
                    className={`mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 ${
                      !gscConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <label htmlFor="fetchGSC" className={`block text-base font-semibold cursor-pointer ${
                        !gscConnected ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        🔍 Fetch Keywords from Google Search Console
                      </label>
                      {checkingGSCStatus ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          gscConnected 
                            ? "bg-green-100 text-green-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {gscConnected ? "Connected" : "Not Connected"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {gscConnected 
                        ? "Enable this to automatically fetch real keywords your website ranks for. These will be combined with your manual keywords for more accurate brand analysis."
                        : "Connect your Google Search Console in Settings to enable keyword fetching. Once connected, you can fetch real keywords your website ranks for."
                      }
                    </p>
                    <div className="flex items-center gap-2">
                      {gscConnected ? (
                        <p className="text-xs text-gray-500">
                          {fetchGSCKeywords 
                            ? "✅ GSC keywords will be fetched during analysis" 
                            : "⚪ Only website crawling and manual keywords will be used"
                          }
                        </p>
                      ) : (
                        <a 
                          href="/dashboard/settings" 
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Go to Settings to connect Google Search Console →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-300">
            <button
              onClick={() => setViewMode('projects')}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Cancel
            </button>
            
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  disabled={isGeneratingAI && currentStep === 1}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingAI && currentStep === 1 ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Generating AI Suggestions...
                    </>
                  ) : (
                    <>
                  Next
                  <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? "Launching..." : "Launch Analysis"}
                  <Play className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Response Modal - Simple fixed modal */}
      {viewResponseModal?.open && viewResponseModal?.response && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            zIndex: 99999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewResponseModal(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Full Response</h3>
              <button
                onClick={() => setViewResponseModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Query:</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {viewResponseModal.prompt}
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium capitalize ${
                    viewResponseModal.response.platform?.toLowerCase().includes('claude') ? 'bg-orange-100 text-orange-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('chatgpt') || viewResponseModal.response.platform?.toLowerCase().includes('gpt') ? 'bg-green-100 text-green-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('gemini') ? 'bg-blue-100 text-blue-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('perplexity') ? 'bg-purple-100 text-purple-800' :
                    viewResponseModal.response.platform?.toLowerCase().includes('groq') ? 'bg-pink-100 text-pink-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewResponseModal.response.platform?.toLowerCase().includes('claude') ? 'Claude' :
                     viewResponseModal.response.platform?.toLowerCase().includes('chatgpt') || viewResponseModal.response.platform?.toLowerCase().includes('gpt') ? 'GPT' :
                     viewResponseModal.response.platform?.toLowerCase().includes('gemini') ? 'Gemini' :
                     viewResponseModal.response.platform?.toLowerCase().includes('perplexity') ? 'Perplexity' :
                     viewResponseModal.response.platform?.toLowerCase().includes('groq') ? 'Groq' :
                     viewResponseModal.response.platform || 'Unknown'}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-700 mb-2">Response:</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded max-h-80 overflow-y-auto">
                  {viewResponseModal.response.response}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setViewResponseModal(null)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Keywords Tab Component
function KeywordsTab({ selectedProject }: { selectedProject: Project }) {
  const [gscKeywords, setGscKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject?.id) {
      fetchGSCKeywords();
    }
  }, [selectedProject]);

  const fetchGSCKeywords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/brand-analysis/${selectedProject.id}/gsc-keywords`);
      const data = await response.json();
      
      if (data.success) {
        setGscKeywords(data.keywords || []);
      }
    } catch (error) {
      console.error('Error fetching GSC keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get manual keywords (target_keywords or keywords field)
  const manualKeywords = selectedProject.keywords || [];

  // Calculate GSC summary stats
  const totalClicks = gscKeywords.reduce((sum, kw) => sum + kw.clicks, 0);
  const totalImpressions = gscKeywords.reduce((sum, kw) => sum + kw.impressions, 0);
  const avgCTR = gscKeywords.length > 0
    ? (gscKeywords.reduce((sum, kw) => sum + kw.ctr, 0) / gscKeywords.length * 100).toFixed(2)
    : 0;

  const totalKeywords = manualKeywords.length + gscKeywords.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Keywords Used in Analysis
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Total: {totalKeywords} keywords ({manualKeywords.length} manual + {gscKeywords.length} from GSC)
        </p>
      </div>

      {/* Manual Keywords Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h4 className="text-md font-semibold text-gray-900">💡 Manual Keywords</h4>
            <p className="text-xs text-gray-500">Keywords entered during project creation</p>
          </div>
        </div>

        {manualKeywords.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {manualKeywords.map((keyword, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium text-purple-900"
                >
                  {keyword}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Total: {manualKeywords.length} keyword{manualKeywords.length !== 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No manual keywords provided</p>
          </div>
        )}
      </div>

      {/* Google Search Console Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Search className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="text-md font-semibold text-gray-900">🔍 Google Search Console</h4>
            <p className="text-xs text-gray-500">Keywords from your verified website</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 text-sm">Loading GSC keywords...</span>
          </div>
        ) : gscKeywords.length > 0 ? (
          <div className="space-y-6">

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-900">Total Keywords</span>
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">{gscKeywords.length}</div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-900">Total Clicks</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900">{totalClicks.toLocaleString()}</div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-900">Total Impressions</span>
                  <Eye className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900">{totalImpressions.toLocaleString()}</div>
              </div>
            </div>

            {/* Keywords Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keyword
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Position
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Clicks
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-3 h-3" />
                          Impressions
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CTR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gscKeywords.map((keyword, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{keyword.keyword}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            keyword.position <= 3 
                              ? 'bg-green-100 text-green-800' 
                              : keyword.position <= 10 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {keyword.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {keyword.clicks.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {keyword.impressions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                          {(keyword.ctr * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedProject.last_gsc_sync && (
              <p className="text-xs text-gray-500 mt-4">
                Last synced: {new Date(selectedProject.last_gsc_sync).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">
              Google Search Console Not Connected
            </h4>
            <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
              Connect your Google Search Console in Settings to automatically fetch keywords 
              from your verified websites during analysis.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/settings'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              Go to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap the component with Suspense to handle useSearchParams
export default function AIVisibility() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AIVisibilityContent />
    </Suspense>
  );
}
