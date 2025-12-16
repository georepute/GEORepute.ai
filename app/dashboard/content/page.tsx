"use client";

import { motion } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  FileText, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Send,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  Minus,
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  Loader2,
  ImageIcon,
  X,
  Globe,
  Code,
  Sparkles,
  Copy,
  Check,
  Mic,
  Star
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

interface KeywordMetric {
  keyword: string;
  score: number;
  trend: string;
  rise: "up" | "down" | "stable";
  percent: number;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: "draft" | "review" | "scheduled" | "published";
  platforms: string[];
  publishDate: string | null;
  performance: { views: number; engagement: number };
  raw?: any;
  keywordMetrics?: KeywordMetric[];
  published_records?: Array<{
    published_url?: string;
    platform?: string;
    published_at?: string;
    platform_post_id?: string;
  }>;
}


function ContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "review" | "scheduled" | "published">("all");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContentId, setScheduleContentId] = useState<string | null>(null);
  const [schedulePosition, setSchedulePosition] = useState({ top: 0, right: 0 });
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewContent, setViewContent] = useState<ContentItem | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [viewMode, setViewMode] = useState<'content' | 'schema' | 'image'>('content');
  const [refreshing, setRefreshing] = useState(false);
  const [publishingContentId, setPublishingContentId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    review: 0,
    draft: 0,
  });

  // AI Visibility Flow State
  const [aiVisibilityData, setAiVisibilityData] = useState<any>(null);
  const [showContentModal, setShowContentModal] = useState(false); // Modal 1: Content Generation
  const [showImageModal, setShowImageModal] = useState(false); // Modal 2: Image Selection
  const [showPlatformModal, setShowPlatformModal] = useState(false); // Modal 3: Platform Selection
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [fetchingImages, setFetchingImages] = useState(false);
  const [pixabayImages, setPixabayImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [creatingSchemas, setCreatingSchemas] = useState(false);
  const [schemaProgress, setSchemaProgress] = useState(0);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [platformSchemas, setPlatformSchemas] = useState<{ [key: string]: any }>({});

  // Modal 1: Content Generation State
  const [editData, setEditData] = useState<any>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [synthesizedResponse, setSynthesizedResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandVoices, setBrandVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  
  // AI Detection State
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  const [aiDetectionResults, setAiDetectionResults] = useState<{
    aiPercentage: number;
    highlightedHtml: string;
    topPhrases: Array<{ phrase: string; confidence: number; reason: string; count: number }>;
    summary: string;
    metrics?: {
      burstiness: number;
      clichés: number;
      avgSentenceLength: number;
      signals?: string[];
    };
  } | null>(null);
  const [influenceLevel, setInfluenceLevel] = useState<"subtle" | "moderate" | "strong">("subtle");

  // PDCA Loop: Performance Tracking & Optimization State
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [performanceContentId, setPerformanceContentId] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState({
    engagement: '',
    traffic: '',
    ranking: '',
    feedback: ''
  });
  const [savingPerformance, setSavingPerformance] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [performancePlatform, setPerformancePlatform] = useState<string | null>(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizeContentId, setOptimizeContentId] = useState<string | null>(null);
  const [learningInsights, setLearningInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);
  const [generatingOptimized, setGeneratingOptimized] = useState(false);

  // Publishing platforms
  const PUBLISHING_PLATFORMS = [
    { id: 'reddit', name: 'Reddit', icon: '/reddit-icon.svg', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'medium', name: 'Medium', icon: '/medium-square.svg', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { id: 'quora', name: 'Quora', icon: '/quora.svg', color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'facebook', name: 'Facebook', icon: '/facebook-color.svg', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'linkedin', name: 'LinkedIn', icon: '/linkedin.svg', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { id: 'instagram', name: 'Instagram', icon: '/instagram-1-svgrepo-com.svg', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { id: 'github', name: 'GitHub', icon: '/github-142.svg', color: 'bg-gray-800 text-white border-gray-700' },
  ];


  useEffect(() => {
      loadContent();
    
    // Auto-refresh every 3 minutes to check for scheduled content
    const autoRefreshInterval = setInterval(() => {
      checkAndPublishScheduled();
    }, 3 * 60 * 1000); // 3 minutes

    // Cleanup on unmount
    return () => clearInterval(autoRefreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load brand voices on mount
  useEffect(() => {
    const loadBrandVoices = async () => {
      setLoadingVoices(true);
      try {
        const response = await fetch("/api/brand-voice");
        if (response.ok) {
          const data = await response.json();
          setBrandVoices(data.voices || []);
          // Auto-select default voice if available
          const defaultVoice = data.voices?.find((v: any) => v.is_default);
          if (defaultVoice) {
            setSelectedVoiceId(defaultVoice.id);
          }
        }
      } catch (error) {
        console.error("Error loading brand voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };
    loadBrandVoices();
  }, []);

  // Check for AI Visibility source and load data
  useEffect(() => {
    const source = searchParams.get('source');
    const step = searchParams.get('step');
    
    if (source === 'ai-visibility') {
      // Check for content-generation step (Modal 1)
      if (step === 'content-generation') {
        const storedData = sessionStorage.getItem('editPromptData');
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            setEditData(data);
            setEditedPrompt(data.prompt);
            setShowContentModal(true);
          } catch (error) {
            console.error('Error parsing edit data:', error);
          }
        }
      } else {
        // Existing flow: image-selection or no step
        const storedData = sessionStorage.getItem('aiVisibilityResponses');
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            setAiVisibilityData(data);
            
            // Initialize image search query from prompt
            if (data.responses?.[0]?.prompt) {
              setImageSearchQuery(data.responses[0].prompt);
            }
            
            // Show image modal if step is image-selection or no step specified
            if (step === 'image-selection' || !step) {
              setShowImageModal(true);
            }
          } catch (error) {
            console.error('Error parsing AI Visibility data:', error);
          }
        }
      }
    }
  }, [searchParams]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const status = activeTab === "all" ? "all" : activeTab;
      const response = await fetch(`/api/geo-core/orchestrator?status=${status}`);
      
      if (!response.ok) {
        throw new Error("Failed to load content");
      }

      const data = await response.json();
      setContentItems(data.content || []);
      setStats(data.stats || {
        total: 0,
        published: 0,
        scheduled: 0,
        review: 0,
        draft: 0,
      });
      
      // Debug: Log published content to see what data we have
      const publishedItems = (data.content || []).filter((item: any) => 
        item.status === "published" || 
        item.raw?.status === "published" || 
        (item.published_records && item.published_records.length > 0)
      );
      console.log('📊 Published items found:', publishedItems.length);
      publishedItems.forEach((item: any) => {
        console.log('Published item:', {
          id: item.id,
          title: item.title,
          status: item.status,
          rawStatus: item.raw?.status,
          publishedRecordsCount: item.published_records?.length || 0,
          publishedRecords: item.published_records
        });
      });
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const checkAndPublishScheduled = async () => {
    try {
      // Call the Supabase Edge Function for scheduled publishing
      const { data, error } = await supabase.functions.invoke('scheduled-publish');

      if (error) {
        console.error("Scheduled publish Edge Function error:", error);
        return;
      }

      // Log detailed results for debugging
      console.log("Scheduled publish results:", data);
      
      if (data?.published > 0) {
          // Refresh content list if something was published
          await loadContent();
          toast.success(`${data.published} scheduled content published!`);
        }
      
      // Show errors for failed items
      if (data?.failed > 0 && data?.results) {
        const failedItems = data.results.filter((r: any) => !r.success);
        failedItems.forEach((item: any) => {
          console.error(`Failed to publish "${item.title}" to ${item.platform}:`, item.error);
          toast.error(`Failed to publish to ${item.platform}: ${item.error || 'Unknown error'}`);
        });
      }
      
      // If nothing to publish, log for debugging
      if (data?.published === 0 && data?.failed === 0) {
        console.log("No scheduled content ready to publish");
      }
    } catch (error) {
      console.error("Error checking scheduled content:", error);
      // Don't show error toast, just silently fail
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // First check and publish scheduled content
      await checkAndPublishScheduled();
      // Then reload content list
      await loadContent();
      toast.success("Content refreshed");
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (contentId: string) => {
    // Simple approve: moves from draft to review
    await handleAction("approve", contentId, { autoPublish: false });
  };

  const handleReviewAction = async (action: "publish" | "schedule" | "reject", contentId: string, scheduledAt?: string) => {
    if (action === "publish") {
      // Check if this is Medium publishing
      const contentItem = contentItems.find(item => item.id === contentId);
      const isMedium = contentItem?.raw?.target_platform === "medium" || contentItem?.platforms?.includes("medium");
      
      if (isMedium) {
        setPublishingContentId(contentId);
      }
      
      try {
        await handleAction("approve", contentId, { autoPublish: true });
        // Note: loadContent() is already called in handleAction (line 438), no need to call it again here
        // This prevents double refresh
      } catch (error) {
        // On error, clear loading state immediately
        if (isMedium) {
          setPublishingContentId(null);
        }
        throw error;
      } finally {
        if (isMedium) {
          // Keep loading state for a bit to show success, then clear
          setTimeout(() => {
            setPublishingContentId(null);
          }, 2000);
        }
      }
    } else if (action === "schedule") {
      if (scheduledAt) {
        await handleAction("approve", contentId, { scheduledAt });
      }
    } else if (action === "reject") {
      await handleAction("reject", contentId, { reason: "Needs revision" });
    }
  };

  const handleScheduleClick = (contentId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    setScheduleContentId(contentId);
    setSchedulePosition({
      top: buttonRect.top - 300, // Position above the button
      right: window.innerWidth - buttonRect.right, // Align to right edge of button
    });
    setShowScheduleModal(true);
    // Set default date/time to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime("09:00");
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleContentId || !scheduleDate) {
      toast.error("Please select a date");
      return;
    }

    // Combine date and time
    const scheduledDateTime = scheduleTime 
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : new Date(`${scheduleDate}T09:00`).toISOString();

    await handleReviewAction("schedule", scheduleContentId, scheduledDateTime);
    
    // Reset form
    setShowScheduleModal(false);
    setScheduleContentId(null);
    setScheduleDate("");
    setScheduleTime("");
  };

  const handleAction = async (action: string, contentId: string, additionalData?: any) => {
    try {
      const response = await fetch("/api/geo-core/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          contentId,
          ...additionalData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Action failed");
      }

      const result = await response.json();
      toast.success(result.message || "Action completed successfully");
      // Longer delay to ensure database consistency before reloading
      await new Promise(resolve => setTimeout(resolve, 1000));
      loadContent();
    } catch (error: any) {
      console.error("Action error:", error);
      toast.error(error.message || "Action failed");
    }
  };

  // PDCA: Load Performance Metrics - Load latest data from database (no auto-fetch)
  const loadPerformanceMetrics = async (contentId: string) => {
    setLoadingMetrics(true);
    try {
      // Always fetch fresh content data from API to get latest metrics
      const contentResponse = await fetch(`/api/geo-core/orchestrator?status=all`);
      let contentItem;
      
      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        contentItem = contentData.content?.find((item: any) => item.id === contentId);
      }
      
      // Fallback to state if API fails
      if (!contentItem) {
        contentItem = contentItems.find(item => item.id === contentId);
      }
      
      if (!contentItem) {
        throw new Error('Content not found');
      }

      // Get published records to find Instagram/Facebook/LinkedIn posts
      const publishedRecords = contentItem.published_records || [];
      const instagramPost = publishedRecords.find((r: any) => r.platform === 'instagram');
      const facebookPost = publishedRecords.find((r: any) => r.platform === 'facebook');
      const linkedinPost = publishedRecords.find((r: any) => r.platform === 'linkedin');
      
      // Determine which platform to show metrics for
      const platform = instagramPost ? 'instagram' : (facebookPost ? 'facebook' : (linkedinPost ? 'linkedin' : null));
      setPerformancePlatform(platform);

      // If it's Instagram, Facebook, or LinkedIn, load existing metrics from database (if any)
      if (platform) {
        // Load existing metrics from database (don't auto-fetch from API)
        if (contentItem.raw?.metadata?.performance) {
          const performance = contentItem.raw.metadata.performance;
          const platformMetrics = performance[platform] || {};
          
          // Always show data, even if some values are 0
          setCurrentMetrics({
            platform: platform,
            likes: platformMetrics.likes || 0,
            comments: platformMetrics.comments || 0,
            shares: platformMetrics.shares || 0,
            reach: platformMetrics.reach || 0,
            impressions: platformMetrics.impressions || 0,
            engagement: platformMetrics.engagement || 0,
            saved: platformMetrics.saved || 0,
            reactions: platformMetrics.reactions || 0,
            clicks: platformMetrics.clicks || 0,
            lastUpdated: platformMetrics.lastUpdated || null, // Preserve timestamp from database
          });
        } else {
          // If no metrics yet, show empty state (zero values) with no timestamp
          setCurrentMetrics({
            platform: platform,
            likes: 0,
            comments: 0,
            shares: 0,
            reach: 0,
            impressions: 0,
            engagement: 0,
            saved: 0,
            reactions: 0,
            clicks: 0,
            lastUpdated: null,
          });
        }
      } else {
        // For non-Instagram/Facebook/LinkedIn platforms, show message
        setCurrentMetrics(null);
      }
    } catch (error: any) {
      console.error('Error loading performance metrics:', error);
      setCurrentMetrics(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // PDCA: Refresh Performance Metrics (trigger Edge Function)
  const handleRefreshMetrics = async () => {
    if (!performanceContentId || !performancePlatform) return;

    setRefreshingMetrics(true);
    try {
      toast.loading('Fetching latest metrics...', { id: 'refresh-metrics' });
      
      // Trigger Edge Function to fetch latest metrics
      const response = await fetch('/api/geo-core/track-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentStrategyId: performanceContentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh metrics');
      }

      // Wait for Edge Function to process and update database
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch updated content directly from API (without reloading whole page)
      const contentResponse = await fetch(`/api/geo-core/orchestrator?status=all`);
      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        const updatedContent = contentData.content?.find((item: any) => item.id === performanceContentId);
        
        if (updatedContent) {
          // Update contentItems state with new data (without full page reload)
          setContentItems((prev) => 
            prev.map(item => item.id === performanceContentId ? updatedContent : item)
          );
          
          // Load updated metrics directly
          if (updatedContent.raw?.metadata?.performance) {
            const performance = updatedContent.raw.metadata.performance;
            const platformMetrics = performance[performancePlatform] || {};
            
            // Use database timestamp (set by Edge Function) or current time as fallback
            const lastUpdated = platformMetrics.lastUpdated || new Date().toISOString();
            
            setCurrentMetrics({
              platform: performancePlatform,
              likes: platformMetrics.likes || 0,
              comments: platformMetrics.comments || 0,
              shares: platformMetrics.shares || 0,
              reach: platformMetrics.reach || 0,
              impressions: platformMetrics.impressions || 0,
              engagement: platformMetrics.engagement || 0,
              saved: platformMetrics.saved || 0,
              reactions: platformMetrics.reactions || 0,
              clicks: platformMetrics.clicks || 0,
              lastUpdated: lastUpdated, // Always set timestamp
            });
            
            toast.success('Metrics refreshed successfully!', { id: 'refresh-metrics' });
          } else {
            // If no metrics in response, show empty state but with timestamp
            setCurrentMetrics({
              platform: performancePlatform,
              likes: 0,
              comments: 0,
              shares: 0,
              reach: 0,
              impressions: 0,
              engagement: 0,
              saved: 0,
              reactions: 0,
              clicks: 0,
              lastUpdated: new Date().toISOString(), // Set timestamp even if no data
            });
            toast.success('Refresh completed. No metrics available yet.', { id: 'refresh-metrics' });
          }
        }
      } else {
        throw new Error('Failed to fetch updated content');
      }
    } catch (error: any) {
      console.error('Error refreshing metrics:', error);
      toast.error(error.message || 'Failed to refresh metrics', { id: 'refresh-metrics' });
    } finally {
      setRefreshingMetrics(false);
    }
  };

  // PDCA: Performance Tracking Handler
  const handleSavePerformance = async () => {
    if (!performanceContentId) return;

    setSavingPerformance(true);
    try {
      const contentItem = contentItems.find(item => item.id === performanceContentId);
      if (!contentItem) {
        throw new Error('Content not found');
      }

      const response = await fetch('/api/geo-core/content-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: performanceContentId,
          platform: contentItem.platforms[0] || 'general',
          keywords: contentItem.raw?.target_keywords || [],
          actualEngagement: performanceData.engagement ? parseFloat(performanceData.engagement) : undefined,
          actualTraffic: performanceData.traffic ? parseInt(performanceData.traffic) : undefined,
          actualRanking: performanceData.ranking ? parseInt(performanceData.ranking) : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save performance data');
      }

      toast.success('Performance data saved! Learning analysis triggered.');
      setShowPerformanceModal(false);
      setPerformanceContentId(null);
      setPerformanceData({ engagement: '', traffic: '', ranking: '', feedback: '' });
      setCurrentMetrics(null);
      loadContent(); // Refresh to show updated performance
    } catch (error: any) {
      console.error('Error saving performance:', error);
      toast.error(error.message || 'Failed to save performance data');
    } finally {
      setSavingPerformance(false);
    }
  };

  // PDCA: Load Learning Insights
  const loadLearningInsights = async (contentId: string) => {
    setLoadingInsights(true);
    try {
      // Fetch learning data for this content
      const response = await fetch('/api/geo-core/learning');
      if (response.ok) {
        const data = await response.json();
        // Find learning data related to this content
        const contentItem = contentItems.find(item => item.id === contentId);
        if (contentItem) {
          // Try to find learning data that matches this content's platform/keywords
          const relevantLearning = data.learnings?.find((l: any) => 
            l.input_data?.contentId === contentId ||
            (l.input_data?.platform === contentItem.platforms[0] && 
             l.input_data?.keywords?.some((k: string) => 
               contentItem.raw?.target_keywords?.includes(k)
             ))
          );
          
          if (relevantLearning) {
            setLearningInsights({
              successScore: relevantLearning.success_score,
              insights: relevantLearning.insights || [],
              recommendations: relevantLearning.recommendations || [],
            });
          } else {
            // Show general learning insights if available
            const latestLearning = data.learnings?.[0];
            if (latestLearning) {
              setLearningInsights({
                successScore: latestLearning.success_score,
                insights: latestLearning.insights || [],
                recommendations: latestLearning.recommendations || [],
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading learning insights:', error);
      // Set empty insights if API fails
      setLearningInsights({
        successScore: null,
        insights: ['No learning data available yet. Track performance first to generate insights.'],
        recommendations: ['Track content performance to enable optimization.'],
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  // PDCA: Generate Optimized Content
  const handleGenerateOptimized = async () => {
    if (!optimizeContentId) return;

    setGeneratingOptimized(true);
    try {
      const contentItem = contentItems.find(item => item.id === optimizeContentId);
      if (!contentItem) {
        throw new Error('Content not found');
      }

      // Fetch original content details
      const response = await fetch(`/api/geo-core/orchestrator?contentId=${optimizeContentId}`);
      if (!response.ok) {
        throw new Error('Failed to load content details');
      }

      const { content } = await response.json();
      const originalContent = Array.isArray(content) ? content[0] : content;

      // Generate optimized version using learning rules
      const optimizeResponse = await fetch('/api/geo-core/content-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: originalContent.topic || originalContent.title,
          targetKeywords: originalContent.target_keywords || [],
          targetPlatform: originalContent.target_platform || contentItem.platforms[0],
          brandMention: originalContent.brand_mention || '',
          influenceLevel: originalContent.influence_level || 'moderate',
          userContext: originalContent.user_context || '',
          imageUrl: originalContent.image_url || null,
          brandVoiceId: originalContent.brand_voice_id || null,
          // Add optimization flag
          optimizeFromContentId: optimizeContentId,
          learningInsights: learningInsights,
        }),
      });

      if (!optimizeResponse.ok) {
        const error = await optimizeResponse.json();
        throw new Error(error.error || 'Failed to generate optimized content');
      }

      const optimized = await optimizeResponse.json();
      setOptimizedContent(optimized.content || optimized.generated_content);
      toast.success('Optimized content generated! Review and republish.');
    } catch (error: any) {
      console.error('Error generating optimized content:', error);
      toast.error(error.message || 'Failed to generate optimized content');
    } finally {
      setGeneratingOptimized(false);
    }
  };

  // PDCA: Republish Optimized Content
  const handleRepublishOptimized = async () => {
    if (!optimizeContentId || !optimizedContent) return;

    try {
      // This will use the existing publish flow
      // For now, we'll create a new content strategy with optimized content
      toast.success('Optimized content ready for republishing! Use the publish flow.');
      setShowOptimizeModal(false);
    } catch (error: any) {
      console.error('Error republishing:', error);
      toast.error(error.message || 'Failed to republish');
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/geo-core/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          contentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      toast.success("Content deleted successfully");
      loadContent();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete content");
    }
  };

  // Image Selection Functions
  // Modal 1: Content Generation Handlers
  const getModelBadgeColor = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('claude')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (platformLower.includes('gemini')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (platformLower.includes('perplexity')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (platformLower.includes('groq') || platformLower.includes('grok')) return 'bg-pink-100 text-pink-800 border-pink-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getModelDisplayName = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('claude')) return 'Claude';
    if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'ChatGPT';
    if (platformLower.includes('gemini')) return 'Gemini';
    if (platformLower.includes('perplexity')) return 'Perplexity';
    if (platformLower.includes('groq') || platformLower.includes('grok')) return 'Groq';
    return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Unknown';
  };

  const handleGenerateOptimizedResponse = async () => {
    if (!editData) return;

    setIsGenerating(true);
    setError(null);
    setSynthesizedResponse(null);
    setAiDetectionResults(null); // Reset AI detection results

    try {
      const selectedVoice = selectedVoiceId ? brandVoices.find(v => v.id === selectedVoiceId) : null;
      
      const response = await fetch('/api/geo-core/synthesize-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
            body: JSON.stringify({
          prompt: editedPrompt,
          responses: editData.responses,
          brandName: editData.brandName,
          industry: editData.industry,
          keywords: editData.keywords,
          competitors: editData.competitors,
          influenceLevel: influenceLevel,
          brandVoice: selectedVoice ? {
            id: selectedVoice.id,
            brand_name: selectedVoice.brand_name,
            tone: selectedVoice.tone,
            personality_traits: selectedVoice.personality_traits,
            sentence_length: selectedVoice.sentence_length,
            vocabulary_level: selectedVoice.vocabulary_level,
            use_emojis: selectedVoice.use_emojis,
            emoji_style: selectedVoice.emoji_style,
            preferred_words: selectedVoice.preferred_words,
            avoid_words: selectedVoice.avoid_words,
            signature_phrases: selectedVoice.signature_phrases,
            voice_examples: selectedVoice.voice_examples
          } : null
            }),
          });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate optimized response');
      }

      const data = await response.json();
      setSynthesizedResponse(data.synthesizedResponse);
      
      // Automatically run AI detection after response is generated
      if (data.synthesizedResponse) {
        console.log('🔍 Starting AI detection for generated response...');
        console.log('📝 Response text preview:', data.synthesizedResponse.substring(0, 100) + '...');
        setIsDetectingAI(true);
        try {
          console.log('📤 Calling detect-ai Edge Function with text length:', data.synthesizedResponse.length);
          
          let detectionData: any = null;
          let detectionError: any = null;
          
          // Try using supabase.functions.invoke first
          try {
            console.log('🔄 Attempting to call via supabase.functions.invoke...');
            const invokeResult = await supabase.functions.invoke('detect-ai', {
              body: { text: data.synthesizedResponse }
            });
            detectionData = invokeResult.data;
            detectionError = invokeResult.error;
            console.log('📥 Invoke result:', { hasData: !!detectionData, hasError: !!detectionError });
          } catch (invokeErr: any) {
            console.warn('⚠️ supabase.functions.invoke failed, trying direct fetch:', invokeErr);
            
            // Fallback: Use direct fetch to Edge Function (same pattern as brand-analysis)
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
            
            if (!supabaseUrl || !supabaseAnonKey) {
              throw new Error('Supabase configuration missing. Check environment variables.');
            }
            
            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/detect-ai`;
            console.log('🔄 Attempting direct fetch to Edge Function:', edgeFunctionUrl.replace(supabaseAnonKey, 'KEY_HIDDEN'));
            
            const fetchResponse = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({ text: data.synthesizedResponse })
            });
            
            console.log('📥 Fetch response status:', fetchResponse.status, fetchResponse.statusText);
            
            if (!fetchResponse.ok) {
              const errorText = await fetchResponse.text();
              console.error('❌ Fetch error response:', errorText);
              throw new Error(`Edge Function returned ${fetchResponse.status}: ${errorText.substring(0, 200)}`);
            }
            
            detectionData = await fetchResponse.json();
            console.log('✅ Fetch successful, got data:', { 
              hasAiPercentage: !!detectionData?.aiPercentage,
              aiPercentage: detectionData?.aiPercentage 
            });
          }
          
          console.log('📥 Final AI Detection Response:', { 
            hasData: !!detectionData, 
            hasError: !!detectionError,
            error: detectionError,
            aiPercentage: detectionData?.aiPercentage 
          });
          
          if (detectionError) {
            console.error('❌ AI detection error:', detectionError);
            toast.error(`AI detection failed: ${detectionError.message || JSON.stringify(detectionError)}`);
          } else if (detectionData) {
            console.log('✅ AI detection successful:', {
              aiPercentage: detectionData.aiPercentage,
              topPhrasesCount: detectionData.topPhrases?.length || 0,
              hasHighlightedHtml: !!detectionData.highlightedHtml
            });
            
            setAiDetectionResults({
              aiPercentage: detectionData.aiPercentage || 0,
              highlightedHtml: detectionData.highlightedHtml || data.synthesizedResponse,
              topPhrases: detectionData.topPhrases || [],
              summary: detectionData.summary || '',
              metrics: detectionData.metrics
            });
            
            toast.success(`AI detection complete: ${detectionData.aiPercentage}% AI detected`);
          } else {
            console.warn('⚠️ AI detection returned no data and no error');
            toast.error('AI detection returned no data');
          }
        } catch (detectionErr: any) {
          console.error('❌ Error calling AI detection:', detectionErr);
          console.error('❌ Error stack:', detectionErr?.stack);
          toast.error(`AI detection error: ${detectionErr?.message || 'Unknown error'}. Check console for details.`);
        } finally {
          setIsDetectingAI(false);
        }
      } else {
        console.warn('⚠️ No synthesized response to analyze');
      }
    } catch (err) {
      console.error('Error generating optimized response:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate optimized response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (synthesizedResponse) {
      await navigator.clipboard.writeText(synthesizedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApproveContent = () => {
    if (!synthesizedResponse || !editData) return;

    // Store content data for next modal (Image Selection)
    const publicationData = {
      responses: [{
        id: `synth-${Date.now()}`,
        prompt: editedPrompt,
        response: synthesizedResponse,
        platform: 'synthesized',
        response_metadata: {
          brand_mentioned: true,
          synthesized: true,
          source_count: editData?.responses.length || 0
        },
        status: 'pending',
        selectedPlatforms: [],
        publishedUrls: [],
        platformSchemas: {},
      }],
      projectName: editData?.brandName || 'AI Visibility Response',
      projectId: editData?.projectId || '',
      keywords: editData?.keywords || [],
      industry: editData?.industry || '',
      brandName: editData?.brandName || '',
      brandVoice: selectedVoiceId ? brandVoices.find((v: any) => v.id === selectedVoiceId) : null,
      influenceLevel: influenceLevel,
    };
    sessionStorage.setItem('aiVisibilityResponses', JSON.stringify(publicationData));
    
    // Set aiVisibilityData state so Modal 2 can access it
    setAiVisibilityData(publicationData);
    
    // Close Modal 1 and open Modal 2 (Image Selection)
    setShowContentModal(false);
    setShowImageModal(true);
    
    // Initialize image search query from prompt
    setImageSearchQuery(editedPrompt);
  };

  const handleFetchImages = async () => {
    if (!imageSearchQuery || imageSearchQuery.trim().length === 0) {
      toast.error('Please enter a search query');
      return;
    }

    setFetchingImages(true);
    setPixabayImages([]);

    try {
      const response = await fetch('/api/geo-core/pixabay-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imageSearchQuery,
          keywords: aiVisibilityData?.keywords || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch images');
      }
      
      if (data?.images && data.images.length > 0) {
        setPixabayImages(data.images);
      } else {
        toast.error('No images found. Try a different search query.');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch images');
    } finally {
      setFetchingImages(false);
    }
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (imageUrl: string, imageId: number): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const timestamp = Date.now();
      const filename = `content-image-${imageId}-${timestamp}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('platform-content-images')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('platform-content-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast.error('Failed to upload image to storage');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image selection
  const handleSelectImage = async (image: any) => {
    setSelectedImage(image);
    
    // Upload image to Supabase Storage
    toast.loading('Uploading image...', { id: 'image-upload' });
    const publicUrl = await uploadImageToStorage(image.largeImageURL, image.id);
    
    if (publicUrl) {
      setUploadedImageUrl(publicUrl);
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
    } else {
      toast.error('Failed to upload image, but you can still continue', { id: 'image-upload' });
    }
  };

  // Confirm image selection and move to platform selection
  const handleConfirmImage = () => {
    if (!selectedImage) {
      toast.error('Please select an image');
      return;
    }
    setShowImageModal(false);
    setShowPlatformModal(true);
  };

  // Platform selection functions
  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  // Create schemas for selected platforms
  const handleCreateSchemas = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    if (!aiVisibilityData?.responses?.[0]) {
      toast.error("Content data not found");
      return;
    }

    setCreatingSchemas(true);
    setSchemaProgress(0);
    setCurrentPlatform('');
    const schemas: { [key: string]: any } = {};
    const totalPlatforms = selectedPlatforms.length;
    const responseData = aiVisibilityData.responses[0];

    const PLATFORMS_WITH_IMAGE_SUPPORT = ['reddit', 'medium', 'quora', 'facebook', 'linkedin', 'instagram'];

    for (let i = 0; i < selectedPlatforms.length; i++) {
      const platformId = selectedPlatforms[i];
      const platformName = PUBLISHING_PLATFORMS.find(p => p.id === platformId)?.name || platformId;
      
      setCurrentPlatform(platformName);
      setSchemaProgress(Math.round((i / totalPlatforms) * 100));
      
      try {
        toast.loading(`Creating schema for ${platformName}...`, { id: `schema-${platformId}` });

        const includeImage = PLATFORMS_WITH_IMAGE_SUPPORT.includes(platformId) && uploadedImageUrl;
          
          const createResponse = await fetch("/api/geo-core/content-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            topic: responseData.prompt,
              targetPlatform: platformId,
              tone: "informative",
              contentType: "answer",
            targetKeywords: aiVisibilityData?.keywords || [],
            generatedContent: responseData.response,
              skipGeneration: true,
            imageUrl: includeImage ? uploadedImageUrl : null,
            imageData: includeImage && selectedImage ? {
              url: uploadedImageUrl,
              alt: selectedImage.tags || responseData.prompt,
              photographer: selectedImage.user,
            } : null,
            }),
          });

          if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          toast.error(`Failed: ${platformId} - ${errorData.error || 'Unknown error'}`, { id: `schema-${platformId}` });
          continue;
          }

          const createData = await createResponse.json();
        
        schemas[platformId] = {
          schemaData: {
            ...createData.structuredSEO,
            jsonLd: createData.schema?.jsonLd,
            scriptTags: createData.schema?.scriptTags,
            ...(includeImage && {
              image: {
                url: uploadedImageUrl,
                alt: selectedImage?.tags || responseData.prompt,
                photographer: selectedImage?.user,
              }
            }),
          },
          contentId: createData.contentId,
          hasImage: includeImage,
        };

        setSchemaProgress(Math.round(((i + 1) / totalPlatforms) * 100));
        toast.success(`Schema created for ${platformName}!`, { id: `schema-${platformId}` });
      } catch (platformError: any) {
        console.error(`Error creating schema for ${platformId}:`, platformError);
        toast.error(`Error: ${platformId} - ${platformError.message}`, { id: `schema-${platformId}` });
      }
    }

    setSchemaProgress(100);
    setCurrentPlatform('Complete!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setPlatformSchemas(schemas);
    setCreatingSchemas(false);
    setShowPlatformModal(false);
    
    // Update aiVisibilityData with schemas
    const updatedData = {
      ...aiVisibilityData,
      responses: [{
        ...responseData,
        selectedPlatforms: selectedPlatforms,
        platformSchemas: schemas,
        image: selectedImage ? {
          id: selectedImage.id,
          url: uploadedImageUrl || selectedImage.largeImageURL,
          storageUrl: uploadedImageUrl,
          originalUrl: selectedImage.largeImageURL,
          previewUrl: selectedImage.webformatURL,
          photographer: selectedImage.user,
          sourceUrl: selectedImage.pageURL,
          tags: selectedImage.tags,
        } : null,
      }],
    };
    setAiVisibilityData(updatedData);
    sessionStorage.setItem('aiVisibilityResponses', JSON.stringify(updatedData));
    
    toast.success(`Schemas created for ${Object.keys(schemas).length} platform(s)!`);
    
    // Reload content to show the new items
    await loadContent();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle };
      case "scheduled": return { bg: "bg-blue-100", text: "text-blue-700", icon: Clock };
      case "review": return { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle };
      case "draft": return { bg: "bg-gray-100", text: "text-gray-700", icon: FileText };
      default: return { bg: "bg-gray-100", text: "text-gray-700", icon: FileText };
    }
  };

  const tabs = [
    { id: "all", label: "All Content", count: stats.total },
    { id: "draft", label: "Drafts", count: stats.draft },
    { id: "review", label: "In Review", count: stats.review },
    { id: "scheduled", label: "Scheduled", count: stats.scheduled },
    { id: "published", label: "Published", count: stats.published },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Orchestrator</h1>
          <p className="text-gray-600">Manage, approve, and publish content across all platforms</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh and check for scheduled content"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <FileText className="w-8 h-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <p className="text-gray-600">Total Content</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.published}</div>
          <p className="text-gray-600">Published</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Clock className="w-8 h-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.scheduled}</div>
          <p className="text-gray-600">Scheduled</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <AlertCircle className="w-8 h-8 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.review}</div>
          <p className="text-gray-600">In Review</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {contentItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-12 border border-gray-200 text-center"
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === "all" ? "No Content Yet" : `No ${activeTab} Content`}
            </h3>
            <p className="text-gray-600">
              {activeTab === "all"
                ? "Generate content from the Content Generator to see it here"
                : `No content in ${activeTab} status`}
            </p>
          </motion.div>
        ) : (
          (() => {
            // Group content items by title/prompt
            const groupedByTitle: Record<string, typeof contentItems> = {};
            contentItems.forEach((item) => {
              const titleKey = item.title?.trim().toLowerCase() || 'untitled';
              if (!groupedByTitle[titleKey]) {
                groupedByTitle[titleKey] = [];
              }
              groupedByTitle[titleKey].push(item);
            });

            return Object.entries(groupedByTitle).map(([titleKey, items], groupIndex) => {
              const firstItem = items[0];
              
              // Check if this is a grouped card (multiple platforms for same prompt)
              const isGrouped = items.length > 1;

              if (isGrouped) {
                // Render grouped card for multiple platforms
                return (
                  <motion.div
                    key={titleKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                  >
                    {/* Prompt Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-4 border-b border-gray-200">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{firstItem.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
                            <span className="font-medium">{firstItem.type}</span>
                            <span>•</span>
                            <span>
                              {firstItem.publishDate
                                ? new Date(firstItem.publishDate).toLocaleDateString()
                                : "Not scheduled"}
                            </span>
                            <span>•</span>
                            <span className="text-purple-600 font-medium">{items.length} platforms</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Cards */}
                    <div className="divide-y divide-gray-100">
                      {items.map((item) => {
                        const statusConfig = getStatusColor(item.status);
                        const StatusIcon = statusConfig.icon;
                        const platform = item.platforms[0] || 'unknown';

                        return (
                          <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              {/* Platform & Keywords */}
                              <div className="flex-1 flex items-center gap-3">
                                <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium capitalize">
                                  {platform}
                                </span>
                                {item.keywordMetrics && item.keywordMetrics.length > 0 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                    {item.keywordMetrics[0].keyword} - {item.keywordMetrics[0].percent}%
                                  </span>
                                )}
                              </div>

                              {/* Status & Actions */}
                              <div className="flex items-center gap-3">
                                {/* Status Badge */}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${statusConfig.bg} ${statusConfig.text}`}>
                                  <StatusIcon className="w-4 h-4" />
                                  <span className="font-medium capitalize">{item.status}</span>
                                </div>

                                {/* Action Buttons */}
                                {item.status === "draft" && (
                                  <button
                                    onClick={() => handleApprove(item.id)}
                                    className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center gap-1.5"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                  </button>
                                )}
                                {item.status === "review" && (
                                  <>
                                    <button
                                      onClick={() => handleReviewAction("publish", item.id)}
                                      disabled={publishingContentId === item.id}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                      title="Publish"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => handleScheduleClick(item.id, e)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Schedule"
                                    >
                                      <Clock className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleReviewAction("reject", item.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </>
                                )}

                                {/* PDCA: Track Performance button for published content in grouped view */}
                                {((item.published_records?.length ?? 0) > 0 || item.status === "published" || item.raw?.status === "published") && (
                                  <button
                                    onClick={async () => {
                                      setPerformanceContentId(item.id);
                                      setShowPerformanceModal(true);
                                      await loadPerformanceMetrics(item.id);
                                    }}
                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Track Performance"
                                  >
                                    <TrendingUp className="w-5 h-5" />
                                  </button>
                                )}

                                {/* PDCA: Optimize & Republish button for published content in grouped view */}
                                {((item.published_records?.length ?? 0) > 0 || item.status === "published" || item.raw?.status === "published") && (
                                  <button
                                    onClick={() => {
                                      setOptimizeContentId(item.id);
                                      setShowOptimizeModal(true);
                                      loadLearningInsights(item.id);
                                    }}
                                    className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Optimize & Republish"
                                  >
                                    <Sparkles className="w-5 h-5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setViewContent(item);
                                    setShowViewModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Published URL */}
                            {item.status === "published" && item.published_records && item.published_records.length > 0 && (
                              <div className="mt-2 ml-0">
                                {item.published_records.map((pub, idx) => (
                                  pub.published_url ? (
                                    <a
                                      key={idx}
                                      href={pub.published_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View on {pub.platform || platform}
                                    </a>
                                  ) : null
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              }

              // Single item - render normally
              const item = firstItem;
            const statusConfig = getStatusColor(item.status);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Content Info - Left Side */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="font-medium">{item.type}</span>
                          <span>•</span>
                          <span>
                            {item.publishDate
                              ? new Date(item.publishDate).toLocaleDateString()
                              : "Not scheduled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Platforms with Keywords - Left Side */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.platforms.map((platform) => {
                        // Get the first keyword for this platform
                        // Try keywordMetrics first, then fall back to raw target_keywords
                        const firstKeyword = item.keywordMetrics && item.keywordMetrics.length > 0
                          ? item.keywordMetrics[0].keyword
                          : (item.raw?.target_keywords && item.raw.target_keywords.length > 0
                            ? item.raw.target_keywords[0]
                            : null);
                        
                        // Get keyword percentage if available
                        const keywordPercent = item.keywordMetrics && item.keywordMetrics.length > 0
                          ? item.keywordMetrics[0].percent
                          : null;

                        return (
                          <div key={platform} className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                              {platform}
                            </span>
                            {firstKeyword && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                {firstKeyword}
                                {keywordPercent !== null && ` - ${keywordPercent}%`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Performance (if published) */}
                    {item.status === "published" && item.performance.views > 0 && (
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Eye className="w-4 h-4" />
                          <span className="font-medium">{item.performance.views.toLocaleString()} views</span>
                        </div>
                        {item.performance.engagement > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-medium">{item.performance.engagement}% engagement</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Published URL Link */}
                    {item.status === "published" && item.published_records && item.published_records.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {item.published_records.map((pub, idx) => (
                          pub.published_url ? (
                            <a
                              key={idx}
                              href={pub.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                              <Send className="w-4 h-4" />
                              <span>Visit published content</span>
                              <span className="text-xs text-gray-500">({pub.platform || 'external'})</span>
                            </a>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Side - Status, Keywords, Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Status Badge */}
                    {item.status === "review" ? (
                      <button className="px-4 py-2 bg-yellow-100 text-gray-900 rounded-lg font-medium flex items-center gap-2 hover:bg-yellow-200 transition-colors">
                        <Clock className="w-4 h-4 text-gray-600" />
                        Review
                      </button>
                    ) : (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="font-semibold capitalize">{item.status}</span>
                      </div>
                    )}

                    {/* Keywords with Metrics - Right Side */}
                    {item.keywordMetrics && item.keywordMetrics.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {item.keywordMetrics.map((metric) => {
                          const getRiseIcon = () => {
                            if (metric.rise === "up") return <TrendingUp className="w-3 h-3" />;
                            if (metric.rise === "down") return <TrendingDown className="w-3 h-3" />;
                            return <Minus className="w-3 h-3" />;
                          };
                          
                          const getRiseColor = () => {
                            if (metric.rise === "up") return "text-green-600";
                            if (metric.rise === "down") return "text-red-600";
                            return "text-gray-600";
                          };

                          return (
                            <span
                              key={metric.keyword}
                              className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium flex items-center gap-2"
                            >
                              <span className="text-blue-700">{metric.keyword}</span>
                              <span className={`flex items-center gap-1 ${getRiseColor()}`}>
                                {getRiseIcon()}
                                <span>{metric.percent}%</span>
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Loading state for Medium publishing */}
                      {publishingContentId === item.id && (item.raw?.target_platform === "medium" || item.platforms?.includes("medium")) ? (
                        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Publishing to Medium...</span>
                            <span className="text-xs text-blue-600">This typically takes 2-3 minutes</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Draft: Only Approve button */}
                          {item.status === "draft" && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          )}

                          {/* Review: Reject, Publish, Schedule buttons */}
                          {item.status === "review" && (
                            <>
                              <button
                                onClick={() => handleReviewAction("publish", item.id)}
                                disabled={publishingContentId === item.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Publish"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReviewAction("reject", item.id)}
                                disabled={publishingContentId === item.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => handleScheduleClick(item.id, e)}
                                disabled={publishingContentId === item.id}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Schedule"
                              >
                                <Clock className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {/* PDCA: Track Performance button for published content - Show if has published_records OR status is published */}
                          {((item.published_records?.length ?? 0) > 0 || item.status === "published" || item.raw?.status === "published") && (
                            <button
                              onClick={async () => {
                                setPerformanceContentId(item.id);
                                setShowPerformanceModal(true);
                                // Load metrics when modal opens
                                await loadPerformanceMetrics(item.id);
                              }}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Track Performance"
                            >
                              <TrendingUp className="w-5 h-5" />
                            </button>
                          )}

                          {/* PDCA: Optimize & Republish button for published content - Show if has published_records OR status is published */}
                          {((item.published_records?.length ?? 0) > 0 || item.status === "published" || item.raw?.status === "published") && (
                            <button
                              onClick={() => {
                                setOptimizeContentId(item.id);
                                setShowOptimizeModal(true);
                                loadLearningInsights(item.id);
                              }}
                              className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Optimize & Republish"
                            >
                              <Sparkles className="w-5 h-5" />
                            </button>
                          )}

                          {/* View action for all statuses */}
                          <button 
                            onClick={() => {
                              setViewContent(item);
                              setShowViewModal(true);
                            }}
                            disabled={publishingContentId === item.id}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {/* Delete action for all statuses */}
                          <button 
                            onClick={() => handleDelete(item.id)}
                            disabled={publishingContentId === item.id}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
            });
          })()
        )}
      </div>

      {/* PDCA: Performance Tracking Modal */}
      {showPerformanceModal && performanceContentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Track Content Performance
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {performancePlatform === 'instagram' || performancePlatform === 'facebook' || performancePlatform === 'linkedin'
                    ? 'Live metrics from ' + (performancePlatform === 'instagram' ? 'Instagram' : performancePlatform === 'facebook' ? 'Facebook' : 'LinkedIn')
                    : 'Measure your content performance to enable optimization'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(performancePlatform === 'instagram' || performancePlatform === 'facebook' || performancePlatform === 'linkedin') && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={handleRefreshMetrics}
                      disabled={refreshingMetrics}
                      className="px-3 py-1.5 text-sm bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Refresh metrics from API"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshingMetrics ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    {currentMetrics?.lastUpdated ? (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        Last refreshed: {new Date(currentMetrics.lastUpdated).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Not refreshed yet
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowPerformanceModal(false);
                    setPerformanceContentId(null);
                    setCurrentMetrics(null);
                    setPerformancePlatform(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingMetrics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading metrics...</span>
                </div>
              ) : (performancePlatform === 'instagram' || performancePlatform === 'facebook' || performancePlatform === 'linkedin') && currentMetrics ? (
                // Show live metrics for Instagram/Facebook/LinkedIn with charts
                <div className="space-y-6">
                  {/* Engagement Metrics Bar Chart */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={(() => {
                          const data = [
                            { name: 'Likes', value: currentMetrics.likes || 0, fill: '#3b82f6' },
                            { name: 'Comments', value: currentMetrics.comments || 0, fill: '#10b981' },
                          ];
                          if (currentMetrics.shares !== undefined) {
                            data.push({ name: 'Shares', value: currentMetrics.shares || 0, fill: '#8b5cf6' });
                          }
                          if (currentMetrics.saved !== undefined) {
                            data.push({ name: 'Saved', value: currentMetrics.saved || 0, fill: '#f59e0b' });
                          }
                          return data;
                        })()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          stroke="#9ca3af"
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          stroke="#9ca3af"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px 12px'
                          }}
                          formatter={(value: any) => value.toLocaleString()}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]}
                        >
                          {(() => {
                            const data = [
                              { fill: '#3b82f6' },
                              { fill: '#10b981' },
                            ];
                            if (currentMetrics.shares !== undefined) {
                              data.push({ fill: '#8b5cf6' });
                            }
                            if (currentMetrics.saved !== undefined) {
                              data.push({ fill: '#f59e0b' });
                            }
                            return data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ));
                          })()}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Engagement Rate Radial Chart - Always show if engagement data exists */}
                  {currentMetrics.engagement !== undefined && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">Engagement Rate</h4>
                      <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={250}>
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="90%"
                            data={[
                              {
                                name: 'Engagement',
                                value: currentMetrics.engagement,
                                fill: '#14b8a6'
                              }
                            ]}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar
                              dataKey="value"
                              cornerRadius={10}
                              fill="#14b8a6"
                            />
                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="text-3xl font-bold fill-teal-700"
                            >
                              {currentMetrics.engagement.toFixed(2)}%
                            </text>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '8px 12px'
                              }}
                              formatter={(value: any) => `${value.toFixed(2)}%`}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // No metrics available or not Instagram/Facebook/LinkedIn
                <div className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-300 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Performance Data Available</h4>
                  <p className="text-sm text-gray-600 text-center max-w-md">
                    {performancePlatform 
                      ? 'Performance tracking is only available for Instagram, Facebook, and LinkedIn posts. Please ensure your content is published to one of these platforms.'
                      : 'This content is not published to Instagram, Facebook, or LinkedIn. Performance tracking is currently only available for these platforms.'}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowPerformanceModal(false);
                  setPerformanceContentId(null);
                  setCurrentMetrics(null);
                  setPerformancePlatform(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDCA: Optimize & Republish Modal */}
      {showOptimizeModal && optimizeContentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Optimize & Republish Content
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Generate an optimized version based on performance data and learning insights
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOptimizeModal(false);
                  setOptimizeContentId(null);
                  setOptimizedContent(null);
                  setLearningInsights(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingInsights ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <span className="ml-3 text-gray-600">Loading learning insights...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Learning Insights Section */}
                  {learningInsights && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-blue-600" />
                        Learning Insights
                      </h4>
                      {learningInsights.successScore && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">Success Score: </span>
                          <span className="font-semibold text-blue-600">{learningInsights.successScore}/100</span>
                        </div>
                      )}
                      {learningInsights.insights && learningInsights.insights.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Key Insights:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {learningInsights.insights.map((insight: string, idx: number) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {learningInsights.recommendations && learningInsights.recommendations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {learningInsights.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generate Optimized Content */}
                  {!optimizedContent ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">
                        Generate an optimized version of your content based on performance data and learning insights.
                      </p>
                      <button
                        onClick={handleGenerateOptimized}
                        disabled={generatingOptimized}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      >
                        {generatingOptimized ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Optimized Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Optimized Version
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Optimized Content Preview</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {optimizedContent}
                        </pre>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Review the optimized content above. Click "Republish" to publish this version.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {optimizedContent && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setOptimizedContent(null);
                    setLearningInsights(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Generate New Version
                </button>
                <button
                  onClick={handleRepublishOptimized}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Republish Optimized Version
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Workflow Suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Workflow Optimization</h3>
            <p className="text-gray-700 leading-relaxed">
              Your content approval time has decreased by 40% this month. Consider automating approval for 
              content with quality scores above 85% to further streamline your workflow.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Schedule Modal - Positioned Top Right of Button */}
      {showScheduleModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowScheduleModal(false);
              setScheduleContentId(null);
              setScheduleDate("");
              setScheduleTime("");
            }}
          />
          {/* Popover */}
          <div 
            className="fixed z-50"
            style={{
              top: `${schedulePosition.top}px`,
              right: `${schedulePosition.right}px`,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-lg shadow-xl border border-gray-200 w-72 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Schedule Publishing
                </h3>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleContentId(null);
                    setScheduleDate("");
                    setScheduleTime("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                {/* Time Picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                {/* Preview */}
                {scheduleDate && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Scheduled:</span>{" "}
                      {new Date(`${scheduleDate}T${scheduleTime || '09:00'}`).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleContentId(null);
                    setScheduleDate("");
                    setScheduleTime("");
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSubmit}
                  disabled={!scheduleDate}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Clock className="w-3 h-3" />
                  Schedule
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* View Content Modal */}
      {showViewModal && viewContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{viewContent.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                    <span className="font-medium">{viewContent.type}</span>
                    <span>•</span>
                    <span className="capitalize">{viewContent.raw?.target_platform || viewContent.platforms[0]}</span>
                    {viewContent.raw?.word_count && (
                      <>
                        <span>•</span>
                        <span>{viewContent.raw.word_count} words</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewContent(null);
                    setViewMode('content');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('content')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'content'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setViewMode('schema')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'schema'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Schema
                </button>
                <button
                  onClick={() => setViewMode('image')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'image'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Image
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                {viewMode === 'content' && (
                  <>
                    {/* Show Content */}
                    {viewContent.raw?.generated_content ? (
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {viewContent.raw.generated_content}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-12">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No content available</p>
                      </div>
                    )}

                    {/* Published URL Link in View Modal */}
                    {viewContent.status === "published" && viewContent.published_records && viewContent.published_records.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Published Links:</h4>
                        <div className="space-y-2">
                          {viewContent.published_records.map((pub: any, idx: number) => (
                            pub.published_url ? (
                              <a
                                key={idx}
                                href={pub.published_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                <span className="break-all">{pub.published_url}</span>
                                <span className="text-xs text-gray-500 capitalize whitespace-nowrap">({pub.platform || 'external'})</span>
                              </a>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {viewMode === 'image' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    {viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image ? (
                      <div className="w-full max-w-2xl">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                          <img
                            src={viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image}
                            alt={viewContent.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            This image will be published with your content to supported platforms.
                          </p>
                          <div className="mt-2 flex flex-wrap justify-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Reddit</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Medium</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Quora</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Facebook</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">LinkedIn</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Instagram</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs line-through">GitHub</span>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 break-all">
                            <strong>Image URL:</strong> {viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="font-medium text-gray-700">No Image Available</p>
                        <p className="text-sm mt-1">This content doesn&apos;t have an associated image.</p>
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'schema' && (
                  <>
                    {/* Show Schema */}
                    <div className="space-y-4">
                      {/* Auto-Generated Schema (includes structured SEO data) */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Auto-Generated JSON-LD Schema</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Includes Structured SEO Data</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                          This schema automatically includes: headings (H1/H2/H3), FAQs, meta description, and other structured data from your content.
                        </p>
                        {viewContent.raw?.metadata?.schema?.jsonLd ? (
                          <pre className="text-xs bg-white p-4 rounded border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
                            {JSON.stringify(viewContent.raw.metadata.schema.jsonLd, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-gray-500 text-sm">No schema data available</p>
                        )}
                      </div>
                      
                      {/* HTML Script Tags (ready to embed) */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">HTML Script Tags (Ready to Embed):</h4>
                        {viewContent.raw?.metadata?.schema?.scriptTags ? (
                          <pre className="text-xs bg-white p-4 rounded border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
                            {viewContent.raw.metadata.schema.scriptTags}
                          </pre>
                        ) : (
                          <p className="text-gray-500 text-sm">No script tags available</p>
                        )}
                      </div>

                      {/* Additional Structured SEO Info (not in schema) */}
                      {viewContent.raw?.metadata?.structuredSEO && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Additional SEO Elements</h4>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Not in Schema</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            These elements are used for meta tags, social sharing, and internal linking (not included in JSON-LD schema).
                          </p>
                          <div className="space-y-2 text-sm">
                            {viewContent.raw.metadata.structuredSEO.metaDescription && (
                              <div>
                                <span className="font-medium text-gray-700">Meta Description: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.metaDescription}</span>
                                <span className="text-xs text-gray-500 ml-2">(also in schema)</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.headings && viewContent.raw.metadata.structuredSEO.headings.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">Headings Structure: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.headings.length} headings (H1, H2, H3)</span>
                                <span className="text-xs text-gray-500 ml-2">(included in schema)</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.faqs && viewContent.raw.metadata.structuredSEO.faqs.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">FAQs: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.faqs.length} FAQs</span>
                                <span className="text-xs text-gray-500 ml-2">(included in schema if FAQPage type)</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.ogTags && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">Open Graph Tags: </span>
                                <span className="text-gray-600 text-xs">For social media sharing previews</span>
                                <div className="mt-2 ml-4 text-xs text-gray-600 space-y-1">
                                  <div>Title: {viewContent.raw.metadata.structuredSEO.ogTags.title}</div>
                                  <div>Description: {viewContent.raw.metadata.structuredSEO.ogTags.description?.substring(0, 80)}...</div>
                                  <div>Image: {viewContent.raw.metadata.structuredSEO.ogTags.image}</div>
                                </div>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.internalLinks && viewContent.raw.metadata.structuredSEO.internalLinks.length > 0 && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">Internal Linking Suggestions: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.internalLinks.length} links</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.canonicalUrl && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">Canonical URL: </span>
                                <span className="text-gray-600 break-all text-xs">{viewContent.raw.metadata.structuredSEO.canonicalUrl}</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.seoScore !== null && viewContent.raw.metadata.structuredSEO.seoScore !== undefined && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">SEO Score: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.seoScore}/100</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {viewContent.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize"
                  >
                    {platform}
                  </span>
                ))}
                {viewContent.raw?.target_keywords && viewContent.raw.target_keywords.slice(0, 3).map((keyword: string) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                {viewMode === 'content' && (
                  <button
                    onClick={() => {
                      if (viewContent.raw?.generated_content) {
                        navigator.clipboard.writeText(viewContent.raw.generated_content);
                        toast.success("Content copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Copy Content
                  </button>
                )}
                {viewMode === 'schema' && (
                  <button
                    onClick={() => {
                      const schemaText = viewContent.raw?.metadata?.schema?.scriptTags || JSON.stringify(viewContent.raw?.metadata?.schema?.jsonLd || {}, null, 2);
                      if (schemaText) {
                        navigator.clipboard.writeText(schemaText);
                        toast.success("Schema copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Copy Schema
                  </button>
                )}
                {viewMode === 'image' && (viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image) && (
                <button
                  onClick={() => {
                      const imageUrl = viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image;
                      if (imageUrl) {
                        navigator.clipboard.writeText(imageUrl);
                        toast.success("Image URL copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Copy Image URL
                </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewContent(null);
                    setViewMode('content');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal 1: Content Generation */}
      {showContentModal && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Generate Optimized Response
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Edit prompt, select brand voice, and generate optimized content
                </p>
              </div>
              <button
                onClick={() => {
                  setShowContentModal(false);
                  router.push('/dashboard/content');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Brand Context Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Brand:</span>
                    <span className="ml-2 font-semibold text-gray-900">{editData.brandName}</span>
                  </div>
                  <div className="w-px h-5 bg-gray-200" />
                  <div>
                    <span className="text-gray-500">Industry:</span>
                    <span className="ml-2 font-medium text-gray-700">{editData.industry}</span>
                  </div>
                  {editData.keywords && editData.keywords.length > 0 && (
                    <>
                      <div className="w-px h-5 bg-gray-200" />
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Keywords:</span>
                        <div className="flex flex-wrap gap-1">
                          {editData.keywords.slice(0, 3).map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                          {editData.keywords.length > 3 && (
                            <span className="text-gray-400 text-xs">+{editData.keywords.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Prompt & LLM Responses */}
                <div className="space-y-6">
                  {/* Editable Prompt */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900">Original Prompt</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Edit the prompt if needed before generating a response</p>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none text-gray-800"
                        placeholder="Enter your prompt..."
                      />
                    </div>
                  </div>

                  {/* Brand Voice Selection */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-indigo-600" />
                          <h2 className="font-semibold text-gray-900">Brand Voice</h2>
                        </div>
                        <a
                          href="/dashboard/settings?tab=brand-voice"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline"
                        >
                          + Create New
                        </a>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Select a voice profile to maintain consistent brand personality</p>
                    </div>
                    <div className="p-4">
                      <select
                        value={selectedVoiceId || ""}
                        onChange={(e) => setSelectedVoiceId(e.target.value || null)}
                        disabled={loadingVoices}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-gray-800 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">No voice profile (generic)</option>
                        {brandVoices.map((voice: any) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.brand_name} - {voice.tone}
                            {voice.is_default ? " ⭐" : ""}
                          </option>
                        ))}
                      </select>

                      {selectedVoiceId && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                          {(() => {
                            const selectedVoice = brandVoices.find((v: any) => v.id === selectedVoiceId);
                            if (!selectedVoice) return null;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4 text-indigo-600" />
                                  <span className="text-sm font-medium text-indigo-900">
                                    {selectedVoice.brand_name}
                                  </span>
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs capitalize">
                                    {selectedVoice.tone}
                                  </span>
                                </div>
                                {selectedVoice.description && (
                                  <p className="text-xs text-indigo-700">{selectedVoice.description}</p>
      )}
    </div>
  );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Influence Level Selection */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900">Influence Level</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Control model temperature for response creativity</p>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "subtle", label: "Subtle", desc: "Natural mention" },
                          { value: "moderate", label: "Moderate", desc: "Balanced" },
                          { value: "strong", label: "Strong", desc: "Clear recommendation" },
                        ].map((level) => (
                          <button
                            key={level.value}
                            onClick={() => setInfluenceLevel(level.value as "subtle" | "moderate" | "strong")}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              influenceLevel === level.value
                                ? "border-cyan-500 bg-cyan-50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="font-semibold text-sm text-gray-900">
                              {level.label}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">{level.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* LLM Responses */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900">Current LLM Responses</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {editData.responses.length} response{editData.responses.length !== 1 ? 's' : ''} from different AI models
                      </p>
                    </div>
                    <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {editData.responses.map((response: any) => (
                        <div
                          key={response.id}
                          className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getModelBadgeColor(response.platform)}`}>
                              {getModelDisplayName(response.platform)}
                            </span>
                            <span className="text-xs text-red-500 font-medium">Brand Not Mentioned</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {response.response}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Generate & Result */}
                <div className="space-y-6">
                  {/* Generate Button Card */}
                  <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 shadow-lg shadow-purple-500/20">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-xl mb-4 backdrop-blur-sm">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Generate Optimized Response</h3>
                      <p className="text-purple-100 text-sm mb-4 max-w-sm mx-auto">
                        GPT-4 Turbo will analyze all responses and create the best synthesized answer with your brand prominently mentioned
                      </p>
                      
                      {selectedVoiceId && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-purple-100 text-xs mb-4 backdrop-blur-sm">
                          <Mic className="w-3.5 h-3.5" />
                          <span>Using: <strong>{brandVoices.find((v: any) => v.id === selectedVoiceId)?.brand_name}</strong> voice</span>
                        </div>
                      )}
                      
                      <button
                        onClick={handleGenerateOptimizedResponse}
                        disabled={isGenerating}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate Optimized Response
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-700 text-sm">{error}</p>
                      <button
                        onClick={handleGenerateOptimizedResponse}
                        className="mt-2 flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Synthesized Response */}
                  {synthesizedResponse && (
                    <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden ring-2 ring-green-100">
                      <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex items-center justify-between">
                        <div>
                          <h2 className="font-semibold text-green-900 flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            Optimized Response Generated
                          </h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-green-700">Brand-optimized, SEO-friendly response</p>
                            {selectedVoiceId && (
                              <>
                                <span className="text-green-300">•</span>
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <Mic className="w-3 h-3" />
                                  {brandVoices.find((v: any) => v.id === selectedVoiceId)?.brand_name} voice
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-50 transition-colors text-sm font-medium"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4">
                        {aiDetectionResults?.highlightedHtml ? (
                          <div 
                            className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: aiDetectionResults.highlightedHtml }}
                          />
                        ) : (
                          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {synthesizedResponse}
                          </div>
                        )}
                        {/* CSS for AI detection highlights */}
                        <style jsx>{`
                          :global(.gltr-red) {
                            background-color: #fee2e2;
                            padding: 2px 4px;
                            border-radius: 3px;
                            cursor: help;
                          }
                          :global(.gltr-yellow) {
                            background-color: #fef3c7;
                            padding: 2px 4px;
                            border-radius: 3px;
                            cursor: help;
                          }
                          :global(.gltr-green) {
                            background-color: #d1fae5;
                            padding: 2px 4px;
                            border-radius: 3px;
                            cursor: help;
                          }
                        `}</style>
                      </div>
                    </div>
                  )}

                  {/* AI Detection Results - Displayed below the response */}
                  {synthesizedResponse && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {isDetectingAI ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                  Analyzing AI Content...
                                </>
                              ) : aiDetectionResults ? (
                                <>
                                  <MessageSquare className="w-4 h-4 text-blue-600" />
                                  AI Content Analysis
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-4 h-4 text-gray-400" />
                                  AI Detection
                                </>
                              )}
                            </h3>
                            {aiDetectionResults && (
                              <p className="text-xs text-gray-600 mt-0.5">{aiDetectionResults.summary}</p>
                            )}
                          </div>
                          {aiDetectionResults && (
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                aiDetectionResults.aiPercentage >= 70 
                                  ? 'bg-red-100 text-red-700' 
                                  : aiDetectionResults.aiPercentage >= 40
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {aiDetectionResults.aiPercentage}% AI
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {aiDetectionResults && (
                        <div className="p-4 space-y-4">
                          {/* Metrics Summary */}
                          {aiDetectionResults.metrics && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900">{aiDetectionResults.metrics.burstiness?.toFixed(1) || 'N/A'}</div>
                                <div className="text-xs text-gray-600">Burstiness</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900">{aiDetectionResults.metrics.clichés || 0}</div>
                                <div className="text-xs text-gray-600">Clichés</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900">{aiDetectionResults.metrics.avgSentenceLength || 0}</div>
                                <div className="text-xs text-gray-600">Avg Sentence</div>
                              </div>
                            </div>
                          )}

                          {/* Top Detected Phrases */}
                          {aiDetectionResults.topPhrases && aiDetectionResults.topPhrases.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                Detected AI Phrases ({aiDetectionResults.topPhrases.length})
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {aiDetectionResults.topPhrases.slice(0, 10).map((phrase, idx) => (
                                  <div 
                                    key={idx} 
                                    className="p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-gray-700 flex-1">"{phrase.phrase}"</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        phrase.confidence >= 90 
                                          ? 'bg-red-100 text-red-700' 
                                          : phrase.confidence >= 75
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {phrase.confidence}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{phrase.reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Legend for Highlighted Text */}
                          <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 bg-red-200 rounded"></span>
                              <span>High AI (90%+)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 bg-yellow-200 rounded"></span>
                              <span>Medium AI (75-89%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 bg-green-200 rounded"></span>
                              <span>Low AI (60-74%)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Approve Button */}
            {synthesizedResponse && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-gray-600">
                  Ready to proceed to image selection
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowContentModal(false);
                      router.push('/dashboard/content');
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApproveContent}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Image Selection */}
      {showImageModal && aiVisibilityData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5 text-cyan-600" />
                  Content Image
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add an image to publish with your content
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  router.push('/dashboard/content');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Search Query */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-gray-700">Search Query</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    placeholder="Enter search terms for images..."
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-sm text-gray-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !fetchingImages) {
                        handleFetchImages();
                      }
                    }}
                  />
                  <button
                    onClick={handleFetchImages}
                    disabled={fetchingImages || !imageSearchQuery.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {fetchingImages ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </button>
                </div>
              </div>
              
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs text-gray-400">Suggestions:</span>
                {aiVisibilityData?.keywords?.slice(0, 3).map((kw: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setImageSearchQuery(kw)}
                    className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-xs hover:bg-cyan-100 transition-colors font-medium"
                  >
                    {kw}
                  </button>
                ))}
                <button
                  onClick={() => setImageSearchQuery(aiVisibilityData?.responses?.[0]?.prompt || '')}
                  className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs hover:bg-purple-100 transition-colors font-medium"
                >
                  Use prompt
                </button>
              </div>

              {/* Image Grid */}
              {fetchingImages ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-cyan-600 mx-auto mb-3" />
                  <p className="text-gray-600">Searching for images...</p>
                </div>
              ) : pixabayImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {pixabayImages.slice(0, 5).map((image) => (
                      <button
                        key={image.id}
                        onClick={() => handleSelectImage(image)}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                          selectedImage?.id === image.id
                            ? 'border-cyan-500 ring-2 ring-cyan-500'
                            : 'border-gray-200 hover:border-cyan-400'
                        }`}
                      >
                        <Image
                          src={image.webformatURL}
                          alt={image.tags}
                          fill
                          className="object-cover"
                        />
                        {selectedImage?.id === image.id && (
                          <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                            <div className="bg-cyan-500 text-white rounded-full p-2">
                              <CheckCircle className="w-6 h-6" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs truncate">by {image.user}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-center pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Images powered by{' '}
                      <a
                        href="https://pixabay.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:underline"
                      >
                        Pixabay
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Search for images to get started</p>
                </div>
              )}
            </div>

            {/* Footer with Confirm Button */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-600">
                {selectedImage ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Image selected
                  </span>
                ) : (
                  'Select an image to continue'
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImageModal(false);
                    router.push('/dashboard/content');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImage}
                  disabled={!selectedImage || uploadingImage}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Platform Selection */}
      {showPlatformModal && aiVisibilityData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Select Publishing Platforms
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose where to publish this content. Schemas will be auto-generated for each platform.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPlatformModal(false);
                  setShowImageModal(true);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {PUBLISHING_PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="relative w-5 h-5 flex-shrink-0">
                      <Image
                        src={platform.icon}
                        alt={platform.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                    {selectedPlatforms.includes(platform.id) && (
                      <CheckCircle className="w-4 h-4 text-blue-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
              
              {selectedImage && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-cyan-300">
                      <Image
                        src={uploadedImageUrl || selectedImage.webformatURL}
                        alt="Selected image"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Selected Image</p>
                      <p className="text-xs text-gray-500">Image will be published with content</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPlatformModal(false);
                        setShowImageModal(true);
                      }}
                      className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Approve Button */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-600">
                {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPlatformModal(false);
                    setShowImageModal(true);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateSchemas}
                  disabled={selectedPlatforms.length === 0 || creatingSchemas}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creatingSchemas ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Schemas...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4" />
                      Approve & Generate Schemas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Creation Progress Modal */}
      {creatingSchemas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="text-center mb-6">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#E5E7EB"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - schemaProgress / 100)}`}
                    className="transition-all duration-500 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{schemaProgress}%</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Creating Platform Schemas</h3>
              <p className="text-sm text-gray-500">
                {currentPlatform ? (
                  <>Processing: <span className="font-medium text-blue-600">{currentPlatform}</span></>
                ) : (
                  'Initializing...'
                )}
              </p>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${schemaProgress}%` }}
              />
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {selectedPlatforms.map((platformId) => {
                const platform = PUBLISHING_PLATFORMS.find(p => p.id === platformId);
                const isComplete = Object.keys(platformSchemas).includes(platformId);
                const isCurrent = PUBLISHING_PLATFORMS.find(p => p.id === platformId)?.name === currentPlatform;
                
                return (
                  <div
                    key={platformId}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      isComplete 
                        ? 'bg-green-100 text-green-700' 
                        : isCurrent 
                          ? 'bg-blue-100 text-blue-700 animate-pulse' 
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {platform && (
                      <div className="relative w-3.5 h-3.5">
                        <Image src={platform.icon} alt={platform.name} fill className="object-contain" />
                      </div>
                    )}
                    <span>{platform?.name}</span>
                    {isComplete && <CheckCircle className="w-3 h-3" />}
                    {isCurrent && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Content() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <ContentInner />
    </Suspense>
  );
}

