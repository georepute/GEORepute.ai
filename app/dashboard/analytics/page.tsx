"use client";

import { motion } from "framer-motion";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  MousePointerClick,
  Globe,
  Calendar,
  Download
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

export default function Analytics() {
  const trafficData = [
    { date: "Oct 1", sessions: 1240, users: 890, pageviews: 4200, bounceRate: 42 },
    { date: "Oct 8", sessions: 1580, users: 1120, pageviews: 5100, bounceRate: 38 },
    { date: "Oct 15", sessions: 1890, users: 1350, pageviews: 6200, bounceRate: 35 },
    { date: "Oct 22", sessions: 2150, users: 1580, pageviews: 7300, bounceRate: 32 },
  ];

  const deviceData = [
    { name: "Desktop", value: 52, color: "#0ea5e9" },
    { name: "Mobile", value: 35, color: "#8b5cf6" },
    { name: "Tablet", value: 13, color: "#10b981" },
  ];

  const topPages = [
    { page: "/", views: 12450, avgTime: "2:34", bounceRate: 28 },
    { page: "/about", views: 8920, avgTime: "3:12", bounceRate: 32 },
    { page: "/services", views: 7680, avgTime: "4:05", bounceRate: 25 },
    { page: "/contact", views: 5430, avgTime: "1:48", bounceRate: 45 },
    { page: "/blog", views: 4290, avgTime: "5:23", bounceRate: 22 },
  ];

  const channelData = [
    { channel: "Organic Search", sessions: 8920, change: 12.5, color: "text-green-600" },
    { channel: "Direct", sessions: 5430, change: 8.2, color: "text-blue-600" },
    { channel: "Social", sessions: 3240, change: -3.4, color: "text-red-600" },
    { channel: "Referral", sessions: 2150, change: 15.8, color: "text-green-600" },
    { channel: "Email", sessions: 1680, change: 5.3, color: "text-green-600" },
  ];

  const conversions = [
    { goal: "Contact Form", conversions: 245, rate: 3.8, value: "$12,450" },
    { goal: "Newsletter Signup", conversions: 892, rate: 13.2, value: "$4,460" },
    { goal: "Demo Request", conversions: 156, rate: 2.3, value: "$31,200" },
    { goal: "Quote Download", conversions: 428, rate: 6.4, value: "$8,560" },
  ];

  const stats = [
    {
      label: "Total Sessions",
      value: "21.4K",
      change: "+18.2%",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      label: "Page Views",
      value: "84.3K",
      change: "+24.5%",
      trend: "up",
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      label: "Avg. Session",
      value: "3:42",
      change: "+12.8%",
      trend: "up",
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      label: "Bounce Rate",
      value: "32.4%",
      change: "-5.2%",
      trend: "up",
      icon: TrendingDown,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Comprehensive traffic and performance insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>Last 90 Days</option>
              <option>This Year</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
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

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Traffic Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Traffic Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Area type="monotone" dataKey="sessions" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorSessions)" />
              <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorUsers)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Users</span>
            </div>
          </div>
        </motion.div>

        {/* Device Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Device Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-4">
            {deviceData.map((device) => (
              <div key={device.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                  <span className="text-sm text-gray-700">{device.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{device.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Top Pages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Pages</h2>
          <div className="space-y-4">
            {topPages.map((page, index) => (
              <div key={page.page} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{page.page}</p>
                    <p className="text-sm text-gray-600">{page.views.toLocaleString()} views</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{page.avgTime}</p>
                  <p className="text-xs text-gray-600">{page.bounceRate}% bounce</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Traffic Channels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Traffic Channels</h2>
          <div className="space-y-4">
            {channelData.map((channel) => (
              <div key={channel.channel} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{channel.channel}</span>
                  <span className={`flex items-center gap-1 text-sm font-semibold ${channel.color}`}>
                    {channel.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(channel.change)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{channel.sessions.toLocaleString()}</span>
                  <span className="text-sm text-gray-600">sessions</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Conversions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Conversion Goals</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {conversions.map((goal) => (
            <div key={goal.goal} className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <MousePointerClick className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">{goal.goal}</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{goal.conversions}</p>
                  <p className="text-sm text-gray-600">Conversions</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Rate:</span>
                  <span className="font-semibold text-gray-900">{goal.rate}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-semibold text-green-600">{goal.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

