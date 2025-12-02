"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  BarChart3,
  Search,
  Activity,
  Users,
  Zap,
  Globe,
  Calendar,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { format } from "date-fns";

// Color palette for charts
const COLORS = {
  primary: "#0ea5e9",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
};

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: "#10a37f",
  claude: "#8b5cf6",
  gemini: "#4285f4",
  perplexity: "#00b4d8",
  groq: "#f97316",
  google: "#4285f4",
  bing: "#008373",
  reddit: "#ff4500",
  quora: "#b92b27",
  medium: "#000000",
  linkedin: "#0077b5",
  facebook: "#1877f2",
  github: "#333333",
};

interface ReportData {
  id: string;
  title: string;
  date_range: string;
  generated_at: string;
  // Keywords
  total_keywords: number;
  keywords_change: number;
  avg_ranking: number;
  ranking_change: number;
  top_keywords: Array<{
    keyword: string;
    ranking: number;
    volume: number;
    change: number;
  }>;
  ranking_trend: Array<{
    date: string;
    avgRank: number;
    count: number;
  }>;
  // Content
  total_content: number;
  content_change: number;
  published_content: number;
  draft_content: number;
  content_by_platform: Array<{
    platform: string;
    count: number;
    color: string;
  }>;
  content_by_status: Array<{
    status: string;
    count: number;
  }>;
  recent_content: Array<{
    title: string;
    platform: string;
    status: string;
    created: string;
  }>;
  // AI Visibility
  avg_visibility_score: number;
  visibility_change: number;
  total_mentions: number;
  mentions_change: number;
  visibility_by_platform: Array<{
    platform: string;
    score: number;
    mentions: number;
    sentiment: number;
  }>;
  visibility_trend: Array<{
    date: string;
    score: number;
  }>;
  // Brand Analysis
  total_projects: number;
  active_sessions: number;
  total_responses: number;
  responses_by_platform: Array<{
    platform: string;
    count: number;
  }>;
  // Performance Summary
  performance_summary: Array<{
    metric: string;
    value: number;
    target: number;
  }>;
  view_count: number;
}

export default function PublicReport({ params }: { params: { shareToken: string } }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reportId = params.shareToken;

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/public/${reportId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load report");
      }

      setReportData(result.report);
    } catch (error: any) {
      console.error("Error loading report:", error);
      setError(error.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-12 w-96 bg-gray-200 rounded mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Report Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "This report doesn't exist or has been removed."}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {reportData.title}
                  </h1>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{reportData.date_range}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Eye className="w-4 h-4" />
                      <span>{reportData.view_count} views</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-500">Generated</div>
                <div className="text-sm font-semibold text-gray-900">
                  {format(new Date(reportData.generated_at), "MMM dd, yyyy")}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Globe className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Public Report</h3>
              <p className="text-sm text-gray-600">
                This is a publicly shared performance report generated by GeoRepute.ai.
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            label="Total Keywords"
            value={reportData.total_keywords.toString()}
            change={reportData.keywords_change}
            icon={Target}
            color="blue"
          />
          <MetricCard
            label="Average Ranking"
            value={reportData.avg_ranking.toFixed(1)}
            change={reportData.ranking_change}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            label="Total Content"
            value={reportData.total_content.toString()}
            change={reportData.content_change}
            icon={FileText}
            color="green"
          />
          <MetricCard
            label="AI Visibility"
            value={`${reportData.avg_visibility_score.toFixed(1)}%`}
            change={reportData.visibility_change}
            icon={Eye}
            color="orange"
          />
        </div>

        {/* Ranking Trend Chart */}
        {reportData.ranking_trend.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-200 mb-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Ranking Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={reportData.ranking_trend}>
                <defs>
                  <linearGradient id="colorRank" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="avgRank"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorRank)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Top Keywords */}
        {reportData.top_keywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 border border-gray-200 mb-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Top Keywords Performance
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Keyword
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Ranking
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Volume
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.top_keywords.map((kw, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {kw.keyword}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-primary-600">
                          {kw.ranking.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {kw.volume.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            kw.change > 0
                              ? "bg-green-100 text-green-700"
                              : kw.change < 0
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {kw.change > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : kw.change < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {Math.abs(kw.change)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Content Distribution */}
        {reportData.content_by_platform.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Content by Platform */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Content by Platform
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.content_by_platform}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ platform, percent }: any) =>
                      `${platform}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {reportData.content_by_platform.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {reportData.content_by_platform.map((platform) => (
                  <div
                    key={platform.platform}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-gray-700 capitalize">
                      {platform.platform}
                    </span>
                    <span className="font-semibold text-gray-900 ml-auto">
                      {platform.count}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Content Status */}
            {reportData.content_by_status.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Content Status Distribution
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.content_by_status}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="status" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Published</p>
                    <p className="text-2xl font-bold text-green-600">
                      {reportData.published_content}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Draft</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {reportData.draft_content}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* AI Visibility Trend */}
        {reportData.visibility_trend.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl p-6 border border-gray-200 mb-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              AI Visibility Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.visibility_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={COLORS.info}
                  strokeWidth={3}
                  dot={{ fill: COLORS.info, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* AI Platform Visibility */}
        {reportData.visibility_by_platform.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl p-6 border border-gray-200 mb-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              AI Platform Visibility Performance
            </h2>
            
            {/* Radar Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={reportData.visibility_by_platform.slice(0, 6)}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="platform" stroke="#6b7280" />
                <PolarRadiusAxis stroke="#6b7280" />
                <Radar
                  name="Visibility Score"
                  dataKey="score"
                  stroke={COLORS.secondary}
                  fill={COLORS.secondary}
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>

            {/* Platform Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {reportData.visibility_by_platform.map((platform, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-gray-900 capitalize">
                      {platform.platform}
                    </div>
                    <div className="text-2xl font-bold text-primary-600">
                      {platform.score.toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Mentions:</span>
                      <span className="font-semibold">{platform.mentions}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Sentiment:</span>
                      <span className="font-semibold">
                        {platform.sentiment.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all"
                      style={{ width: `${platform.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Brand Analysis Responses by Platform */}
        {reportData.responses_by_platform.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-xl p-6 border border-gray-200 mb-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Brand Analysis: Platform Responses
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Projects</div>
                  <div className="text-2xl font-bold text-primary-600">
                    {reportData.total_projects}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Responses</div>
                  <div className="text-2xl font-bold text-secondary-600">
                    {reportData.total_responses}
                  </div>
                </div>
              </div>
            </div>

            {/* Responses Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.responses_by_platform}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="platform" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.info} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Platform Response Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {reportData.responses_by_platform.map((platform, idx) => {
                const platformColor = PLATFORM_COLORS[platform.platform.toLowerCase()] || COLORS.secondary;
                const totalResponses = reportData.total_responses || 1;
                const percentage = ((platform.count / totalResponses) * 100).toFixed(1);
                
                return (
                  <motion.div
                    key={platform.platform}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + idx * 0.1 }}
                    className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: platformColor + '20' }}
                        >
                          <Globe 
                            className="w-5 h-5" 
                            style={{ color: platformColor }}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">
                            {platform.platform}
                          </p>
                          <p className="text-xs text-gray-500">
                            {percentage}% of total
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {platform.count}
                        </p>
                        <p className="text-xs text-gray-500">responses</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 1.3 }}
                        className="h-2 rounded-full"
                        style={{ backgroundColor: platformColor }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Analysis Coverage
                    </p>
                    <p className="text-xs text-gray-600">
                      Comprehensive monitoring across {reportData.responses_by_platform.length} AI platforms
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Average per platform</p>
                  <p className="text-xl font-bold text-primary-600">
                    {(reportData.total_responses / Math.max(reportData.responses_by_platform.length, 1)).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Performance Summary Radar */}
        {reportData.performance_summary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-xl p-6 border border-gray-200 mb-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Performance Summary
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={reportData.performance_summary}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                <PolarRadiusAxis stroke="#6b7280" />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke={COLORS.success}
                  fill={COLORS.success}
                  fillOpacity={0.6}
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke={COLORS.warning}
                  fill={COLORS.warning}
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full border border-gray-200 shadow-sm">
            <span className="text-sm text-gray-600">Powered by</span>
            <span className="text-sm font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              GeoRepute.ai
            </span>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            © {new Date().getFullYear()} GeoRepute.ai. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  icon: any;
  color: "blue" | "purple" | "green" | "orange";
}

function MetricCard({ label, value, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color].bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].text}`} />
        </div>
        {change !== 0 && (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              change > 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </motion.div>
  );
}
