"use client";

import { useEffect, useState } from "react";
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
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Brain,
  Search,
  Globe,
  Target,
  CheckCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: { domain_url?: string; verification_status?: string } | null;
}

interface GapQuery {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  googleScore: number;
  aiScore: number;
  gapScore: number;
  band: string;
  bandLabel: string;
}

interface ReportSummary {
  totalQueries: number;
  avgGapScore: number;
  aiRisk: number;
  moderateGap: number;
  balanced: number;
  seoOpportunity: number;
  seoFailure: number;
}

interface ReportData {
  id?: string;
  domain: string;
  queries: GapQuery[];
  summary: ReportSummary;
  enginesUsed: string[];
  generatedAt: string;
}

const BAND_COLORS: Record<string, string> = {
  ai_risk: "#ef4444",
  moderate_gap: "#f97316",
  balanced: "#22c55e",
  seo_opportunity: "#3b82f6",
  seo_failure: "#8b5cf6",
};

const BAND_LABELS: Record<string, string> = {
  ai_risk: "SEO Strong, AI Weak",
  moderate_gap: "Moderate AI Gap",
  balanced: "Balanced",
  seo_opportunity: "AI Strong, SEO Weak",
  seo_failure: "SEO Failure",
};

export default function AiVsGoogleGapPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadReport();
    } else {
      setReport(null);
    }
  }, [selectedDomain]);

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
        `/api/reports/ai-vs-google-gap?domainId=${selectedDomain}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error("Load report error:", err);
      setReport(null);
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
      toast.loading("Generating AI vs Google gap report (this may take a few minutes)...", {
        id: "generate-gap",
      });
      const res = await fetch("/api/reports/ai-vs-google-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: selectedDomain }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
        toast.success("Report generated successfully!", { id: "generate-gap" });
      } else {
        toast.error(data.error || "Failed to generate report", {
          id: "generate-gap",
        });
      }
    } catch (err) {
      console.error("Generate report error:", err);
      toast.error("Failed to generate report", { id: "generate-gap" });
    } finally {
      setGenerating(false);
    }
  };

  // Chart data
  const pieData = report
    ? [
        { name: BAND_LABELS.ai_risk, value: report.summary.aiRisk, color: BAND_COLORS.ai_risk },
        { name: BAND_LABELS.moderate_gap, value: report.summary.moderateGap, color: BAND_COLORS.moderate_gap },
        { name: BAND_LABELS.balanced, value: report.summary.balanced, color: BAND_COLORS.balanced },
        { name: BAND_LABELS.seo_opportunity, value: report.summary.seoOpportunity, color: BAND_COLORS.seo_opportunity },
        { name: BAND_LABELS.seo_failure, value: report.summary.seoFailure, color: BAND_COLORS.seo_failure },
      ].filter((d) => d.value > 0)
    : [];

  const bandBarData = report
    ? [
        { name: "AI Risk", count: report.summary.aiRisk, color: BAND_COLORS.ai_risk },
        { name: "Moderate Gap", count: report.summary.moderateGap, color: BAND_COLORS.moderate_gap },
        { name: "Balanced", count: report.summary.balanced, color: BAND_COLORS.balanced },
        { name: "SEO Opp.", count: report.summary.seoOpportunity, color: BAND_COLORS.seo_opportunity },
        { name: "SEO Failure", count: report.summary.seoFailure, color: BAND_COLORS.seo_failure },
      ].filter((d) => d.count > 0)
    : [];

  const googleVsAiBarData =
    report?.queries?.slice(0, 15).map((q) => ({
      name: q.query.length > 22 ? q.query.slice(0, 19) + "…" : q.query,
      fullName: q.query,
      Google: q.googleScore,
      AI: q.aiScore,
      gap: q.gapScore,
    })) ?? [];

  const topAiRiskData =
    report?.queries
      ?.filter((q) => q.band === "ai_risk")
      .sort((a, b) => b.gapScore - a.gapScore)
      .slice(0, 10)
      .map((q) => ({
        name: q.query.length > 22 ? q.query.slice(0, 19) + "…" : q.query,
        fullName: q.query,
        gap: q.gapScore,
        impressions: q.impressions,
      })) ?? [];

  const topSeoOppData =
    report?.queries
      ?.filter((q) => q.band === "seo_opportunity" || q.band === "seo_failure")
      .sort((a, b) => a.gapScore - b.gapScore)
      .slice(0, 10)
      .map((q) => ({
        name: q.query.length > 22 ? q.query.slice(0, 19) + "…" : q.query,
        fullName: q.query,
        gap: q.gapScore,
        impressions: q.impressions,
      })) ?? [];

  const scatterData =
    report?.queries?.map((q) => ({
      x: q.impressions,
      y: q.gapScore,
      query: q.query,
      band: q.band,
    })) ?? [];

  const avgByBandData = report
    ? (["ai_risk", "moderate_gap", "balanced", "seo_opportunity", "seo_failure"] as const)
        .map((band) => {
          const bandQueries = report.queries.filter((q) => q.band === band);
          if (bandQueries.length === 0) return null;
          const avgGoogle = bandQueries.reduce((s, q) => s + q.googleScore, 0) / bandQueries.length;
          const avgAi = bandQueries.reduce((s, q) => s + q.aiScore, 0) / bandQueries.length;
          return {
            name: (BAND_LABELS[band] || band).slice(0, 14),
            fullName: BAND_LABELS[band] || band,
            Google: Math.round(avgGoogle * 10) / 10,
            AI: Math.round(avgAi * 10) / 10,
            count: bandQueries.length,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
    : [];

  if (loadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading domains...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
            <p className="text-gray-600 mb-4">
              Add and verify a domain in Google Search Console before viewing the AI vs Google gap report.
            </p>
            <a
              href="/dashboard/google-search-console"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Domain
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI vs Google Gap</h1>
          </div>
          <p className="text-gray-600">
            Compare your Google Search visibility with AI assistant visibility across queries. Identify where you rank on Google but lack AI presence.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="font-medium text-gray-700 text-sm">Domain:</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.gsc_integration?.domain_url || d.domain}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadReport}
              disabled={!selectedDomain || loadingReport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReport ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={generateReport}
              disabled={!selectedDomain || generating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              <Brain className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
              {report ? "Regenerate" : "Generate"} Report
            </button>
          </div>
        </div>

        {selectedDomain && !report && !loadingReport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Search className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Available</h3>
            <p className="text-gray-600 mb-6">
              Generate a report to see the AI vs Google gap analysis for this domain.
            </p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Brain className="w-5 h-5" />
              Generate Report
            </button>
          </div>
        )}

        {report && (
          <>
            {/* Summary Stats - Gradient cards like global reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">AI Risk</span>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-900">{report.summary.aiRisk}</div>
                <p className="text-xs text-red-600 mt-1">SEO strong, AI weak</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Moderate Gap</span>
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-900">{report.summary.moderateGap}</div>
                <p className="text-xs text-orange-600 mt-1">Some AI gap</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Balanced</span>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-900">{report.summary.balanced}</div>
                <p className="text-xs text-green-600 mt-1">Google ≈ AI</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">SEO Opportunity</span>
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">{report.summary.seoOpportunity}</div>
                <p className="text-xs text-blue-600 mt-1">AI strong, SEO weak</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">SEO Failure</span>
                  <X className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-purple-900">{report.summary.seoFailure}</div>
                <p className="text-xs text-purple-600 mt-1">Weak on both</p>
              </div>
            </div>

            {/* Meta info row */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
              <span><strong>Domain:</strong> {report.domain}</span>
              <span><strong>Avg Gap:</strong> {report.summary.avgGapScore} (positive = stronger on Google)</span>
              <span><strong>Queries:</strong> {report.summary.totalQueries}</span>
              <span><strong>Generated:</strong> {new Date(report.generatedAt).toLocaleString()}</span>
              {report.enginesUsed?.length > 0 && (
                <span><strong>Engines:</strong> {report.enginesUsed.join(", ")}</span>
              )}
            </div>

            {/* Charts Row 1: Pie + Band Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gap Distribution by Band</h3>
                <p className="text-sm text-gray-600 mb-4">Share of queries in each visibility band</p>
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
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No distribution data</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Queries per Band</h3>
                <p className="text-sm text-gray-600 mb-4">Count of queries in each visibility band</p>
                {bandBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={bandBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {bandBarData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No band data</p>
                )}
              </div>
            </div>

            {/* Charts Row 2: Google vs AI + Avg by Band */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Google vs AI Score (Top 15 Queries)</h3>
                <p className="text-sm text-gray-600 mb-4">Compare visibility scores per query</p>
                {googleVsAiBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={googleVsAiBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                        formatter={(value: number) => [value.toFixed(1), ""]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                      />
                      <Legend />
                      <Bar dataKey="Google" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="AI" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No query data</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Google vs AI by Band</h3>
                <p className="text-sm text-gray-600 mb-4">Average scores within each band</p>
                {avgByBandData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={avgByBandData} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                        formatter={(value: number) => [value.toFixed(1), ""]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                      />
                      <Legend />
                      <Bar dataKey="Google" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="AI" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No band data</p>
                )}
              </div>
            </div>

            {/* Charts Row 3: Top AI Risk + Top SEO Opp + Scatter */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-red-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Top 10 AI Risk Queries</h3>
                <p className="text-sm text-gray-600 mb-4">Highest gap – strong on Google, weak on AI</p>
                {topAiRiskData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topAiRiskData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                        formatter={(value: number) => [value.toFixed(1), "Gap"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                      />
                      <Bar dataKey="gap" fill="#ef4444" radius={[0, 4, 4, 0]} name="Gap" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No AI risk queries</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Top 10 SEO Opportunity</h3>
                <p className="text-sm text-gray-600 mb-4">Most negative gap – strong on AI, weak on Google</p>
                {topSeoOppData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topSeoOppData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                        formatter={(value: number) => [value.toFixed(1), "Gap"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                      />
                      <Bar dataKey="gap" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Gap" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No SEO opportunity queries</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gap vs Impressions</h3>
                <p className="text-sm text-gray-600 mb-4">Each point = query. Right = high impressions.</p>
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="x" name="Impressions" type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                      <YAxis dataKey="y" name="Gap" type="number" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", maxWidth: 300 }}
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as { query: string; x: number; y: number; band: string };
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
                              <div className="font-medium truncate max-w-[250px]">{p.query}</div>
                              <div>Impressions: {p.x.toLocaleString()}</div>
                              <div>Gap: {p.y.toFixed(1)}</div>
                              <div>Band: {BAND_LABELS[p.band] || p.band}</div>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={scatterData} fill="#6366f1" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No scatter data</p>
                )}
              </div>
            </div>

            {/* Query Details Table */}
            {report.queries?.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-gray-200">Query Details</h3>
                {/* Band Filters */}
                <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-medium text-gray-600 mr-1">Filter by band:</span>
                  <button
                    onClick={() => setSelectedBands([])}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedBands.length === 0
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    All
                  </button>
                  {(["ai_risk", "moderate_gap", "balanced", "seo_opportunity", "seo_failure"] as const).map((band) => {
                    const count = report.queries.filter((q) => q.band === band).length;
                    if (count === 0) return null;
                    const isSelected = selectedBands.includes(band);
                    return (
                      <button
                        key={band}
                        onClick={() =>
                          setSelectedBands((prev) =>
                            isSelected ? prev.filter((b) => b !== band) : [...prev, band]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          isSelected ? "text-white" : "hover:opacity-90"
                        }`}
                        style={{
                          backgroundColor: isSelected ? BAND_COLORS[band] : `${BAND_COLORS[band]}30`,
                          color: isSelected ? "#fff" : BAND_COLORS[band],
                        }}
                      >
                        {BAND_LABELS[band]} ({count})
                      </button>
                    );
                  })}
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-700">Query</th>
                        <th className="text-right p-3 font-medium text-gray-700">Impressions</th>
                        <th className="text-right p-3 font-medium text-gray-700">Position</th>
                        <th className="text-right p-3 font-medium text-gray-700">Google</th>
                        <th className="text-right p-3 font-medium text-gray-700">AI</th>
                        <th className="text-right p-3 font-medium text-gray-700">Gap</th>
                        <th className="text-left p-3 font-medium text-gray-700">Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBands.length === 0
                        ? report.queries
                        : report.queries.filter((q) => selectedBands.includes(q.band))
                      ).map((q, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3 max-w-[200px] truncate text-gray-900" title={q.query}>
                            {q.query}
                          </td>
                          <td className="p-3 text-right text-gray-600">{q.impressions.toLocaleString()}</td>
                          <td className="p-3 text-right text-gray-600">{q.position?.toFixed(1) ?? "-"}</td>
                          <td className="p-3 text-right text-gray-600">{q.googleScore?.toFixed(1) ?? "-"}</td>
                          <td className="p-3 text-right text-gray-600">{q.aiScore?.toFixed(1) ?? "-"}</td>
                          <td className="p-3 text-right font-medium">{q.gapScore?.toFixed(1) ?? "-"}</td>
                          <td className="p-3">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${BAND_COLORS[q.band] || "#94a3b8"}20`,
                                color: BAND_COLORS[q.band] || "#64748b",
                              }}
                            >
                              {q.bandLabel}
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
    </div>
  );
}
