"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  MapPin,
  RefreshCw,
  Zap,
  BarChart3,
  Globe,
} from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";

interface LiveMetric {
  label: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "neutral";
}

export default function LiveViewPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([
    { label: "Active Visitors", value: 47, change: 12, trend: "up" },
    { label: "Page Views (Today)", value: "2,341", change: -3, trend: "down" },
    { label: "Avg. Rank Position", value: "#4.2", change: 8, trend: "up" },
    { label: "AI Visibility Score", value: 87, change: 5, trend: "up" },
  ]);

  const [recentEvents, setRecentEvents] = useState([
    {
      type: "rank_change",
      keyword: "local seo services",
      from: 5,
      to: 3,
      time: "2 mins ago",
    },
    {
      type: "new_visitor",
      source: "Google Search",
      location: "San Francisco, CA",
      time: "3 mins ago",
    },
    {
      type: "ai_detection",
      platform: "Reddit",
      content: "Your brand mentioned in r/SEO",
      time: "5 mins ago",
    },
    {
      type: "rank_change",
      keyword: "reputation management",
      from: 12,
      to: 9,
      time: "8 mins ago",
    },
  ]);

  const [geoMap, setGeoMap] = useState([
    { city: "San Francisco", state: "CA", visitors: 34, rank: 2 },
    { city: "New York", state: "NY", visitors: 28, rank: 4 },
    { city: "Los Angeles", state: "CA", visitors: 19, rank: 7 },
    { city: "Chicago", state: "IL", visitors: 15, rank: 5 },
    { city: "Austin", state: "TX", visitors: 12, rank: 3 },
  ]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate live data updates
      setLiveMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value:
            typeof metric.value === "number"
              ? metric.value + Math.floor(Math.random() * 3) - 1
              : metric.value,
          change: Math.floor(Math.random() * 20) - 10,
        }))
      );
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "rank_change":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "new_visitor":
        return <Eye className="w-4 h-4 text-blue-600" />;
      case "ai_detection":
        return <Zap className="w-4 h-4 text-accent-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-primary-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Live Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time rankings, traffic, and AI visibility
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              Last update:{" "}
              <span className="font-medium text-gray-900">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "primary" : "outline"}
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
              />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-primary-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold">LIVE</span>: Dashboard updates every
            5 seconds with real-time data from rank trackers, analytics, and AI
            detection systems.
          </p>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {liveMetrics.map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {metric.value}
                  </div>
                  <div className="text-sm text-gray-600">{metric.label}</div>
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    metric.trend === "up"
                      ? "bg-green-100 text-green-800"
                      : metric.trend === "down"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {metric.trend === "up" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : metric.trend === "down" ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : null}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    metric.trend === "up"
                      ? "bg-green-500"
                      : metric.trend === "down"
                      ? "bg-red-500"
                      : "bg-gray-500"
                  }`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.abs(metric.change) * 5}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT: Real-Time Events */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Real-Time Events
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">LIVE</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {recentEvents.map((event, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getEventIcon(event.type)}
                  <div className="flex-1">
                    {event.type === "rank_change" && (
                      <>
                        <div className="font-semibold text-sm text-gray-900 mb-1">
                          Rank Movement
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{event.keyword}</span>{" "}
                          moved from #{event.from} → #{event.to}
                        </div>
                      </>
                    )}
                    {event.type === "new_visitor" && (
                      <>
                        <div className="font-semibold text-sm text-gray-900 mb-1">
                          New Visitor
                        </div>
                        <div className="text-sm text-gray-600">
                          From <span className="font-medium">{event.source}</span>{" "}
                          in {event.location}
                        </div>
                      </>
                    )}
                    {event.type === "ai_detection" && (
                      <>
                        <div className="font-semibold text-sm text-gray-900 mb-1">
                          AI Detection
                        </div>
                        <div className="text-sm text-gray-600">
                          {event.platform}: {event.content}
                        </div>
                      </>
                    )}
                    <div className="text-xs text-gray-500 mt-1">{event.time}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* RIGHT: Geographic Heat Map */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-600" />
            Geographic Performance
          </h2>

          <div className="space-y-4">
            {geoMap.map((location, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg p-4 border border-primary-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <span className="font-semibold text-gray-900">
                      {location.city}, {location.state}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-primary-700">
                    Rank #{location.rank}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 text-xs text-gray-600">
                      <span>Visitors</span>
                      <span className="font-bold text-gray-900">
                        {location.visitors}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary-500"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(location.visitors / 34) * 100}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 text-center">
              📍 Showing top 5 performing cities by visitor count
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom: Performance Chart Placeholder */}
      <Card className="p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-secondary-600" />
          Traffic & Rankings Timeline
        </h2>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Live chart visualization</p>
          <p className="text-sm text-gray-500">
            Integration with Chart.js or Recharts for real-time graph rendering
          </p>
        </div>
      </Card>
    </div>
  );
}

