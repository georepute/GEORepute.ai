"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users,
  Building2,
  DollarSign,
  ArrowUpRight,
  Eye,
  Target
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function AgencyDashboard({ user }: { user: any }) {
  // Sample data for agency view
  const clientPerformance = [
    { name: "Client A", visibility: 85, keywords: 120 },
    { name: "Client B", visibility: 72, keywords: 95 },
    { name: "Client C", visibility: 91, keywords: 150 },
    { name: "Client D", visibility: 68, keywords: 80 },
    { name: "Client E", visibility: 88, keywords: 110 },
  ];

  const revenueData = [
    { month: "Jan", revenue: 12000 },
    { month: "Feb", revenue: 14500 },
    { month: "Mar", revenue: 16800 },
    { month: "Apr", revenue: 19200 },
    { month: "May", revenue: 21500 },
    { month: "Jun", revenue: 24000 },
  ];

  const topClients = [
    { name: "Acme Corp", visibility: 92, change: "+8%", status: "active" },
    { name: "TechStart Inc", visibility: 88, change: "+12%", status: "active" },
    { name: "Global Retail", visibility: 85, change: "+5%", status: "active" },
    { name: "FinanceHub", visibility: 79, change: "-2%", status: "needs attention" },
  ];

  const stats = [
    {
      label: "Total Clients",
      value: "24",
      change: "+3 this month",
      icon: Users,
      color: "text-primary-600",
      bgColor: "bg-primary-100",
    },
    {
      label: "Avg. Client Visibility",
      value: "84%",
      change: "+7% avg increase",
      icon: Eye,
      color: "text-secondary-600",
      bgColor: "bg-secondary-100",
    },
    {
      label: "Total Keywords",
      value: "1,847",
      change: "+234 this month",
      icon: Target,
      color: "text-accent-600",
      bgColor: "bg-accent-100",
    },
    {
      label: "Monthly Revenue",
      value: "$24K",
      change: "+18% vs last month",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Agency Dashboard 🚀
        </h1>
        <p className="text-gray-600">Manage all your clients and track performance in one place.</p>
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
        {/* Client Performance */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Client Performance</h2>
              <p className="text-sm text-gray-600">Visibility scores by client</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="visibility" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue Trends */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenue Trends</h2>
              <p className="text-sm text-gray-600">Last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#14b8a6" 
                strokeWidth={3}
                dot={{ fill: "#14b8a6", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top Clients Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Top Clients</h2>
            <p className="text-sm text-gray-600">Highest performing clients this month</p>
          </div>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
            View All Clients
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          {topClients.map((client, index) => (
            <motion.div
              key={client.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500">
                    {client.status === "active" ? "✅ Active" : "⚠️ Needs Attention"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{client.visibility}%</p>
                <p className={`text-sm font-semibold ${
                  client.change.startsWith("+") ? "text-green-600" : "text-red-600"
                }`}>
                  {client.change}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}


