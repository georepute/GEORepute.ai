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
      });
    } catch (error) {
      console.error("Error loading report data:", error);
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
