"use client";

import { motion } from "framer-motion";
import { 
  Video, 
  Play,
  Download,
  Share2,
  Calendar,
  Eye,
  Clock,
  Settings,
  Wand2,
  Plus
} from "lucide-react";

export default function VideoReports() {
  const videoReports = [
    {
      id: 1,
      title: "October 2024 Performance Review",
      thumbnail: "gradient-1",
      duration: "4:32",
      generatedDate: "2024-10-20",
      views: 156,
      status: "ready",
      description: "Monthly performance summary with key metrics, rankings, and AI visibility insights."
    },
    {
      id: 2,
      title: "Q3 2024 Executive Summary",
      thumbnail: "gradient-2",
      duration: "6:45",
      generatedDate: "2024-09-30",
      views: 289,
      status: "ready",
      description: "Quarterly review covering all major KPIs, competitive analysis, and strategic recommendations."
    },
    {
      id: 3,
      title: "Keyword Performance Deep Dive",
      thumbnail: "gradient-3",
      duration: "3:18",
      generatedDate: "2024-10-15",
      views: 112,
      status: "ready",
      description: "Detailed analysis of top-performing keywords with forecasts and action items."
    },
    {
      id: 4,
      title: "AI Visibility Report - October",
      thumbnail: "gradient-4",
      duration: "5:23",
      generatedDate: "2024-10-18",
      views: 203,
      status: "ready",
      description: "Complete overview of your presence across ChatGPT, Gemini, Perplexity, and other AI platforms."
    },
    {
      id: 5,
      title: "Weekly Progress Update",
      thumbnail: "gradient-5",
      duration: "2:15",
      generatedDate: "2024-10-19",
      views: 87,
      status: "processing",
      description: "Quick weekly snapshot of rankings, traffic, and key wins."
    },
    {
      id: 6,
      title: "Content Performance Analysis",
      thumbnail: "gradient-6",
      duration: "0:00",
      generatedDate: "2024-10-21",
      views: 0,
      status: "generating",
      description: "Analyzing content engagement, platform distribution, and optimization opportunities."
    },
  ];

  const stats = [
    { label: "Total Videos", value: "24", icon: Video, color: "text-blue-600" },
    { label: "Total Views", value: "3.2K", icon: Eye, color: "text-purple-600" },
    { label: "This Month", value: "6", icon: Calendar, color: "text-green-600" },
    { label: "Avg. Duration", value: "4:12", icon: Clock, color: "text-orange-600" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return { bg: "bg-green-100", text: "text-green-700", icon: Play };
      case "processing": return { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock };
      case "generating": return { bg: "bg-blue-100", text: "text-blue-700", icon: Wand2 };
      default: return { bg: "bg-gray-100", text: "text-gray-700", icon: Video };
    }
  };

  const getThumbnailGradient = (gradient: string) => {
    const gradients: { [key: string]: string } = {
      "gradient-1": "from-blue-500 to-purple-600",
      "gradient-2": "from-purple-500 to-pink-600",
      "gradient-3": "from-green-500 to-blue-600",
      "gradient-4": "from-orange-500 to-red-600",
      "gradient-5": "from-pink-500 to-purple-600",
      "gradient-6": "from-cyan-500 to-blue-600",
    };
    return gradients[gradient] || "from-gray-400 to-gray-600";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Reports</h1>
        <p className="text-gray-600">AI-generated video summaries with narration and dynamic charts</p>
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
            <h2 className="text-2xl font-bold mb-2">Generate New Video Report</h2>
            <p className="text-white/90">Create a custom video report with AI narration and dynamic visualizations</p>
          </div>
          <button className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-5 h-5" />
            Create Video
          </button>
        </div>
      </motion.div>

      {/* Video Library */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videoReports.map((video, index) => {
          const statusConfig = getStatusColor(video.status);
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all group"
            >
              {/* Thumbnail */}
              <div className={`relative aspect-video bg-gradient-to-br ${getThumbnailGradient(video.thumbnail)} flex items-center justify-center cursor-pointer`}>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all"></div>
                {video.status === "ready" && (
                  <div className="relative z-10 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-primary-600 ml-1" />
                  </div>
                )}
                {video.status === "processing" && (
                  <div className="relative z-10">
                    <Clock className="w-12 h-12 text-white animate-pulse" />
                  </div>
                )}
                {video.status === "generating" && (
                  <div className="relative z-10">
                    <Wand2 className="w-12 h-12 text-white animate-pulse" />
                  </div>
                )}
                
                {/* Duration Badge */}
                {video.duration !== "0:00" && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-sm font-semibold">
                    {video.duration}
                  </div>
                )}

                {/* Status Badge */}
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text} text-xs font-semibold flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {video.status}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {video.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(video.generatedDate).toLocaleDateString()}</span>
                  </div>
                  {video.views > 0 && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{video.views} views</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {video.status === "ready" && (
                    <>
                      <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                        <Play className="w-4 h-4" />
                        Play
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4 text-gray-700" />
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Share2 className="w-4 h-4 text-gray-700" />
                      </button>
                    </>
                  )}
                  {video.status === "processing" && (
                    <div className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-center font-semibold">
                      Processing...
                    </div>
                  )}
                  {video.status === "generating" && (
                    <div className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-center font-semibold flex items-center justify-center gap-2">
                      <Wand2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Video Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="mt-8 bg-white rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Video Report Settings</h2>
            <p className="text-sm text-gray-600">Configure automatic video generation preferences</p>
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Frequency</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Auto-generate videos</p>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Manual only</option>
            </select>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Voice</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">AI narrator voice</p>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Professional (Male)</option>
              <option>Professional (Female)</option>
              <option>Casual (Male)</option>
              <option>Casual (Female)</option>
            </select>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Video className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Quality</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Video resolution</p>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>1080p (HD)</option>
              <option>720p</option>
              <option>480p</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

