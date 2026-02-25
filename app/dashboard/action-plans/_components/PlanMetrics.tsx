"use client";

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
} from "recharts";
import { Target, CheckCircle2, Clock, Zap, TrendingUp } from "lucide-react";

interface ActionStep {
  step: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  channel?: string;
  platform?: string;
  executionMetadata?: {
    executionStatus?: string;
  };
}

interface ActionPlan {
  id: string;
  title: string;
  objective: string;
  steps: ActionStep[];
  expectedOutcome: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  category: string;
  projectName?: string;
  domain?: string;
}

interface PlanMetricsProps {
  plan: ActionPlan;
  compact?: boolean;
}

const PRIORITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

const CHART_COLORS = ["#9333ea", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function PlanMetrics({ plan, compact = false }: PlanMetricsProps) {
  const completedSteps = plan.steps.filter(
    (s) => s.completed || s.executionMetadata?.executionStatus === "published"
  ).length;
  const totalSteps = plan.steps.length;
  const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Priority distribution
  const priorityData = [
    {
      name: "High",
      value: plan.steps.filter((s) => s.priority === "high").length,
      color: PRIORITY_COLORS.high,
    },
    {
      name: "Medium",
      value: plan.steps.filter((s) => s.priority === "medium").length,
      color: PRIORITY_COLORS.medium,
    },
    {
      name: "Low",
      value: plan.steps.filter((s) => s.priority === "low").length,
      color: PRIORITY_COLORS.low,
    },
  ].filter((d) => d.value > 0);

  // Channel/platform distribution
  const channelMap: Record<string, number> = {};
  plan.steps.forEach((s) => {
    const key = s.channel || s.platform || "General";
    channelMap[key] = (channelMap[key] || 0) + 1;
  });
  const channelData = Object.entries(channelMap).map(([name, value], i) => ({
    name: name.replace(/_/g, " "),
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Step progress for bar chart
  const stepProgressData = plan.steps.map((s, i) => ({
    name: `Step ${i + 1}`,
    completed: s.completed || s.executionMetadata?.executionStatus === "published" ? 1 : 0,
    pending: s.completed || s.executionMetadata?.executionStatus === "published" ? 0 : 1,
    label: s.step?.slice(0, 20) + (s.step?.length > 20 ? "…" : ""),
  }));

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Completion
          </div>
          <div className="text-xl font-bold text-gray-900">{completionRate}%</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <Target className="w-4 h-4 text-accent-600" />
            Steps
          </div>
          <div className="text-xl font-bold text-gray-900">
            {completedSteps}/{totalSteps}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            High Priority
          </div>
          <div className="text-xl font-bold text-red-600">
            {plan.steps.filter((s) => s.priority === "high").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            Timeline
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">{plan.timeline}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
            <CheckCircle2 className="w-5 h-5" />
            Completion Rate
          </div>
          <div className="text-2xl font-bold text-green-900">{completionRate}%</div>
          <div className="text-xs text-green-600 mt-1">{completedSteps} of {totalSteps} steps done</div>
        </div>
        <div className="bg-gradient-to-br from-accent-50 to-purple-50 border border-accent-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-accent-700 text-sm font-medium mb-1">
            <Target className="w-5 h-5" />
            Total Steps
          </div>
          <div className="text-2xl font-bold text-accent-900">{totalSteps}</div>
          <div className="text-xs text-accent-600 mt-1">Action items</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
            <Zap className="w-5 h-5" />
            High Priority
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {plan.steps.filter((s) => s.priority === "high").length}
          </div>
          <div className="text-xs text-amber-600 mt-1">Urgent actions</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
            <TrendingUp className="w-5 h-5" />
            Expected Outcome
          </div>
          <div className="text-sm font-semibold text-blue-900 line-clamp-2">{plan.expectedOutcome?.slice(0, 60)}…</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Step Priority Distribution</h4>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} steps`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No priority data
            </div>
          )}
        </div>

        {/* Channel/Platform Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Steps by Channel / Platform</h4>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channelData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Steps" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No channel data
            </div>
          )}
        </div>
      </div>

      {/* Step Progress Bar Chart */}
      {stepProgressData.length > 0 && stepProgressData.length <= 15 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Step-by-Step Progress</h4>
          <ResponsiveContainer width="100%" height={Math.min(300, stepProgressData.length * 28)}>
            <BarChart data={stepProgressData} layout="vertical" margin={{ left: 0, right: 20 }} barCategoryGap="4">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" domain={[0, 1]} tickFormatter={() => ""} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number, name: string) => [value === 1 ? "Done" : "Pending", name]} />
              <Legend />
              <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="pending" name="Pending" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
