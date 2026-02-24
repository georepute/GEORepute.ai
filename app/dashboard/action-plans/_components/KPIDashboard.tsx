"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Eye,
  Search,
  BarChart3,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
  Target,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────
interface KPIDashboardProps {
  intelligenceData: any;
  planProgress?: {
    totalPlans: number;
    completedSteps: number;
    totalSteps: number;
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, decimals = 0) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function pct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `${Number(n).toFixed(1)}%`;
}
function scoreColor(s: number) {
  return s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444";
}
function scoreBg(s: number) {
  return s >= 70 ? "bg-green-100 text-green-800" : s >= 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
}

// ─── sub-components ───────────────────────────────────────────────────────────
function HeroCard({
  label, value, sub, icon: Icon, color, badge,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "18" }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
        {badge && (
          <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${scoreBg(Number(value) || 0)}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, count }: { title: string; sub?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
      {count != null && (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
          {count} rows
        </span>
      )}
    </div>
  );
}

function Collapsible({ title, sub, children, defaultOpen = false }: {
  title: string; sub?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div>
          <span className="text-sm font-bold text-gray-900">{title}</span>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function ProgressBar({ value, color = "#6366f1" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold w-7 text-right" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function KPIDashboard({ intelligenceData, planProgress }: KPIDashboardProps) {
  if (!intelligenceData) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No KPI Data</h3>
        <p className="text-sm text-gray-500">Select a brand project to load real performance data.</p>
      </div>
    );
  }

  const scores = intelligenceData.scores || {};
  const reports = intelligenceData.reports || {};
  const completeness = intelligenceData.dataCompleteness || {};

  // ── derived real numbers ──────────────────────────────────────────────────
  const aiD = reports.aiVisibility?.details || null;
  const seoD = reports.seoAnalysis?.details || null;
  const riskD = reports.riskMatrix?.details || null;
  const gapD = reports.gapAnalysis?.details || null;
  const mktD = reports.shareOfAttention?.details || null;
  const oppD = reports.opportunityEngine?.details || null;

  // Scores bar chart — only scores with real data
  const scoreAvailability: Record<string, boolean> = {
    aiVisibility: completeness.aiVisibility,
    seoPresence: completeness.gscData,
    shareOfAttention: completeness.marketShare,
    riskExposure: completeness.blindSpots,
    opportunityScore: completeness.gscData,
    authorityScore: !!(completeness.aiVisibility || completeness.gscData || completeness.marketShare),
    revenueReadiness: !!(completeness.aiVisibility || completeness.gscData),
  };
  const barData = Object.entries(scores)
    .filter(([k]) => scoreAvailability[k] && (scores[k] as number) > 0)
    .map(([k, v]) => ({
      name: k.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()).trim(),
      score: v as number,
    }));

  // AI Visibility platform breakdown for pie chart
  const platformPieData = (aiD?.platformBreakdown || []).map((p: any) => ({
    name: p.platform,
    value: p.mentioned,
    total: p.total,
    rate: p.rate,
  }));
  const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

  const hasAnyData = completeness.completenessScore > 0;

  return (
    <div className="space-y-5">
      {/* ── Data completeness banner ──────────────────────────────────────── */}
      <div className={`rounded-xl border p-3 flex items-center gap-3 flex-wrap ${hasAnyData ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        {hasAnyData
          ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
        <span className={`text-xs font-semibold ${hasAnyData ? "text-green-800" : "text-amber-800"}`}>
          Data completeness: {completeness.completenessScore ?? 0}%
        </span>
        <div className="flex gap-3 flex-wrap text-xs">
          {[
            { key: "aiVisibility", label: "AI Visibility" },
            { key: "gscData", label: "GSC" },
            { key: "marketShare", label: "Market Share" },
            { key: "blindSpots", label: "Blind Spots" },
            { key: "gapAnalysis", label: "Gap Analysis" },
          ].map((item) => (
            <span
              key={item.key}
              className={completeness[item.key as keyof typeof completeness]
                ? "text-green-700 font-medium"
                : "text-gray-400 line-through"}
            >
              {completeness[item.key as keyof typeof completeness] ? "✓" : "✗"} {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero metrics row ──────────────────────────────────────────────── */}
      {hasAnyData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {aiD && (
            <HeroCard
              label="AI Mention Rate"
              value={`${aiD.mentionRate ?? 0}%`}
              sub={`${aiD.mentionedCount ?? 0} / ${aiD.totalQueries ?? 0} queries`}
              icon={Eye}
              color="#8b5cf6"
            />
          )}
          {seoD && (
            <HeroCard
              label="Total GSC Clicks"
              value={fmt(seoD.totalClicks)}
              sub={`${fmt(seoD.totalImpressions)} impressions`}
              icon={Search}
              color="#22c55e"
            />
          )}
          {seoD && (
            <HeroCard
              label="Avg. Position"
              value={fmt(seoD.avgPosition, 1)}
              sub={`${pct(seoD.avgCTR)} CTR · ${fmt(seoD.totalQueries)} queries`}
              icon={TrendingUp}
              color="#3b82f6"
            />
          )}
          {riskD && (
            <HeroCard
              label="Blind Spots"
              value={fmt(riskD.totalBlindSpots)}
              sub={`${fmt(riskD.highPriority)} high priority`}
              icon={Shield}
              color="#ef4444"
            />
          )}
          {gapD && (
            <HeroCard
              label="AI-Risk Queries"
              value={fmt(gapD.aiRisk)}
              sub={`of ${fmt(gapD.totalQueries)} total analyzed`}
              icon={AlertTriangle}
              color="#f59e0b"
            />
          )}
        </div>
      )}

      {/* ── Execution progress ───────────────────────────────────────────── */}
      {planProgress && planProgress.totalPlans > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-600" />
            Execution Progress
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Plans", value: planProgress.totalPlans, color: "bg-indigo-50 text-indigo-900", sub: "" },
              { label: "Steps Done", value: `${planProgress.completedSteps}/${planProgress.totalSteps}`, color: "bg-green-50 text-green-900", sub: "" },
              { label: "Completion", value: `${planProgress.totalSteps > 0 ? Math.round((planProgress.completedSteps / planProgress.totalSteps) * 100) : 0}%`, color: "bg-amber-50 text-amber-900", sub: "" },
              { label: "Remaining", value: planProgress.totalSteps - planProgress.completedSteps, color: "bg-violet-50 text-violet-900", sub: "" },
            ].map((item, i) => (
              <div key={i} className={`rounded-lg p-3 ${item.color.split(" ")[0]}`}>
                <div className={`text-xs font-medium ${item.color.split(" ")[1]} opacity-70`}>{item.label}</div>
                <div className={`text-2xl font-bold ${item.color.split(" ")[1]}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Intelligence scores bar chart ─────────────────────────────────── */}
      {barData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader
            title="Intelligence Score Overview"
            sub="All scores sourced from real report data — no synthetic values"
          />
          <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 38)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v}/100`, "Score"]} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={scoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── AI Visibility section ─────────────────────────────────────────── */}
      {aiD && (
        <Collapsible
          title="AI Visibility — Platform Breakdown"
          sub={`${aiD.mentionedCount ?? 0} / ${aiD.totalQueries ?? 0} queries mention brand (${aiD.mentionRate ?? 0}%)`}
          defaultOpen
        >
          <div className="mt-3 space-y-3">
            {/* Overall score gauge row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-violet-50 rounded-lg p-3 text-center">
                <div className="text-xs text-violet-600 font-medium">Visibility Score</div>
                <div className="text-3xl font-bold text-violet-900">{scores.aiVisibility ?? 0}</div>
                <div className="text-xs text-violet-600">/100</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 font-medium">Mentioned</div>
                <div className="text-3xl font-bold text-green-900">{aiD.mentionedCount ?? 0}</div>
                <div className="text-xs text-green-600">queries</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xs text-red-600 font-medium">Not Mentioned</div>
                <div className="text-3xl font-bold text-red-900">{aiD.gapCount ?? 0}</div>
                <div className="text-xs text-red-600">queries</div>
              </div>
            </div>

            {/* Per-platform breakdown */}
            {platformPieData.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Pie chart */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Mentions by Platform</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={platformPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, rate }) => `${name}: ${rate}%`}
                        labelLine={false}
                      >
                        {platformPieData.map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, _: string, p: any) => [`${v} / ${p.payload.total} (${p.payload.rate}%)`, p.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Table */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Per-Platform Rates</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-1.5 text-gray-500 font-medium">Platform</th>
                        <th className="text-right py-1.5 text-gray-500 font-medium">Mentioned</th>
                        <th className="text-right py-1.5 text-gray-500 font-medium">Total</th>
                        <th className="text-right py-1.5 text-gray-500 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformPieData.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 font-medium text-gray-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {p.name}
                          </td>
                          <td className="py-1.5 text-right text-green-700 font-semibold">{p.value}</td>
                          <td className="py-1.5 text-right text-gray-500">{p.total}</td>
                          <td className="py-1.5 text-right">
                            <span className={`font-bold ${p.rate >= 50 ? "text-green-700" : p.rate >= 25 ? "text-amber-600" : "text-red-600"}`}>
                              {p.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* ── SEO Performance section ───────────────────────────────────────── */}
      {seoD && (
        <Collapsible
          title="SEO Performance — Google Search Console"
          sub={`${fmt(seoD.totalQueries)} queries · ${fmt(seoD.totalClicks)} clicks · ${fmt(seoD.totalImpressions)} impressions`}
          defaultOpen
        >
          <div className="mt-3 space-y-4">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Clicks", value: fmt(seoD.totalClicks), color: "text-green-700" },
                { label: "Total Impressions", value: fmt(seoD.totalImpressions), color: "text-blue-700" },
                { label: "Avg. CTR", value: pct(seoD.avgCTR), color: "text-indigo-700" },
                { label: "Avg. Position", value: fmt(seoD.avgPosition, 1), color: "text-amber-700" },
                { label: "Top 10 Queries", value: fmt(seoD.topRankingQueries), color: "text-green-700" },
                { label: "Opportunity Queries", value: fmt(seoD.opportunityQueryCount), color: "text-red-600" },
                { label: "Unique Queries", value: fmt(seoD.totalQueries), color: "text-gray-700" },
                { label: "Unique Pages", value: fmt(seoD.totalPages), color: "text-gray-700" },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">{item.label}</div>
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Top queries table */}
            {seoD.topPerformingQueries?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Queries by Clicks</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 text-gray-500 font-medium">Query</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Clicks</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Impressions</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">CTR</th>
                        <th className="text-right py-2 pl-2 text-gray-500 font-medium">Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seoD.topPerformingQueries.map((q: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 pr-4 font-medium text-gray-900 max-w-[220px] truncate">{q.query}</td>
                          <td className="py-1.5 px-2 text-right text-green-700 font-semibold">{fmt(q.clicks)}</td>
                          <td className="py-1.5 px-2 text-right text-gray-600">{fmt(q.impressions)}</td>
                          <td className="py-1.5 px-2 text-right text-blue-700">{q.ctr}%</td>
                          <td className="py-1.5 pl-2 text-right">
                            <span className={`font-bold ${q.position <= 3 ? "text-green-700" : q.position <= 10 ? "text-amber-700" : "text-red-600"}`}>
                              {q.position}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Opportunity queries table */}
            {(oppD?.opportunityKeywords?.length > 0) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Opportunity Queries — high impressions, position &gt;10
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 text-gray-500 font-medium">Query</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Impressions</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Clicks</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">CTR</th>
                        <th className="text-right py-2 pl-2 text-gray-500 font-medium">Pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oppD.opportunityKeywords.map((kw: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 pr-4 font-medium text-gray-900 max-w-[220px] truncate">{kw.query}</td>
                          <td className="py-1.5 px-2 text-right text-amber-700 font-semibold">{fmt(kw.impressions)}</td>
                          <td className="py-1.5 px-2 text-right text-gray-600">{fmt(kw.clicks)}</td>
                          <td className="py-1.5 px-2 text-right text-blue-700">{kw.ctr != null ? `${kw.ctr}%` : "—"}</td>
                          <td className="py-1.5 pl-2 text-right text-red-600 font-semibold">{kw.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top pages */}
            {seoD.topPages?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Pages by Clicks</p>
                <div className="space-y-1.5">
                  {seoD.topPages.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 gap-2">
                      <span className="text-xs text-gray-700 truncate min-w-0" title={p.page}>
                        {p.page?.replace(/^https?:\/\/[^/]+/, "") || p.page}
                      </span>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <span className="text-green-700 font-semibold">{fmt(p.clicks)} clicks</span>
                        <span className="text-gray-400">{fmt(p.impressions)} impr</span>
                        <span className={`font-medium ${p.position <= 3 ? "text-green-600" : p.position <= 10 ? "text-amber-600" : "text-red-500"}`}>
                          pos {fmt(p.position, 1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* ── Market Share section ──────────────────────────────────────────── */}
      {mktD && reports.shareOfAttention?.available && (
        <Collapsible
          title="Market Share of Attention"
          sub={`AI mention share: ${pct(mktD.aiMentionShare)} · Organic share: ${pct(mktD.organicShare)}`}
        >
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Market Share Score", value: `${mktD.marketShareScore}%`, color: "text-indigo-700" },
                { label: "AI Mention Share", value: pct(mktD.aiMentionShare), color: "text-violet-700" },
                { label: "Weighted AI Share", value: pct(mktD.weightedAIShare), color: "text-purple-700" },
                { label: "Organic Share", value: pct(mktD.organicShare), color: "text-green-700" },
                { label: "Total AI Queries", value: fmt(mktD.totalAIQueries), color: "text-gray-700" },
                { label: "Total AI Mentions", value: fmt(mktD.totalAIMentions), color: "text-blue-700" },
                { label: "AI Recommendation Share", value: pct(mktD.aiRecommendationShare), color: "text-amber-700" },
                { label: "Market Leader", value: mktD.isDefaultLeader ? "Yes ✓" : "No", color: mktD.isDefaultLeader ? "text-green-700" : "text-red-600" },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 font-medium">{item.label}</div>
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Per-engine breakdown */}
            {Array.isArray(mktD.engineBreakdown) && mktD.engineBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Per AI Engine</p>
                <div className="space-y-2">
                  {mktD.engineBreakdown.map((e: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-700 w-28 flex-shrink-0">{e.label || e.engine}</span>
                      <ProgressBar value={e.mentionSharePct ?? 0} color={PIE_COLORS[i % PIE_COLORS.length]} />
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{e.mentions}/{e.totalQueries}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* ── Blind Spots section ───────────────────────────────────────────── */}
      {riskD && reports.riskMatrix?.available && (
        <Collapsible
          title="Strategic Blind Spots"
          sub={`${fmt(riskD.totalBlindSpots)} total · ${fmt(riskD.highPriority)} high priority · ${pct(riskD.aiBlindSpotPct)} AI blind spot rate`}
        >
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xs text-red-600 font-medium">High Priority</div>
                <div className="text-2xl font-bold text-red-900">{fmt(riskD.highPriority)}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-600 font-medium">Medium Priority</div>
                <div className="text-2xl font-bold text-amber-900">{fmt(riskD.mediumPriority)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 font-medium">Low Priority</div>
                <div className="text-2xl font-bold text-green-900">{fmt(riskD.lowPriority)}</div>
              </div>
            </div>

            {riskD.topBlindSpots?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Blind Spots to Fix</p>
                <div className="space-y-1.5">
                  {riskD.topBlindSpots.map((bs: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate min-w-0">{bs.query}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          bs.priority === "high" ? "bg-red-100 text-red-700"
                          : bs.priority === "medium" ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                        }`}>{bs.priority}</span>
                        <span className="text-xs text-gray-500">Score: <strong>{bs.score?.toFixed(1)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* ── Gap Analysis section ──────────────────────────────────────────── */}
      {gapD && reports.gapAnalysis?.available && (
        <Collapsible
          title="AI vs Google Gap Analysis"
          sub={`${fmt(gapD.aiRisk)} AI-risk queries · ${fmt(gapD.totalQueries)} total analyzed · Avg gap score: ${fmt(gapD.avgGapScore, 1)}`}
        >
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "AI Risk", value: fmt(gapD.aiRisk), color: "bg-red-50 text-red-700 text-red-900", desc: "Google strong, AI weak" },
                { label: "Moderate Gap", value: fmt(gapD.moderateGap), color: "bg-amber-50 text-amber-700 text-amber-900", desc: "" },
                { label: "Balanced", value: fmt(gapD.balanced), color: "bg-green-50 text-green-700 text-green-900", desc: "" },
                { label: "SEO Opportunity", value: fmt(gapD.seoOpportunity), color: "bg-blue-50 text-blue-700 text-blue-900", desc: "AI strong, SEO weak" },
                { label: "SEO Failure", value: fmt(gapD.seoFailure), color: "bg-gray-50 text-gray-500 text-gray-700", desc: "" },
              ].map((item, i) => {
                const [bg, labelColor, valColor] = item.color.split(" ");
                return (
                  <div key={i} className={`rounded-lg p-3 ${bg}`}>
                    <div className={`text-xs font-medium ${labelColor}`}>{item.label}</div>
                    <div className={`text-2xl font-bold ${valColor}`}>{item.value}</div>
                    {item.desc && <div className={`text-xs ${labelColor} opacity-80`}>{item.desc}</div>}
                  </div>
                );
              })}
            </div>

            {gapD.topGaps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Gaps — Google Strong, AI Weak</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 text-gray-500 font-medium">Query</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Band</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">Google</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">AI</th>
                        <th className="text-right py-2 pl-2 text-gray-500 font-medium">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gapD.topGaps.map((g: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 pr-4 font-medium text-gray-900 max-w-[200px] truncate">{g.query}</td>
                          <td className="py-1.5 px-2 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                              g.band === "ai_risk" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}>{g.band}</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-green-700 font-semibold">{fmt(g.googleScore, 1)}</td>
                          <td className="py-1.5 px-2 text-right text-red-600 font-semibold">{fmt(g.aiScore, 1)}</td>
                          <td className="py-1.5 pl-2 text-right text-amber-700 font-bold">{fmt(g.gapScore, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!hasAnyData && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No report data yet</p>
          <p className="text-xs text-gray-400 mt-1">Run AI Visibility, GSC, Market Share, Blind Spots, and Gap reports to populate this dashboard.</p>
        </div>
      )}
    </div>
  );
}
