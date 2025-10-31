"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  Target,
  TrendingUp,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";

interface ActionStep {
  step: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  completed: boolean;
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
  createdAt: Date;
  expanded: boolean;
}

export default function ActionPlansPage() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [objective, setObjective] = useState("");
  const [keywords, setKeywords] = useState("");

  const generateActionPlan = async () => {
    if (!objective.trim()) {
      toast.error("Please enter an objective");
      return;
    }

    setLoading(true);
    try {
      // REAL AI Action Plan Generation using OpenAI GPT-4 Turbo
      const response = await fetch('/api/geo-core/action-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objective: objective,
          targetKeywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to generate action plan');
      }

      const newPlan: ActionPlan = {
        id: data.planId || Date.now().toString(),
        title: data.title,
        objective: data.objective,
        steps: data.steps.map((step: any) => ({
          ...step,
          completed: false,
        })),
        reasoning: data.reasoning,
        expectedOutcome: data.expectedOutcome,
        timeline: data.timeline,
        priority: data.priority,
        category: data.category,
        createdAt: new Date(),
        expanded: true,
      };

      setPlans([newPlan, ...plans]);
      toast.success("AI Action plan generated!");
      setObjective("");
      setKeywords("");
    } catch (error: any) {
      console.error("Action plan error:", error);
      toast.error(error.message || "Failed to generate action plan. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (planId: string) => {
    setPlans(
      plans.map((p) =>
        p.id === planId ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  const toggleStep = (planId: string, stepIndex: number) => {
    setPlans(
      plans.map((p) =>
        p.id === planId
          ? {
              ...p,
              steps: p.steps.map((s, idx) =>
                idx === stepIndex ? { ...s, completed: !s.completed } : s
              ),
            }
          : p
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-500 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI Action Plans
            </h1>
            <p className="text-gray-600 mt-1">
              Dynamic, AI-generated strategies with step-by-step execution
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-50 to-primary-50 border border-accent-200 rounded-lg p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Strategic AI Orchestrator</span>:
              Uses OpenAI GPT-4 Turbo to analyze your goals and generate actionable plans with reasoning,
              priorities, and expected outcomes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Generation Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-600" />
              Generate Plan
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objective / Goal *
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g., Improve local SEO rankings for my restaurant"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Keywords (optional)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., local seo, google maps"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>

              <Button
                onClick={generateActionPlan}
                disabled={loading || !objective.trim()}
                variant="primary"
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Generate AI Action Plan
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                ⚡ Powered by OpenAI GPT-4 Turbo
              </div>
            </div>

            {/* Stats */}
            {plans.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Plans</span>
                    <span className="font-bold text-gray-900">
                      {plans.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">High Priority</span>
                    <span className="font-bold text-red-600">
                      {plans.filter((p) => p.priority === "high").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avg. Steps</span>
                    <span className="font-bold text-gray-900">
                      {plans.length > 0
                        ? Math.round(
                            plans.reduce((acc, p) => acc + p.steps.length, 0) /
                              plans.length
                          )
                        : 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Plans List */}
        <div className="lg:col-span-2">
          {plans.length === 0 && !loading && (
            <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No action plans yet</p>
              <p className="text-sm text-gray-500">
                Enter your objective and let AI generate a strategic plan
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <div className="w-12 h-12 border-4 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">
                AI crafting your action plan...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Analyzing strategy and generating steps
              </p>
            </div>
          )}

          {plans.length > 0 && !loading && (
            <div className="space-y-4">
              {plans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    {/* Plan Header */}
                    <div
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => togglePlan(plan.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`px-2 py-1 rounded-full border text-xs font-semibold ${getPriorityColor(
                                plan.priority
                              )}`}
                            >
                              {plan.priority.toUpperCase()}
                            </div>
                            <div className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                              {plan.category}
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {plan.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {plan.timeline}
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              {
                                plan.steps.filter((s) => s.completed).length
                              }/{plan.steps.length} completed
                            </div>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          {plan.expanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {plan.expanded && (
                      <div className="border-t border-gray-200">
                        {/* AI Reasoning */}
                        <div className="p-6 bg-gradient-to-r from-accent-50 to-primary-50 border-b border-gray-200">
                          <div className="flex items-start gap-2 mb-3">
                            <Zap className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-accent-900 mb-1">
                                AI Strategic Reasoning
                              </div>
                              <p className="text-sm text-gray-700">
                                {plan.reasoning}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-green-900 mb-1">
                                Expected Outcome
                              </div>
                              <p className="text-sm text-gray-700">
                                {plan.expectedOutcome}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Steps */}
                        <div className="p-6">
                          <h4 className="text-sm font-bold text-gray-900 mb-4">
                            Action Steps
                          </h4>
                          <div className="space-y-3">
                            {plan.steps.map((step, stepIdx) => (
                              <div
                                key={stepIdx}
                                className={`border rounded-lg p-4 transition-all ${
                                  step.completed
                                    ? "bg-green-50 border-green-200"
                                    : "bg-white border-gray-200 hover:border-accent-300"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() =>
                                      toggleStep(plan.id, stepIdx)
                                    }
                                    className="mt-0.5 flex-shrink-0"
                                  >
                                    {step.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-gray-400 hover:text-accent-600 transition-colors" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h5
                                        className={`font-semibold text-sm ${
                                          step.completed
                                            ? "text-green-900 line-through"
                                            : "text-gray-900"
                                        }`}
                                      >
                                        {stepIdx + 1}. {step.step}
                                      </h5>
                                      <div
                                        className={`px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 ${getPriorityColor(
                                          step.priority
                                        )}`}
                                      >
                                        {step.priority}
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      {step.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500">
                                        Impact:
                                      </span>
                                      <span className="font-semibold text-green-700">
                                        {step.estimatedImpact}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

