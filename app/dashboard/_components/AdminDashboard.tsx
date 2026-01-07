"use client";

import { motion } from "framer-motion";
import { 
  Users,
  Building2,
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { useLanguage } from "@/lib/language-context";

export default function AdminDashboard({ user }: { user: any }) {
  const { isRtl, t } = useLanguage();
  // Sample data for admin view
  const platformHealth = [
    { name: "API", status: 99.9, color: "#14b8a6" },
    { name: "Database", status: 100, color: "#3b82f6" },
    { name: "AI Services", status: 98.5, color: "#8b5cf6" },
    { name: "Storage", status: 99.8, color: "#10b981" },
  ];

  const userGrowth = [
    { month: "Jan", users: 120, agencies: 8 },
    { month: "Feb", users: 185, agencies: 12 },
    { month: "Mar", users: 245, agencies: 15 },
    { month: "Apr", users: 310, agencies: 19 },
    { month: "May", users: 390, agencies: 24 },
    { month: "Jun", users: 485, agencies: 31 },
  ];

  const roleDistribution = [
    { name: "Clients", value: 420, color: "#14b8a6" },
    { name: "Agencies", value: 31, color: "#8b5cf6" },
    { name: "Admins", value: 3, color: "#ef4444" },
  ];

  const recentActivity = [
    { action: "New user signup", user: "john@example.com", time: "2 min ago", type: "success" },
    { action: "Failed API call", details: "Rate limit exceeded", time: "5 min ago", type: "warning" },
    { action: "New agency created", user: "Agency Pro", time: "12 min ago", type: "success" },
    { action: "Database backup completed", details: "All data backed up", time: "1 hour ago", type: "info" },
  ];

  const stats = [
    {
      label: t.dashboard.admin.totalUsers,
      value: "485",
      change: "+95",
      icon: Users,
      color: "text-primary-600",
      bgColor: "bg-primary-100",
    },
    {
      label: t.dashboard.admin.totalAgencies,
      value: "31",
      change: "+7",
      icon: Building2,
      color: "text-accent-600",
      bgColor: "bg-accent-100",
    },
    {
      label: t.dashboard.admin.systemHealth,
      value: "99.9%",
      change: "30 days",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: t.dashboard.admin.apiCalls,
      value: "24K",
      change: "+18%",
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t.dashboard.admin.adminDashboard} ⚡
        </h1>
        <p className="text-gray-600">{t.dashboard.admin.systemOverview}</p>
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
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600 mb-2">{stat.label}</div>
            <div className="text-xs text-gray-500">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Split View */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard.admin.userGrowth}</h2>
              <p className="text-sm text-gray-600">{t.dashboard.client.last6Months}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} />
              <Line type="monotone" dataKey="agencies" stroke="#8b5cf6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500"></div>
              <span className="text-sm text-gray-600">Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-500"></div>
              <span className="text-sm text-gray-600">Agencies</span>
            </div>
          </div>
        </motion.div>

        {/* Role Distribution */}
        <motion.div
          initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard.admin.systemMetrics}</h2>
              <p className="text-sm text-gray-600">{t.dashboard.admin.performanceOverTime}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={roleDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {roleDistribution.map((role) => (
              <div key={role.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }}></div>
                  <span className="text-sm text-gray-700">{role.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{role.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Platform Health & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Platform Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t.dashboard.admin.systemHealth}</h2>
            <p className="text-sm text-gray-600">{t.dashboard.admin.performanceOverTime}</p>
          </div>
          <div className="space-y-4">
            {platformHealth.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-900">{service.name}</span>
                </div>
                <span className="font-bold text-green-600">{service.status}%</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t.dashboard.admin.recentSignups}</h2>
              <p className="text-sm text-gray-600">{t.dashboard.admin.latestRegistrations}</p>
            </div>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              {t.dashboard.common.view}
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === "success" ? "bg-green-500" :
                  activity.type === "warning" ? "bg-orange-500" :
                  "bg-blue-500"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">
                    {activity.user || activity.details} • {activity.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}




