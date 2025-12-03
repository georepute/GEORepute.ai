"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  FileText, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Send,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  Minus,
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";

interface KeywordMetric {
  keyword: string;
  score: number;
  trend: string;
  rise: "up" | "down" | "stable";
  percent: number;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: "draft" | "review" | "scheduled" | "published";
  platforms: string[];
  publishDate: string | null;
  performance: { views: number; engagement: number };
  raw?: any;
  keywordMetrics?: KeywordMetric[];
  published_records?: Array<{
    published_url?: string;
    platform?: string;
    published_at?: string;
    platform_post_id?: string;
  }>;
}


export default function Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "review" | "scheduled" | "published">("all");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContentId, setScheduleContentId] = useState<string | null>(null);
  const [schedulePosition, setSchedulePosition] = useState({ top: 0, right: 0 });
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewContent, setViewContent] = useState<ContentItem | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [viewMode, setViewMode] = useState<'content' | 'schema' | 'image'>('content');
  const [refreshing, setRefreshing] = useState(false);
  const [publishingContentId, setPublishingContentId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    review: 0,
    draft: 0,
  });


  useEffect(() => {
    loadContent();
    
    // Auto-refresh every 3 minutes to check for scheduled content
    const autoRefreshInterval = setInterval(() => {
      checkAndPublishScheduled();
    }, 3 * 60 * 1000); // 3 minutes

    // Cleanup on unmount
    return () => clearInterval(autoRefreshInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const status = activeTab === "all" ? "all" : activeTab;
      const response = await fetch(`/api/geo-core/orchestrator?status=${status}`);
      
      if (!response.ok) {
        throw new Error("Failed to load content");
      }

      const data = await response.json();
      setContentItems(data.content || []);
      setStats(data.stats || {
        total: 0,
        published: 0,
        scheduled: 0,
        review: 0,
        draft: 0,
      });
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const checkAndPublishScheduled = async () => {
    try {
      // Call the scheduled publish endpoint to check and publish any ready content
      const response = await fetch("/api/geo-core/orchestrator/scheduled-publish", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.published > 0) {
          // Refresh content list if something was published
          await loadContent();
          toast.success(`${data.published} scheduled content published!`);
        }
      }
    } catch (error) {
      console.error("Error checking scheduled content:", error);
      // Don't show error toast, just silently fail
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // First check and publish scheduled content
      await checkAndPublishScheduled();
      // Then reload content list
      await loadContent();
      toast.success("Content refreshed");
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (contentId: string) => {
    // Simple approve: moves from draft to review
    await handleAction("approve", contentId, { autoPublish: false });
  };

  const handleReviewAction = async (action: "publish" | "schedule" | "reject", contentId: string, scheduledAt?: string) => {
    if (action === "publish") {
      // Check if this is Medium publishing
      const contentItem = contentItems.find(item => item.id === contentId);
      const isMedium = contentItem?.raw?.target_platform === "medium" || contentItem?.platforms?.includes("medium");
      
      if (isMedium) {
        setPublishingContentId(contentId);
      }
      
      try {
        await handleAction("approve", contentId, { autoPublish: true });
        // Reload content after successful publish
        await loadContent();
      } catch (error) {
        // On error, clear loading state immediately
        if (isMedium) {
          setPublishingContentId(null);
        }
        throw error;
      } finally {
        if (isMedium) {
          // Keep loading state for a bit to show success, then clear
          setTimeout(() => {
            setPublishingContentId(null);
          }, 2000);
        }
      }
    } else if (action === "schedule") {
      if (scheduledAt) {
        await handleAction("approve", contentId, { scheduledAt });
      }
    } else if (action === "reject") {
      await handleAction("reject", contentId, { reason: "Needs revision" });
    }
  };

  const handleScheduleClick = (contentId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    setScheduleContentId(contentId);
    setSchedulePosition({
      top: buttonRect.top - 300, // Position above the button
      right: window.innerWidth - buttonRect.right, // Align to right edge of button
    });
    setShowScheduleModal(true);
    // Set default date/time to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    setScheduleTime("09:00");
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleContentId || !scheduleDate) {
      toast.error("Please select a date");
      return;
    }

    // Combine date and time
    const scheduledDateTime = scheduleTime 
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : new Date(`${scheduleDate}T09:00`).toISOString();

    await handleReviewAction("schedule", scheduleContentId, scheduledDateTime);
    
    // Reset form
    setShowScheduleModal(false);
    setScheduleContentId(null);
    setScheduleDate("");
    setScheduleTime("");
  };

  const handleAction = async (action: string, contentId: string, additionalData?: any) => {
    try {
      const response = await fetch("/api/geo-core/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          contentId,
          ...additionalData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Action failed");
      }

      const result = await response.json();
      toast.success(result.message || "Action completed successfully");
      loadContent();
    } catch (error: any) {
      console.error("Action error:", error);
      toast.error(error.message || "Action failed");
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch("/api/geo-core/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          contentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      toast.success("Content deleted successfully");
      loadContent();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete content");
    }
  };

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
    { id: "all", label: "All Content", count: stats.total },
    { id: "draft", label: "Drafts", count: stats.draft },
    { id: "review", label: "In Review", count: stats.review },
    { id: "scheduled", label: "Scheduled", count: stats.scheduled },
    { id: "published", label: "Published", count: stats.published },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Orchestrator</h1>
          <p className="text-gray-600">Manage, approve, and publish content across all platforms</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh and check for scheduled content"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <FileText className="w-8 h-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <p className="text-gray-600">Total Content</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.published}</div>
          <p className="text-gray-600">Published</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <Clock className="w-8 h-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.scheduled}</div>
          <p className="text-gray-600">Scheduled</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <AlertCircle className="w-8 h-8 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900 mb-1">{stats.review}</div>
          <p className="text-gray-600">In Review</p>
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
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {contentItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-12 border border-gray-200 text-center"
          >
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === "all" ? "No Content Yet" : `No ${activeTab} Content`}
            </h3>
            <p className="text-gray-600">
              {activeTab === "all"
                ? "Generate content from the Content Generator to see it here"
                : `No content in ${activeTab} status`}
            </p>
          </motion.div>
        ) : (
          (() => {
            // Group content items by title/prompt
            const groupedByTitle: Record<string, typeof contentItems> = {};
            contentItems.forEach((item) => {
              const titleKey = item.title?.trim().toLowerCase() || 'untitled';
              if (!groupedByTitle[titleKey]) {
                groupedByTitle[titleKey] = [];
              }
              groupedByTitle[titleKey].push(item);
            });

            return Object.entries(groupedByTitle).map(([titleKey, items], groupIndex) => {
              const firstItem = items[0];
              
              // Check if this is a grouped card (multiple platforms for same prompt)
              const isGrouped = items.length > 1;

              if (isGrouped) {
                // Render grouped card for multiple platforms
                return (
                  <motion.div
                    key={titleKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                  >
                    {/* Prompt Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-4 border-b border-gray-200">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{firstItem.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
                            <span className="font-medium">{firstItem.type}</span>
                            <span>•</span>
                            <span>
                              {firstItem.publishDate
                                ? new Date(firstItem.publishDate).toLocaleDateString()
                                : "Not scheduled"}
                            </span>
                            <span>•</span>
                            <span className="text-purple-600 font-medium">{items.length} platforms</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Cards */}
                    <div className="divide-y divide-gray-100">
                      {items.map((item) => {
                        const statusConfig = getStatusColor(item.status);
                        const StatusIcon = statusConfig.icon;
                        const platform = item.platforms[0] || 'unknown';

                        return (
                          <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              {/* Platform & Keywords */}
                              <div className="flex-1 flex items-center gap-3">
                                <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium capitalize">
                                  {platform}
                                </span>
                                {item.keywordMetrics && item.keywordMetrics.length > 0 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                    {item.keywordMetrics[0].keyword} - {item.keywordMetrics[0].percent}%
                                  </span>
                                )}
                              </div>

                              {/* Status & Actions */}
                              <div className="flex items-center gap-3">
                                {/* Status Badge */}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${statusConfig.bg} ${statusConfig.text}`}>
                                  <StatusIcon className="w-4 h-4" />
                                  <span className="font-medium capitalize">{item.status}</span>
                                </div>

                                {/* Action Buttons */}
                                {item.status === "draft" && (
                                  <button
                                    onClick={() => handleApprove(item.id)}
                                    className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center gap-1.5"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                  </button>
                                )}
                                {item.status === "review" && (
                                  <>
                                    <button
                                      onClick={() => handleReviewAction("publish", item.id)}
                                      disabled={publishingContentId === item.id}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                      title="Publish"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={(e) => handleScheduleClick(item.id, e)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Schedule"
                                    >
                                      <Clock className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleReviewAction("reject", item.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    setViewContent(item);
                                    setShowViewModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Published URL */}
                            {item.status === "published" && item.published_records && item.published_records.length > 0 && (
                              <div className="mt-2 ml-0">
                                {item.published_records.map((pub, idx) => (
                                  pub.published_url ? (
                                    <a
                                      key={idx}
                                      href={pub.published_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View on {pub.platform || platform}
                                    </a>
                                  ) : null
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              }

              // Single item - render normally
              const item = firstItem;
              const statusConfig = getStatusColor(item.status);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Content Info - Left Side */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="font-medium">{item.type}</span>
                          <span>•</span>
                          <span>
                            {item.publishDate
                              ? new Date(item.publishDate).toLocaleDateString()
                              : "Not scheduled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Platforms with Keywords - Left Side */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.platforms.map((platform) => {
                        // Get the first keyword for this platform
                        // Try keywordMetrics first, then fall back to raw target_keywords
                        const firstKeyword = item.keywordMetrics && item.keywordMetrics.length > 0
                          ? item.keywordMetrics[0].keyword
                          : (item.raw?.target_keywords && item.raw.target_keywords.length > 0
                            ? item.raw.target_keywords[0]
                            : null);
                        
                        // Get keyword percentage if available
                        const keywordPercent = item.keywordMetrics && item.keywordMetrics.length > 0
                          ? item.keywordMetrics[0].percent
                          : null;

                        return (
                          <div key={platform} className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                              {platform}
                            </span>
                            {firstKeyword && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                {firstKeyword}
                                {keywordPercent !== null && ` - ${keywordPercent}%`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Performance (if published) */}
                    {item.status === "published" && item.performance.views > 0 && (
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Eye className="w-4 h-4" />
                          <span className="font-medium">{item.performance.views.toLocaleString()} views</span>
                        </div>
                        {item.performance.engagement > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-medium">{item.performance.engagement}% engagement</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Published URL Link */}
                    {item.status === "published" && item.published_records && item.published_records.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {item.published_records.map((pub, idx) => (
                          pub.published_url ? (
                            <a
                              key={idx}
                              href={pub.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                            >
                              <Send className="w-4 h-4" />
                              <span>Visit published content</span>
                              <span className="text-xs text-gray-500">({pub.platform || 'external'})</span>
                            </a>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Side - Status, Keywords, Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {/* Status Badge */}
                    {item.status === "review" ? (
                      <button className="px-4 py-2 bg-yellow-100 text-gray-900 rounded-lg font-medium flex items-center gap-2 hover:bg-yellow-200 transition-colors">
                        <Clock className="w-4 h-4 text-gray-600" />
                        Review
                      </button>
                    ) : (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="font-semibold capitalize">{item.status}</span>
                      </div>
                    )}

                    {/* Keywords with Metrics - Right Side */}
                    {item.keywordMetrics && item.keywordMetrics.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {item.keywordMetrics.map((metric) => {
                          const getRiseIcon = () => {
                            if (metric.rise === "up") return <TrendingUp className="w-3 h-3" />;
                            if (metric.rise === "down") return <TrendingDown className="w-3 h-3" />;
                            return <Minus className="w-3 h-3" />;
                          };
                          
                          const getRiseColor = () => {
                            if (metric.rise === "up") return "text-green-600";
                            if (metric.rise === "down") return "text-red-600";
                            return "text-gray-600";
                          };

                          return (
                            <span
                              key={metric.keyword}
                              className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium flex items-center gap-2"
                            >
                              <span className="text-blue-700">{metric.keyword}</span>
                              <span className={`flex items-center gap-1 ${getRiseColor()}`}>
                                {getRiseIcon()}
                                <span>{metric.percent}%</span>
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Loading state for Medium publishing */}
                      {publishingContentId === item.id && (item.raw?.target_platform === "medium" || item.platforms?.includes("medium")) ? (
                        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Publishing to Medium...</span>
                            <span className="text-xs text-blue-600">This typically takes 2-3 minutes</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Draft: Only Approve button */}
                          {item.status === "draft" && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          )}

                          {/* Review: Reject, Publish, Schedule buttons */}
                          {item.status === "review" && (
                            <>
                              <button
                                onClick={() => handleReviewAction("publish", item.id)}
                                disabled={publishingContentId === item.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Publish"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReviewAction("reject", item.id)}
                                disabled={publishingContentId === item.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => handleScheduleClick(item.id, e)}
                                disabled={publishingContentId === item.id}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Schedule"
                              >
                                <Clock className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {/* View action for all statuses */}
                          <button 
                            onClick={() => {
                              setViewContent(item);
                              setShowViewModal(true);
                            }}
                            disabled={publishingContentId === item.id}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {/* Delete action for all statuses */}
                          <button 
                            onClick={() => handleDelete(item.id)}
                            disabled={publishingContentId === item.id}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                </motion.div>
              );
            });
          })()
        )}
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

      {/* Schedule Modal - Positioned Top Right of Button */}
      {showScheduleModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowScheduleModal(false);
              setScheduleContentId(null);
              setScheduleDate("");
              setScheduleTime("");
            }}
          />
          {/* Popover */}
          <div 
            className="fixed z-50"
            style={{
              top: `${schedulePosition.top}px`,
              right: `${schedulePosition.right}px`,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-lg shadow-xl border border-gray-200 w-72 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Schedule Publishing
                </h3>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleContentId(null);
                    setScheduleDate("");
                    setScheduleTime("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                {/* Time Picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                {/* Preview */}
                {scheduleDate && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Scheduled:</span>{" "}
                      {new Date(`${scheduleDate}T${scheduleTime || '09:00'}`).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleContentId(null);
                    setScheduleDate("");
                    setScheduleTime("");
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSubmit}
                  disabled={!scheduleDate}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Clock className="w-3 h-3" />
                  Schedule
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* View Content Modal */}
      {showViewModal && viewContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{viewContent.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="font-medium">{viewContent.type}</span>
                      <span>•</span>
                      <span className="capitalize">{viewContent.raw?.target_platform || viewContent.platforms[0]}</span>
                      {viewContent.raw?.word_count && (
                        <>
                          <span>•</span>
                          <span>{viewContent.raw.word_count} words</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewContent(null);
                    setViewMode('content');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('content')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'content'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setViewMode('schema')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'schema'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Schema
                </button>
                <button
                  onClick={() => setViewMode('image')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'image'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Image
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                {viewMode === 'content' && (
                  <>
                    {/* Show Content */}
                    {viewContent.raw?.generated_content ? (
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {viewContent.raw.generated_content}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-12">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No content available</p>
                      </div>
                    )}

                    {/* Published URL Link in View Modal */}
                    {viewContent.status === "published" && viewContent.published_records && viewContent.published_records.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Published Links:</h4>
                        <div className="space-y-2">
                          {viewContent.published_records.map((pub: any, idx: number) => (
                            pub.published_url ? (
                              <a
                                key={idx}
                                href={pub.published_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                <span className="break-all">{pub.published_url}</span>
                                <span className="text-xs text-gray-500 capitalize whitespace-nowrap">({pub.platform || 'external'})</span>
                              </a>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {viewMode === 'image' && (
                  <div className="flex flex-col items-center justify-center py-8">
                    {viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image ? (
                      <div className="w-full max-w-2xl">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                          <img
                            src={viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image}
                            alt={viewContent.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            This image will be published with your content to supported platforms.
                          </p>
                          <div className="mt-2 flex flex-wrap justify-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Reddit</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Medium</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Quora</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Facebook</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">LinkedIn</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Instagram</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs line-through">GitHub</span>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 break-all">
                            <strong>Image URL:</strong> {viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="font-medium text-gray-700">No Image Available</p>
                        <p className="text-sm mt-1">This content doesn&apos;t have an associated image.</p>
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'schema' && (
                  <>
                    {/* Show Schema */}
                    <div className="space-y-4">
                      {/* Auto-Generated Schema (includes structured SEO data) */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Auto-Generated JSON-LD Schema</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Includes Structured SEO Data</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                          This schema automatically includes: headings (H1/H2/H3), FAQs, meta description, and other structured data from your content.
                        </p>
                        {viewContent.raw?.metadata?.schema?.jsonLd ? (
                          <pre className="text-xs bg-white p-4 rounded border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
                            {JSON.stringify(viewContent.raw.metadata.schema.jsonLd, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-gray-500 text-sm">No schema data available</p>
                        )}
                      </div>
                      
                      {/* HTML Script Tags (ready to embed) */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">HTML Script Tags (Ready to Embed):</h4>
                        {viewContent.raw?.metadata?.schema?.scriptTags ? (
                          <pre className="text-xs bg-white p-4 rounded border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
                            {viewContent.raw.metadata.schema.scriptTags}
                          </pre>
                        ) : (
                          <p className="text-gray-500 text-sm">No script tags available</p>
                        )}
                      </div>

                      {/* Additional Structured SEO Info (not in schema) */}
                      {viewContent.raw?.metadata?.structuredSEO && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Additional SEO Elements</h4>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Not in Schema</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            These elements are used for meta tags, social sharing, and internal linking (not included in JSON-LD schema).
                          </p>
                          <div className="space-y-2 text-sm">
                            {viewContent.raw.metadata.structuredSEO.metaDescription && (
                              <div>
                                <span className="font-medium text-gray-700">Meta Description: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.metaDescription}</span>
                                <span className="text-xs text-gray-500 ml-2">(also in schema)</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.headings && viewContent.raw.metadata.structuredSEO.headings.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">Headings Structure: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.headings.length} headings (H1, H2, H3)</span>
                                <span className="text-xs text-gray-500 ml-2">(included in schema)</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.faqs && viewContent.raw.metadata.structuredSEO.faqs.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">FAQs: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.faqs.length} FAQs</span>
                                <span className="text-xs text-gray-500 ml-2">(included in schema if FAQPage type)</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.ogTags && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">Open Graph Tags: </span>
                                <span className="text-gray-600 text-xs">For social media sharing previews</span>
                                <div className="mt-2 ml-4 text-xs text-gray-600 space-y-1">
                                  <div>Title: {viewContent.raw.metadata.structuredSEO.ogTags.title}</div>
                                  <div>Description: {viewContent.raw.metadata.structuredSEO.ogTags.description?.substring(0, 80)}...</div>
                                  <div>Image: {viewContent.raw.metadata.structuredSEO.ogTags.image}</div>
                                </div>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.internalLinks && viewContent.raw.metadata.structuredSEO.internalLinks.length > 0 && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">Internal Linking Suggestions: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.internalLinks.length} links</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.canonicalUrl && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">Canonical URL: </span>
                                <span className="text-gray-600 break-all text-xs">{viewContent.raw.metadata.structuredSEO.canonicalUrl}</span>
                              </div>
                            )}
                            {viewContent.raw.metadata.structuredSEO.seoScore !== null && viewContent.raw.metadata.structuredSEO.seoScore !== undefined && (
                              <div className="pt-2 border-t border-green-200">
                                <span className="font-medium text-gray-700">SEO Score: </span>
                                <span className="text-gray-600">{viewContent.raw.metadata.structuredSEO.seoScore}/100</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {viewContent.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize"
                  >
                    {platform}
                  </span>
                ))}
                {viewContent.raw?.target_keywords && viewContent.raw.target_keywords.slice(0, 3).map((keyword: string) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                {viewMode === 'content' && (
                  <button
                    onClick={() => {
                      if (viewContent.raw?.generated_content) {
                        navigator.clipboard.writeText(viewContent.raw.generated_content);
                        toast.success("Content copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Copy Content
                  </button>
                )}
                {viewMode === 'schema' && (
                  <button
                    onClick={() => {
                      const schemaText = viewContent.raw?.metadata?.schema?.scriptTags || JSON.stringify(viewContent.raw?.metadata?.schema?.jsonLd || {}, null, 2);
                      if (schemaText) {
                        navigator.clipboard.writeText(schemaText);
                        toast.success("Schema copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Copy Schema
                  </button>
                )}
                {viewMode === 'image' && (viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image) && (
                  <button
                    onClick={() => {
                      const imageUrl = viewContent.raw?.metadata?.imageUrl || viewContent.raw?.metadata?.structuredSEO?.ogTags?.image;
                      if (imageUrl) {
                        navigator.clipboard.writeText(imageUrl);
                        toast.success("Image URL copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Copy Image URL
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewContent(null);
                    setViewMode('content');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

