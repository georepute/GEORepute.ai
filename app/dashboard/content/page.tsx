"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { 
  FileText, 
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Send,
  MoreVertical,
  TrendingUp
} from "lucide-react";

export default function Content() {
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "review" | "scheduled" | "published">("all");

  const contentItems = [
    {
      id: 1,
      title: "Complete Guide to AI-Driven SEO Optimization",
      type: "Blog Post",
      status: "published",
      platforms: ["Medium", "LinkedIn", "Website"],
      publishDate: "2024-10-15",
      performance: { views: 8234, engagement: 12.4 },
    },
    {
      id: 2,
      title: "How to Optimize for ChatGPT and AI Search",
      type: "Guide",
      status: "review",
      platforms: ["Quora", "Reddit", "Medium"],
      publishDate: "2024-10-22",
      performance: { views: 0, engagement: 0 },
    },
    {
      id: 3,
      title: "GEO vs SEO: Understanding the Difference",
      type: "Article",
      status: "scheduled",
      platforms: ["Website", "Medium"],
      publishDate: "2024-10-25",
      performance: { views: 0, engagement: 0 },
    },
    {
      id: 4,
      title: "Top 10 Reputation Management Strategies",
      type: "List Article",
      status: "draft",
      platforms: ["Website"],
      publishDate: null,
      performance: { views: 0, engagement: 0 },
    },
    {
      id: 5,
      title: "AI Search Visibility: A Beginner's Guide",
      type: "Tutorial",
      status: "published",
      platforms: ["YouTube", "Website", "Medium"],
      publishDate: "2024-10-10",
      performance: { views: 15672, engagement: 18.7 },
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle };
      case "scheduled": return { bg: "bg-blue-100", text: "text-blue-700", icon: Clock };
      case "review": return { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle };
      case "draft": return { bg: "bg-gray-100", text: "text-gray-700", icon: FileText };
      default: return { bg: "bg-gray-100", text: "text-gray-700", icon: FileText };
    }
  };

  const tabs = [
    { id: "all", label: "All Content", count: 5 },
    { id: "draft", label: "Drafts", count: 1 },
    { id: "review", label: "In Review", count: 1 },
    { id: "scheduled", label: "Scheduled", count: 1 },
    { id: "published", label: "Published", count: 2 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Orchestrator</h1>
        <p className="text-gray-600">Manage, approve, and publish content across all platforms</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <FileText className="w-8 h-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">124</div>
          <p className="text-gray-600">Total Content</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">89</div>
          <p className="text-gray-600">Published</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Clock className="w-8 h-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">12</div>
          <p className="text-gray-600">Scheduled</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Eye className="w-8 h-8 text-orange-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">234K</div>
          <p className="text-gray-600">Total Views</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filter</span>
            </button>
            <button className="px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {contentItems.map((item, index) => {
          const statusConfig = getStatusColor(item.status);
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="font-medium">{item.type}</span>
                        <span>•</span>
                        <span>{item.publishDate || "Not scheduled"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {item.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>

                  {/* Performance (if published) */}
                  {item.status === "published" && (
                    <div className="flex items-center gap-6 mt-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Eye className="w-4 h-4" />
                        <span className="font-medium">{item.performance.views.toLocaleString()} views</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">{item.performance.engagement}% engagement</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="font-semibold capitalize">{item.status}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "review" && (
                      <>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit className="w-5 h-5" />
                    </button>
                    {item.status === "draft" && (
                      <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Send className="w-5 h-5" />
                      </button>
                    )}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Workflow Suggestion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Workflow Optimization</h3>
            <p className="text-gray-700 leading-relaxed">
              Your content approval time has decreased by 40% this month. Consider automating approval for 
              content with quality scores above 85% to further streamline your workflow.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

