"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Search,
  Filter,
  Star,
  Clock,
  Zap,
  Target,
  ExternalLink,
} from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  location: string;
  intent: "high" | "medium" | "low";
  source: string;
  searchQuery: string;
  capturedAt: Date;
  status: "new" | "contacted" | "qualified" | "converted";
  estimatedValue: number;
}

export default function LeadsPage() {
  const [filterIntent, setFilterIntent] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [leads] = useState<Lead[]>([
    {
      id: "1",
      name: "Michael Rodriguez",
      email: "michael.r@techstart.com",
      phone: "(415) 555-0123",
      company: "TechStart Inc",
      location: "San Francisco, CA",
      intent: "high",
      source: "Google Search",
      searchQuery: "local seo agency san francisco",
      capturedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "new",
      estimatedValue: 5000,
    },
    {
      id: "2",
      name: "Sarah Chen",
      email: "sarah@localcafe.com",
      company: "Local Cafe",
      location: "Oakland, CA",
      intent: "high",
      source: "Organic Search",
      searchQuery: "how to improve google my business reviews",
      capturedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: "contacted",
      estimatedValue: 3500,
    },
    {
      id: "3",
      name: "David Kim",
      email: "dkim@example.com",
      location: "San Jose, CA",
      intent: "medium",
      source: "Reddit",
      searchQuery: "best seo tools for small business",
      capturedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "new",
      estimatedValue: 2000,
    },
    {
      id: "4",
      name: "Jennifer Taylor",
      email: "jtaylor@healthclinic.com",
      phone: "(510) 555-0198",
      company: "Health Clinic",
      location: "Berkeley, CA",
      intent: "high",
      source: "Google Maps",
      searchQuery: "reputation management for doctors",
      capturedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: "qualified",
      estimatedValue: 8000,
    },
    {
      id: "5",
      name: "Robert Johnson",
      email: "rjohnson@email.com",
      location: "Sacramento, CA",
      intent: "low",
      source: "Social Media",
      searchQuery: "what is seo",
      capturedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: "new",
      estimatedValue: 500,
    },
  ]);

  const stats = {
    total: leads.length,
    high: leads.filter((l) => l.intent === "high").length,
    new: leads.filter((l) => l.status === "new").length,
    converted: leads.filter((l) => l.status === "converted").length,
    totalValue: leads.reduce((acc, l) => acc + l.estimatedValue, 0),
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesIntent = filterIntent === "all" || lead.intent === filterIntent;
    const matchesSearch =
      searchTerm === "" ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.searchQuery.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesIntent && matchesSearch;
  });

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case "high":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-purple-100 text-purple-800";
      case "qualified":
        return "bg-amber-100 text-amber-800";
      case "converted":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-primary-500 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Capture</h1>
            <p className="text-gray-600 mt-1">
              AI-powered intent detection and lead scoring
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Intent Detection</span>: Automatically
              captures visitor info when they show buying signals. Tracks search
              queries, behavior, and scores lead quality using AI.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Leads</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.high}</div>
          <div className="text-sm text-gray-600">High Intent</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.new}</div>
          <div className="text-sm text-gray-600">New Leads</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.converted}
          </div>
          <div className="text-sm text-gray-600">Converted</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ${(stats.totalValue / 1000).toFixed(1)}k
          </div>
          <div className="text-sm text-gray-600">Est. Value</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search leads by name, email, or query..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Intent Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterIntent("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterIntent === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterIntent("high")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterIntent === "high"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              High
            </button>
            <button
              onClick={() => setFilterIntent("medium")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterIntent === "medium"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setFilterIntent("low")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterIntent === "low"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Low
            </button>
          </div>
        </div>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead, idx) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-purple-700">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {lead.name}
                      </h3>
                      <div
                        className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getIntentColor(
                          lead.intent
                        )}`}
                      >
                        {lead.intent.toUpperCase()} INTENT
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        {lead.status.toUpperCase()}
                      </div>
                    </div>

                    {lead.company && (
                      <div className="text-sm text-gray-600 mb-2">
                        {lead.company}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {lead.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getTimeAgo(lead.capturedAt)}
                      </div>
                    </div>

                    {/* Search Query */}
                    <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-start gap-2">
                        <Search className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-purple-900 mb-1">
                            Search Query ({lead.source})
                          </div>
                          <div className="text-sm text-gray-700">
                            "{lead.searchQuery}"
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${lead.estimatedValue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Est. Value</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="primary" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No leads match your filters</p>
          <p className="text-sm text-gray-500">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

