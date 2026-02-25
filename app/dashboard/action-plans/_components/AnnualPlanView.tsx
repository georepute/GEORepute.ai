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
  Calendar,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  ArrowRight,
  Layers,
  Zap,
  Shield,
  Rocket,
  Crown,
  MapPin,
  BarChart3,
  Play,
} from "lucide-react";

export interface QuarterlyItem {
  id: string;
  title: string;
  description: string;
  where: string;
  whyCritical: string;
  category: string;
  platforms: string[];
  kpis: string[];
  estimatedROI: string;
  priority: "high" | "medium" | "low";
  selected: boolean;
  channel?: string;
  executionType?: "content_generation" | "audit" | "analysis" | "manual";
}

export interface QuarterlyPlan {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  theme: string;
  description: string;
  items: QuarterlyItem[];
  kpis: { metric: string; target: string; baseline: string }[];
  estimatedROI: string;
}

export interface AnnualPlan {
  currentPosition: string;
  twelveMonthObjective: string;
  strategicGap: string;
  coreFocusAreas: string[];
  quarters: QuarterlyPlan[];
  generatedAt: string;
}

interface AnnualPlanViewProps {
  plan: AnnualPlan | null;
  loading: boolean;
  onSelectItems: (selectedItems: QuarterlyItem[]) => void;
  onToggleItem: (quarterId: string, itemId: string) => void;
  onGenerateContent?: (item: QuarterlyItem) => void;
}

const QUARTER_CONFIG = {
  Q1: {
    icon: Shield,
    gradient: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    label: "Foundation",
  },
  Q2: {
    icon: Rocket,
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    label: "Expansion",
  },
  Q3: {
    icon: Crown,
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    label: "Authority & Market Positioning",
  },
  Q4: {
    icon: Target,
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    label: "Market Control & Optimization",
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Content Development": "#3b82f6",
  "SEO Implementation": "#22c55e",
  "AI Visibility Expansion": "#8b5cf6",
  "Authority & PR Strategy": "#f59e0b",
  "Funnel Optimization": "#ef4444",
  "Conversion Improvements": "#ec4899",
  "Market Expansion": "#06b6d4",
};

const PLATFORM_ICONS: Record<string, string> = {
  Website: "🌐",
  Blog: "📝",
  "Google Business": "📍",
  YouTube: "📺",
  LinkedIn: "💼",
  X: "𝕏",
  Instagram: "📸",
  Facebook: "👥",
  "PR Networks": "📰",
  "External Authority": "🏛️",
  Reddit: "🤖",
  Medium: "✍️",
  Quora: "❓",
  Email: "📧",
};

export function AnnualPlanView({
  plan,
  loading,
  onSelectItems,
  onToggleItem,
  onGenerateContent,
}: AnnualPlanViewProps) {
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>("Q1");
  const [viewMode, setViewMode] = useState<"quarters" | "timeline" | "categories">("quarters");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">
            Generating 12-Month Strategic Plan...
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Applying decision logic to intelligence data
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Annual Plan Generated Yet
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Generate strategic intelligence first, then create your 12-month
          execution plan.
        </p>
      </div>
    );
  }

  const allItems = plan.quarters.flatMap((q) => q.items);
  const selectedItems = allItems.filter((item) => item.selected);
  const totalItems = allItems.length;

  const categoryDistribution = allItems.reduce(
    (acc: Record<string, number>, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {}
  );

  const categoryData = Object.entries(categoryDistribution).map(
    ([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#6b7280",
    })
  );

  const quarterDistribution = plan.quarters.map((q) => ({
    name: q.quarter,
    total: q.items.length,
    selected: q.items.filter((i) => i.selected).length,
    highPriority: q.items.filter((i) => i.priority === "high").length,
  }));

  return (
    <div className="space-y-6">
      {/* Annual Strategic Overview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            12-Month Strategic Work Plan
          </h2>
          <p className="text-indigo-200 text-sm mt-1">
            Generated based on strategic intelligence analysis
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Current Position
              </h4>
              <p className="text-sm text-gray-700">{plan.currentPosition}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase mb-2">
                12-Month Objective
              </h4>
              <p className="text-sm text-gray-700 font-medium">
                {plan.twelveMonthObjective}
              </p>
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="text-xs font-semibold text-amber-700 uppercase mb-2">
              Strategic Gap
            </h4>
            <p className="text-sm text-gray-700">{plan.strategicGap}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Core Focus Areas
            </h4>
            <div className="flex flex-wrap gap-2">
              {plan.coreFocusAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs + Stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(
            [
              { key: "quarters", label: "Quarters" },
              { key: "timeline", label: "Timeline" },
              { key: "categories", label: "Categories" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            <span className="font-bold text-indigo-600">
              {selectedItems.length}
            </span>{" "}
            / {totalItems} items selected for execution
          </span>
          {selectedItems.length > 0 && (
            <button
              onClick={() => onSelectItems(selectedItems)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Generate Action Plans
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-3">
            Items by Quarter
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quarterDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" name="Total" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="selected" name="Selected" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="highPriority" name="High Priority" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-3">
            Execution Categories
          </h4>
          {categoryData.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-[200px] flex-shrink-0">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {categoryData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-700 truncate">{entry.name}</span>
                    </span>
                    <span className="font-semibold text-gray-900 flex-shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No category data
            </div>
          )}
        </div>
      </div>

      {/* Quarters View */}
      {viewMode === "quarters" && (
        <div className="space-y-4">
          {plan.quarters.map((quarter) => {
            const config = QUARTER_CONFIG[quarter.quarter];
            const IconComp = config.icon;
            const isExpanded = expandedQuarter === quarter.quarter;

            return (
              <div
                key={quarter.quarter}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  isExpanded ? config.border : "border-gray-200"
                }`}
              >
                {/* Quarter Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() =>
                    setExpandedQuarter(isExpanded ? null : quarter.quarter)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center`}
                      >
                        <IconComp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${config.bg} ${config.text}`}
                          >
                            {quarter.quarter}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900">
                            {quarter.theme}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {quarter.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {quarter.items.length} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {quarter.items.filter((i) => i.selected).length}{" "}
                          selected
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Quarter KPIs */}
                    {quarter.kpis.length > 0 && (
                      <div className={`px-5 py-3 ${config.bg}`}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                          Quarter KPIs
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {quarter.kpis.map((kpi, idx) => (
                            <div
                              key={idx}
                              className="bg-white/80 rounded-lg p-2"
                            >
                              <div className="text-xs text-gray-600">
                                {kpi.metric}
                              </div>
                              <div className="text-sm font-bold text-gray-900">
                                {kpi.target}
                              </div>
                              <div className="text-xs text-gray-400">
                                Baseline: {kpi.baseline}
                              </div>
                            </div>
                          ))}
                        </div>
                        {quarter.estimatedROI && (
                          <div className="mt-2 text-xs text-gray-600">
                            Estimated ROI:{" "}
                            <span className="font-bold text-green-700">
                              {quarter.estimatedROI}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Strategic Items */}
                    <div className="p-5 space-y-3">
                      {quarter.items.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 transition-all ${
                            item.selected
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() =>
                                onToggleItem(quarter.quarter, item.id)
                              }
                              className="mt-0.5 flex-shrink-0"
                            >
                              {item.selected ? (
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400 transition-colors" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h5 className="font-semibold text-gray-900 text-sm">
                                  {item.title}
                                </h5>
                                <span
                                  className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${
                                    item.priority === "high"
                                      ? "bg-red-100 text-red-800"
                                      : item.priority === "medium"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {item.description}
                              </p>

                              {/* Where + Why */}
                              <div className="grid sm:grid-cols-2 gap-2 mb-2">
                                <div className="text-xs">
                                  <span className="font-semibold text-gray-500">
                                    Where:
                                  </span>{" "}
                                  <span className="text-gray-700">
                                    {item.where}
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <span className="font-semibold text-gray-500">
                                    Why Critical:
                                  </span>{" "}
                                  <span className="text-gray-700">
                                    {item.whyCritical}
                                  </span>
                                </div>
                              </div>

                              {/* Chips row — category, channel, executionType, platforms */}
                              <div className="flex items-center gap-2 flex-wrap mt-2">
                                {/* Category chip */}
                                <span
                                  className="px-2 py-0.5 text-xs font-medium rounded"
                                  style={{
                                    backgroundColor:
                                      (CATEGORY_COLORS[item.category] || "#6b7280") + "20",
                                    color: CATEGORY_COLORS[item.category] || "#6b7280",
                                  }}
                                >
                                  {item.category}
                                </span>
                                {/* Channel chip — matches action plan tab */}
                                {item.channel && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                    {item.channel.replace(/_/g, " ")}
                                  </span>
                                )}
                                {/* Execution type chip */}
                                {item.executionType && (
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    item.executionType === "content_generation"
                                      ? "bg-green-100 text-green-800"
                                      : item.executionType === "audit"
                                      ? "bg-orange-100 text-orange-800"
                                      : item.executionType === "analysis"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}>
                                    {item.executionType.replace(/_/g, " ")}
                                  </span>
                                )}
                                {/* Platform chips */}
                                {item.platforms.map((platform) => (
                                  <span
                                    key={platform}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded flex items-center gap-1"
                                  >
                                    {PLATFORM_ICONS[platform] || "📌"} {platform}
                                  </span>
                                ))}
                              </div>

                              {/* KPI targets */}
                              {item.kpis.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.kpis.map((kpi, ki) => (
                                    <span key={ki} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100">
                                      {kpi}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* ROI */}
                              {item.estimatedROI && (
                                <div className="mt-2 text-xs text-gray-500">
                                  Est. outcome:{" "}
                                  <span className="font-semibold text-green-700">
                                    {item.estimatedROI}
                                  </span>
                                </div>
                              )}

                              {/* Generate Content button — matches action plan tab */}
                              {item.executionType === "content_generation" && onGenerateContent && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onGenerateContent(item);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    <Play className="w-3 h-3" />
                                    Generate Content
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {plan.quarters.map((quarter, qIdx) => {
              const config = QUARTER_CONFIG[quarter.quarter];
              const months = [
                ["Jan", "Feb", "Mar"],
                ["Apr", "May", "Jun"],
                ["Jul", "Aug", "Sep"],
                ["Oct", "Nov", "Dec"],
              ][qIdx];

              return (
                <div key={quarter.quarter} className="relative mb-8 last:mb-0">
                  {/* Quarter Marker */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-sm">
                        {quarter.quarter}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {quarter.theme}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {months?.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="ml-16 space-y-2">
                    {quarter.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          item.selected
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-gray-50 border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() =>
                          onToggleItem(quarter.quarter, item.id)
                        }
                      >
                        {item.selected ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {item.category}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                item.priority === "high"
                                  ? "text-red-600"
                                  : item.priority === "medium"
                                  ? "text-amber-600"
                                  : "text-green-600"
                              }`}
                            >
                              {item.priority}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {item.platforms.slice(0, 3).map((p) => (
                            <span key={p} className="text-xs">
                              {PLATFORM_ICONS[p] || "📌"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories View */}
      {viewMode === "categories" && (
        <div className="space-y-4">
          {Object.entries(categoryDistribution).map(([category, count]) => {
            const items = allItems.filter(
              (item) => item.category === category
            );
            const color = CATEGORY_COLORS[category] || "#6b7280";

            return (
              <div
                key={category}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ backgroundColor: color + "10" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h4 className="font-bold text-gray-900">{category}</h4>
                  </div>
                  <span className="text-sm text-gray-600">
                    {items.filter((i) => i.selected).length}/{count} selected
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        item.selected
                          ? "bg-indigo-50 border-indigo-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => {
                        const quarter = plan.quarters.find((q) =>
                          q.items.some((i) => i.id === item.id)
                        );
                        if (quarter) onToggleItem(quarter.quarter, item.id);
                      }}
                    >
                      {item.selected ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {plan.quarters.find((q) =>
                            q.items.some((i) => i.id === item.id)
                          )?.quarter}{" "}
                          · {item.priority} priority
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {item.platforms.slice(0, 3).map((p) => (
                          <span key={p} className="text-xs">
                            {PLATFORM_ICONS[p] || "📌"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selection Summary */}
      {selectedItems.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-white">
              <h3 className="text-lg font-bold">
                {selectedItems.length} Strategic Items Selected
              </h3>
              <p className="text-indigo-200 text-sm">
                {selectedItems.filter((i) => i.priority === "high").length} high
                priority ·{" "}
                {[...new Set(selectedItems.map((i) => i.category))].length}{" "}
                categories ·{" "}
                {[...new Set(selectedItems.flatMap((i) => i.platforms))].length}{" "}
                platforms
              </p>
            </div>
            <button
              onClick={() => onSelectItems(selectedItems)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Zap className="w-5 h-5" />
              Generate Execution Action Plans
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
