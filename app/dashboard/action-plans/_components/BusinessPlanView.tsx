"use client";

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
} from "recharts";
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";

interface ActionStep {
  step: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  completed: boolean;
  id?: string;
  channel?: string;
  platform?: string;
  executionMetadata?: { executionStatus?: string };
}

interface ActionPlan {
  id: string;
  title: string;
  objective: string;
  steps: ActionStep[];
  reasoning: string;
  expectedOutcome: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  category: string;
  projectName?: string;
  domain?: string;
}

interface BusinessPlanViewProps {
  plan: ActionPlan;
  className?: string;
  /** When true, renders a print/export-friendly layout (no interactive charts) */
  forExport?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

export function BusinessPlanView({ plan, className = "", forExport = false }: BusinessPlanViewProps) {
  const completedCount = plan.steps.filter(
    (s) => s.completed || s.executionMetadata?.executionStatus === "published"
  ).length;
  const totalSteps = plan.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Priority distribution
  const priorityData = [
    { name: "High", value: plan.steps.filter((s) => s.priority === "high").length, color: PRIORITY_COLORS.high },
    { name: "Medium", value: plan.steps.filter((s) => s.priority === "medium").length, color: PRIORITY_COLORS.medium },
    { name: "Low", value: plan.steps.filter((s) => s.priority === "low").length, color: PRIORITY_COLORS.low },
  ].filter((d) => d.value > 0);

  // Completion status
  const completionData = [
    { name: "Completed", value: completedCount, color: "#22c55e" },
    { name: "Pending", value: totalSteps - completedCount, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  // Steps by priority (bar chart)
  const priorityBarData = [
    { name: "High", count: plan.steps.filter((s) => s.priority === "high").length },
    { name: "Medium", count: plan.steps.filter((s) => s.priority === "medium").length },
    { name: "Low", count: plan.steps.filter((s) => s.priority === "low").length },
  ].filter((d) => d.count > 0);

  // Steps by channel/platform
  const channelMap: Record<string, number> = {};
  plan.steps.forEach((s) => {
    const key = s.channel || s.platform || "General";
    channelMap[key] = (channelMap[key] || 0) + 1;
  });
  const channelBarData = Object.entries(channelMap).map(([name, count]) => ({
    name: name.replace(/_/g, " "),
    count,
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Executive Summary */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-accent-600 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Executive Summary
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.title}</h3>
            {plan.projectName && (
              <p className="text-sm text-primary-600 font-medium">{plan.projectName}</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objective</h4>
            <p className="text-gray-700">{plan.objective}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 font-medium">Timeline</div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900">{plan.timeline}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 font-medium">Category</div>
              <span className="font-semibold text-gray-900">{plan.category}</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 font-medium">Progress</div>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-gray-900">{completedCount}/{totalSteps} steps</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 font-medium">Completion</div>
              <span className="font-semibold text-green-600">{progressPct}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Goals & Metrics */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-accent-500 to-primary-500 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Goals & Metrics
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Distribution */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Steps by Priority</h4>
              {priorityBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={priorityBarData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Steps" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">No step data</p>
              )}
            </div>
            {/* Completion Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Completion Status</h4>
              {completionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {completionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">No step data</p>
              )}
            </div>
            {/* Steps by Channel / Platform */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Steps by Channel</h4>
              {channelBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={channelBarData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Steps" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">No channel data</p>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Overall Progress</span>
              <span className="font-bold text-primary-600">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Reasoning */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Strategic Reasoning
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Analysis</h4>
            <p className="text-gray-700 leading-relaxed">{plan.reasoning}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Expected Outcome
            </h4>
            <p className="text-gray-700 leading-relaxed">{plan.expectedOutcome}</p>
          </div>
        </div>
      </section>

      {/* Action Steps */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Action Steps ({completedCount}/{totalSteps} completed)
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {plan.steps.map((step, idx) => (
              <div
                key={step.id || idx}
                className={`border rounded-lg p-4 ${
                  step.completed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h5
                      className={`font-semibold ${
                        step.completed ? "text-green-900 line-through" : "text-gray-900"
                      }`}
                    >
                      {idx + 1}. {step.step}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          step.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : step.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {step.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        Impact: <span className="font-medium text-gray-700">{step.estimatedImpact}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
