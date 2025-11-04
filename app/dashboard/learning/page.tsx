"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Calendar,
  Settings,
  Zap,
  Award,
  Activity,
} from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Learning {
  id: string;
  action_type: string;
  success_score: number;
  insights: string[];
  recommendations: string[];
  applied_to_future: boolean;
  created_at: string;
  input_data: any;
  outcome_data: any;
}

interface LearningRule {
  id: string;
  rule_type: string;
  platform?: string;
  keyword?: string;
  action: Record<string, any>;
  success_count: number;
  failure_count: number;
  last_applied?: string;
  applied_to_future: boolean;
  created_at: string;
}

export default function LearningDashboard() {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [rules, setRules] = useState<LearningRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"learnings" | "rules">("learnings");
  const [stats, setStats] = useState({
    totalLearnings: 0,
    avgSuccessScore: 0,
    appliedRules: 0,
    topInsight: "",
    totalRules: 0,
    successRate: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load learnings
      const learningsResponse = await fetch("/api/geo-core/learning");
      let learningsData: any = { learnings: [] };
      if (learningsResponse.ok) {
        learningsData = await learningsResponse.json();
        setLearnings(learningsData.learnings || []);
      }

      // Load rules
      const rulesResponse = await fetch("/api/geo-core/learning-rules");
      let rulesData: any = { rules: [], insights: null };
      if (rulesResponse.ok) {
        rulesData = await rulesResponse.json();
        setRules(rulesData.rules || []);
        if (rulesData.insights) {
          setStats((prev) => ({
            ...prev,
            successRate: rulesData.insights.successRate || 0,
          }));
        }
      }

      // Calculate stats
      if (learningsData?.learnings && learningsData.learnings.length > 0) {
        const total = learningsData.learnings.length;
        const avgScore = learningsData.learnings.reduce(
          (sum: number, l: Learning) => sum + (l.success_score || 0),
          0
        ) / total;
        const applied = learningsData.learnings.filter(
          (l: Learning) => l.applied_to_future
        ).length;
        const topInsight =
          learningsData.learnings[0]?.insights?.[0] || "No insights yet";

        setStats({
          totalLearnings: total,
          avgSuccessScore: Math.round(avgScore),
          appliedRules: applied,
          topInsight,
          totalRules: rulesData?.rules?.length || 0,
          successRate: rulesData?.insights?.successRate || 0,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load learning data");
    } finally {
      setLoading(false);
    }
  };

  const getSuccessColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-100";
    if (score >= 50) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const handleRuleAction = async (ruleId: string, action: "enable" | "disable" | "delete") => {
    try {
      const response = await fetch("/api/geo-core/learning-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, action }),
      });

      if (response.ok) {
        toast.success(`Rule ${action}d successfully`);
        loadData();
      } else {
        toast.error(`Failed to ${action} rule`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing rule`);
    }
  };

  // Chart data for success scores over time
  const successScoreChartData = learnings
    .slice(0, 10)
    .reverse()
    .map((l, idx) => ({
      name: `Learning ${idx + 1}`,
      score: l.success_score,
      date: new Date(l.created_at).toLocaleDateString(),
    }));

  // Rule performance chart
  const rulePerformanceData = rules
    .slice(0, 10)
    .map((r) => ({
      name: r.rule_type.replace("_", " ").substring(0, 15),
      success: r.success_count,
      failure: r.failure_count,
      successRate: r.success_count + r.failure_count > 0
        ? Math.round((r.success_count / (r.success_count + r.failure_count)) * 100)
        : 0,
    }));

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Self-Learning Insights
              </h1>
              <p className="text-gray-600 mt-1">
                AI-powered continuous improvement system
              </p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <Brain className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Auto-Learning System</span>: The
              system automatically analyzes outcomes, learns from results, and
              applies insights to improve future content and strategies. Learning
              is triggered from ranking updates, content performance, and traffic changes.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalLearnings}
          </div>
          <div className="text-sm text-gray-600">Total Learnings</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.avgSuccessScore}
          </div>
          <div className="text-sm text-gray-600">Avg. Success Score</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalRules}
          </div>
          <div className="text-sm text-gray-600">Active Rules</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.successRate}%
          </div>
          <div className="text-sm text-gray-600">Rule Success Rate</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Success Score Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Success Score Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={successScoreChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#8b5cf6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Rule Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Rule Performance
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={rulePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip />
              <Bar dataKey="success" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failure" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("learnings")}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "learnings"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Historical Learnings ({learnings.length})
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Active Rules ({rules.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "learnings" && (
        <div className="space-y-4">
          {learnings.length === 0 ? (
            <Card className="p-12 text-center">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Learning Data Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Learning insights will appear here as the system analyzes
                outcomes from your content and keyword strategies.
              </p>
              <p className="text-sm text-gray-500">
                The system automatically learns when:
              </p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1">
                <li>• Rankings are updated</li>
                <li>• Content performance data is available</li>
                <li>• You manually submit learning data</li>
              </ul>
            </Card>
          ) : (
            learnings.map((learning, idx) => (
              <motion.div
                key={learning.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                          {learning.action_type.replace("_", " ").toUpperCase()}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getSuccessColor(
                            learning.success_score
                          )}`}
                        >
                          Score: {learning.success_score}/100
                        </span>
                        {learning.applied_to_future && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Auto-Applied
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(learning.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Insights */}
                  {learning.insights && learning.insights.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        Key Insights
                      </h4>
                      <ul className="space-y-1">
                        {learning.insights.map((insight, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-700 flex items-start gap-2"
                          >
                            <span className="text-yellow-500 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {learning.recommendations &&
                    learning.recommendations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {learning.recommendations.map((rec, i) => (
                            <li
                              key={i}
                              className="text-sm text-gray-700 flex items-start gap-2"
                            >
                              <span className="text-blue-500 mt-1">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Applied Status */}
                  {learning.applied_to_future && (
                    <div className="mt-4 pt-4 border-t border-gray-200 bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold">
                          This learning is automatically applied to future
                          {learning.action_type === "content_generation"
                            ? " content generation"
                            : " strategies"}
                          .
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <Card className="p-12 text-center">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Active Rules Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Active rules will appear here once learnings are automatically
                extracted and applied.
              </p>
              <p className="text-sm text-gray-500">
                Rules are automatically created when learnings have
                `applied_to_future: true`
              </p>
            </Card>
          ) : (
            rules.map((rule, idx) => {
              const successRate =
                rule.success_count + rule.failure_count > 0
                  ? Math.round(
                      (rule.success_count /
                        (rule.success_count + rule.failure_count)) *
                        100
                    )
                  : 0;

              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {rule.rule_type.replace("_", " ").toUpperCase()}
                          </span>
                          {rule.platform && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                              Platform: {rule.platform}
                            </span>
                          )}
                          {rule.keyword && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                              Keyword: {rule.keyword}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            Success: {rule.success_count} | Failure:{" "}
                            {rule.failure_count}
                          </span>
                          <span className="font-semibold text-green-600">
                            {successRate}% Success Rate
                          </span>
                          {rule.last_applied && (
                            <span>
                              Last applied:{" "}
                              {new Date(rule.last_applied).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleRuleAction(
                              rule.id,
                              rule.applied_to_future ? "disable" : "enable"
                            )
                          }
                          variant="outline"
                          size="sm"
                        >
                          {rule.applied_to_future ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRuleAction(rule.id, "delete")}
                          variant="outline"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Action Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">
                        Applied Actions:
                      </h5>
                      <div className="space-y-1">
                        {Object.entries(rule.action).map(([key, value]) => (
                          <div
                            key={key}
                            className="text-sm text-gray-700 flex items-center gap-2"
                          >
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="font-medium">{key}:</span>
                            <span>
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

