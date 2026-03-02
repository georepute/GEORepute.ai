"use client";

import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/lib/language-context";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  Eye,
  Target,
  Globe,
  Users,
  FileText,
  Server,
  BarChart3,
  ArrowUpRight,
  Building2,
  RefreshCw,
  Video,
  FileBarChart,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AccountSummary {
  user: { id: string; email?: string; name?: string };
  organization: { id: string; name: string; seats: number; seatsUsed: number } | null;
  counts: {
    projects: number;
    domains: number;
    teamMembers: number;
    keywords: number;
    content: number;
    keywordPlans: number;
    reports?: number;
    videoReports?: number;
  };
  visibility: {
    totalVisibility: number;
    totalMentions: number;
    totalQueries: number;
    completedSessions: number;
  };
}

interface Prompt {
  id: string;
  text: string;
  visibility: number;
  sentiment: number;
  rank: number;
  intent: string;
  region: string;
  created: string;
  tags: string[];
  projectName?: string;
}

interface DomainItem {
  id: string;
  domain: string;
  status?: string;
  gsc_integration?: { verification_status?: string } | null;
}

export default function Dashboard() {
  const { loading: permissionsLoading } = usePermissions();
  const { isRtl, t } = useLanguage();
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [intentDistribution, setIntentDistribution] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [topPrompts, setTopPrompts] = useState<Prompt[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, promptsRes, domainsRes] = await Promise.all([
        fetch("/api/dashboard/summary"),
        fetch("/api/dashboard/prompts"),
        fetch("/api/integrations/google-search-console/domains"),
      ]);
      if (!summaryRes.ok) throw new Error("Failed to fetch summary");
      const summaryData = await summaryRes.json();
      if (summaryData.success && summaryData.summary) {
        setSummary(summaryData.summary);
      } else {
        throw new Error(summaryData.error || "Invalid response");
      }
      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        if (promptsData.success) {
          setIntentDistribution(promptsData.intentDistribution || []);
          setTopPrompts(promptsData.topPrompts || []);
        }
      }
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        if (domainsData.success && domainsData.domains) {
          setDomains(domainsData.domains);
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to load account summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const defaultIntentData = [
    { name: "Informational", value: 48, color: "#3b82f6" },
    { name: "Navigational", value: 24, color: "#8b5cf6" },
    { name: "Transactional", value: 16, color: "#f97316" },
    { name: "Commercial", value: 12, color: "#14b8a6" },
  ];

  const intentData = intentDistribution.length > 0 ? intentDistribution : defaultIntentData;

  if (permissionsLoading || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <button
            onClick={fetchSummary}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s = summary!;
  const stats = [
    {
      label: t.dashboard.client.totalVisibility,
      value: `${s.visibility.totalVisibility}%`,
      sub: s.visibility.totalQueries > 0
        ? `${s.visibility.totalMentions.toLocaleString()} / ${s.visibility.totalQueries.toLocaleString()} queries`
        : "No data yet",
      icon: Eye,
      color: "text-primary-600",
      bgColor: "bg-primary-100",
      href: "/dashboard/ai-visibility",
    },
    {
      label: t.dashboard.client.keywordsTracked,
      value: String(s.counts.keywords),
      sub: `${s.counts.projects} projects, ${s.counts.keywordPlans} plans`,
      icon: Target,
      color: "text-secondary-600",
      bgColor: "bg-secondary-100",
      href: "/dashboard/keyword-forecast",
    },
    {
      label: t.dashboard.client.visibility,
      value: String(s.counts.domains),
      sub: "Domains",
      icon: Globe,
      color: "text-accent-600",
      bgColor: "bg-accent-100",
      href: "/dashboard/domains",
    },
    {
      label: t.dashboard.client.content,
      value: String(s.counts.content),
      sub: "Content items",
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100",
      href: "/dashboard/content",
    },
    {
      label: t.dashboard.client.reports,
      value: String(s.counts.reports ?? 0),
      sub: t.dashboard.client.generatedReports,
      icon: FileBarChart,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      href: "/dashboard/reports",
    },
    {
      label: t.dashboard.client.videoReports,
      value: String(s.counts.videoReports ?? 0),
      sub: t.dashboard.client.videoReportsDesc,
      icon: Video,
      color: "text-rose-600",
      bgColor: "bg-rose-100",
      href: "/dashboard/reports",
    },
    {
      label: "Projects",
      value: String(s.counts.projects),
      sub: "Brand analysis",
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/dashboard/ai-visibility",
    },
    {
      label: "Team",
      value: String(s.counts.teamMembers),
      sub: s.organization ? `${s.organization.seatsUsed} / ${s.organization.seats} seats` : "Members",
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      href: "/dashboard/team",
    },
  ];

  const visibilityPct = Math.min(s.visibility.totalVisibility, 100);
  const gaugeRadius = 62;
  const circumference = 2 * Math.PI * gaugeRadius;
  const strokeDashoffset = circumference - (visibilityPct / 100) * circumference;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              {t.dashboard.sidebar.dashboard}
            </h1>
          </div>
          <p className="text-gray-600">
            {t.dashboard.client.welcomeBack}, {s.user.name || t.dashboard.client.welcomeDefault}!{" "}
            {s.organization && (
              <span className="text-gray-500">— {s.organization.name}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Hero: AI Visibility summary card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 rounded-xl border border-gray-200 overflow-hidden bg-gradient-to-r from-primary-50 via-white to-accent-50"
      >
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={gaugeRadius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
              <circle
                cx="80" cy="80"
                r={gaugeRadius}
                stroke="url(#gaugeGrad)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 80 80)"
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{visibilityPct}%</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Overall <br></br>Visibility</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
            {[
              { label: "Brand Mentions", value: s.visibility.totalMentions.toLocaleString(), icon: TrendingUp },
              { label: "Queries Analyzed", value: s.visibility.totalQueries.toLocaleString(), icon: Server },
              { label: "Completed Sessions", value: String(s.visibility.completedSessions), icon: BarChart3 },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/80 border border-gray-100 p-4">
                <item.icon className="w-5 h-5 text-primary-600 mb-2" />
                <div className="text-xl font-bold text-gray-900">{item.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
            <Link
              href="/dashboard/ai-visibility"
              className="col-span-2 sm:col-span-3 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View full AI Visibility report
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Account Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
          >
            <Link
              href={stat.href}
              className="block bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg hover:border-primary-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors shrink-0" />
              </div>
              <div className="text-xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{stat.sub}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Organization, Domains, Visibility & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {s.organization && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              Organization
            </h2>
            <div className="flex-1">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Name</dt>
                  <dd className="font-medium text-gray-900">{s.organization.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Team seats</dt>
                  <dd className="font-medium text-gray-900">
                    {s.organization.seatsUsed} / {s.organization.seats} used
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Members</dt>
                  <dd className="font-medium text-gray-900">{s.counts.teamMembers}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Seat usage</span>
                  <span>{Math.round((s.organization.seatsUsed / s.organization.seats) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${Math.min((s.organization.seatsUsed / s.organization.seats) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/team"
              className="mt-4 pt-4 border-t border-gray-100 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Manage team
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        {/* Domains Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent-600" />
            Domains
          </h2>
          <div className="flex-1 space-y-3">
            {s.counts.domains === 0 ? (
              <p className="text-sm text-gray-500 py-2">No domains yet</p>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total domains</span>
                  <span className="font-semibold text-gray-900">{s.counts.domains}</span>
                </div>
                {domains.length > 0 && (
                  <ul className="space-y-2">
                    {domains.slice(0, 3).map((d) => {
                      const status = d.gsc_integration?.verification_status || d.status;
                      const StatusIcon = status === "verified" ? CheckCircle : status === "pending_verification" || status === "pending" ? Clock : XCircle;
                      const statusColor = status === "verified" ? "text-green-600" : status === "pending_verification" || status === "pending" ? "text-amber-600" : status === "failed" ? "text-red-500" : "text-gray-400";
                      return (
                        <li key={d.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
                          <span className="font-medium text-gray-900 truncate">{d.domain}</span>
                          <span title={status || "—"}>
                            <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
          <Link
            href="/dashboard/domains"
            className="mt-4 pt-4 border-t border-gray-100 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Manage domains
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-primary-600" />
            AI Visibility
          </h2>
          <div className="flex-1">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total visibility</dt>
                <dd className="font-medium text-gray-900">{s.visibility.totalVisibility}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Brand mentions</dt>
                <dd className="font-medium text-gray-900">{s.visibility.totalMentions.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Queries analyzed</dt>
                <dd className="font-medium text-gray-900">{s.visibility.totalQueries.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Completed sessions</dt>
                <dd className="font-medium text-gray-900">{s.visibility.completedSessions}</dd>
              </div>
            </dl>
          </div>
          <Link
            href="/dashboard/ai-visibility"
            className="mt-4 pt-4 border-t border-gray-100 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View AI Visibility
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-indigo-600" />
            Reports & Videos
          </h2>
          <div className="flex-1">
            <dl className="space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-gray-600">Generated reports</dt>
                <dd className="font-medium text-gray-900">{s.counts.reports ?? 0}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-600">Video reports</dt>
                <dd className="font-medium text-gray-900">{s.counts.videoReports ?? 0}</dd>
              </div>
            </dl>
          </div>
          <Link
            href="/dashboard/reports"
            className="mt-4 pt-4 border-t border-gray-100 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View Reports
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      {/* Prompt Intent Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8"
      >
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {t.dashboard.client.promptIntentDistribution}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {t.dashboard.client.promptIntentDistributionDesc}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={intentData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value}%`, ""]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {intentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Top Prompts from AI Visibility */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">
            {t.dashboard.client.topPromptsTitle}
          </h2>
          <Link
            href="/dashboard/ai-visibility"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            {t.dashboard.client.viewAllInAiVisibility}
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="p-4">
          {topPrompts.length > 0 ? (
            <ul className="space-y-3">
              {topPrompts.map((prompt) => {
                const pct = prompt.visibility;
                const circ = 2 * Math.PI * 20;
                const ringColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#3b82f6" : "#f97316";
                return (
                  <li
                    key={prompt.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900">{prompt.text}</span>
                      {prompt.projectName && (
                        <span className="block text-xs text-gray-500 mt-0.5">{prompt.projectName}</span>
                      )}
                    </div>
                    <div className="flex items-center shrink-0">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke={ringColor}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">{t.dashboard.common.noData}</p>
              <p className="text-sm mt-1">{t.dashboard.client.topPromptsEmpty}</p>
              <Link
                href="/dashboard/ai-visibility"
                className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                {t.dashboard?.reports?.goToAIVisibility ?? "Go to AI Visibility"}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
