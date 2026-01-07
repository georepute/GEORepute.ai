"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown,
  Search,
  Award,
  Target,
  Calendar,
  Filter,
  Download
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/lib/language-context";

export default function Rankings() {
  const { isRtl, t } = useLanguage();
  const rankingHistory = [
    { date: "Week 1", position: 45, competitors: 52 },
    { date: "Week 2", position: 38, competitors: 48 },
    { date: "Week 3", position: 32, competitors: 45 },
    { date: "Week 4", position: 28, competitors: 42 },
    { date: "Week 5", position: 21, competitors: 39 },
    { date: "Week 6", position: 15, competitors: 38 },
    { date: "Week 7", position: 11, competitors: 36 },
    { date: "Week 8", position: 7, competitors: 34 },
  ];

  const topRankings = [
    { keyword: "AI SEO tools", position: 3, previousPosition: 5, url: "/blog/ai-seo-tools", impressions: 12400, clicks: 1860 },
    { keyword: "generative engine optimization", position: 1, previousPosition: 1, url: "/services/geo", impressions: 3200, clicks: 896 },
    { keyword: "AI-driven visibility", position: 4, previousPosition: 6, url: "/solutions/visibility", impressions: 5600, clicks: 728 },
    { keyword: "reputation management AI", position: 7, previousPosition: 10, url: "/features/reputation", impressions: 8900, clicks: 623 },
    { keyword: "SEO automation platform", position: 6, previousPosition: 7, url: "/platform", impressions: 7200, clicks: 864 },
    { keyword: "AI search optimization", position: 5, previousPosition: 4, url: "/blog/ai-search", impressions: 6100, clicks: 915 },
    { keyword: "digital visibility tools", position: 8, previousPosition: 9, url: "/tools", impressions: 4800, clicks: 528 },
    { keyword: "content optimization AI", position: 9, previousPosition: 12, url: "/features/content", impressions: 5400, clicks: 486 },
  ];

  const stats = [
    { label: "Avg. Position", value: "7.2", change: "-2.3", icon: Target, color: "text-blue-600" },
    { label: "Top 3 Rankings", value: "23", change: "+5", icon: Award, color: "text-green-600" },
    { label: "Total Impressions", value: "234K", change: "+18%", icon: TrendingUp, color: "text-purple-600" },
    { label: "Total Clicks", value: "18.5K", change: "+22%", icon: Search, color: "text-orange-600" },
  ];

  const getPositionChange = (current: number, previous: number) => {
    const change = previous - current;
    if (change > 0) return { value: change, type: "up" };
    if (change < 0) return { value: Math.abs(change), type: "down" };
    return { value: 0, type: "stable" };
  };

  const getPositionBadgeColor = (position: number) => {
    if (position <= 3) return "bg-green-100 text-green-700 border-green-300";
    if (position <= 10) return "bg-blue-100 text-blue-700 border-blue-300";
    if (position <= 20) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-gray-100 text-gray-700 border-gray-300";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.dashboard.rankings.title}</h1>
        <p className="text-gray-600">{t.dashboard.rankings.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              <span className={`text-sm font-semibold ${
                stat.change.startsWith('+') || stat.change.startsWith('-') && !stat.change.includes('-2') 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-gray-600">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Ranking Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-6 border border-gray-200 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Average Position Trend</h2>
            <p className="text-sm text-gray-600">Lower is better</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              7 Days
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg">
              30 Days
            </button>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              90 Days
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={rankingHistory}>
            <defs>
              <linearGradient id="colorPosition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompetitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" reversed domain={[0, 60]} />
            <Tooltip />
            <Area type="monotone" dataKey="position" stroke="#0ea5e9" strokeWidth={3} fill="url(#colorPosition)" />
            <Area type="monotone" dataKey="competitors" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorCompetitors)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Your Position</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span>Avg. Competitor</span>
          </div>
        </div>
      </motion.div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-3 flex-1">
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5" />
              <span>Date Range</span>
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </button>
          </div>
          <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
            <Download className="w-5 h-5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Rankings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Keyword</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Position</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Change</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">URL</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Impressions</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Clicks</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">CTR</th>
              </tr>
            </thead>
            <tbody>
              {topRankings.map((item, index) => {
                const change = getPositionChange(item.position, item.previousPosition);
                const ctr = ((item.clicks / item.impressions) * 100).toFixed(1);

                return (
                  <motion.tr
                    key={item.keyword}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{item.keyword}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[40px] h-8 rounded-full border-2 font-bold text-sm px-2 ${getPositionBadgeColor(item.position)}`}>
                        #{item.position}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {change.type === "up" ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          +{change.value}
                        </span>
                      ) : change.type === "down" ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <TrendingDown className="w-4 h-4" />
                          -{change.value}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-600 font-mono">{item.url}</span>
                    </td>
                    <td className="py-4 px-6 text-right text-gray-900 font-medium">
                      {item.impressions.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right text-gray-900 font-medium">
                      {item.clicks.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-gray-900">{ctr}%</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* AI Insight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Performance Insight</h3>
            <p className="text-gray-700 leading-relaxed">
              Excellent progress! Your average position improved by 2.3 spots this month. Focus on "AI SEO tools" 
              and "reputation management AI" - they're trending upward and have high click-through rates. 
              Continue optimizing content for these keywords to reach the top 3.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

