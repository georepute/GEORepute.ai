"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
} from "recharts";
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Globe,
  Target,
  Search,
  Video,
  Download,
  Loader2,
  Play,
  RotateCcw,
  XCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

type VideoStatus = "idle" | "pending" | "done" | "failed";
interface VideoState { status: VideoStatus; url: string | null; generatedAt: string | null; requestId: string | null; }
const POLL_INTERVAL_MS = 12000;
const POLL_MAX_COUNT = 75;
const VIDEO_LANGUAGE_OPTIONS = [
  { code: "en", name: "English" }, { code: "ar", name: "Arabic" }, { code: "zh", name: "Chinese" },
  { code: "da", name: "Danish" }, { code: "nl", name: "Dutch" }, { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" }, { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" }, { code: "id", name: "Indonesian" }, { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" }, { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" }, { code: "pt", name: "Portuguese" }, { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" }, { code: "sv", name: "Swedish" }, { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" }, { code: "ur", name: "Urdu" }, { code: "vi", name: "Vietnamese" },
];

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  claude: "#8b5cf6",
  gemini: "#4285f4",
  perplexity: "#00b4d8",
  groq: "#f97316",
};

interface EngineData {
  platform: string;
  displayName: string;
  presenceScore: number;
  totalQueries: number;
  mentionCount: number;
  mentionRatePct: number;
  shareOfVoicePct: number;
  avgSentiment: number | null;
}

interface ReportData {
  projects: Array<{ id: string; brand_name: string }>;
  engines: EngineData[];
  enginesByProject: Record<string, EngineData[]>;
  summary: {
    totalQueries: number;
    totalMentions: number;
    overallMentionRate: number;
    hasRepresentationIssue: boolean;
    recommendation: string;
  };
  responses: any[];
}

export default function AiSearchPresencePage() {
  const [projects, setProjects] = useState<ReportData["projects"]>([]);
  const [enginesByProject, setEnginesByProject] = useState<
    ReportData["enginesByProject"]
  >({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [video, setVideo] = useState<VideoState>({ status: "idle", url: null, generatedAt: null, requestId: null });
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState("en");
  const videoLanguageRef = useRef(videoLanguage);
  videoLanguageRef.current = videoLanguage;
  const [showVideoModal, setShowVideoModal] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => { return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); }; }, []);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setShowVideoModal(false); };
    if (showVideoModal) { window.addEventListener("keydown", onKeyDown); document.body.style.overflow = "hidden"; }
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [showVideoModal]);
  useEffect(() => {
    if (video.status === "pending" && selectedProjectId) { startPolling(); } else { stopPolling(); }
    return () => stopPolling();
  }, [video.status, selectedProjectId]);

  const resetVideo = () => { stopPolling(); setVideo({ status: "idle", url: null, generatedAt: null, requestId: null }); };
  const startPolling = () => { stopPolling(); pollCountRef.current = 0; pollTimerRef.current = setInterval(pollVideoStatus, POLL_INTERVAL_MS); };
  const stopPolling = () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };

  const generateVideoReport = async (engines: EngineData[], summary: any, brandName: string) => {
    if (!selectedProjectId || !engines.length) return;
    try {
      setGeneratingVideo(true);
      toast.loading("Starting video report generation with xAI Aurora...", { id: "gen-asp-video" });
      const reportData = { brandName, engines, summary: { overallPresenceScore: summary.overallMentionRate, totalQueries: summary.totalQueries, totalMentions: summary.totalMentions, avgSentiment: null, enginesCount: engines.filter(e => e.totalQueries > 0).length }, generatedAt: new Date().toISOString() };
      const languageToUse = videoLanguageRef.current;
      const res = await fetch("/api/reports/ai-search-presence/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, reportData, language: languageToUse }) });
      const data = await res.json();
      if (data.success && data.requestId) {
        setVideo({ status: "pending", url: null, generatedAt: null, requestId: data.requestId });
        toast.success("Video generation started! A 15-second video usually takes 2–8 minutes. We'll check automatically.", { id: "gen-asp-video", duration: 6000 });
      } else { toast.error(data.error || "Failed to start video generation", { id: "gen-asp-video" }); }
    } catch (err) { console.error("Generate video error:", err); toast.error("Failed to start video generation", { id: "gen-asp-video" }); }
    finally { setGeneratingVideo(false); }
  };

  const pollVideoStatus = async () => {
    if (!selectedProjectId) return;
    pollCountRef.current += 1;
    if (pollCountRef.current > POLL_MAX_COUNT) { stopPolling(); setVideo({ status: "failed", url: null, generatedAt: null, requestId: null }); toast.error("Video generation is taking too long. Please try again."); return; }
    try {
      const res = await fetch(`/api/reports/ai-search-presence/video?projectId=${selectedProjectId}`);
      const data = await res.json();
      if (!data.success) return;
      const v = data.video;
      if (!v) return;
      if (v.status === "done" && v.url) { stopPolling(); setVideo({ status: "done", url: v.url, generatedAt: v.generatedAt, requestId: null }); toast.success("Video report is ready!", { duration: 5000 }); }
      else if (v.status === "failed") { stopPolling(); setVideo({ status: "failed", url: null, generatedAt: null, requestId: null }); toast.error("Video generation failed. Please try again."); }
    } catch (err) { console.error("Poll video status error:", err); }
  };

  const downloadVideo = async (brandName?: string) => {
    if (!video.url) return;
    try {
      const res = await fetch(video.url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = blobUrl; a.download = `ai-presence-video-${brandName || "report"}-${Date.now()}.mp4`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl); toast.success("Download started!");
    } catch { window.open(video.url!, "_blank"); }
  };

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/ai-search-presence");
      const data = await res.json();
      if (data.success && data.data) {
        const projs = data.data.projects || [];
        setProjects(projs);
        if (projs.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projs[0].id);
        }
        if (projs.length === 0) {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Load projects error:", err);
      toast.error("Failed to load projects");
      setLoading(false);
    }
  }, []);

  const loadReportForProject = useCallback(async (projectId: string) => {
    if (!projectId) return;
    resetVideo();
    try {
      setLoading(true);
      const res = await fetch(
        `/api/reports/ai-search-presence?projectId=${encodeURIComponent(projectId)}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setProjects(d.projects || []);
        setEnginesByProject(d.enginesByProject || {});
      } else {
        toast.error(data.error || "Failed to load report");
      }
      // Restore video state
      try {
        const vRes = await fetch(`/api/reports/ai-search-presence/video?projectId=${projectId}`);
        const vData = await vRes.json();
        if (vData.success && vData.video) {
          const v = vData.video;
          setVideo({ status: v.status || "idle", url: v.url || null, generatedAt: v.generatedAt || null, requestId: v.requestId || null });
        }
      } catch { /* ignore video state restore errors */ }
    } catch (err) {
      console.error("Load report error:", err);
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadReportForProject(selectedProjectId);
    }
  }, [selectedProjectId, loadReportForProject]);

  // Always use project-specific engines
  const displayEngines = selectedProjectId
    ? enginesByProject[selectedProjectId] || []
    : [];

  // Compute summary from selected project's engines
  const computedSummary = displayEngines.length
    ? (() => {
        const totalQueries = displayEngines.reduce((s, e) => s + e.totalQueries, 0);
        const totalMentions = displayEngines.reduce((s, e) => s + e.mentionCount, 0);
        const overallMentionRate =
          totalQueries > 0 ? (totalMentions / totalQueries) * 100 : 0;
        const hasRepresentationIssue = totalQueries > 0 && overallMentionRate < 20;
        let recommendation = "";
        if (totalQueries === 0) {
          recommendation = "Run AI Visibility analysis to generate report data.";
        } else if (hasRepresentationIssue) {
          recommendation =
            "AI representation issue detected. Low brand recognition across AI engines. Consider improving content visibility, citations, and brand authority signals.";
        } else if (overallMentionRate < 50) {
          recommendation =
            "Moderate AI visibility. There is room to improve brand recognition by optimizing content and citations.";
        } else {
          recommendation =
            "Strong AI visibility. Your brand is well-recognized by AI engines.";
        }
        return {
          totalQueries,
          totalMentions,
          overallMentionRate: Math.round(overallMentionRate * 10) / 10,
          hasRepresentationIssue,
          recommendation,
        };
      })()
    : null;

  // Filter engines that have data
  const enginesWithData = displayEngines.filter((e) => e.totalQueries > 0);

  // Chart: Mention rate by platform
  const mentionRateChartData = enginesWithData.map((e) => ({
    name: e.displayName,
    rate: Math.round(e.mentionRatePct),
    mentions: e.mentionCount,
    total: e.totalQueries,
  }));

  // Chart: Mentioned vs Missed (stacked bar)
  const mentionedVsMissedData = enginesWithData.map((e) => ({
    name: e.displayName,
    mentioned: e.mentionCount,
    missed: e.totalQueries - e.mentionCount,
    total: e.totalQueries,
  }));

  // Chart: Mentioned vs Missed pie (overall)
  const pieData =
    computedSummary && computedSummary.totalQueries > 0
      ? [
          {
            name: "Brand Mentioned",
            value: computedSummary.totalMentions,
            color: "#10b981",
          },
          {
            name: "Not Mentioned",
            value: computedSummary.totalQueries - computedSummary.totalMentions,
            color: "#ef4444",
          },
        ].filter((d) => d.value > 0)
      : [];

  // Chart: Sentiment by engine (engines with sentiment data)
  const sentimentChartData = enginesWithData
    .filter((e) => e.avgSentiment !== null)
    .map((e) => ({
      name: e.displayName,
      sentiment: Math.round((e.avgSentiment! + 1) * 50), // -1..1 -> 0..100 for display
      raw: e.avgSentiment!,
      label:
        e.avgSentiment! > 0.3
          ? "Positive"
          : e.avgSentiment! < -0.3
          ? "Negative"
          : "Neutral",
    }));

  // Chart: Share of voice (query distribution across engines)
  const shareOfVoiceData = enginesWithData.map((e) => ({
    name: e.displayName,
    value: e.totalQueries,
    color: PLATFORM_COLORS[e.platform] || "#6366f1",
  }));

  // Chart: Radar - one polygon per engine
  const radarMetrics = [
    { metric: "Mention Rate", fullMark: 100 },
    { metric: "Sentiment", fullMark: 100 },
    { metric: "Query Share", fullMark: 100 },
  ];
  const radarData = radarMetrics.map((m) => {
    const row: Record<string, string | number> = { metric: m.metric, fullMark: m.fullMark };
    enginesWithData.forEach((e) => {
      row[e.displayName] =
        m.metric === "Mention Rate"
          ? Math.round(e.mentionRatePct)
          : m.metric === "Sentiment"
          ? e.avgSentiment !== null ? Math.round((e.avgSentiment + 1) * 50) : 0
          : Math.round(e.shareOfVoicePct);
    });
    return row;
  });
  const radarColors = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444"];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              AI Search Presence
            </h1>
          </div>
          <p className="text-gray-600">
            Does AI &quot;recognize&quot; your brand? This report shows how often
            AI engines mention your brand when answering relevant queries. Use it
            to identify AI representation issues.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="font-medium text-gray-700 text-sm">
                Project:
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brand_name || "Unnamed"}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => selectedProjectId && loadReportForProject(selectedProjectId)}
              disabled={loading || !selectedProjectId}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <Link
              href="/dashboard/ai-visibility"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              Run AI Visibility Analysis
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading report...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Brain className="w-16 h-16 text-primary-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No AI Visibility Data
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Run an AI Visibility analysis first to generate queries and check
              whether AI engines mention your brand. This report uses that data
              to show brand recognition across AI search engines.
            </p>
            <Link
              href="/dashboard/ai-visibility"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              <Globe className="w-5 h-5" />
              Go to AI Visibility
            </Link>
          </div>
        ) : (
          <>
            {/* Decision Insight Card */}
            {computedSummary && (
              <div
                className={`rounded-lg shadow-sm border p-6 mb-6 ${
                  computedSummary.hasRepresentationIssue
                    ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
                    : "bg-gradient-to-br from-green-50 to-green-100 border-green-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      computedSummary.hasRepresentationIssue
                        ? "bg-red-200"
                        : "bg-green-200"
                    }`}
                  >
                    {computedSummary.hasRepresentationIssue ? (
                      <AlertTriangle className="w-6 h-6 text-red-700" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Decision Insight: AI Representation
                    </h3>
                    <p
                      className={`font-medium mb-2 ${
                        computedSummary.hasRepresentationIssue
                          ? "text-red-800"
                          : "text-green-800"
                      }`}
                    >
                      {computedSummary.hasRepresentationIssue
                        ? "AI representation issue detected"
                        : "No significant AI representation issue"}
                    </p>
                    <p className="text-gray-700 text-sm">
                      {computedSummary.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            {computedSummary && computedSummary.totalQueries > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Total Queries
                    </span>
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {computedSummary.totalQueries}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Queries tested across AI engines
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Brand Mentions
                    </span>
                    <Target className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {computedSummary.totalMentions}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Times AI mentioned your brand
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Overall Mention Rate
                    </span>
                    <Brain className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="text-3xl font-bold text-primary-600">
                    {computedSummary.overallMentionRate}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Brand recognition rate
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      AI Engines
                    </span>
                    <Globe className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {enginesWithData.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Engines with data
                  </p>
                </div>
              </div>
            )}

            {/* Video Report Section */}
            {enginesWithData.length > 0 && computedSummary && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Video className="w-6 h-6 text-primary-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Video Report</h3>
                      <p className="text-sm text-gray-500">Generate a short AI-narrated video summarizing this report</p>
                    </div>
                  </div>
                  {video.status === "done" && video.url && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowVideoModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                        <Play className="w-4 h-4" /> Preview
                      </button>
                      <button onClick={() => downloadVideo(projects.find(p => p.id === selectedProjectId)?.brand_name)} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                        <Download className="w-4 h-4" /> Download
                      </button>
                      <button onClick={resetVideo} className="inline-flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">
                        <RotateCcw className="w-4 h-4" /> Regenerate
                      </button>
                    </div>
                  )}
                </div>
                {video.status === "idle" && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Language:</label>
                      <select value={videoLanguage} onChange={e => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        {VIDEO_LANGUAGE_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => generateVideoReport(enginesWithData as EngineData[], computedSummary, projects.find(p => p.id === selectedProjectId)?.brand_name || "Brand")}
                      disabled={generatingVideo}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      {generatingVideo ? "Starting..." : "Generate Video Report"}
                    </button>
                  </div>
                )}
                {video.status === "pending" && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Generating video report...</p>
                      <p className="text-xs text-blue-600 mt-1">This usually takes 2–8 minutes. We&apos;re polling automatically every 12 seconds.</p>
                    </div>
                    <button onClick={resetVideo} className="ml-auto text-blue-500 hover:text-blue-700"><XCircle className="w-5 h-5" /></button>
                  </div>
                )}
                {video.status === "failed" && (
                  <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Video generation failed.</p>
                      <p className="text-xs text-red-600 mt-1">Please try again.</p>
                    </div>
                    <button onClick={resetVideo} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50">
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  </div>
                )}
                {video.status === "done" && video.url && video.generatedAt && (
                  <div className="p-4 bg-green-50 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800">Video ready — generated {new Date(video.generatedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {/* Video Preview Modal */}
            {showVideoModal && video.url && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowVideoModal(false)}>
                <div className="relative bg-black rounded-xl overflow-hidden max-w-4xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowVideoModal(false)} className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/80">
                    <X className="w-5 h-5" />
                  </button>
                  <video src={video.url} controls autoPlay className="w-full max-h-[80vh]" />
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                    <span className="text-sm text-gray-300">AI Search Presence — Video Report</span>
                    <button onClick={() => downloadVideo(projects.find(p => p.id === selectedProjectId)?.brand_name)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Engine Cards */}
            {enginesWithData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  AI Engine Cards
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {enginesWithData.map((engine) => {
                    const color =
                      PLATFORM_COLORS[engine.platform] || "#6366f1";
                    const isStrong = engine.mentionRatePct >= 50;
                    const isWeak = engine.mentionRatePct < 30;
                    return (
                      <div
                        key={engine.platform}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Brain
                            className="w-5 h-5"
                            style={{ color }}
                          />
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {engine.displayName}
                        </h4>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {Math.round(engine.mentionRatePct)}%
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Mention rate
                        </p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {engine.mentionCount} / {engine.totalQueries}{" "}
                            mentioned
                          </span>
                        </div>
                        {engine.avgSentiment !== null && (
                          <div className="mt-2 text-xs text-gray-500">
                            Avg sentiment:{" "}
                            {engine.avgSentiment > 0.3
                              ? "Positive"
                              : engine.avgSentiment < -0.3
                              ? "Negative"
                              : "Neutral"}{" "}
                            ({engine.avgSentiment.toFixed(2)})
                          </div>
                        )}
                        <div
                          className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isStrong
                              ? "bg-green-100 text-green-800"
                              : isWeak
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isStrong
                            ? "Strong presence"
                            : isWeak
                            ? "Weak presence"
                            : "Moderate presence"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charts */}
            {computedSummary && computedSummary.totalQueries > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pie: Mentioned vs Not Mentioned */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Brand Recognition Overview
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Share of queries where AI mentioned your brand
                  </p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, value }) =>
                            `${name}: ${value} (${Math.round(
                              (value / computedSummary.totalQueries) * 100
                            )}%)`
                          }
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            `${value} (${Math.round(
                              (value / computedSummary.totalQueries) * 100
                            )}%)`,
                            "",
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No data available
                    </p>
                  )}
                </div>

                {/* Bar: Mention Rate by Platform */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Mention Rate by AI Engine
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    How often each engine mentions your brand
                  </p>
                  {mentionRateChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={mentionRateChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#6b7280"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px",
                          }}
                          formatter={(value: number, name: string, props: any) => {
                            const d = props.payload;
                            return [
                              `${value}% (${d.mentions}/${d.total} queries)`,
                              "Mention Rate",
                            ];
                          }}
                        />
                        <Bar
                          dataKey="rate"
                          fill="#9333ea"
                          radius={[8, 8, 0, 0]}
                          name="Mention Rate (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No platform data
                    </p>
                  )}
                </div>

                {/* Stacked Bar: Mentioned vs Missed by Platform */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Platform Comparison: Mentioned vs Not Mentioned
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Query breakdown per AI engine
                  </p>
                  {mentionedVsMissedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={mentionedVsMissedData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#6b7280"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="mentioned"
                          stackId="a"
                          fill="#10b981"
                          name="Brand Mentioned"
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
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No comparison data
                    </p>
                  )}
                </div>

                {/* Overall Presence Gauge */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Brand Recognition Score
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Overall AI presence across all engines
                  </p>
                  <div className="flex flex-col items-center">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke={
                            computedSummary.overallMentionRate >= 50
                              ? "#10b981"
                              : computedSummary.overallMentionRate >= 30
                              ? "#f59e0b"
                              : "#ef4444"
                          }
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${computedSummary.overallMentionRate * 2.64} 264`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">
                          {computedSummary.overallMentionRate}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {computedSummary.overallMentionRate >= 50
                        ? "Strong recognition"
                        : computedSummary.overallMentionRate >= 30
                        ? "Moderate recognition"
                        : "Needs improvement"}
                    </p>
                  </div>
                </div>

                {/* Sentiment by Engine */}
                {sentimentChartData.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Sentiment When Mentioned
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Average sentiment of brand mentions per engine
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={sentimentChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number, _: string, props: any) => [
                            `${props.payload.label} (${props.payload.raw.toFixed(2)})`,
                            "Sentiment",
                          ]}
                        />
                        <Bar
                          dataKey="sentiment"
                          fill="#8b5cf6"
                          radius={[0, 4, 4, 0]}
                          name="Sentiment"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Share of Voice - Query Distribution */}
                {shareOfVoiceData.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Query Distribution by Engine
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Share of queries tested per AI engine
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={shareOfVoiceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, value }) =>
                            `${name}: ${value} (${computedSummary.totalQueries > 0 ? Math.round((value / computedSummary.totalQueries) * 100) : 0}%)`
                          }
                        >
                          {shareOfVoiceData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value} queries (${computedSummary.totalQueries > 0 ? Math.round((value / computedSummary.totalQueries) * 100) : 0}%)`,
                            name,
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Engine Performance Radar - same row as Query Distribution */}
                {radarData.length > 0 && enginesWithData.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Engine Performance Radar
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Multi-dimensional comparison: mention rate, sentiment, and query share
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "#6b7280" }}
                        />
                        {enginesWithData.map((e, i) => (
                          <Radar
                            key={e.platform}
                            name={e.displayName}
                            dataKey={e.displayName}
                            stroke={PLATFORM_COLORS[e.platform] || radarColors[i % radarColors.length]}
                            fill={PLATFORM_COLORS[e.platform] || radarColors[i % radarColors.length]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Queries per Engine - Horizontal Bar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Query Volume by Engine
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Number of queries tested per AI engine
                  </p>
                  {mentionRateChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={mentionRateChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number, _: string, props: any) => [
                            `${props.payload.total} queries (${props.payload.mentions} mentioned)`,
                            "Total",
                          ]}
                        />
                        <Bar
                          dataKey="total"
                          fill="#0ea5e9"
                          radius={[0, 4, 4, 0]}
                          name="Queries"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No data</p>
                  )}
                </div>

                {/* Mention Rate vs Sentiment Trend */}
                {sentimentChartData.length > 0 && mentionRateChartData.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Mention Rate vs Sentiment
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Engines with higher mention rate and positive sentiment
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart
                        data={enginesWithData
                          .filter((e) => e.avgSentiment !== null)
                          .map((e) => ({
                            name: e.displayName,
                            mentionRate: Math.round(e.mentionRatePct),
                            sentiment: Math.round((e.avgSentiment! + 1) * 50),
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" stroke="#10b981" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" domain={[0, 100]} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "Mention Rate" ? `${value}%` : value,
                            name,
                          ]}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="mentionRate"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          name="Mention Rate (%)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="sentiment"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ fill: "#8b5cf6", r: 4 }}
                          name="Sentiment (0-100)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
