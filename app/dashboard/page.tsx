"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Target, 
  Users,
  ArrowUpRight,
  Brain,
  Search,
  Globe
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
} from "recharts";

export default function Dashboard() {
  // Sample data
  const rankingData = [
    { date: "Jan", google: 45, bing: 38, ai: 25 },
    { date: "Feb", google: 52, bing: 42, ai: 35 },
    { date: "Mar", google: 61, bing: 48, ai: 48 },
    { date: "Apr", google: 73, bing: 55, ai: 62 },
    { date: "May", google: 82, bing: 61, ai: 75 },
    { date: "Jun", google: 91, bing: 68, ai: 88 },
  ];

  const visibilityData = [
    { platform: "GPT-4", score: 85, color: "#0ea5e9" },
    { platform: "Gemini", score: 78, color: "#8b5cf6" },
    { platform: "Perplexity", score: 82, color: "#ec4899" },
    { platform: "Claude", score: 71, color: "#f59e0b" },
  ];

  const keywordData = [
    { keyword: "AI SEO tools", position: 3, change: 2, volume: 8900 },
    { keyword: "GEO optimization", position: 1, change: 0, volume: 3200 },
    { keyword: "AI search visibility", position: 5, change: -1, volume: 5400 },
    { keyword: "reputation management", position: 7, change: 3, volume: 12100 },
  ];

  const trafficSources = [
    { name: "Google", value: 45, color: "#0ea5e9" },
    { name: "AI Search", value: 30, color: "#8b5cf6" },
    { name: "Direct", value: 15, color: "#10b981" },
    { name: "Social", value: 10, color: "#f59e0b" },
  ];

  const stats = [
    {
      label: "Total Visibility",
      value: "91%",
      change: "+12%",
      trend: "up",
      icon: Eye,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Keywords Tracked",
      value: "247",
      change: "+23",
      trend: "up",
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      label: "AI Platforms",
      value: "15",
      change: "+3",
      trend: "up",
      icon: Brain,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Monthly Leads",
      value: "1,234",
      change: "+18%",
      trend: "up",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your visibility.</p>
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
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Visibility Trends</h2>
              <p className="text-sm text-gray-600">Last 6 months performance</p>
            </div>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View Details
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={rankingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="google" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
              <Area type="monotone" dataKey="bing" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="ai" stackId="1" stroke="#ec4899" fill="#ec4899" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Google</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Bing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span className="text-gray-600">AI Search</span>
            </div>
          </div>
        </motion.div>

        {/* AI Platform Visibility */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Platform Visibility</h2>
              <p className="text-sm text-gray-600">Current visibility scores</p>
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
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Pro Tip:</span> Your AI visibility is 23% above industry average. Keep up the great work!
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Keywords */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Top Performing Keywords</h2>
              <p className="text-sm text-gray-600">Your best ranking keywords this month</p>
            </div>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Keyword</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Position</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Change</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Volume</th>
                </tr>
              </thead>
              <tbody>
                {keywordData.map((item, index) => (
                  <motion.tr
                    key={item.keyword}
                    initial={{ opacity: 0, x: -20 }}
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
                    <td className="py-4 px-4 text-right text-gray-900 font-medium">
                      {item.volume.toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Traffic Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Traffic Sources</h2>
            <p className="text-sm text-gray-600">Where your visitors come from</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={trafficSources}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {trafficSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-4">
            {trafficSources.map((source) => (
              <div key={source.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                  <span className="text-sm text-gray-700">{source.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{source.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

