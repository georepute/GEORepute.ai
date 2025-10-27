"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  Target,
  Plus,
  Filter,
  Download,
  BarChart3,
  Eye,
  DollarSign
} from "lucide-react";

export default function Keywords() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const keywords = [
    { keyword: "AI SEO tools", position: 3, change: 2, volume: 8900, difficulty: 72, roi: "High", forecast: "+5 positions" },
    { keyword: "GEO optimization", position: 1, change: 0, volume: 3200, difficulty: 45, roi: "Very High", forecast: "Maintain" },
    { keyword: "AI search visibility", position: 5, change: -1, volume: 5400, difficulty: 68, roi: "High", forecast: "+3 positions" },
    { keyword: "reputation management", position: 7, change: 3, volume: 12100, difficulty: 81, roi: "Medium", forecast: "+2 positions" },
    { keyword: "generative engine optimization", position: 2, change: 1, volume: 1800, difficulty: 52, roi: "Very High", forecast: "#1 in 2 weeks" },
    { keyword: "AI-driven visibility", position: 4, change: 2, volume: 4200, difficulty: 58, roi: "High", forecast: "+4 positions" },
    { keyword: "digital reputation control", position: 8, change: 0, volume: 6700, difficulty: 75, roi: "Medium", forecast: "+1 position" },
    { keyword: "SEO automation tools", position: 6, change: 1, volume: 9300, difficulty: 79, roi: "High", forecast: "+2 positions" },
  ];

  const getRoiColor = (roi: string) => {
    switch (roi) {
      case "Very High": return "text-green-700 bg-green-100";
      case "High": return "text-blue-700 bg-blue-100";
      case "Medium": return "text-yellow-700 bg-yellow-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Keyword Forecast & Tracking</h1>
        <p className="text-gray-600">AI-powered predictions and real-time ranking data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">247</span>
          </div>
          <p className="text-gray-600">Keywords Tracked</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">142</span>
          </div>
          <p className="text-gray-600">Position Improvements</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">89%</span>
          </div>
          <p className="text-gray-600">Avg. Visibility Score</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">$45K</span>
          </div>
          <p className="text-gray-600">Est. Monthly Value</p>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filter</span>
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Keyword</span>
            </button>
          </div>
        </div>
      </div>

      {/* Keywords Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Keyword</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Position</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Change</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Volume</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Difficulty</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">ROI</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">AI Forecast</th>
                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((item, index) => (
                <motion.tr
                  key={item.keyword}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900">{item.keyword}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-8 bg-primary-100 text-primary-700 rounded-full font-bold text-sm px-2">
                      #{item.position}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      item.change > 0 ? "text-green-600" : item.change < 0 ? "text-red-600" : "text-gray-600"
                    }`}>
                      {item.change > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          +{item.change}
                        </>
                      ) : item.change < 0 ? (
                        <>
                          <TrendingDown className="w-4 h-4" />
                          {item.change}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-gray-900 font-medium">
                    {item.volume.toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                          style={{ width: `${item.difficulty}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{item.difficulty}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoiColor(item.roi)}`}>
                      {item.roi}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <BarChart3 className="w-4 h-4 text-primary-600" />
                      {item.forecast}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                      Details
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Recommendation</h3>
            <p className="text-gray-700 leading-relaxed">
              Based on current trends, we recommend focusing on <span className="font-semibold">"generative engine optimization"</span> and 
              <span className="font-semibold"> "AI-driven visibility"</span>. These keywords show strong momentum with lower competition. 
              Expected ROI increase of 34% within 30 days.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

