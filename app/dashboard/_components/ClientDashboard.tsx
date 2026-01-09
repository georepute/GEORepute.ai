"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Target, 
  Brain,
  Search,
  ArrowUpRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/lib/language-context";

export default function ClientDashboard({ user }: { user: any }) {
  const { isRtl, t } = useLanguage();
  // Sample data for client view
  const rankingData = [
    { date: "Jan", google: 45, ai: 25 },
    { date: "Feb", google: 52, ai: 35 },
    { date: "Mar", google: 61, ai: 48 },
    { date: "Apr", google: 73, ai: 62 },
    { date: "May", google: 82, ai: 75 },
    { date: "Jun", google: 91, ai: 88 },
  ];

  const visibilityData = [
    { platform: "GPT-4", score: 85, color: "#3b82f6" },
    { platform: "Gemini", score: 78, color: "#8b5cf6" },
    { platform: "Perplexity", score: 82, color: "#14b8a6" },
    { platform: "Claude", score: 71, color: "#ec4899" },
  ];

  const keywordData = [
    { keyword: "AI SEO tools", position: 3, change: 2, volume: 8900 },
    { keyword: "GEO optimization", position: 1, change: 0, volume: 3200 },
    { keyword: "AI search visibility", position: 5, change: -1, volume: 5400 },
  ];

  const stats = [
    {
      label: t.dashboard.client.totalVisibility,
      value: "91%",
      change: "+12%",
      trend: "up",
      icon: Eye,
      color: "text-primary-600",
      bgColor: "bg-primary-100",
    },
    {
      label: t.dashboard.client.keywordsTracked,
      value: "247",
      change: "+23",
      trend: "up",
      icon: Target,
      color: "text-secondary-600",
      bgColor: "bg-secondary-100",
    },
    {
      label: t.dashboard.client.aiPlatforms,
      value: "15",
      change: "+3",
      trend: "up",
      icon: Brain,
      color: "text-accent-600",
      bgColor: "bg-accent-100",
    },
    {
      label: t.dashboard.client.avgPosition,
      value: "3.2",
      change: "-0.8",
      trend: "up",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t.dashboard.client.welcomeBack}, {user?.user_metadata?.full_name || t.dashboard.client.welcomeDefault}! 👋
        </h1>
        <p className="text-gray-600">{t.dashboard.client.visibilityPerformance}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                stat.trend === "up" ? "text-green-600" : "text-red-600"
              }`}>
                {stat.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {stat.change}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Split View: Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Visibility Trends */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard.client.visibilityTrends}</h2>
              <p className="text-sm text-gray-600">{t.dashboard.client.last6Months}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={rankingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="google" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="ai" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Platform Visibility */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard.client.aiPlatformVisibility}</h2>
              <p className="text-sm text-gray-600">{t.dashboard.client.scoreAcrossPlatforms}</p>
            </div>
          </div>
          <div className="space-y-4">
            {visibilityData.map((platform, index) => (
              <motion.div
                key={platform.platform}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5" style={{ color: platform.color }} />
                    <span className="font-medium text-gray-900">{platform.platform}</span>
                  </div>
                  <span className="font-bold text-gray-900">{platform.score}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${platform.score}%` }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Keywords */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t.dashboard.client.topKeywords}</h2>
            <p className="text-sm text-gray-600">{t.dashboard.client.bestPerforming}</p>
          </div>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            {t.dashboard.client.viewAllKeywords}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-600`}>{t.dashboard.sidebar.keywords}</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">{t.dashboard.client.position}</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">{t.dashboard.client.change}</th>
                <th className={`${isRtl ? 'text-left' : 'text-right'} py-3 px-4 text-sm font-semibold text-gray-600`}>{t.dashboard.client.volume}</th>
              </tr>
            </thead>
            <tbody>
              {keywordData.map((item, index) => (
                <motion.tr
                  key={item.keyword}
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{item.keyword}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full font-bold text-sm">
                      {item.position}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      item.change > 0 ? "text-green-600" : item.change < 0 ? "text-red-600" : "text-gray-600"
                    }`}>
                      {item.change > 0 ? <TrendingUp className="w-4 h-4" /> : item.change < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                      {item.change !== 0 && Math.abs(item.change)}
                    </span>
                  </td>
                  <td className={`py-4 px-4 ${isRtl ? 'text-left' : 'text-right'} text-gray-900 font-medium`}>
                    {item.volume.toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}


