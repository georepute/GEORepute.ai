"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  Brain,
  Eye,
  Search,
  Shield,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface IntelligenceData {
  project: {
    id: string;
    name: string;
    industry: string;
    website: string;
    description: string;
  };
  scores: Record<string, number>;
  reports: Record<string, any>;
  decisionLogic: {
    priorities: { area: string; reason: string; urgency: string }[];
    focusAreas: string[];
    quarterlyThemes: { quarter: string; theme: string; focus: string }[];
  };
  dataCompleteness: {
    aiVisibility: boolean;
    gscData: boolean;
    marketShare: boolean;
    blindSpots: boolean;
    gapAnalysis: boolean;
    completenessScore: number;
  };
  generatedAt: string;
}

interface StrategicIntelligenceProps {
  data: IntelligenceData | null;
  loading: boolean;
  onGeneratePlan: () => void;
}

const REPORT_CARDS = [
  {
    key: "aiVisibility",
    label: "AI Visibility Analysis",
    icon: Eye,
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  {
    key: "seoAnalysis",
    label: "SEO & Organic Presence",
    icon: Search,
    color: "from-green-500 to-emerald-600",
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
  },
  {
    key: "riskMatrix",
    label: "Risk & Exposure Matrix",
    icon: Shield,
    color: "from-slate-600 to-gray-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
  },
  {
    key: "gapAnalysis",
    label: "AI vs Google Gap Analysis",
    icon: AlertTriangle,
    color: "from-yellow-500 to-amber-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
  },
];

function ScoreGauge({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-sm font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

export function StrategicIntelligence({
  data,
  loading,
  onGeneratePlan,
}: StrategicIntelligenceProps) {
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">
            Gathering strategic intelligence...
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Aggregating data from all reports
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Intelligence Data Available
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Select a brand project to load strategic intelligence from your
          existing reports.
        </p>
      </div>
    );
  }

  const radarData = [
    { subject: "AI Visibility", value: data.scores.aiVisibility, fullMark: 100 },
    { subject: "SEO Presence", value: data.scores.seoPresence, fullMark: 100 },
    { subject: "Authority", value: data.scores.authorityScore, fullMark: 100 },
    { subject: "Risk Coverage", value: data.scores.riskExposure, fullMark: 100 },
    { subject: "Opportunity", value: data.scores.opportunityScore, fullMark: 100 },
    { subject: "Revenue Ready", value: data.scores.revenueReadiness, fullMark: 100 },
  ];

  const overallHealth = data.reports.executiveBrief?.overallHealth || 0;

  return (
    <div className="space-y-6">
      {/* Data Completeness Banner */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            Data Completeness
          </h3>
          <span className="text-sm font-bold text-violet-600">
            {data.dataCompleteness.completenessScore}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${data.dataCompleteness.completenessScore}%`,
            }}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { key: "aiVisibility", label: "AI Visibility" },
            { key: "gscData", label: "GSC Data" },
            { key: "marketShare", label: "Market Share" },
            { key: "blindSpots", label: "Blind Spots" },
            { key: "gapAnalysis", label: "Gap Analysis" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-1">
              {data.dataCompleteness[
                item.key as keyof typeof data.dataCompleteness
              ] ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-300" />
              )}
              <span
                className={
                  data.dataCompleteness[
                    item.key as keyof typeof data.dataCompleteness
                  ]
                    ? "text-gray-700"
                    : "text-gray-400"
                }
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Health + Radar Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overall Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            Overall Brand Health
          </h3>
          <div className="flex items-center gap-6 mb-6">
            <ScoreGauge score={overallHealth} size={100} />
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {overallHealth}
                <span className="text-lg text-gray-400">/100</span>
              </div>
              <p className="text-sm text-gray-600">
                {overallHealth >= 70
                  ? "Strong Position"
                  : overallHealth >= 40
                  ? "Needs Improvement"
                  : "Critical Attention Required"}
              </p>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="space-y-3">
            {data.reports.executiveBrief?.topStrengths?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-green-700 uppercase mb-2">
                  Top Strengths
                </h4>
                {data.reports.executiveBrief.topStrengths.map(
                  (s: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-gray-700 capitalize">
                        {s.area}
                      </span>
                      <span className="font-bold text-green-600">
                        {s.score}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
            {data.reports.executiveBrief?.topWeaknesses?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-700 uppercase mb-2">
                  Critical Weaknesses
                </h4>
                {data.reports.executiveBrief.topWeaknesses.map(
                  (w: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-gray-700 capitalize">
                        {w.area}
                      </span>
                      <span className="font-bold text-red-600">{w.score}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            Strategic Position Radar
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: "#6b7280" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligence Report Cards */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-600" />
          Strategic Intelligence Reports
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {REPORT_CARDS.map((card) => {
            const report = data.reports[card.key];
            const isExpanded = expandedReport === card.key;
            const IconComp = card.icon;

            return (
              <div
                key={card.key}
                className={`rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  report?.available ? card.border : "border-gray-200 opacity-60"
                } ${card.bg}`}
                onClick={() =>
                  setExpandedReport(isExpanded ? null : card.key)
                }
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}
                    >
                      <IconComp className="w-4 h-4 text-white" />
                    </div>
                    {report?.available ? (
                      <ScoreGauge score={report.score || 0} size={40} />
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">
                        N/A
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-gray-900 leading-tight">
                    {card.label}
                  </h4>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-xs ${
                        report?.available ? card.text : "text-gray-400"
                      }`}
                    >
                      {report?.available ? "Data Available" : "No Data"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Report Detail */}
      {expandedReport && data.reports[expandedReport]?.details && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            {REPORT_CARDS.find((c) => c.key === expandedReport)?.label} — Details
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(
              data.reports[expandedReport].details || {}
            ).map(([key, value]) => {
              if (Array.isArray(value)) {
                return (
                  <div
                    key={key}
                    className="col-span-full bg-gray-50 rounded-lg p-4"
                  >
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (s) => s.toUpperCase())}
                    </h4>
                    <div className="space-y-2">
                      {(value as any[]).slice(0, 5).map((item, i) => (
                        <div
                          key={i}
                          className="text-sm text-gray-700 bg-white rounded p-2 border border-gray-200"
                        >
                          {typeof item === "object"
                            ? Object.entries(item)
                                .map(
                                  ([k, v]) =>
                                    `${k}: ${typeof v === "number" ? Math.round(v * 100) / 100 : v}`
                                )
                                .join(" | ")
                            : String(item)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (typeof value === "object" && value !== null) {
                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      {key.replace(/([A-Z])/g, " $1")}
                    </h4>
                    <div className="space-y-1">
                      {Object.entries(value as Record<string, any>).map(
                        ([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-gray-600">{k}</span>
                            <span className="font-semibold text-gray-900">
                              {typeof v === "number"
                                ? Math.round(v * 100) / 100
                                : String(v)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    {key.replace(/([A-Z])/g, " $1")}
                  </h4>
                  <div className="text-lg font-bold text-gray-900">
                    {typeof value === "number"
                      ? Math.round((value as number) * 100) / 100
                      : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quarterly Theme Preview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Recommended Quarterly Focus
          </h3>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.decisionLogic.quarterlyThemes.map((qt, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 hover:border-violet-300 hover:bg-violet-50/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-violet-100 text-violet-800 text-xs font-bold rounded">
                    {qt.quarter}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {qt.theme}
                </h4>
                <p className="text-xs text-gray-600">{qt.focus}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA: Generate 12-Month Plan */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-6 text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          Ready to Generate Your 12-Month Strategic Plan?
        </h3>
        <p className="text-violet-200 text-sm mb-4 max-w-lg mx-auto">
          Based on {data.decisionLogic.priorities.length} strategic priorities
          identified, the system will generate a structured quarterly execution
          plan tailored to your intelligence data.
        </p>
        <button
          onClick={onGeneratePlan}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-700 font-bold rounded-lg hover:bg-violet-50 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          Generate 12-Month Strategic Plan
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
