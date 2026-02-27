"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Target,
  RefreshCw,
  Brain,
  Search,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  EyeOff,
  Video,
  Download,
  Loader2,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: { domain_url?: string; verification_status?: string } | null;
}

interface BlindSpot {
  query: string;
  topic: string;
  volume: number;
  gscImpressions: number;
  avgPosition: number;
  aiMentions: boolean;
  llmMentions?: Record<string, boolean>;
  demandScore: number;
  absenceScore: number;
  blindSpotScore: number;
  priority: "high" | "medium" | "low";
}

interface ReportSummary {
  totalBlindSpots: number;
  avgBlindSpotScore: number;
  aiBlindSpotPct: number;
  perLlmStats?: Record<string, { mentioned: number; total: number; pct: number }>;
}

interface ReportData {
  id?: string;
  domain: string;
  blindSpots: BlindSpot[];
  summary: ReportSummary;
  enginesUsed: string[];
  generatedAt: string;
  videoUrl?: string | null;
  videoStatus?: string | null;
  videoGeneratedAt?: string | null;
}

type VideoStatus = "idle" | "pending" | "done" | "failed";

interface VideoState {
  status: VideoStatus;
  url: string | null;
  generatedAt: string | null;
  requestId: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

const LLM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  claude: "Claude",
  grok: "Grok",
};

const LLM_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  gemini: "#4285f4",
  perplexity: "#00b4d8",
  claude: "#8b5cf6",
  grok: "#f97316",
};

const POLL_INTERVAL_MS = 12000; // 12 seconds
const POLL_MAX_COUNT = 75; // 75 × 12s ≈ 15 min — then stop polling

const VIDEO_LANGUAGE_OPTIONS: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "ur", name: "Urdu" },
  { code: "vi", name: "Vietnamese" },
];

export default function StrategicBlindSpotsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Video state
  const [video, setVideo] = useState<VideoState>({
    status: "idle",
    url: null,
    generatedAt: null,
    requestId: null,
  });
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState("en");
  const videoLanguageRef = useRef(videoLanguage);
  videoLanguageRef.current = videoLanguage;
  const [showVideoModal, setShowVideoModal] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Close video modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowVideoModal(false);
    };
    if (showVideoModal) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [showVideoModal]);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadReport();
    } else {
      setReport(null);
      resetVideo();
    }
  }, [selectedDomain]);

  // Start/stop polling based on video status
  useEffect(() => {
    if (video.status === "pending" && selectedDomain) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [video.status, selectedDomain]);

  const resetVideo = () => {
    stopPolling();
    setVideo({ status: "idle", url: null, generatedAt: null, requestId: null });
  };

  const startPolling = () => {
    stopPolling();
    pollCountRef.current = 0;
    pollTimerRef.current = setInterval(() => {
      pollVideoStatus();
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const res = await fetch("/api/integrations/google-search-console/domains");
      const data = await res.json();
      if (data.success && data.domains?.length) {
        const verified = data.domains.filter(
          (d: Domain) => d.gsc_integration?.verification_status === "verified"
        );
        setDomains(verified);
        if (!selectedDomain && verified[0]) {
          setSelectedDomain(verified[0].id);
        }
      }
    } catch (err) {
      console.error("Load domains error:", err);
      toast.error("Failed to load domains");
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadReport = async () => {
    if (!selectedDomain) return;
    try {
      setLoadingReport(true);
      const res = await fetch(
        `/api/reports/strategic-blind-spots?domainId=${selectedDomain}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
        // Restore video state from saved report
        const { videoUrl, videoStatus, videoGeneratedAt } = data.data;
        if (videoStatus === "done" && videoUrl) {
          setVideo({ status: "done", url: videoUrl, generatedAt: videoGeneratedAt, requestId: null });
        } else if (videoStatus === "pending") {
          setVideo({ status: "pending", url: null, generatedAt: null, requestId: null });
        } else if (videoStatus === "failed") {
          setVideo({ status: "failed", url: null, generatedAt: null, requestId: null });
        } else {
          setVideo({ status: "idle", url: null, generatedAt: null, requestId: null });
        }
      } else {
        setReport(null);
        resetVideo();
      }
    } catch (err) {
      console.error("Load report error:", err);
      setReport(null);
      resetVideo();
    } finally {
      setLoadingReport(false);
    }
  };

  const generateReport = async () => {
    if (!selectedDomain) {
      toast.error("Please select a domain");
      return;
    }
    try {
      setGenerating(true);
      resetVideo();
      console.log("[strategic-blind-spots] Regenerating report for domainId:", selectedDomain);
      toast.loading("Discovering what we're ignoring (this may take a few minutes)...", {
        id: "generate-blind-spots",
      });
      const res = await fetch("/api/reports/strategic-blind-spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: selectedDomain }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
        toast.success("Report generated! Generate a video report to visualize your data.", {
          id: "generate-blind-spots",
        });
      } else {
        toast.error(data.error || "Failed to generate report", {
          id: "generate-blind-spots",
        });
      }
    } catch (err) {
      console.error("Generate report error:", err);
      toast.error("Failed to generate report", { id: "generate-blind-spots" });
    } finally {
      setGenerating(false);
    }
  };

  const generateVideoReport = async () => {
    if (!report || !selectedDomain) return;
    try {
      setGeneratingVideo(true);
      toast.loading("Starting video report generation with xAI Aurora...", {
        id: "generate-video",
      });

      const res = await fetch("/api/reports/strategic-blind-spots/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: selectedDomain, reportData: report, language: videoLanguageRef.current }),
      });
      const data = await res.json();

      if (data.success && data.requestId) {
        setVideo({ status: "pending", url: null, generatedAt: null, requestId: data.requestId });
        toast.success(
          "Video generation started! A 15-second video usually takes 2–8 minutes. We'll check automatically.",
          { id: "generate-video", duration: 6000 }
        );
      } else {
        toast.error(data.error || "Failed to start video generation", { id: "generate-video" });
      }
    } catch (err) {
      console.error("Generate video error:", err);
      toast.error("Failed to start video generation", { id: "generate-video" });
    } finally {
      setGeneratingVideo(false);
    }
  };

  const pollVideoStatus = async () => {
    if (!selectedDomain) return;
    pollCountRef.current += 1;
    if (pollCountRef.current > POLL_MAX_COUNT) {
      stopPolling();
      setVideo({ status: "failed", url: null, generatedAt: null, requestId: null });
      toast.error("Video generation is taking too long. Please try again or regenerate.");
      return;
    }
    try {
      const res = await fetch(
        `/api/reports/strategic-blind-spots/video?domainId=${selectedDomain}`
      );
      const data = await res.json();
      if (!data.success) return;

      const v = data.video;
      if (!v) return;

      if (v.status === "done" && v.url) {
        stopPolling();
        setVideo({ status: "done", url: v.url, generatedAt: v.generatedAt, requestId: null });
        toast.success("Video report is ready!", { duration: 5000 });
      } else if (v.status === "failed") {
        stopPolling();
        setVideo({ status: "failed", url: null, generatedAt: null, requestId: null });
        toast.error("Video generation failed. Please try again.");
      }
      // "pending" — keep polling
    } catch (err) {
      console.error("Poll video status error:", err);
    }
  };

  const downloadVideo = async () => {
    if (!video.url) return;
    try {
      const res = await fetch(video.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `blind-spots-video-${report?.domain || "report"}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch {
      // Fallback: open in new tab
      window.open(video.url, "_blank");
    }
  };

  // =====================
  // Chart data transforms
  // =====================

  const top20Data = report?.blindSpots?.slice(0, 20).map((b) => ({
    name: b.query.length > 25 ? b.query.slice(0, 22) + "…" : b.query,
    fullName: b.query,
    score: b.blindSpotScore,
    volume: b.volume,
    priority: b.priority,
  })) ?? [];

  const priorityPieData = report
    ? [
        { name: "High", value: report.blindSpots.filter((b) => b.priority === "high").length, color: PRIORITY_COLORS.high },
        { name: "Medium", value: report.blindSpots.filter((b) => b.priority === "medium").length, color: PRIORITY_COLORS.medium },
        { name: "Low", value: report.blindSpots.filter((b) => b.priority === "low").length, color: PRIORITY_COLORS.low },
      ].filter((d) => d.value > 0)
    : [];

  const aiVisibilityPieData = report
    ? [
        { name: "AI Recommends Us", value: report.blindSpots.filter((b) => b.aiMentions).length, color: "#22c55e" },
        { name: "AI Ignores Us", value: report.blindSpots.filter((b) => !b.aiMentions).length, color: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  const scatterData =
    report?.blindSpots?.map((b) => ({
      x: b.volume,
      y: b.blindSpotScore,
      query: b.query,
      priority: b.priority,
    })) ?? [];

  const demandVsAbsenceData =
    report?.blindSpots?.slice(0, 15).map((b) => ({
      name: b.query.length > 20 ? b.query.slice(0, 17) + "…" : b.query,
      fullName: b.query,
      Demand: b.demandScore,
      Absence: b.absenceScore,
      Score: b.blindSpotScore,
    })) ?? [];

  const priorityBarData = report
    ? [
        { name: "High", count: report.blindSpots.filter((b) => b.priority === "high").length, color: PRIORITY_COLORS.high },
        { name: "Medium", count: report.blindSpots.filter((b) => b.priority === "medium").length, color: PRIORITY_COLORS.medium },
        { name: "Low", count: report.blindSpots.filter((b) => b.priority === "low").length, color: PRIORITY_COLORS.low },
      ].filter((d) => d.count > 0)
    : [];

  const perLlmBarData =
    report?.summary?.perLlmStats && Object.keys(report.summary.perLlmStats).length > 0
      ? Object.entries(report.summary.perLlmStats).map(([key, stats]) => ({
          name: LLM_LABELS[key] || key,
          key,
          mentioned: stats.mentioned,
          total: stats.total,
          pct: stats.pct,
          notMentioned: stats.total - stats.mentioned,
          color: LLM_COLORS[key] || "#6366f1",
        }))
      : [];

  // =====================
  // RENDER
  // =====================

  if (loadingDomains) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
          <p className="text-gray-600 mb-4">
            Add and verify a domain in Google Search Console to discover what you&apos;re ignoring.
          </p>
          <a
            href="/dashboard/google-search-console"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Add Domain
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <EyeOff className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">What Are We Ignoring?</h1>
        </div>
        <p className="text-gray-600">
          Strategic blindness: topics people are actively searching for — but where we have zero presence. This report reveals what we&apos;re ignoring in content, SEO, and AI visibility.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.gsc_integration?.domain_url || d.domain}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={!selectedDomain || loadingReport}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReport ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={!selectedDomain || generating}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Brain className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
              {report ? "Regenerate Report" : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {selectedDomain && !report && !loadingReport && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <EyeOff className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">What Are We Ignoring?</h3>
          <p className="text-gray-600 mb-6">
            Generate a report to discover topics with demand that we&apos;re ignoring — where customers are searching but we have no presence.
          </p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className="w-5 h-5" />
            Generate Report
          </button>
        </div>
      )}

      {report && (
        <>
          {/* ========== VIDEO REPORT SECTION ========== */}
          <div className="mb-6">
            {video.status === "idle" && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Video Report</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Generate an AI-powered video presentation of this report — all charts, data, and insights visualized with professional animations, powered by xAI Aurora.
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <select
                    value={videoLanguage}
                    onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }}
                    disabled={generatingVideo}
                    className="px-3 py-2.5 border border-violet-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]"
                    title="Video language"
                  >
                    {VIDEO_LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={generateVideoReport}
                    disabled={generatingVideo}
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium text-sm whitespace-nowrap"
                  >
                    <Play className="w-4 h-4" />
                    Generate Video Report
                  </button>
                </div>
              </div>
            )}

            {video.status === "pending" && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">Generating Video Report…</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      xAI Aurora is rendering your 15-second professional video with all charts and data. This typically takes <strong>2–8 minutes</strong>. We&apos;re checking automatically every 12 seconds.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-violet-600">Scenes being rendered with all your data</span>
                    </div>
                  </div>
                  <button
                    onClick={pollVideoStatus}
                    className="flex-shrink-0 px-4 py-2 bg-white text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 flex items-center gap-2 text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Now
                  </button>
                </div>
              </div>
            )}

            {video.status === "failed" && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">Video Generation Failed</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    The video generation request expired or failed. Please try again.
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <select
                    value={videoLanguage}
                    onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }}
                    disabled={generatingVideo}
                    className="px-3 py-2 border border-red-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]"
                    title="Video language"
                  >
                    {VIDEO_LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={generateVideoReport}
                    disabled={generatingVideo}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {video.status === "done" && video.url && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Video Report</h3>
                      {video.generatedAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Generated {new Date(video.generatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowVideoModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 flex items-center gap-2 text-sm font-medium"
                    >
                      <Play className="w-4 h-4" />
                      Preview Video
                    </button>
                    <select
                      value={videoLanguage}
                      onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }}
                      disabled={generatingVideo}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[100px]"
                      title="Video language for regeneration"
                    >
                      {VIDEO_LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={generateVideoReport}
                      disabled={generatingVideo}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={downloadVideo}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Video Preview Modal */}
            {showVideoModal && video.url && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                onClick={() => setShowVideoModal(false)}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Video Report</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadVideo}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => setShowVideoModal(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 bg-gray-950 flex items-center justify-center p-4">
                    <video
                      src={video.url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[calc(90vh-80px)]"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Executive Answer: What Are We Missing? (LLMs don't mention us) */}
          {(() => {
            const llmNotMentioned = report.blindSpots?.filter((b) => !b.aiMentions) ?? [];
            return llmNotMentioned.length > 0 ? (
              <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-orange-600" />
                  What Are We Missing?
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  Topics with customer demand where LLMs do not mention us — AI visibility gaps to address.
                </p>
                <ol className="space-y-2">
                  {llmNotMentioned.slice(0, 10).map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-semibold flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900">{b.query}</span>
                        <span className="text-gray-600 ml-2">
                          — {b.volume.toLocaleString()} searches, score {b.blindSpotScore.toFixed(1)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null;
          })()}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-sm border border-amber-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700">Topics We&apos;re Ignoring</span>
                <EyeOff className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-amber-900">{report.summary.totalBlindSpots}</div>
              <p className="text-xs text-amber-600 mt-1">Demand exists, we have no presence</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">How Much We&apos;re Ignoring</span>
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900">{report.summary.avgBlindSpotScore.toFixed(1)}</div>
              <p className="text-xs text-blue-600 mt-1">Higher = more urgent to address</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700">AI Queries We&apos;re Ignoring</span>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-900">{report.summary.aiBlindSpotPct}%</div>
              <p className="text-xs text-red-600 mt-1">High-demand where AI doesn&apos;t mention us</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">High Priority Urgent</span>
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {report.blindSpots?.filter((b) => b.priority === "high").length ?? 0}
              </div>
              <p className="text-xs text-purple-600 mt-1">Topics to address first</p>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
            <span><strong>Domain:</strong> {report.domain}</span>
            <span><strong>Generated:</strong> {new Date(report.generatedAt).toLocaleString()}</span>
            {report.enginesUsed?.length > 0 && (
              <span><strong>Engines:</strong> {report.enginesUsed.join(", ")}</span>
            )}
          </div>

          {/* Per LLM Analytics */}
          {perLlmBarData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Per LLM Analytics</h3>
              <p className="text-sm text-gray-600 mb-4">
                How often each LLM mentions us across the topics we&apos;re ignoring. Lower = more visibility gap with that model.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Mention Rate by LLM</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={perLlmBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={90} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                        formatter={(value: number, name: string, props: any) => [
                          `${value}% (${props.payload.mentioned}/${props.payload.total} topics)`,
                          "Mention %",
                        ]}
                      />
                      <Bar dataKey="pct" name="Mention %" radius={[0, 4, 4, 0]}>
                        {perLlmBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Mention Summary</h4>
                  <div className="space-y-3">
                    {perLlmBarData.map((entry) => (
                      <div key={entry.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="font-medium text-gray-900">{entry.name}</span>
                        </div>
                        <div className="text-right text-sm">
                          <span className="text-gray-600">
                            {entry.mentioned} / {entry.total} topics
                          </span>
                          <span
                            className="ml-2 font-semibold"
                            style={{ color: entry.pct === 0 ? "#ef4444" : entry.pct < 30 ? "#f97316" : "#22c55e" }}
                          >
                            {entry.pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {report.blindSpots?.some((b) => b.llmMentions) && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Per Topic: Which LLMs Mention Us</h4>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-700">Topic</th>
                          {report.enginesUsed?.map((key) => (
                            <th key={key} className="text-center p-2 font-medium text-gray-700" title={LLM_LABELS[key] || key}>
                              {LLM_LABELS[key] || key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.blindSpots.slice(0, 15).map((b, i) => (
                          <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="p-2 max-w-[200px] truncate text-gray-900" title={b.query}>
                              {b.query}
                            </td>
                            {report.enginesUsed?.map((key) => (
                              <td key={key} className="p-2 text-center">
                                {b.llmMentions && key in b.llmMentions ? (
                                  b.llmMentions[key] ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 inline" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-400 inline" />
                                  )
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top 20 We're Ignoring */}
          {top20Data.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Top 20 Topics We&apos;re Ignoring</h3>
              <p className="text-sm text-gray-600 mb-4">Highest-priority topics with demand that we have no presence in</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={top20Data} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                    formatter={(value: number) => [value.toFixed(1), "Score"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  />
                  <Bar dataKey="score" name="Ignore Score" radius={[0, 4, 4, 0]}>
                    {top20Data.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charts Row: Priority Distribution + AI Visibility + Priority Count */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {priorityPieData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What We&apos;re Ignoring by Urgency</h3>
                <p className="text-sm text-gray-600 mb-4">How many topics we ignore at each priority level</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={priorityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {priorityPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {aiVisibilityPieData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI: What We&apos;re Ignoring</h3>
                <p className="text-sm text-gray-600 mb-4">Topics where AI mentions us vs. where AI ignores us</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={aiVisibilityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {aiVisibilityPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {priorityBarData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ignored Topics by Urgency</h3>
                <p className="text-sm text-gray-600 mb-4">How many high / medium / low priority topics we&apos;re ignoring</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={priorityBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={70} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {priorityBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Charts Row: Scatter + Demand vs Absence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {scatterData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What We&apos;re Ignoring: Demand vs Impact</h3>
                <p className="text-sm text-gray-600 mb-4">Each point = topic. Top-right = high demand + high impact — most urgent to stop ignoring.</p>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="x" name="Volume (Impressions)" type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                    <YAxis dataKey="y" name="Ignore Score" type="number" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", maxWidth: 300 }}
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as { query: string; x: number; y: number; priority: string };
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
                            <div className="font-medium truncate max-w-[250px]">{p.query}</div>
                            <div>Volume: {p.x.toLocaleString()}</div>
                            <div>Ignore Score: {p.y.toFixed(1)}</div>
                            <div>Priority: {p.priority}</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatterData} fill="#6366f1" fillOpacity={0.6}>
                      {scatterData.map((entry, i) => (
                        <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || "#6366f1"} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            {demandVsAbsenceData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Why We&apos;re Ignoring (Top 15)</h3>
                <p className="text-sm text-gray-600 mb-4">Demand (customer interest) vs. Absence (our lack of presence) — what drives each ignored topic</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={demandVsAbsenceData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 10]} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                      formatter={(value: number) => [value.toFixed(1), ""]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                    />
                    <Legend />
                    <Bar dataKey="Demand" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Absence" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Full List: What We're Ignoring */}
          {report.blindSpots?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-gray-200">Complete List: What We&apos;re Ignoring</h3>
              <p className="text-sm text-gray-600 px-4 pb-3">
                Per-LLM mention status: ✓ = mentions us, ✗ = ignores us
              </p>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700">Topic We&apos;re Ignoring</th>
                      <th className="text-right p-3 font-medium text-gray-700">Search Volume</th>
                      <th className="text-right p-3 font-medium text-gray-700">Our Position</th>
                      {(report.enginesUsed?.length
                        ? report.enginesUsed
                        : ["chatgpt", "gemini", "perplexity", "claude", "grok"]
                      ).map((key) => (
                        <th key={key} className="text-center p-2 font-medium text-gray-700" title={LLM_LABELS[key] || key}>
                          {LLM_LABELS[key] || key}
                        </th>
                      ))}
                      <th className="text-right p-3 font-medium text-gray-700">Ignore Score</th>
                      <th className="text-left p-3 font-medium text-gray-700">Urgency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.blindSpots.map((b, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 max-w-[280px] truncate text-gray-900" title={b.query}>
                          {b.query}
                        </td>
                        <td className="p-3 text-right text-gray-600">{b.volume.toLocaleString()}</td>
                        <td className="p-3 text-right text-gray-600">
                          {b.avgPosition > 0 ? b.avgPosition.toFixed(1) : "—"}
                        </td>
                        {(report.enginesUsed?.length
                          ? report.enginesUsed
                          : ["chatgpt", "gemini", "perplexity", "claude", "grok"]
                        ).map((key) => (
                          <td key={key} className="p-2 text-center">
                            {b.llmMentions && key in b.llmMentions ? (
                              b.llmMentions[key] ? (
                                <CheckCircle className="w-5 h-5 text-green-500 inline" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 inline" />
                              )
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="p-3 text-right font-medium">{b.blindSpotScore.toFixed(1)}</td>
                        <td className="p-3">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${PRIORITY_COLORS[b.priority] || "#94a3b8"}20`,
                              color: PRIORITY_COLORS[b.priority] || "#64748b",
                            }}
                          >
                            {b.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
