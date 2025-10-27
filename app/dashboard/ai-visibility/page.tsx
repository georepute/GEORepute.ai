"use client";

import { motion } from "framer-motion";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Search,
  MessageSquare,
  Sparkles,
  Eye,
  Target,
  BarChart3
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export default function AIVisibility() {
  const aiPlatforms = [
    { 
      name: "ChatGPT", 
      score: 85, 
      change: 5, 
      mentions: 234,
      citations: 45,
      icon: MessageSquare,
      color: "#10a37f",
      bgColor: "bg-green-100"
    },
    { 
      name: "Google Gemini", 
      score: 78, 
      change: 3, 
      mentions: 189,
      citations: 38,
      icon: Sparkles,
      color: "#4285f4",
      bgColor: "bg-blue-100"
    },
    { 
      name: "Perplexity AI", 
      score: 82, 
      change: -2, 
      mentions: 167,
      citations: 52,
      icon: Search,
      color: "#ec4899",
      bgColor: "bg-pink-100"
    },
    { 
      name: "Claude AI", 
      score: 71, 
      change: 4, 
      mentions: 143,
      citations: 29,
      icon: Brain,
      color: "#f59e0b",
      bgColor: "bg-orange-100"
    },
    { 
      name: "Microsoft Copilot", 
      score: 68, 
      change: 2, 
      mentions: 128,
      citations: 31,
      icon: MessageSquare,
      color: "#0078d4",
      bgColor: "bg-blue-100"
    },
    { 
      name: "You.com", 
      score: 75, 
      change: 6, 
      mentions: 156,
      citations: 41,
      icon: Search,
      color: "#8b5cf6",
      bgColor: "bg-purple-100"
    },
  ];

  const visibilityTrend = [
    { month: "May", chatgpt: 72, gemini: 68, perplexity: 70, claude: 62 },
    { month: "Jun", chatgpt: 76, gemini: 71, perplexity: 74, claude: 65 },
    { month: "Jul", chatgpt: 79, gemini: 74, perplexity: 78, claude: 67 },
    { month: "Aug", chatgpt: 82, gemini: 76, perplexity: 80, claude: 69 },
    { month: "Sep", chatgpt: 83, gemini: 77, perplexity: 81, claude: 70 },
    { month: "Oct", chatgpt: 85, gemini: 78, perplexity: 82, claude: 71 },
  ];

  const competitorData = [
    { subject: "Mentions", yourBrand: 85, competitor1: 72, competitor2: 68 },
    { subject: "Citations", yourBrand: 78, competitor1: 82, competitor2: 65 },
    { subject: "Authority", yourBrand: 92, competitor1: 75, competitor2: 78 },
    { subject: "Recency", yourBrand: 88, competitor1: 70, competitor2: 72 },
    { subject: "Context", yourBrand: 80, competitor1: 77, competitor2: 75 },
  ];

  const topQueries = [
    { query: "best AI SEO tools", mentions: 45, platforms: ["ChatGPT", "Gemini", "Perplexity"] },
    { query: "generative engine optimization", mentions: 38, platforms: ["ChatGPT", "Claude"] },
    { query: "AI-driven reputation management", mentions: 32, platforms: ["Gemini", "Perplexity"] },
    { query: "SEO automation tools", mentions: 29, platforms: ["ChatGPT", "Copilot"] },
    { query: "digital visibility optimization", mentions: 27, platforms: ["Perplexity", "You.com"] },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Engine Visibility</h1>
        <p className="text-gray-600">Track your presence across AI-powered search platforms</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Eye className="w-8 h-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">78%</div>
          <p className="text-gray-600">Avg. Visibility Score</p>
          <div className="flex items-center gap-1 text-sm text-green-600 font-semibold mt-2">
            <TrendingUp className="w-4 h-4" />
            +4.2% vs last month
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">1,047</div>
          <p className="text-gray-600">Total Mentions</p>
          <div className="flex items-center gap-1 text-sm text-green-600 font-semibold mt-2">
            <TrendingUp className="w-4 h-4" />
            +12% this week
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Target className="w-8 h-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">236</div>
          <p className="text-gray-600">Citations</p>
          <div className="flex items-center gap-1 text-sm text-green-600 font-semibold mt-2">
            <TrendingUp className="w-4 h-4" />
            +8% this week
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Sparkles className="w-8 h-8 text-orange-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">15</div>
          <p className="text-gray-600">AI Platforms</p>
          <div className="flex items-center gap-1 text-sm text-gray-600 font-semibold mt-2">
            <span>+3 new this month</span>
          </div>
        </motion.div>
      </div>

      {/* Platform Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {aiPlatforms.map((platform, index) => {
          const Icon = platform.icon;
          return (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${platform.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6" style={{ color: platform.color }} />
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  platform.change > 0 ? "bg-green-100 text-green-700" : platform.change < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                }`}>
                  {platform.change > 0 ? <TrendingUp className="w-4 h-4" /> : platform.change < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                  {platform.change > 0 ? "+" : ""}{platform.change}%
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{platform.name}</h3>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Visibility Score</span>
                  <span className="text-2xl font-bold text-gray-900">{platform.score}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${platform.score}%` }}
                    transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Mentions</p>
                  <p className="font-bold text-gray-900">{platform.mentions}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Citations</p>
                  <p className="font-bold text-gray-900">{platform.citations}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Visibility Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Visibility Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visibilityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="chatgpt" stroke="#10a37f" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="gemini" stroke="#4285f4" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="perplexity" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="claude" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#10a37f" }}></div>
              <span>ChatGPT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#4285f4" }}></div>
              <span>Gemini</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ec4899" }}></div>
              <span>Perplexity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }}></div>
              <span>Claude</span>
            </div>
          </div>
        </motion.div>

        {/* Competitor Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Competitor Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={competitorData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" stroke="#6b7280" />
              <PolarRadiusAxis stroke="#6b7280" />
              <Radar name="Your Brand" dataKey="yourBrand" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
              <Radar name="Competitor 1" dataKey="competitor1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              <Radar name="Competitor 2" dataKey="competitor2" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Your Brand</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Competitor 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span>Competitor 2</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Queries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Top Queries Mentioning Your Brand</h2>
        <div className="space-y-4">
          {topQueries.map((query, index) => (
            <div key={query.query} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{query.query}</span>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  {query.platforms.map((platform) => (
                    <span key={platform} className="px-2 py-1 bg-white text-xs font-medium text-gray-700 rounded">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{query.mentions}</div>
                <div className="text-sm text-gray-600">mentions</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Recommendation</h3>
            <p className="text-gray-700 leading-relaxed">
              Your ChatGPT visibility has increased by 5% this week, driven by mentions in technical documentation. 
              Consider expanding content on "generative engine optimization" to capitalize on this momentum across 
              other AI platforms. Perplexity shows strong citation potential with 52 backlinks.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

