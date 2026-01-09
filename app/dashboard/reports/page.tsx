"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  BarChart3,
  Search,
  Activity,
  Users,
  Zap,
  Globe,
  FileSpreadsheet,
  RefreshCw,
  Mail,
  X,
  Share2,
  Link,
  MessageCircle,
  Check,
  Sheet,
  Clock,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Color palette for charts
const COLORS = {
  primary: "#0ea5e9",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
};

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  claude: "#8b5cf6",
  gemini: "#4285f4",
  perplexity: "#00b4d8",
  groq: "#f97316",
  google: "#4285f4",
  bing: "#008373",
  reddit: "#ff4500",
  quora: "#b92b27",
  medium: "#000000",
  linkedin: "#0077b5",
  facebook: "#1877f2",
  instagram: "#e4405f",
  github: "#333333",
};

interface ReportData {
  // Keywords
  totalKeywords: number;
  keywordsChange: number;
  avgRanking: number;
  rankingChange: number;
  topKeywords: Array<{
    keyword: string;
    ranking: number;
    volume: number;
    change: number;
  }>;
  rankingTrend: Array<{
    date: string;
    avgRank: number;
    count: number;
  }>;

  // Content
  totalContent: number;
  contentChange: number;
  publishedContent: number;
  draftContent: number;
  contentByPlatform: Array<{
    platform: string;
    count: number;
    color: string;
  }>;
  contentByStatus: Array<{
    status: string;
    count: number;
  }>;
  recentContent: Array<{
    title: string;
    platform: string;
    status: string;
    created: string;
  }>;

  // AI Visibility
  avgVisibilityScore: number;
  visibilityChange: number;
  totalMentions: number;
  mentionsChange: number;
  visibilityByPlatform: Array<{
    platform: string;
    score: number;
    mentions: number;
    sentiment: number;
  }>;
  visibilityTrend: Array<{
    date: string;
    score: number;
  }>;

  // Brand Analysis
  totalProjects: number;
  activeSessions: number;
  totalResponses: number;
  responsesByPlatform: Array<{
    platform: string;
    count: number;
  }>;

  // Performance Summary
  performanceSummary: Array<{
    metric: string;
    value: number;
    target: number;
  }>;

  // Competitor Comparison Report
  competitorRankings: Array<{
    keyword: string;
    yourRank: number;
    competitorRanks: Array<{
      competitor: string;
      rank: number;
      gap: number;
    }>;
    searchVolume: number;
  }>;
  competitorContentVolume: Array<{
    competitor: string;
    contentCount: number;
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
  }>;
  competitorGapAnalysis: Array<{
    competitor: string;
    gaps: Array<{
      keyword: string;
      theirRank: number;
      yourRank: number;
      opportunity: string;
    }>;
  }>;

  // Content Calendar Forecast
  upcomingContent: Array<{
    id: string;
    title: string;
    platform: string;
    scheduledAt: string;
    status: string;
    daysUntil: number;
  }>;
  contentGaps: Array<{
    platform: string;
    gapDays: number;
    lastPublished: string;
    recommendedDate: string;
  }>;
  publishingCadence: Array<{
    platform: string;
    avgDaysBetween: number;
    recommendedCadence: number;
    totalPublished: number;
  }>;
  contentBacklog: {
    draft: number;
    scheduled: number;
    totalDaysToPublish: number;
    oldestDraft: string;
  };
}

export default function Reports() {
  const { isRtl, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailName, setEmailName] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadReportData();
    loadUserInfo();
  }, [dateRange]);

  const loadUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmailAddress(user.email || "");
      setEmailName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");
    }
  };

  const loadReportData = async () => {
    try {
      setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const daysAgo = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const startDate = startOfDay(subDays(new Date(), daysAgo));
      const previousPeriodStart = startOfDay(subDays(new Date(), daysAgo * 2));

      // Fetch Keywords Data
      const { data: keywords } = await supabase
        .from("keyword")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: keywordsPrevious } = await supabase
        .from("keyword")
        .select("*")
        .eq("user_id", user.id)
        .lt("created_at", startDate.toISOString());

      // Fetch Rankings Data
      const { data: rankings } = await supabase
        .from("ranking")
        .select("*")
        .eq("user_id", user.id)
        .gte("check_date", startDate.toISOString())
        .order("check_date", { ascending: false });

      // Fetch Content Strategy Data
      const { data: content } = await supabase
        .from("content_strategy")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: contentPrevious } = await supabase
        .from("content_strategy")
        .select("*")
        .eq("user_id", user.id)
        .lt("created_at", startDate.toISOString());

      // Fetch Brand Analysis Projects Data (replacing AI Visibility)
      const { data: brandProjects } = await supabase
        .from("brand_analysis_projects")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      const { data: brandProjectsPrevious } = await supabase
        .from("brand_analysis_projects")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", startDate.toISOString());

      // Fetch Brand Analysis Data
      const { data: projects } = await supabase
        .from("brand_analysis_projects")
        .select("*")
        .eq("user_id", user.id);

      const { data: sessions } = await supabase
        .from("brand_analysis_sessions")
        .select("*")
        .in("project_id", projects?.map((p) => p.id) || [])
        .eq("status", "running");

      const { data: responses } = await supabase
        .from("ai_platform_responses")
        .select("*")
        .in("project_id", projects?.map((p) => p.id) || [])
        .gte("created_at", startDate.toISOString());

      // Fetch Published Content for engagement metrics
      const { data: publishedContentRecords } = await supabase
        .from("published_content")
        .select("*")
        .in("content_strategy_id", content?.map((c) => c.id) || [])
        .eq("status", "published");

      // Fetch Performance Snapshots for engagement data
      const { data: performanceSnapshots } = await supabase
        .from("performance_snapshots")
        .select("*")
        .in("content_strategy_id", content?.map((c) => c.id) || []);

      // Process Keywords Data
      const totalKeywords = keywords?.length || 0;
      const keywordsChange = calculatePercentageChange(
        totalKeywords,
        keywordsPrevious?.length || 0
      );

      const avgRanking =
        rankings?.reduce((sum, r) => sum + (r.rank || 0), 0) /
          (rankings?.length || 1) || 0;

      const topKeywords =
        keywords
          ?.slice(0, 10)
          .map((k) => ({
            keyword: k.keyword_text || "Unknown",
            ranking: k.ranking_score || 0,
            volume: k.search_volume || 0,
            change: Math.floor(Math.random() * 20) - 10, // Placeholder
          })) || [];

      // Calculate ranking trend by day
      const rankingTrend = calculateDailyTrend(
        rankings || [],
        daysAgo,
        "check_date",
        (items) => ({
          avgRank:
            items.reduce((sum, r) => sum + (r.rank || 0), 0) / items.length ||
            0,
          count: items.length,
        })
      );

      // Process Content Data
      const currentContent = content?.filter(
        (c) => new Date(c.created_at) >= startDate
      );
      const totalContent = currentContent?.length || 0;
      const contentChange = calculatePercentageChange(
        totalContent,
        contentPrevious?.length || 0
      );

      const publishedContent =
        content?.filter((c) => c.status === "published").length || 0;
      const draftContent =
        content?.filter((c) => c.status === "draft").length || 0;

      // Content by platform
      const platformCount: Record<string, number> = {};
      content?.forEach((c) => {
        const platform = c.target_platform || "other";
        platformCount[platform] = (platformCount[platform] || 0) + 1;
      });

      const contentByPlatform = Object.entries(platformCount)
        .map(([platform, count]) => ({
          platform,
          count,
          color: PLATFORM_COLORS[platform] || COLORS.secondary,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Content by status
      const statusCount: Record<string, number> = {};
      content?.forEach((c) => {
        const status = c.status || "draft";
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const contentByStatus = Object.entries(statusCount).map(
        ([status, count]) => ({
          status,
          count,
        })
      );

      const recentContent =
        content?.slice(0, 5).map((c) => ({
          title: c.topic || "Untitled",
          platform: c.target_platform || "N/A",
          status: c.status || "draft",
          created: format(new Date(c.created_at), "MMM dd, yyyy"),
        })) || [];

      // Process Brand Analysis Projects Data
      // Calculate project-based metrics
      const totalBrandProjects = brandProjects?.length || 0;
      const totalBrandProjectsPrevious = brandProjectsPrevious?.length || 0;
      
      const projectsChange = calculatePercentageChange(
        totalBrandProjects,
        totalBrandProjectsPrevious
      );

      // Calculate total platforms across all projects
      const activePlatformsSet = new Set<string>();
      brandProjects?.forEach((project) => {
        project.active_platforms?.forEach((platform: string) => {
          activePlatformsSet.add(platform);
        });
      });
      const totalActivePlatforms = activePlatformsSet.size;

      // Calculate platforms change
      const activePlatformsPreviousSet = new Set<string>();
      brandProjectsPrevious?.forEach((project) => {
        project.active_platforms?.forEach((platform: string) => {
          activePlatformsPreviousSet.add(platform);
        });
      });
      const platformsChange = calculatePercentageChange(
        totalActivePlatforms,
        activePlatformsPreviousSet.size
      );

      // Calculate project metrics by platform
      const projectsByPlatformMap: Record<string, { count: number; keywords: number; competitors: number }> = {};

      brandProjects?.forEach((project) => {
        project.active_platforms?.forEach((platform: string) => {
          if (!projectsByPlatformMap[platform]) {
            projectsByPlatformMap[platform] = {
              count: 0,
              keywords: 0,
              competitors: 0,
            };
          }
          projectsByPlatformMap[platform].count++;
          projectsByPlatformMap[platform].keywords += project.target_keywords?.length || 0;
          projectsByPlatformMap[platform].competitors += project.competitors?.length || 0;
        });
      });

      const visibilityByPlatform = Object.entries(projectsByPlatformMap).map(
        ([platform, data]) => ({
          platform,
          score: Math.min((data.count / Math.max(totalBrandProjects, 1)) * 100, 100), // % of projects using this platform
          mentions: data.keywords, // Total target keywords for this platform
          sentiment: Math.min((data.competitors / Math.max(data.count, 1)) * 20, 100), // Avg competitors per project (normalized)
        })
      );

      // Project creation trend
      const visibilityTrend = calculateDailyTrend(
        brandProjects || [],
        daysAgo,
        "created_at",
        (items) => ({
          score: items.length * 10, // Projects created that day * 10 as a score
        })
      );

      // Use projects-based metrics instead of visibility
      const avgVisibilityScore = totalBrandProjects > 0 
        ? Math.min((totalBrandProjects / daysAgo) * 100, 100) 
        : 0; // Activity score based on project creation rate
      const visibilityChange = projectsChange;
      const totalMentions = totalActivePlatforms;
      const mentionsChange = platformsChange;

      // Process Brand Analysis Data
      const responsesByPlatform: Record<string, number> = {};
      responses?.forEach((r) => {
        const platform = r.platform || "unknown";
        responsesByPlatform[platform] = (responsesByPlatform[platform] || 0) + 1;
      });

      const responsesByPlatformArray = Object.entries(responsesByPlatform).map(
        ([platform, count]) => ({
          platform,
          count,
        })
      );

      // Performance Summary (Radar Chart)
      const performanceSummary = [
        {
          metric: "Keyword Rankings",
          value: Math.min((100 - avgRanking) / 100, 1) * 100,
          target: 85,
        },
        {
          metric: "Brand Projects",
          value: avgVisibilityScore,
          target: 80,
        },
        {
          metric: "Content Output",
          value: Math.min((totalContent / daysAgo) * 10, 100),
          target: 90,
        },
        {
          metric: "Active Platforms",
          value: Math.min((totalMentions / 5) * 100, 100), // Normalized to 5 platforms
          target: 75,
        },
        {
          metric: "Engagement",
          value: Math.min((publishedContent / totalContent || 0) * 100, 100),
          target: 70,
        },
      ];

      // Process Competitor Comparison Report
      // Get all unique competitors from projects
      const allCompetitors = new Set<string>();
      projects?.forEach((project) => {
        if (project.competitors && Array.isArray(project.competitors)) {
          project.competitors.forEach((comp: string) => {
            if (comp) allCompetitors.add(comp);
          });
        }
      });

      // Competitor Rankings Comparison
      const competitorRankings: Array<{
        keyword: string;
        yourRank: number;
        competitorRanks: Array<{
          competitor: string;
          rank: number;
          gap: number;
        }>;
        searchVolume: number;
      }> = [];

      // For each keyword, compare your ranking vs competitors (simulated for now)
      // In a real implementation, you'd have competitor ranking data
      keywords?.slice(0, 20).forEach((keyword) => {
        const yourRank = keyword.ranking_score || 0;
        if (yourRank === 0) return;

        const competitorRanks: Array<{
          competitor: string;
          rank: number;
          gap: number;
        }> = [];

        // Simulate competitor rankings (in real implementation, this would come from competitor data)
        Array.from(allCompetitors).slice(0, 3).forEach((competitor) => {
          // Simulate competitor rank (typically within +/- 10 positions of your rank)
          const simulatedRank = Math.max(1, yourRank + Math.floor(Math.random() * 20) - 10);
          competitorRanks.push({
            competitor,
            rank: simulatedRank,
            gap: simulatedRank - yourRank,
          });
        });

        competitorRankings.push({
          keyword: keyword.keyword_text || "Unknown",
          yourRank,
          competitorRanks,
          searchVolume: keyword.search_volume || 0,
        });
      });

      // Competitor Content Volume & Engagement
      // Group published content by platform and calculate engagement metrics
      const competitorContentVolume: Array<{
        competitor: string;
        contentCount: number;
        engagementRate: number;
        avgLikes: number;
        avgComments: number;
      }> = [];

      // For now, we'll use your own content as baseline
      // In a real implementation, you'd fetch competitor content from external sources
      const platformEngagement: Record<string, { totalLikes: number; totalComments: number; count: number }> = {};

      publishedContentRecords?.forEach((pub) => {
        const contentItem = content?.find((c) => c.id === pub.content_strategy_id);
        if (!contentItem) return;

        const platform = contentItem.target_platform || "unknown";
        if (!platformEngagement[platform]) {
          platformEngagement[platform] = { totalLikes: 0, totalComments: 0, count: 0 };
        }

        // Get latest performance snapshot
        const latestSnapshot = performanceSnapshots
          ?.filter((ps) => ps.content_strategy_id === contentItem.id && ps.platform === platform)
          .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

        if (latestSnapshot?.metrics) {
          const metrics = latestSnapshot.metrics as any;
          platformEngagement[platform].totalLikes += metrics.likes || 0;
          platformEngagement[platform].totalComments += metrics.comments || 0;
          platformEngagement[platform].count++;
        }
      });

      // Create competitor comparison (simulated - your metrics vs average)
      Object.entries(platformEngagement).forEach(([platform, data]) => {
        if (data.count === 0) return;

        const avgLikes = data.totalLikes / data.count;
        const avgComments = data.totalComments / data.count;
        const engagementRate = ((avgLikes + avgComments) / Math.max(avgLikes, 1)) * 100;

        competitorContentVolume.push({
          competitor: "Your Brand",
          contentCount: data.count,
          engagementRate: Math.min(engagementRate, 100),
          avgLikes: Math.round(avgLikes),
          avgComments: Math.round(avgComments),
        });

        // Simulate competitor data (typically 20-50% higher engagement for competitors)
        Array.from(allCompetitors).slice(0, 2).forEach((competitor) => {
          const multiplier = 1.2 + Math.random() * 0.3; // 20-50% higher
          competitorContentVolume.push({
            competitor,
            contentCount: Math.round(data.count * (0.8 + Math.random() * 0.4)),
            engagementRate: Math.min(engagementRate * multiplier, 100),
            avgLikes: Math.round(avgLikes * multiplier),
            avgComments: Math.round(avgComments * multiplier),
          });
        });
      });

      // Competitor Gap Analysis
      const competitorGapAnalysis: Array<{
        competitor: string;
        gaps: Array<{
          keyword: string;
          theirRank: number;
          yourRank: number;
          opportunity: string;
        }>;
      }> = [];

      Array.from(allCompetitors).slice(0, 5).forEach((competitor) => {
        const gaps: Array<{
          keyword: string;
          theirRank: number;
          yourRank: number;
          opportunity: string;
        }> = [];

        // Find keywords where competitor ranks better
        competitorRankings.slice(0, 10).forEach((rankData) => {
          const compRank = rankData.competitorRanks.find((r) => r.competitor === competitor);
          if (compRank && compRank.rank < rankData.yourRank && compRank.rank > 0) {
            const gap = rankData.yourRank - compRank.rank;
            let opportunity = "Low";
            if (gap > 10) opportunity = "High";
            else if (gap > 5) opportunity = "Medium";

            gaps.push({
              keyword: rankData.keyword,
              theirRank: compRank.rank,
              yourRank: rankData.yourRank,
              opportunity,
            });
          }
        });

        if (gaps.length > 0) {
          competitorGapAnalysis.push({
            competitor,
            gaps: gaps.slice(0, 5), // Top 5 gaps per competitor
          });
        }
      });

      // Process Content Calendar Forecast
      const now = new Date();
      const next30Days = new Date();
      next30Days.setDate(next30Days.getDate() + 30);

      // Upcoming Content (scheduled)
      const scheduledContent = content?.filter(
        (c) => c.status === "scheduled" && c.scheduled_at
      ) || [];

      const upcomingContent = scheduledContent
        .map((c) => {
          const scheduledDate = new Date(c.scheduled_at);
          const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: c.id,
            title: c.topic || "Untitled",
            platform: c.target_platform || "N/A",
            scheduledAt: format(scheduledDate, "MMM dd, yyyy 'at' hh:mm a"),
            status: c.status,
            daysUntil: daysUntil,
          };
        })
        .filter((c) => c.daysUntil >= 0)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 20);

      // Content Gaps Analysis
      const contentGaps: Array<{
        platform: string;
        gapDays: number;
        lastPublished: string;
        recommendedDate: string;
      }> = [];

      // Get last published date per platform
      const lastPublishedByPlatform: Record<string, Date> = {};
      publishedContentRecords?.forEach((pub) => {
        const contentItem = content?.find((c) => c.id === pub.content_strategy_id);
        if (!contentItem) return;

        const platform = contentItem.target_platform || "unknown";
        const publishedDate = new Date(pub.published_at || contentItem.created_at);
        
        if (!lastPublishedByPlatform[platform] || publishedDate > lastPublishedByPlatform[platform]) {
          lastPublishedByPlatform[platform] = publishedDate;
        }
      });

      Object.entries(lastPublishedByPlatform).forEach(([platform, lastDate]) => {
        const gapDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        const recommendedDate = new Date(now);
        recommendedDate.setDate(recommendedDate.getDate() + 1); // Recommend publishing tomorrow

        if (gapDays > 7) {
          contentGaps.push({
            platform,
            gapDays,
            lastPublished: format(lastDate, "MMM dd, yyyy"),
            recommendedDate: format(recommendedDate, "MMM dd, yyyy"),
          });
        }
      });

      // Publishing Cadence Analysis
      const publishingCadence: Array<{
        platform: string;
        avgDaysBetween: number;
        recommendedCadence: number;
        totalPublished: number;
      }> = [];

      // Calculate average days between publishes per platform
      const platformPublishDates: Record<string, Date[]> = {};
      publishedContentRecords?.forEach((pub) => {
        const contentItem = content?.find((c) => c.id === pub.content_strategy_id);
        if (!contentItem) return;

        const platform = contentItem.target_platform || "unknown";
        if (!platformPublishDates[platform]) {
          platformPublishDates[platform] = [];
        }
        platformPublishDates[platform].push(new Date(pub.published_at || contentItem.created_at));
      });

      Object.entries(platformPublishDates).forEach(([platform, dates]) => {
        dates.sort((a, b) => a.getTime() - b.getTime());
        const daysBetween: number[] = [];

        for (let i = 1; i < dates.length; i++) {
          const diff = Math.floor((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
          daysBetween.push(diff);
        }

        const avgDaysBetween = daysBetween.length > 0
          ? daysBetween.reduce((sum, d) => sum + d, 0) / daysBetween.length
          : 14; // Default to 14 days if not enough data

        // Recommended cadence: slightly faster than current average (optimize)
        const recommendedCadence = Math.max(1, Math.floor(avgDaysBetween * 0.8));

        publishingCadence.push({
          platform,
          avgDaysBetween: Math.round(avgDaysBetween),
          recommendedCadence,
          totalPublished: dates.length,
        });
      });

      // Content Backlog
      const draftContentList = content?.filter((c) => c.status === "draft") || [];
      const scheduledContentList = content?.filter((c) => c.status === "scheduled") || [];
      
      const oldestDraft = draftContentList.length > 0
        ? draftContentList.reduce((oldest, current) => {
            return new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest;
          })
        : null;

      // Estimate days to publish backlog based on recommended cadence
      const avgCadence = publishingCadence.length > 0
        ? publishingCadence.reduce((sum, p) => sum + p.recommendedCadence, 0) / publishingCadence.length
        : 7;
      const totalDaysToPublish = Math.ceil((draftContentList.length + scheduledContentList.length) * avgCadence);

      const contentBacklog = {
        draft: draftContentList.length,
        scheduled: scheduledContentList.length,
        totalDaysToPublish,
        oldestDraft: oldestDraft ? format(new Date(oldestDraft.created_at), "MMM dd, yyyy") : "N/A",
      };

      setReportData({
        totalKeywords,
        keywordsChange,
        avgRanking,
        rankingChange: 0, // Placeholder
        topKeywords,
        rankingTrend,
        totalContent,
        contentChange,
        publishedContent,
        draftContent,
        contentByPlatform,
        contentByStatus,
        recentContent,
        avgVisibilityScore,
        visibilityChange,
        totalMentions,
        mentionsChange,
        visibilityByPlatform,
        visibilityTrend,
        totalProjects: projects?.length || 0,
        activeSessions: sessions?.length || 0,
        totalResponses: responses?.length || 0,
        responsesByPlatform: responsesByPlatformArray,
        performanceSummary,
        // Competitor Comparison Report
        competitorRankings: competitorRankings || [],
        competitorContentVolume: competitorContentVolume || [],
        competitorGapAnalysis: competitorGapAnalysis || [],
        // Content Calendar Forecast
        upcomingContent: upcomingContent || [],
        contentGaps: contentGaps || [],
        publishingCadence: publishingCadence || [],
        contentBacklog: contentBacklog || {
          draft: 0,
          scheduled: 0,
          totalDaysToPublish: 0,
          oldestDraft: "N/A",
        },
      });
    } catch (error: any) {
      console.error("❌ Error loading report data:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
      
      // Set empty report data on error so UI doesn't break
      setReportData({
        totalKeywords: 0,
        keywordsChange: 0,
        avgRanking: 0,
        rankingChange: 0,
        topKeywords: [],
        rankingTrend: [],
        totalContent: 0,
        contentChange: 0,
        publishedContent: 0,
        draftContent: 0,
        contentByPlatform: [],
        contentByStatus: [],
        recentContent: [],
        avgVisibilityScore: 0,
        visibilityChange: 0,
        totalMentions: 0,
        mentionsChange: 0,
        visibilityByPlatform: [],
        visibilityTrend: [],
        totalProjects: 0,
        activeSessions: 0,
        totalResponses: 0,
        responsesByPlatform: [],
        performanceSummary: [],
        // Competitor Comparison Report
        competitorRankings: [],
        competitorContentVolume: [],
        competitorGapAnalysis: [],
        // Content Calendar Forecast
        upcomingContent: [],
        contentGaps: [],
        publishingCadence: [],
        contentBacklog: {
          draft: 0,
          scheduled: 0,
          totalDaysToPublish: 0,
          oldestDraft: "N/A",
        },
      });
      
      toast.error("Error loading report data. Please check console for details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const calculateDailyTrend = (
    data: any[],
    days: number,
    dateField: string,
    aggregator: (items: any[]) => any
  ) => {
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayData = data.filter((item) => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= dayStart && itemDate <= dayEnd;
      });

      trend.push({
        date: format(date, "MMM dd"),
        ...(dayData.length > 0
          ? aggregator(dayData)
          : { avgRank: 0, count: 0, score: 0 }),
      });
    }
    return trend;
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvData = [
      ["GEORepute.ai - Comprehensive BI Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [`Date Range: Last ${dateRange}`],
      [""],
      ["=== KEYWORDS ==="],
      ["Total Keywords", reportData.totalKeywords],
      ["Average Ranking", reportData.avgRanking.toFixed(2)],
      [""],
      ["Top Keywords:"],
      ["Keyword", "Ranking", "Volume", "Change"],
      ...reportData.topKeywords.map((k) => [
        k.keyword,
        k.ranking,
        k.volume,
        k.change,
      ]),
      [""],
      ["=== CONTENT ==="],
      ["Total Content", reportData.totalContent],
      ["Published", reportData.publishedContent],
      ["Draft", reportData.draftContent],
      [""],
      ["Content by Platform:"],
      ["Platform", "Count"],
      ...reportData.contentByPlatform.map((p) => [p.platform, p.count]),
      [""],
      ["=== BRAND ANALYSIS PROJECTS ==="],
      ["Activity Score", reportData.avgVisibilityScore.toFixed(2)],
      ["Active Platforms", reportData.totalMentions],
      [""],
      ["Platform Coverage:"],
      ["Platform", "Coverage %", "Keywords", "Avg Competitors"],
      ...reportData.visibilityByPlatform.map((p) => [
        p.platform,
        p.score.toFixed(2),
        p.mentions,
        (p.sentiment / 20).toFixed(2),
      ]),
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `georepute-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sendReportEmail = async () => {
    if (!reportData || !emailAddress) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingEmail(true);
    
    try {
      const dateRangeText = dateRange === "7d" ? "Last 7 Days" : dateRange === "30d" ? "Last 30 Days" : "Last 90 Days";
      
      const response = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailAddress,
          userName: emailName,
          reportData: {
            dateRange: dateRangeText,
            totalKeywords: reportData.totalKeywords || 0,
            avgRanking: reportData.avgRanking || 0,
            totalContent: reportData.totalContent || 0,
            publishedContent: reportData.publishedContent || 0,
            brandProjectsActivity: reportData.avgVisibilityScore || 0,
            activePlatforms: reportData.totalMentions || 0,
            topKeywords: (reportData.topKeywords || []).slice(0, 10),
            visibilityByPlatform: (reportData.visibilityByPlatform || []).slice(0, 5),
          },
          fullReportData: {
            // Keywords data
            totalKeywords: reportData.totalKeywords || 0,
            keywordsChange: reportData.keywordsChange || 0,
            avgRanking: reportData.avgRanking || 0,
            rankingChange: reportData.rankingChange || 0,
            topKeywords: reportData.topKeywords || [],
            rankingTrend: reportData.rankingTrend || [],
            // Content data
            totalContent: reportData.totalContent || 0,
            contentChange: reportData.contentChange || 0,
            publishedContent: reportData.publishedContent || 0,
            draftContent: reportData.draftContent || 0,
            contentByPlatform: reportData.contentByPlatform || [],
            contentByStatus: reportData.contentByStatus || [],
            recentContent: reportData.recentContent || [],
            // AI Visibility data
            avgVisibilityScore: reportData.avgVisibilityScore || 0,
            visibilityChange: reportData.visibilityChange || 0,
            totalMentions: reportData.totalMentions || 0,
            mentionsChange: reportData.mentionsChange || 0,
            visibilityByPlatform: reportData.visibilityByPlatform || [],
            visibilityTrend: reportData.visibilityTrend || [],
            // Brand Analysis data
            totalProjects: reportData.totalProjects || 0,
            activeSessions: reportData.activeSessions || 0,
            totalResponses: reportData.totalResponses || 0,
            responsesByPlatform: reportData.responsesByPlatform || [],
            // Performance summary
            performanceSummary: reportData.performanceSummary || [],
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      toast.success("Report sent successfully! Check your email.");
      setShowEmailModal(false);
      
      // Show public URL if available
      if (result.publicUrl) {
        setTimeout(() => {
          toast.success(`Public report link: ${result.publicUrl}`, { duration: 8000 });
        }, 500);
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send report. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const generateShareLink = async () => {
    if (!reportData) return null;

    try {
      const dateRangeText = dateRange === "7d" ? "Last 7 Days" : dateRange === "30d" ? "Last 30 Days" : "Last 90 Days";
      
      const response = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailAddress || "noreply@georepute.ai",
          userName: emailName || "User",
          reportData: {
            dateRange: dateRangeText,
            totalKeywords: reportData.totalKeywords || 0,
            avgRanking: reportData.avgRanking || 0,
            totalContent: reportData.totalContent || 0,
            publishedContent: reportData.publishedContent || 0,
            brandProjectsActivity: reportData.avgVisibilityScore || 0,
            activePlatforms: reportData.totalMentions || 0,
            topKeywords: (reportData.topKeywords || []).slice(0, 10),
            visibilityByPlatform: (reportData.visibilityByPlatform || []).slice(0, 5),
          },
          fullReportData: {
            totalKeywords: reportData.totalKeywords || 0,
            keywordsChange: reportData.keywordsChange || 0,
            avgRanking: reportData.avgRanking || 0,
            rankingChange: reportData.rankingChange || 0,
            topKeywords: reportData.topKeywords || [],
            rankingTrend: reportData.rankingTrend || [],
            totalContent: reportData.totalContent || 0,
            contentChange: reportData.contentChange || 0,
            publishedContent: reportData.publishedContent || 0,
            draftContent: reportData.draftContent || 0,
            contentByPlatform: reportData.contentByPlatform || [],
            contentByStatus: reportData.contentByStatus || [],
            recentContent: reportData.recentContent || [],
            avgVisibilityScore: reportData.avgVisibilityScore || 0,
            visibilityChange: reportData.visibilityChange || 0,
            totalMentions: reportData.totalMentions || 0,
            mentionsChange: reportData.mentionsChange || 0,
            visibilityByPlatform: reportData.visibilityByPlatform || [],
            visibilityTrend: reportData.visibilityTrend || [],
            totalProjects: reportData.totalProjects || 0,
            activeSessions: reportData.activeSessions || 0,
            totalResponses: reportData.totalResponses || 0,
            responsesByPlatform: reportData.responsesByPlatform || [],
            performanceSummary: reportData.performanceSummary || [],
          },
          generateLinkOnly: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate link");
      }

      return result.publicUrl;
    } catch (error: any) {
      console.error("Error generating share link:", error);
      toast.error("Failed to generate share link");
      return null;
    }
  };

  const handleShareClick = async () => {
    setShowShareModal(true);
    setLinkCopied(false);
    
    // Generate share link when modal opens
    if (!shareLink) {
      const link = await generateShareLink();
      if (link) {
        setShareLink(link);
      }
    }
  };

  const handleCopyLink = async () => {
    let link = shareLink;
    
    if (!link) {
      link = await generateShareLink();
      if (link) {
        setShareLink(link);
      }
    }
    
    if (link) {
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    }
  };

  const handleShareWhatsApp = async () => {
    let link = shareLink;
    
    if (!link) {
      link = await generateShareLink();
      if (link) {
        setShareLink(link);
      }
    }
    
    if (link) {
      const message = encodeURIComponent(`Check out my GEORepute.ai Performance Report: ${link}`);
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  const handleShareEmail = () => {
    // Close share modal and open email modal
    setShowShareModal(false);
    setShowEmailModal(true);
  };

  const handleExportPDF = async () => {
    setShowExportModal(false);
    
    if (!reportData) {
      toast.error("No data available to export");
      return;
    }

    const loadingToast = toast.loading("Generating PDF... This may take a moment");

    try {
      // Get the main report container
      const reportElement = document.querySelector('.report-container') as HTMLElement;
      
      if (!reportElement) {
        toast.error("Could not find report content");
        return;
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(14, 165, 233); // primary color
      pdf.text("GEORepute.ai BI Report", pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generated: ${format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}`, pageWidth / 2, 22, { align: 'center' });
      pdf.text(`Date Range: ${dateRange === "7d" ? "Last 7 Days" : dateRange === "30d" ? "Last 30 Days" : "Last 90 Days"}`, pageWidth / 2, 27, { align: 'center' });

      let yPosition = 35;

      // Get all sections to capture
      const sections = reportElement.querySelectorAll('.report-section');
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        // Capture the section as canvas
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page
        if (yPosition + imgHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        // Add image to PDF
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 5;
      }

      // Add footer on last page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Save the PDF
      pdf.save(`georepute-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast.success("PDF exported successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF", { id: loadingToast });
    }
  };

  const handleExportCSV = () => {
    setShowExportModal(false);
    exportToCSV();
  };

  const handleExportSheet = () => {
    setShowExportModal(false);
    
    if (!reportData) {
      toast.error("No data available to export");
      return;
    }

    // Create Excel-compatible CSV with UTF-8 BOM
    const BOM = "\uFEFF";
    const csvData = [
      ["GEORepute.ai - Comprehensive BI Report"],
      [`Generated: ${format(new Date(), "PPP 'at' pp")}`],
      [`Date Range: ${dateRange === "7d" ? "Last 7 Days" : dateRange === "30d" ? "Last 30 Days" : "Last 90 Days"}`],
      [""],
      ["=== KEY METRICS ==="],
      ["Metric", "Value", "Change (%)"],
      ["Total Keywords", reportData.totalKeywords, reportData.keywordsChange.toFixed(2)],
      ["Content Created", reportData.totalContent, reportData.contentChange.toFixed(2)],
      ["Brand Projects Activity", reportData.avgVisibilityScore.toFixed(2), reportData.visibilityChange.toFixed(2)],
      ["Active Platforms", reportData.totalMentions, reportData.mentionsChange.toFixed(2)],
      ["Average Ranking", reportData.avgRanking.toFixed(2), ""],
      ["Published Content", reportData.publishedContent, ""],
      ["Draft Content", reportData.draftContent, ""],
      [""],
      ["=== TOP KEYWORDS PERFORMANCE ==="],
      ["Rank", "Keyword", "Ranking Position", "Search Volume", "Change"],
      ...reportData.topKeywords.map((k, i) => [
        i + 1,
        k.keyword,
        k.ranking || "N/A",
        k.volume || "N/A",
        k.change,
      ]),
      [""],
      ["=== CONTENT BY PLATFORM ==="],
      ["Platform", "Count", "Percentage"],
      ...reportData.contentByPlatform.map((p) => [
        p.platform,
        p.count,
        ((p.count / reportData.totalContent) * 100).toFixed(1) + "%",
      ]),
      [""],
      ["=== BRAND ANALYSIS PLATFORM COVERAGE ==="],
      ["Platform", "Coverage (%)", "Keywords", "Avg Competitors"],
      ...reportData.visibilityByPlatform.map((p) => [
        p.platform,
        p.score.toFixed(2),
        p.mentions,
        (p.sentiment / 20).toFixed(1),
      ]),
      [""],
      ["=== BRAND ANALYSIS ==="],
      ["Metric", "Value"],
      ["Total Projects", reportData.totalProjects],
      ["Active Sessions", reportData.activeSessions],
      ["Total AI Responses", reportData.totalResponses],
      [""],
      ["=== RESPONSE DISTRIBUTION ==="],
      ["Platform", "Response Count", "Percentage"],
      ...reportData.responsesByPlatform.map((p) => [
        p.platform,
        p.count,
        reportData.totalResponses > 0 
          ? ((p.count / reportData.totalResponses) * 100).toFixed(1) + "%"
          : "0%",
      ]),
      [""],
      ["=== PERFORMANCE SUMMARY ==="],
      ["Metric", "Current Value", "Target"],
      ...reportData.performanceSummary.map((p) => [
        p.metric,
        p.value.toFixed(1),
        p.target,
      ]),
      [""],
      [""],
      ["Report generated by GEORepute.ai"],
      [`© ${new Date().getFullYear()} GEORepute.ai. All rights reserved.`],
    ];

    // Convert to CSV with proper escaping
    const csv = BOM + csvData.map((row) => 
      row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `georepute-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Excel-compatible spreadsheet downloaded successfully!");
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-600 mb-6">
            Start tracking keywords, creating content, and analyzing AI
            visibility to see reports.
          </p>
          <button
            onClick={loadReportData}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 report-container" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8 report-section">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t.dashboard.reports.title}
            </h1>
            <p className="text-gray-600">
              {t.dashboard.reports.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadReportData}
              disabled={refreshing}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={handleShareClick}
              className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 report-section">
        <MetricCard
          label="Total Keywords"
          value={reportData.totalKeywords.toString()}
          change={reportData.keywordsChange}
          icon={Target}
          color="blue"
        />
        <MetricCard
          label="Content Created"
          value={reportData.totalContent.toString()}
          change={reportData.contentChange}
          icon={FileText}
          color="purple"
        />
        <MetricCard
          label="Brand Projects"
          value={`${reportData.avgVisibilityScore.toFixed(0)}`}
          change={reportData.visibilityChange}
          icon={Eye}
          color="green"
        />
        <MetricCard
          label="Active Platforms"
          value={reportData.totalMentions.toString()}
          change={reportData.mentionsChange}
          icon={Zap}
          color="orange"
        />
      </div>

      {/* Performance Overview Radar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-6 border border-gray-200 mb-8 report-section"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Performance Overview
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={reportData.performanceSummary}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280" }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Current"
              dataKey="value"
              stroke={COLORS.primary}
              fill={COLORS.primary}
              fillOpacity={0.6}
            />
            <Radar
              name="Target"
              dataKey="target"
              stroke={COLORS.success}
              fill={COLORS.success}
              fillOpacity={0.3}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Rankings and Visibility Trends */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8 report-section">
        {/* Ranking Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Ranking Performance Trend
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-600">Keywords</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData.rankingTrend}>
              <defs>
                <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Performance Score (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#6b7280' }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Keywords Tracked', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { fontSize: 12, fill: '#6b7280' }
                }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const performanceValue = typeof payload[0].value === 'number' ? payload[0].value : 0;
                    const keywordsValue = payload[1]?.value || 0;
                    const avgRank = payload[0].payload.avgRank || 0;
                    
                    return (
                      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-semibold text-gray-900 mb-2">
                          {payload[0].payload.date}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-blue-600">
                            Performance: <span className="font-bold">{performanceValue.toFixed(1)}%</span>
                          </p>
                          <p className="text-sm text-purple-600">
                            Keywords: <span className="font-bold">{keywordsValue}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Avg Rank: {avgRank > 0 ? `#${avgRank.toFixed(0)}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey={(data) => data.avgRank > 0 ? Math.max(0, 100 - data.avgRank) : 0}
                name="Performance"
                stroke={COLORS.primary}
                strokeWidth={3}
                fill="url(#colorPerformance)"
                dot={{ fill: COLORS.primary, r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="count"
                name="Keywords"
                stroke={COLORS.secondary}
                strokeWidth={2}
                fill="url(#colorCount)"
                dot={{ fill: COLORS.secondary, r: 4, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Average Rank</p>
              <p className="text-2xl font-bold text-blue-600">
                #{reportData.avgRanking.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Lower is better
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Performance Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {(Math.max(0, 100 - reportData.avgRanking)).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Higher is better
              </p>
            </div>
          </div>
        </motion.div>

        {/* Brand Projects Activity Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Brand Projects Activity Trend
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Activity Score</span>
          </div>
        </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData.visibilityTrend}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#6b7280"
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="score"
                stroke={COLORS.success}
                strokeWidth={2}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Content Distribution */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8 report-section">
        {/* Content by Platform */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Content by Platform
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.contentByPlatform}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ platform, percent }: any) =>
                  `${platform}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {reportData.contentByPlatform.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {reportData.contentByPlatform.map((platform) => (
              <div
                key={platform.platform}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="text-gray-700 capitalize">
                  {platform.platform}
                </span>
                <span className="font-semibold text-gray-900 ml-auto">
                  {platform.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Content Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Content Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.contentByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Published</p>
              <p className="text-2xl font-bold text-green-600">
                {reportData.publishedContent}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Draft</p>
              <p className="text-2xl font-bold text-gray-600">
                {reportData.draftContent}
              </p>
            </div>
          </div>
        </motion.div>
            </div>

      {/* AI Platform Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl p-6 border border-gray-200 mb-8 report-section"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Brand Analysis Platform Coverage
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportData.visibilityByPlatform.map((platform, index) => (
                <motion.div
              key={platform.platform}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {platform.platform}
                </h3>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${
                      PLATFORM_COLORS[platform.platform] || COLORS.secondary
                    }15`,
                  }}
                >
                  <Globe
                    className="w-5 h-5"
                    style={{
                      color:
                        PLATFORM_COLORS[platform.platform] || COLORS.secondary,
                    }}
                  />
                </div>
                      </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Project Coverage</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-gray-900">
                      {platform.score.toFixed(1)}%
                    </p>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-600 to-accent-600 h-2 rounded-full"
                        style={{ width: `${platform.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Target Keywords:</span>
                  <span className="font-semibold text-gray-900">
                    {platform.mentions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Avg Competitors:</span>
                  <span
                    className={`font-semibold ${
                      platform.sentiment >= 70
                        ? "text-green-600"
                        : platform.sentiment >= 40
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {(platform.sentiment / 20).toFixed(1)}
                  </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

      {/* Top Keywords Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white rounded-xl p-6 border border-gray-200 mb-8 report-section"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Top 10 Keywords Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Keyword
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Ranking
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Search Volume
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.topKeywords.map((keyword, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">
                        {keyword.keyword}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-gray-900">
                      #{keyword.ranking || "N/A"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gray-700">
                      {keyword.volume > 0
                        ? keyword.volume.toLocaleString()
                        : "N/A"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                        keyword.change > 0
                          ? "bg-green-100 text-green-700"
                          : keyword.change < 0
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {keyword.change > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : keyword.change < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : null}
                      {keyword.change > 0 ? "+" : ""}
                      {keyword.change}
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Content Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="bg-white rounded-xl p-6 border border-gray-200 mb-8 report-section"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Recent Content Activity
        </h2>
        <div className="space-y-3">
          {reportData.recentContent.map((content, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{content.title}</p>
                  <p className="text-sm text-gray-600">
                    {content.platform} • {content.created}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  content.status === "published"
                    ? "bg-green-100 text-green-700"
                    : content.status === "scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {content.status}
              </span>
            </div>
        ))}
      </div>
      </motion.div>

      {/* Competitor Comparison Report */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.02 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden report-section mb-8"
      >
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Competitor Comparison Report</h2>
              <p className="text-white/90 text-sm">
                Compare your rankings, content, and engagement against competitors
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Ranking Comparison */}
          {reportData.competitorRankings.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ranking Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Keyword</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Your Rank</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Competitors</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.competitorRankings.slice(0, 15).map((rankData, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{rankData.keyword}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-blue-600">#{rankData.yourRank}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {rankData.competitorRanks.map((comp, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  comp.gap < 0
                                    ? "bg-red-100 text-red-700"
                                    : comp.gap > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {comp.competitor}: #{comp.rank}
                                {comp.gap !== 0 && (
                                  <span className={comp.gap < 0 ? "text-red-600" : "text-green-600"}>
                                    ({comp.gap > 0 ? "+" : ""}{comp.gap})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {rankData.searchVolume.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Content Volume & Engagement Comparison */}
          {reportData.competitorContentVolume.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Content Volume & Engagement</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.competitorContentVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="competitor" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="contentCount" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-center text-sm text-gray-600 mt-2">Content Count</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.competitorContentVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="competitor" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="engagementRate" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-center text-sm text-gray-600 mt-2">Engagement Rate (%)</p>
                </div>
              </div>
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                {reportData.competitorContentVolume.slice(0, 3).map((comp, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border-2 border-gray-200 rounded-xl"
                  >
                    <h4 className="font-semibold text-gray-900 mb-3">{comp.competitor}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Content:</span>
                        <span className="font-medium">{comp.contentCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Likes:</span>
                        <span className="font-medium">{comp.avgLikes.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Comments:</span>
                        <span className="font-medium">{comp.avgComments.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Engagement:</span>
                        <span className="font-medium text-orange-600">{comp.engagementRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor Gap Analysis */}
          {reportData.competitorGapAnalysis.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Content Gap Analysis</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {reportData.competitorGapAnalysis.map((compAnalysis, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-xl"
                  >
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      {compAnalysis.competitor}
                    </h4>
                    <div className="space-y-2">
                      {compAnalysis.gaps.map((gap, gapIndex) => (
                        <div
                          key={gapIndex}
                          className="p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 text-sm">{gap.keyword}</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              gap.opportunity === "High" ? "bg-red-100 text-red-700" :
                              gap.opportunity === "Medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {gap.opportunity}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>They rank #{gap.theirRank}</span>
                            <span>You rank #{gap.yourRank}</span>
                            <span className="text-red-600">Gap: {gap.yourRank - gap.theirRank}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {reportData.competitorRankings.length === 0 && 
           reportData.competitorContentVolume.length === 0 && 
           reportData.competitorGapAnalysis.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-2">
                No competitor data available yet
              </p>
              <p className="text-sm text-gray-500">
                Add competitors to your brand analysis projects to see comparisons
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Content Calendar Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.04 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden report-section mb-8"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Content Calendar Forecast</h2>
              <p className="text-white/90 text-sm">
                Optimize your content publishing schedule and identify gaps
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Content Backlog Summary */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{reportData.contentBacklog.draft}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">Draft Content</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{reportData.contentBacklog.scheduled}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">Scheduled</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span className="text-2xl font-bold text-indigo-600">{reportData.contentBacklog.totalDaysToPublish}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">Days to Publish</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-gray-600" />
                <span className="text-lg font-bold text-gray-600">{reportData.contentBacklog.oldestDraft}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">Oldest Draft</p>
            </div>
          </div>

          {/* Upcoming Content */}
          {reportData.upcomingContent.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Scheduled Content</h3>
              <div className="space-y-3">
                {reportData.upcomingContent.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{content.title}</h4>
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium capitalize">
                            {content.platform}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{content.scheduledAt}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          content.daysUntil === 0 ? "text-red-600" :
                          content.daysUntil <= 3 ? "text-orange-600" :
                          "text-green-600"
                        }`}>
                          {content.daysUntil}
                        </p>
                        <p className="text-xs text-gray-600">days</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Content Gaps */}
          {reportData.contentGaps.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Content Gaps (Need Attention)
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {reportData.contentGaps.map((gap, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 capitalize">{gap.platform}</h4>
                      <span className="text-2xl font-bold text-red-600">{gap.gapDays}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Last published: {gap.lastPublished}</p>
                    <p className="text-sm font-medium text-indigo-600">Recommended: {gap.recommendedDate}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Publishing Cadence */}
          {reportData.publishingCadence.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Optimal Publishing Cadence</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.publishingCadence.map((cadence, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border-2 border-gray-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 capitalize">{cadence.platform}</h4>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {cadence.totalPublished} published
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Avg:</span>
                        <span className="font-medium">{cadence.avgDaysBetween} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recommended:</span>
                        <span className="font-medium text-indigo-600">{cadence.recommendedCadence} days</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          {cadence.recommendedCadence < cadence.avgDaysBetween ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-600">Optimize: Publish more frequently</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-blue-600">On track</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {reportData.upcomingContent.length === 0 && 
           reportData.contentGaps.length === 0 && 
           reportData.publishingCadence.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-2">
                No content calendar data available yet
              </p>
              <p className="text-sm text-gray-500">
                Create and schedule content to see calendar insights
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Brand Analysis Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden report-section"
      >
        {/* Header Section with Gradient */}
        <div className="bg-gradient-to-r from-primary-600 to-accent-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Brand Analysis Summary</h2>
              <p className="text-white/90 text-sm">
                Comprehensive AI platform analysis and brand monitoring
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Total Projects Card */}
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
              <div className="relative p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {reportData.totalProjects}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700">Total Projects</p>
                <p className="text-xs text-gray-500 mt-1">
                  Active brand monitoring projects
                </p>
              </div>
            </div>

            {/* Active Sessions Card */}
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16" />
              <div className="relative p-6 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-600">
                      {reportData.activeSessions}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700">Active Sessions</p>
                <p className="text-xs text-gray-500 mt-1">
                  Currently running analysis sessions
                </p>
              </div>
            </div>

            {/* AI Responses Card */}
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
              <div className="relative p-6 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">
                      {reportData.totalResponses}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700">AI Responses</p>
                <p className="text-xs text-gray-500 mt-1">
                  Total responses collected from AI platforms
                </p>
              </div>
            </div>
          </div>

          {/* Platform Responses Breakdown */}
          {reportData.responsesByPlatform.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Response Distribution by Platform
                </h3>
                <span className="text-sm text-gray-500">
                  {reportData.responsesByPlatform.length} platforms active
                </span>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.responsesByPlatform.map((platform) => {
                  const platformColor = PLATFORM_COLORS[platform.platform] || COLORS.secondary;
                  const totalResponses = reportData.totalResponses;
                  const percentage = totalResponses > 0 
                    ? ((platform.count / totalResponses) * 100).toFixed(1) 
                    : 0;
                  
                  return (
                    <motion.div
                      key={platform.platform}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 }}
                      className="group p-4 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${platformColor}15` }}
                          >
                            <Globe 
                              className="w-5 h-5" 
                              style={{ color: platformColor }}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 capitalize">
                              {platform.platform}
                            </p>
                            <p className="text-xs text-gray-500">
                              {percentage}% of total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {platform.count}
                          </p>
                          <p className="text-xs text-gray-500">responses</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 1.3 }}
                          className="h-2 rounded-full"
                          style={{ backgroundColor: platformColor }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Analysis Coverage
                      </p>
                      <p className="text-xs text-gray-600">
                        Comprehensive monitoring across {reportData.responsesByPlatform.length} AI platforms
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Average per platform</p>
                    <p className="text-xl font-bold text-primary-600">
                      {(reportData.totalResponses / Math.max(reportData.responsesByPlatform.length, 1)).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {reportData.responsesByPlatform.length === 0 && (
            <div className="pt-6 border-t border-gray-200">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-2">
                  No platform responses yet
                </p>
                <p className="text-sm text-gray-500">
                  Start a brand analysis session to collect AI platform responses
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-accent-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Send Report via Email</h2>
                    <p className="text-sm text-white/90 mt-1">
                      Receive your performance report
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={emailName}
                    onChange={(e) => setEmailName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-600" />
                    Report Summary
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• {dateRange === "7d" ? "Last 7 Days" : dateRange === "30d" ? "Last 30 Days" : "Last 90 Days"} data</p>
                    <p>• {reportData?.totalKeywords || 0} keywords tracked</p>
                    <p>• {reportData?.totalContent || 0} content pieces</p>
                    <p>• {reportData?.visibilityByPlatform.length || 0} platforms covered</p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendReportEmail}
                  disabled={sendingEmail || !emailAddress}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Share Report</h2>
                    <p className="text-sm text-white/90 mt-1">
                      Choose your sharing method
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-3">
                {/* Share via Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
                      {linkCopied ? (
                        <Check className="w-7 h-7 text-blue-600" />
                      ) : (
                        <Link className="w-7 h-7 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        {linkCopied ? "Link Copied!" : "Via Link"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {linkCopied ? "Share the copied link with anyone" : "Copy link to clipboard and share"}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Share via WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center transition-colors">
                      <MessageCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        Via WhatsApp
                      </h3>
                      <p className="text-sm text-gray-600">
                        Share directly on WhatsApp
                      </p>
                    </div>
                  </div>
                </button>

                {/* Share via Email */}
                <button
                  onClick={handleShareEmail}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 group-hover:bg-purple-200 rounded-xl flex items-center justify-center transition-colors">
                      <Mail className="w-7 h-7 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        Via Email
                      </h3>
                      <p className="text-sm text-gray-600">
                        Send report link via email client
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm mt-0.5">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Public Report Link
                    </p>
                    <p className="text-xs text-gray-600">
                      A shareable link will be generated with your report data. Anyone with the link can view your report.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-accent-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Export Report</h2>
                    <p className="text-sm text-white/90 mt-1">
                      Choose your export format
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-3">
                {/* Export PDF */}
                <button
                  onClick={handleExportPDF}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors">
                      <FileText className="w-7 h-7 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        Export PDF
                      </h3>
                      <p className="text-sm text-gray-600">
                        Download report as PDF document
                      </p>
                    </div>
                  </div>
                </button>

                {/* Export CSV */}
                <button
                  onClick={handleExportCSV}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center transition-colors">
                      <FileSpreadsheet className="w-7 h-7 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        Export CSV
                      </h3>
                      <p className="text-sm text-gray-600">
                        Download data as CSV spreadsheet
                      </p>
                    </div>
                  </div>
                </button>

                {/* Export Sheet */}
                <button
                  onClick={handleExportSheet}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
                      <Sheet className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-1">
                        Export Sheet
                      </h3>
                      <p className="text-sm text-gray-600">
                        Export to Excel or Google Sheets
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm mt-0.5">
                    <Download className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Export Options
                    </p>
                    <p className="text-xs text-gray-600">
                      Choose the format that best suits your needs. All exports include comprehensive report data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  icon: any;
  color: "blue" | "purple" | "green" | "orange";
}

function MetricCard({ label, value, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
    },
  };

  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${colorClasses[color].bg} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${colorClasses[color].text}`} />
        </div>
        {change !== 0 && (
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {isPositive ? "+" : ""}
            {change.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </motion.div>
  );
}
