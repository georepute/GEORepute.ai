"use client";

import { useEffect, useState, useCallback } from "react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Trophy,
  RefreshCw,
  Brain,
  Search,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Globe,
  Star,
  AlertCircle,
  CheckCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Constants ────────────────────────────────────────────────────────────────

const ENGINE_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  claude: "#8b5cf6",
  gemini: "#4285f4",
  perplexity: "#00b4d8",
  grok: "#f97316",
};

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
  grok: "Grok",
};

const CHART_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

// ── Types ────────────────────────────────────────────────────────────────────

interface EngineBreakdown {
  engine: string;
  label: string;
  totalQueries: number;
  mentions: number;
  mentionSharePct: number;
  weightedScore: number;
  recommendations: number;
}

interface IntentBucket {
  queries: number;
  mentions: number;
}

interface GscQuery {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}

interface Report {
  brand_name: string;
  domain: string;
  ai_mention_share_pct: number;
  ai_recommendation_share_pct: number;
  weighted_ai_share_pct: number;
  organic_share_pct: number;
  market_share_score: number;
  is_default_leader: boolean;
  total_ai_queries: number;
  total_ai_mentions: number;
  total_recommendations: number;
  total_gsc_queries: number;
  top10_count: number;
  top3_count?: number; // deprecated, use top10_count
  total_impressions: number;
  gsc_queries?: GscQuery[];
  engine_breakdown: EngineBreakdown[];
  intent_breakdown: { commercial: IntentBucket; comparison: IntentBucket; informational: IntentBucket };
  generated_at: string;
}

interface DomainOption {
  id: string;
  domain: string;
  projectId: string | null;
  brandName: string | null;
  hasAiData: boolean;
  hasGscData: boolean;
  isGscVerified: boolean;
  missingRequirements: string[];
  report: Report | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 60) return "text-emerald-600";
  if (score >= 35) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(score: number): string {
  if (score >= 60) return "bg-emerald-50 border-emerald-200";
  if (score >= 35) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

function scoreLabel(score: number): string {
  if (score >= 60) return "Dominant";
  if (score >= 35) return "Default Leader";
  if (score >= 20) return "Competitive";
  return "Low Visibility";
}

// ── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-gray-800 mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex gap-2">
          <span>{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}%</span>
        </p>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MarketShareOfAttentionPage() {
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "engines" | "organic" | "intent">("overview");

  const selectedDomain = domains.find(d => d.id === selectedDomainId);
  const canGenerate = selectedDomain?.isGscVerified && selectedDomain?.projectId && selectedDomain?.hasAiData && selectedDomain?.hasGscData;

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async (domainId?: string) => {
    try {
      setLoading(true);
      const url = domainId
        ? `/api/reports/market-share-of-attention?domainId=${encodeURIComponent(domainId)}`
        : "/api/reports/market-share-of-attention";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const doms = data.data?.domains || [];
        setDomains(doms);
        const sel = domainId || (doms[0]?.id ?? "");
        setSelectedDomainId((prev) => (doms.length && !prev ? sel : prev));
        setReport(data.data?.report ?? doms.find((d: DomainOption) => d.id === sel)?.report ?? null);
      }
    } catch {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDomainChange = useCallback((domainId: string) => {
    setSelectedDomainId(domainId);
    const d = domains.find((x) => x.id === domainId);
    setReport(d?.report ?? null);
  }, [domains]);

  const generateReport = async () => {
    if (!selectedDomainId || !canGenerate) return;
    try {
      setGenerating(true);
      toast.loading("Analysing AI engines & organic data…", { id: "msa-gen" });
      const res = await fetch("/api/reports/market-share-of-attention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: selectedDomainId }),
      });
      const data = await res.json();
      toast.dismiss("msa-gen");
      if (data.success) {
        setReport(data.data?.report || null);
        toast.success("Market Share of Attention report generated!");
        loadData(selectedDomainId);
      } else {
        toast.error(data.error || "Failed to generate report");
      }
    } catch {
      toast.dismiss("msa-gen");
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // ── Chart data ────────────────────────────────────────────────────────────

  const dominancePieData = report
    ? [
        { name: "AI Mention Share", value: report.ai_mention_share_pct, color: "#0ea5e9" },
        { name: "Organic Proxy Share", value: report.organic_share_pct, color: "#10b981" },
        { name: "Uncaptured Attention", value: Math.max(0, 100 - report.market_share_score), color: "#e5e7eb" },
      ]
    : [];

  const aiVsOrganicBarData = report
    ? [
        {
          name: report.brand_name,
          "AI Mention Share": report.ai_mention_share_pct,
          "AI Recommendation Share": report.ai_recommendation_share_pct,
          "Organic Proxy Share": report.organic_share_pct,
          "Weighted AI Share": report.weighted_ai_share_pct,
        },
      ]
    : [];

  const engineRadarData = report?.engine_breakdown?.map(e => ({
    engine: e.label,
    "Mention Rate": e.mentionSharePct,
    "Recommendation Rate": e.totalQueries > 0 ? Math.round((e.recommendations / e.totalQueries) * 100) : 0,
  })) || [];

  const intentBarData = report
    ? [
        {
          intent: "Commercial",
          queries: report.intent_breakdown.commercial.queries,
          mentions: report.intent_breakdown.commercial.mentions,
          rate: report.intent_breakdown.commercial.queries > 0
            ? Math.round((report.intent_breakdown.commercial.mentions / report.intent_breakdown.commercial.queries) * 100)
            : 0,
        },
        {
          intent: "Comparison",
          queries: report.intent_breakdown.comparison.queries,
          mentions: report.intent_breakdown.comparison.mentions,
          rate: report.intent_breakdown.comparison.queries > 0
            ? Math.round((report.intent_breakdown.comparison.mentions / report.intent_breakdown.comparison.queries) * 100)
            : 0,
        },
        {
          intent: "Informational",
          queries: report.intent_breakdown.informational.queries,
          mentions: report.intent_breakdown.informational.mentions,
          rate: report.intent_breakdown.informational.queries > 0
            ? Math.round((report.intent_breakdown.informational.mentions / report.intent_breakdown.informational.queries) * 100)
            : 0,
        },
      ]
    : [];

  const overviewMetricsBarData = report
    ? [
        { metric: "AI Mention Share", value: report.ai_mention_share_pct, fill: "#0ea5e9" },
        { metric: "AI Recommendation Share", value: report.ai_recommendation_share_pct, fill: "#8b5cf6" },
        { metric: "Weighted AI Share", value: report.weighted_ai_share_pct, fill: "#f59e0b" },
        { metric: "Organic Proxy Share", value: report.organic_share_pct, fill: "#10b981" },
      ]
    : [];

  const engineMentionsBarData = report?.engine_breakdown?.map(e => ({
    engine: e.label,
    mentions: e.mentions,
    totalQueries: e.totalQueries,
    recommendations: e.recommendations,
    fill: ENGINE_COLORS[e.engine] || "#6b7280",
  })) || [];

  const topGscQueriesBarData = (report?.gsc_queries || []).slice(0, 10).map(q => ({
    query: q.query.length > 25 ? q.query.slice(0, 22) + "…" : q.query,
    impressions: q.impressions,
    clicks: q.clicks,
    position: q.position,
  }));

  const intentPieData = intentBarData.map(d => ({
    name: d.intent,
    value: d.queries,
    fill: d.intent === "Commercial" ? "#10b981" : d.intent === "Comparison" ? "#8b5cf6" : "#0ea5e9",
  })).filter(d => d.value > 0);

  const aiMentionPieData = report && report.total_ai_queries > 0
    ? [
        { name: "Mentioned", value: report.total_ai_mentions, fill: "#10b981" },
        { name: "Not Mentioned", value: report.total_ai_queries - report.total_ai_mentions, fill: "#e5e7eb" },
      ].filter(d => d.value > 0)
    : [];

  // ── Empty / loading states ────────────────────────────────────────────────

  if (loading && !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading report…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Market Share of Attention</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Who dominates AI search perception in your category — not just traffic, but <em>mindshare</em>.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Domain selector */}
          {domains.length > 0 && (
            <div className="relative">
              <select
                value={selectedDomainId}
                onChange={e => handleDomainChange(e.target.value)}
                className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none"
              >
                {domains.map(d => (
                  <option key={d.id} value={d.id}>{d.domain}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={generating || !canGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Analysing…" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* ── Missing requirements banner ── */}
      {selectedDomainId && selectedDomain && !canGenerate && (
        <div className="flex flex-wrap gap-3">
          {(!selectedDomain.isGscVerified || !selectedDomain.hasGscData) && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800">No GSC verified</span>
              <a
                href="/dashboard/google-search-console"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Verify
              </a>
            </div>
          )}
          {(!selectedDomain.projectId || !selectedDomain.hasAiData) && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800">No AI visibility analysis</span>
              <a
                href="/dashboard/ai-visibility"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Run Analysis
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── No data banner ── */}
      {!report && !generating && canGenerate && (
        <div className="bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Report Yet</h2>
          <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed mb-6">
            Generate your Market Share of Attention report to discover how often AI engines mention and recommend your brand compared to all competitors in your category.
          </p>
          <button
            onClick={generateReport}
            disabled={generating || !canGenerate}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            Generate Now
          </button>
        </div>
      )}

      {/* ── No domains banner ── */}
      {domains.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">No domains found</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Add domains in Domain Management or Google Search Console first. Then create an AI Visibility project linked to that domain.
            </p>
          </div>
        </div>
      )}

      {/* ── Report body ── */}
      {report && (
        <>
          {/* Default Leader badge */}
          {report.is_default_leader && (
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 flex items-center gap-3 text-white shadow-md">
              <Star className="w-7 h-7 flex-shrink-0 fill-white" />
              <div>
                <p className="font-bold text-lg leading-tight">Default Leader in AI Search</p>
                <p className="text-sm opacity-90">
                  <strong>{report.brand_name}</strong> achieves {report.market_share_score.toFixed(1)}% Market Share of Attention — framed as the obvious choice by AI engines.
                </p>
              </div>
            </div>
          )}

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<Trophy className="w-5 h-5" />}
              iconBg="from-primary-500 to-purple-600"
              label="Market Share of Attention"
              value={`${report.market_share_score.toFixed(1)}%`}
              badge={scoreLabel(report.market_share_score)}
              badgeClass={`text-xs font-semibold px-2 py-0.5 rounded-full ${report.market_share_score >= 35 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
              sub={`AI 60% + Organic 40%`}
            />
            <KpiCard
              icon={<Brain className="w-5 h-5" />}
              iconBg="from-blue-500 to-cyan-500"
              label="AI Mention Share"
              value={`${report.ai_mention_share_pct.toFixed(1)}%`}
              badge={`${report.total_ai_mentions} / ${report.total_ai_queries} queries`}
              badgeClass="text-xs text-gray-500"
              sub="Across all AI engines"
            />
            <KpiCard
              icon={<Target className="w-5 h-5" />}
              iconBg="from-violet-500 to-purple-600"
              label="AI Recommendation Share"
              value={`${report.ai_recommendation_share_pct.toFixed(1)}%`}
              badge={`${report.total_recommendations} recommendations`}
              badgeClass="text-xs text-gray-500"
              sub="Best / Top / Leading tags"
            />
            <KpiCard
              icon={<Search className="w-5 h-5" />}
              iconBg="from-emerald-500 to-teal-600"
              label="Organic Proxy Share"
              value={`${report.organic_share_pct.toFixed(1)}%`}
              badge={`${(report.top10_count ?? report.top3_count ?? 0)} top-10 rankings`}
              badgeClass="text-xs text-gray-500"
              sub="Impression-weighted GSC share"
            />
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            {(["overview", "engines", "organic", "intent"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "engines" ? "AI Engines" : tab === "organic" ? "Organic" : "Query Intent"}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Dominance Pie */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Attention Dominance Split</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">How your brand captures attention across AI + Organic</p>
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0" style={{ width: 220, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dominancePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dominancePieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {dominancePieData.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{entry.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI vs Organic Bar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI vs Organic Breakdown</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Share percentages across all dimensions</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={aiVsOrganicBarData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="AI Mention Share" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="AI Recommendation Share" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Weighted AI Share" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Organic Proxy Share" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* AI Mention split pie */}
              {aiMentionPieData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">AI Queries: Mentioned vs Not Mentioned</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Brand mention distribution across all AI queries</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={aiMentionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {aiMentionPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} queries`, "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Overview metrics horizontal bar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">All Share Metrics</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Comparison of all available share percentages</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={overviewMetricsBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="metric" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Value"]} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {overviewMetricsBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── AI ENGINES TAB ── */}
          {activeTab === "engines" && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Engine mention share table */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Per-Engine Mention Share</h3>
                </div>
                {report.engine_breakdown.length === 0 ? (
                  <EmptyEngineState />
                ) : (
                  <div className="space-y-3">
                    {report.engine_breakdown.map(eng => (
                      <div key={eng.engine} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ENGINE_COLORS[eng.engine] || "#6b7280" }}
                        />
                        <span className="text-sm font-medium text-gray-800 w-24">{eng.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, eng.mentionSharePct)}%`,
                              backgroundColor: ENGINE_COLORS[eng.engine] || "#6b7280",
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                          {eng.mentionSharePct.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400 w-20 text-right">
                          {eng.mentions}/{eng.totalQueries} queries
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Radar chart */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI Engine Radar</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Mention rate vs recommendation rate per engine</p>
                {engineRadarData.length === 0 ? (
                  <EmptyEngineState />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={engineRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="engine" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Mention Rate" dataKey="Mention Rate" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                      <Radar name="Recommendation Rate" dataKey="Recommendation Rate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Engine mentions bar chart */}
              {engineMentionsBarData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Mentions by Engine</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Brand mentions per AI engine</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={engineMentionsBarData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="engine" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="mentions" name="Mentions" radius={[4, 4, 0, 0]}>
                        {engineMentionsBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Engine recommendations bar chart */}
              {engineMentionsBarData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-amber-600" />
                    <h3 className="font-semibold text-gray-900">Recommendations by Engine</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Best / Top / Leading mentions per engine</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={engineMentionsBarData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="engine" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="recommendations" name="Recommendations" radius={[4, 4, 0, 0]}>
                        {engineMentionsBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Engine breakdown cards */}
              {report.engine_breakdown.length > 0 && (
                <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {report.engine_breakdown.map(eng => (
                    <div key={eng.engine} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <div
                        className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: ENGINE_COLORS[eng.engine] || "#6b7280" }}
                      >
                        {eng.label[0]}
                      </div>
                      <p className="text-xs font-medium text-gray-600">{eng.label}</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{eng.mentionSharePct.toFixed(0)}%</p>
                      <p className="text-xs text-gray-400">mention share</p>
                      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        {eng.recommendations} recommendation{eng.recommendations !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ORGANIC TAB ── */}
          {activeTab === "organic" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Organic Proxy Share Metrics</h3>
                </div>
                <div className="space-y-4">
                  <MetricRow
                    label="Top-10 Ranking Frequency"
                    value={`${report.top10_count ?? report.top3_count ?? 0} queries`}
                    sub={`out of ${report.total_gsc_queries} total GSC queries`}
                    color="text-emerald-600"
                  />
                  <MetricRow
                    label="Impression-Weighted Share"
                    value={`${report.organic_share_pct.toFixed(1)}%`}
                    sub={`${report.total_impressions.toLocaleString()} total impressions tracked`}
                    color="text-blue-600"
                  />
                  <MetricRow
                    label="Organic Contribution to Score"
                    value={`${(report.organic_share_pct * 0.4).toFixed(1)}%`}
                    sub="40% weight in final formula"
                    color="text-purple-600"
                  />
                </div>
                {report.total_gsc_queries === 0 && (
                  <div className="mt-4 flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      No Google Search Console data found. Connect your domain to GSC in the Assets Hub to unlock organic proxy data.
                    </p>
                  </div>
                )}
                {report.gsc_queries && report.gsc_queries.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">GSC Queries</h4>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-3 py-2 font-medium text-gray-600">Query</th>
                            <th className="px-3 py-2 font-medium text-gray-600 text-right">Impressions</th>
                            <th className="px-3 py-2 font-medium text-gray-600 text-right">Clicks</th>
                            <th className="px-3 py-2 font-medium text-gray-600 text-right">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.gsc_queries.map((q, i) => (
                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                              <td className="px-3 py-2 text-gray-900">{q.query}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{q.impressions.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{q.clicks.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{q.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Organic vs AI Share</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">How organic search contributes to total attention</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={[
                      { channel: "AI Share (60%)", share: report.ai_mention_share_pct, fill: "#0ea5e9" },
                      { channel: "Organic Share (40%)", share: report.organic_share_pct, fill: "#10b981" },
                      { channel: "Combined Score", share: report.market_share_score, fill: "#8b5cf6" },
                    ]}
                    barCategoryGap="40%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="share" radius={[6, 6, 0, 0]}>
                      {[
                        { fill: "#0ea5e9" },
                        { fill: "#10b981" },
                        { fill: "#8b5cf6" },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top GSC queries by impressions */}
              {topGscQueriesBarData.length > 0 && (
                <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Top Queries by Impressions</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Top 10 GSC queries with highest impressions</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topGscQueriesBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="query" width={180} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="impressions" name="Impressions" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* GSC clicks vs impressions for top queries */}
              {topGscQueriesBarData.length > 0 && (
                <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Clicks vs Impressions (Top Queries)</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Compare clicks and impressions for top-performing queries</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topGscQueriesBarData} barCategoryGap="15%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="query" tick={{ fontSize: 9 }} angle={-12} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="impressions" name="Impressions" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="clicks" name="Clicks" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── INTENT TAB ── */}
          {activeTab === "intent" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Mention Rate by Query Intent</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">How often your brand is mentioned for each type of query</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={intentBarData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="intent" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="rate" name="Mention Rate %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Queries vs Mentions by Intent</h3>
                </div>
                <div className="space-y-4">
                  {intentBarData.map(row => (
                    <div key={row.intent}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{row.intent}</span>
                        <span className="text-xs text-gray-500">{row.mentions}/{row.queries} mentioned</span>
                      </div>
                      <div className="relative bg-gray-100 rounded-full h-3">
                        <div
                          className="absolute left-0 top-0 h-3 rounded-full bg-primary-400 transition-all"
                          style={{ width: `${Math.min(100, row.queries > 0 ? (row.queries / Math.max(...intentBarData.map(r => r.queries))) * 100 : 0)}%` }}
                        />
                        <div
                          className="absolute left-0 top-0 h-3 rounded-full bg-primary-600 transition-all"
                          style={{ width: `${Math.min(100, row.queries > 0 ? (row.mentions / Math.max(...intentBarData.map(r => r.queries))) * 100 : 0)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{row.rate}% mention rate</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Intent Strategy</p>
                  <IntentInsight data={intentBarData} />
                </div>
              </div>

              {/* Query distribution by intent pie */}
              {intentPieData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">Query Distribution by Intent</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Share of queries per intent type</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={intentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {intentPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => {
                        const total = intentBarData.reduce((s, d) => s + d.queries, 0);
                        return [`${v} queries${total > 0 ? ` (${((v / total) * 100).toFixed(1)}%)` : ""}`, name];
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Mentions vs Missed by intent stacked bar */}
              {intentBarData.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Mentions vs Missed by Intent</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Brand mentions vs missed opportunities per intent</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={intentBarData.map(d => ({
                        ...d,
                        missed: d.queries - d.mentions,
                      }))}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="intent" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="mentions" name="Mentioned" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} />
                      <Bar dataKey="missed" name="Missed" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {report.generated_at && (
            <p className="text-xs text-gray-400 text-center">
              Report generated: {new Date(report.generated_at).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  badge,
  badgeClass,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  badge: string;
  badgeClass: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 bg-gradient-to-br ${iconBg} rounded-xl text-white`}>{icon}</div>
        <span className={badgeClass}>{badge}</span>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      <p className={`text-lg font-bold ${color} flex-shrink-0`}>{value}</p>
    </div>
  );
}

function EmptyEngineState() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
      <Brain className="w-10 h-10 mb-2 opacity-30" />
      <p className="text-sm">No AI engine data yet.</p>
      <p className="text-xs mt-1">Run AI Visibility analysis to populate engine data.</p>
    </div>
  );
}

function IntentInsight({ data }: { data: { intent: string; rate: number }[] }) {
  const sorted = [...data].sort((a, b) => b.rate - a.rate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (!best) return null;
  return (
    <div className="space-y-2">
      {best.rate > 0 && (
        <div className="flex gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            <strong>{best.intent}</strong> queries have the highest mention rate ({best.rate}%). Your brand is well-positioned here.
          </p>
        </div>
      )}
      {worst.rate < best.rate && worst.rate < 30 && (
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            <strong>{worst.intent}</strong> queries show a low mention rate ({worst.rate}%). Consider creating more content targeting {worst.intent.toLowerCase()} searches.
          </p>
        </div>
      )}
    </div>
  );
}
