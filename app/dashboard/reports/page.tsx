"use client";

import { motion } from "framer-motion";
import { 
  FileText,
  Download,
  Share2,
  Calendar,
  Filter,
  TrendingUp,
  Users,
  Eye,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Mail
} from "lucide-react";

export default function Reports() {
  const reportCategories = [
    {
      name: "Visibility Reports",
      icon: Eye,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      reports: [
        { name: "Overall Visibility Score", type: "PDF", lastGenerated: "2 hours ago", size: "2.4 MB" },
        { name: "AI Search Visibility", type: "PDF", lastGenerated: "5 hours ago", size: "1.8 MB" },
        { name: "Google Rankings Report", type: "CSV", lastGenerated: "1 day ago", size: "856 KB" },
        { name: "Competitor Visibility Analysis", type: "PDF", lastGenerated: "2 days ago", size: "3.2 MB" },
      ]
    },
    {
      name: "Keyword Reports",
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      reports: [
        { name: "Keyword Performance Summary", type: "PDF", lastGenerated: "3 hours ago", size: "1.9 MB" },
        { name: "Keyword Forecast & ROI", type: "PDF", lastGenerated: "1 day ago", size: "2.1 MB" },
        { name: "Top 100 Keywords", type: "CSV", lastGenerated: "12 hours ago", size: "245 KB" },
        { name: "Keyword Gap Analysis", type: "PDF", lastGenerated: "3 days ago", size: "2.7 MB" },
      ]
    },
    {
      name: "Content Reports",
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100",
      reports: [
        { name: "Content Performance Dashboard", type: "PDF", lastGenerated: "4 hours ago", size: "3.1 MB" },
        { name: "Platform Distribution Report", type: "PDF", lastGenerated: "1 day ago", size: "1.6 MB" },
        { name: "Engagement Metrics", type: "CSV", lastGenerated: "6 hours ago", size: "512 KB" },
        { name: "Content Quality Score", type: "PDF", lastGenerated: "2 days ago", size: "2.3 MB" },
      ]
    },
    {
      name: "Traffic & Leads",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      reports: [
        { name: "Traffic Sources Analysis", type: "PDF", lastGenerated: "1 hour ago", size: "2.8 MB" },
        { name: "Lead Attribution Report", type: "PDF", lastGenerated: "5 hours ago", size: "2.2 MB" },
        { name: "Conversion Funnel", type: "CSV", lastGenerated: "8 hours ago", size: "687 KB" },
        { name: "ROI & Revenue Impact", type: "PDF", lastGenerated: "1 day ago", size: "1.9 MB" },
      ]
    },
  ];

  const quickStats = [
    { label: "Reports Generated", value: "156", icon: FileText, color: "text-blue-600" },
    { label: "Scheduled Reports", value: "24", icon: Calendar, color: "text-purple-600" },
    { label: "Shared Reports", value: "89", icon: Share2, color: "text-green-600" },
    { label: "Export Size", value: "84 MB", icon: Download, color: "text-orange-600" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">50+ comprehensive reports with PDF/CSV exports</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <p className="text-gray-600">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-xl p-6 mb-8 text-white"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Generate Custom Report</h2>
            <p className="text-white/90">Create a personalized report with specific metrics and date ranges</p>
          </div>
          <button className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:shadow-xl transition-all flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Report
          </button>
        </div>
      </motion.div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-3 flex-1">
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span>Filter</span>
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5" />
              <span>Date Range</span>
            </button>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Download className="w-5 h-5" />
              <span>Download All</span>
            </button>
            <button className="px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
              <Mail className="w-5 h-5" />
              <span>Schedule Email</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports by Category */}
      <div className="space-y-8">
        {reportCategories.map((category, catIndex) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + catIndex * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${category.bgColor} rounded-lg flex items-center justify-center`}>
                <category.icon className={`w-6 h-6 ${category.color}`} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
              <span className="text-sm text-gray-500">({category.reports.length} reports)</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {category.reports.map((report, repIndex) => (
                <motion.div
                  key={report.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + catIndex * 0.1 + repIndex * 0.05 }}
                  className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                        {report.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {report.type}
                        </span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                    <FileText className="w-8 h-8 text-gray-300 group-hover:text-primary-600 transition-colors" />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Generated {report.lastGenerated}</span>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Export Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-8 bg-white rounded-xl p-6 border border-gray-200"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">Export Options</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left">
            <FileText className="w-6 h-6 text-primary-600 mb-2" />
            <div className="font-semibold text-gray-900 mb-1">PDF Reports</div>
            <p className="text-sm text-gray-600">Professional formatted reports</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left">
            <BarChart3 className="w-6 h-6 text-primary-600 mb-2" />
            <div className="font-semibold text-gray-900 mb-1">CSV Data</div>
            <p className="text-sm text-gray-600">Raw data for analysis</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left">
            <Share2 className="w-6 h-6 text-primary-600 mb-2" />
            <div className="font-semibold text-gray-900 mb-1">Google Sheets</div>
            <p className="text-sm text-gray-600">Live synced data</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

