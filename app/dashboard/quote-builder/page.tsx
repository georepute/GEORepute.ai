"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Send,
  Eye,
  DollarSign,
  Calendar,
  TrendingUp,
  Target,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Mail,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Palette,
  X,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import { REPORT_ADDON_IDS, REPORT_ADDON_PRICES } from "@/lib/quote-builder/pricing-engine";
import { STRATEGIC_MODES } from "@/lib/quote-builder/recommendation-engine";
import { generateProposalPDF } from "@/lib/quote-builder/proposal-pdf";

const REPORT_LABELS: Record<string, string> = {
  ai_vs_google_gap: "AI vs Google Gap",
  market_share_of_attention: "Market Share of Attention",
  opportunity_blind_spots: "Opportunity & Blind Spots",
  geo_visibility: "GEO Visibility",
};

const STEPS: Record<number, string> = {
  1: "Domain & Client",
  2: "Scan",
  3: "DCS Overview",
  4: "Market & Revenue",
  5: "Risk & Threat",
  6: "Recommendation",
  7: "Reports",
  8: "Pricing",
  9: "Preview",
  10: "Export",
};

const STEPS_QUICK = [1, 2, 3, 6, 7, 8, 10]; // Skip Market (4), Risk (5), Preview (9)
const STEPS_FULL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function nextStepNumber(step: number, mode: "quick" | "advanced" | "internal"): number {
  const list = mode === "quick" ? STEPS_QUICK : STEPS_FULL;
  const i = list.indexOf(step);
  if (i < 0 || i >= list.length - 1) return step;
  return list[i + 1];
}

function prevStepNumber(step: number, mode: "quick" | "advanced" | "internal"): number {
  const list = mode === "quick" ? STEPS_QUICK : STEPS_FULL;
  const i = list.indexOf(step);
  if (i <= 0) return step;
  return list[i - 1];
}

function stepsForMode(mode: "quick" | "advanced" | "internal"): number[] {
  return mode === "quick" ? STEPS_QUICK : STEPS_FULL;
}

const DRAFT_STORAGE_KEY = "quote_builder_draft_id";

/** Base URL for proposal share links. In production (origin not localhost) use origin; otherwise use NEXT_PUBLIC_APP_URL or origin. */
function getProposalBaseUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    if (!isLocalhost) return origin;
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
    return origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return "";
}

/** Build Gmail compose URL with pre-filled to, subject, and body (proposal link). */
function getGmailComposeUrl(quote: { client_email?: string | null; client_name?: string | null; share_token: string }): string {
  const baseUrl = typeof window !== "undefined" ? getProposalBaseUrl() : "";
  const proposalLink = baseUrl ? `${baseUrl}/proposals/${quote.share_token}` : "";
  const clientName = quote.client_name || "Proposal";
  const subject = `Strategic Intelligence Proposal – ${clientName}`;
  const bodyLines = [
    "Hi,",
    "",
    "Please find your Strategic Intelligence Proposal below.",
    "",
    proposalLink ? `View proposal: ${proposalLink}` : "",
    "",
    "Best regards",
  ];
  const body = bodyLines.join("\n").trim();
  const to = (quote.client_email || "").trim();
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  params.set("su", subject);
  params.set("body", body);
  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}

interface Project {
  id: string;
  brand_name: string;
  website_url: string | null;
  industry: string | null;
}

interface Quote {
  id: string;
  share_token: string;
  status: string;
  project_id?: string | null;
  domain: string;
  client_name: string | null;
  client_email: string | null;
  contact_person: string | null;
  valid_until: string | null;
  dcs_snapshot: {
    finalScore: number;
    layerBreakdown: { name: string; score: number }[];
    radarChartData: { layer: string; score: number; fullMark: number }[];
    distanceToSafetyZone: number;
    distanceToDominanceZone: number;
    industryAverage?: number;
    competitorComparison?: { name: string; domain?: string; score: number }[];
  };
  revenue_exposure: {
    searchDemand: number;
    revenueExposureWindow: { conservative: number; strategic: number; dominance: number };
    avgDealValue: number;
    disclaimer?: string;
  };
  market_data?: {
    totalSearchDemand?: number;
    marketOpportunityIndex?: number | null;
    competitiveShareOfAttention?: number;
    cpcWeightedValue?: number | null;
    summary?: {
      totalSearchDemand?: number;
      competitiveShareOfAttention?: string;
      cpcWeightedValue?: string | null;
    };
    /** Advanced mode: optional full breakdown fields */
    aiQueryGrowthTrend?: number | null;
    geographicSignals?: string | null;
    emergingTopicClusters?: string[] | null;
  };
  threat_data: {
    competitivePressureIndex: number;
    riskAccelerationIndicator: string;
    signals?: Record<string, number>;
    projectedDcsSixMonths?: number;
    projectionDisclaimer?: string;
    legalNegativeMentions?: string;
  };
  recommendation: {
    primaryMode: string;
    allModes: { id: string; name: string; description: string; pricingAnchor: string }[];
    priorities: { area: string; reason: string; urgency: string }[];
    focusAreas: string[];
  };
  pricing_data: {
    suggestedMin: number;
    suggestedMax: number;
    breakdown: Record<string, string>;
    reportAddOns: { reportId: string; amount: number }[];
  };
  selected_reports: string[];
  selected_markets: string[];
  scope_adjustments: { monitoringDepth?: string };
  price_override: number | null;
  total_monthly_price: number | null;
  internal_notes?: string | null;
  margin_estimate?: number | null;
  win_probability?: number | null;
  created_at: string;
}

export default function QuoteBuilderPage() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"quick" | "advanced" | "internal">("quick");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [scanning, setScanning] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [priceOverrideReason, setPriceOverrideReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [winProbability, setWinProbability] = useState<number | null>(null);
  const [marginEstimate, setMarginEstimate] = useState<string>("");
  const [quoteHistory, setQuoteHistory] = useState<{ id: string; share_token: string; client_name: string | null; status: string; total_monthly_price: number | null; price_override?: number | null; win_probability?: number | null; created_at: string; domain: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activityLog, setActivityLog] = useState<{ id: string; action: string; old_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null; created_at: string }[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityModalQuoteId, setActivityModalQuoteId] = useState<string | null>(null);
  const [activityModalLog, setActivityModalLog] = useState<{ id: string; action: string; old_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null; created_at: string }[]>([]);
  const [loadingActivityModal, setLoadingActivityModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSendProposalModal, setShowSendProposalModal] = useState(false);
  const [sendProposalRecipientName, setSendProposalRecipientName] = useState("");
  const [sendProposalEmail, setSendProposalEmail] = useState("");
  const [sendProposalMessage, setSendProposalMessage] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const domain = selectedProject?.website_url
    ? selectedProject.website_url.replace(/https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
    : "";

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("brand_analysis_projects")
      .select("id, brand_name, website_url, industry")
      .order("updated_at", { ascending: false });
    if (!error && data) setProjects(data as Project[]);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const res = await fetch("/api/quote-builder?limit=20");
    const data = await res.json().catch(() => ({}));
    if (data.quotes) setQuoteHistory(data.quotes);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchHistory();
  }, [fetchProjects, fetchHistory]);

  // Restore draft quote on load so refresh doesn't force "start again"
  useEffect(() => {
    if (quote != null) return;
    const draftId = typeof window !== "undefined" ? sessionStorage.getItem(DRAFT_STORAGE_KEY) : null;
    if (!draftId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/quote-builder?id=${encodeURIComponent(draftId)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled || !res.ok || !data.quote) return;
      const q = data.quote as Quote;
      if (q.status !== "draft") {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      setQuote(q);
      setSelectedProjectId(q.project_id ?? "");
      setClientName(q.client_name ?? "");
      setClientEmail(q.client_email ?? "");
      setContactPerson(q.contact_person ?? "");
      setValidUntil(q.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : "");
      setSelectedReports(q.selected_reports ?? []);
      setStep(3);
      toast.success("Draft restored");
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (quote) {
      setInternalNotes(quote.internal_notes ?? "");
      setWinProbability(quote.win_probability ?? null);
      setMarginEstimate(quote.margin_estimate != null ? String(quote.margin_estimate) : "");
      setPriceOverride(quote.price_override != null ? String(quote.price_override) : "");
      if (typeof window !== "undefined" && quote.status === "draft") {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, quote.id);
      }
    } else if (typeof window !== "undefined") {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [quote?.id, quote?.status]);

  // When switching to Quick, snap off skipped steps (4, 5, 9) so we don't show a step not in the progress bar
  useEffect(() => {
    if (mode !== "quick") return;
    if (step === 4 || step === 5) setStep(6);
    else if (step === 9) setStep(10);
  }, [mode]);

  const handleGenerate = async () => {
    if (!selectedProjectId || !domain) {
      toast.error("Select a project with a website URL");
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/quote-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          domain,
          client_name: clientName || null,
          client_email: clientEmail || null,
          contact_person: contactPerson || null,
          valid_until: validUntil || null,
          mode,
          selected_reports: [],
          selected_markets: [],
          scope_adjustments: { monitoringDepth: "standard" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create proposal");
      setQuote(data.quote);
      setSelectedReports(data.quote.selected_reports || []);
      setStep(3);
      if (typeof window !== "undefined" && data.quote.status === "draft") {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, data.quote.id);
      }
      toast.success("Proposal generated");
      fetchHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setScanning(false);
    }
  };

  const updateQuote = async (updates: Record<string, unknown>) => {
    if (!quote) return;
    const res = await fetch("/api/quote-builder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: quote.id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Update failed");
      return;
    }
    setQuote(data.quote);
    toast.success("Updated");
  };

  const toggleReport = (id: string) => {
    const next = selectedReports.includes(id)
      ? selectedReports.filter((r) => r !== id)
      : [...selectedReports, id];
    setSelectedReports(next);
    if (quote) updateQuote({ selected_reports: next });
  };

  const applyPriceOverride = () => {
    const num = parseFloat(priceOverride);
    if (isNaN(num) || num < 0) {
      toast.error("Enter a valid price");
      return;
    }
    updateQuote({
      price_override: num,
      price_override_reason: priceOverrideReason || null,
      total_monthly_price: num,
    });
    toast.success("Price updated");
    if (quote?.id && activityLogOpen) fetchActivityLog(quote.id);
  };

  const fetchActivityLog = useCallback(async (quoteId: string) => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/quote-builder/activity?quoteId=${encodeURIComponent(quoteId)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.activity)) {
        setActivityLog(data.activity);
      } else {
        setActivityLog([]);
      }
    } catch {
      setActivityLog([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    if (!activityModalQuoteId) {
      setActivityModalLog([]);
      return;
    }
    let cancelled = false;
    setLoadingActivityModal(true);
    fetch(`/api/quote-builder/activity?quoteId=${encodeURIComponent(activityModalQuoteId)}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!cancelled && ok && Array.isArray(data.activity)) {
          setActivityModalLog(data.activity);
        } else if (!cancelled) {
          setActivityModalLog([]);
        }
      })
      .catch(() => {
        if (!cancelled) setActivityModalLog([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingActivityModal(false);
      });
    return () => { cancelled = true; };
  }, [activityModalQuoteId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-100 text-blue-700";
      case "accepted": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      case "expired": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const copyShareLink = () => {
    if (!quote?.share_token) return;
    const url = `${getProposalBaseUrl()}/proposals/${quote.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const handleEditQuote = async (id: string) => {
    try {
      const res = await fetch(`/api/quote-builder?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load quote");
      const q = data.quote as Quote;
      setQuote(q);
      setSelectedProjectId(q.project_id ?? "");
      setClientName(q.client_name ?? "");
      setClientEmail(q.client_email ?? "");
      setContactPerson(q.contact_person ?? "");
      setValidUntil(q.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : "");
      setSelectedReports(q.selected_reports ?? []);
      if (typeof window !== "undefined" && q.status === "draft") {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, q.id);
      }
      setStep(3);
      toast.success("Quote loaded — continue editing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load quote");
    }
  };

  const handleOpenDraftAtExport = async (id: string) => {
    try {
      const res = await fetch(`/api/quote-builder?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load quote");
      const q = data.quote as Quote;
      setQuote(q);
      setSelectedProjectId(q.project_id ?? "");
      setClientName(q.client_name ?? "");
      setClientEmail(q.client_email ?? "");
      setContactPerson(q.contact_person ?? "");
      setValidUntil(q.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : "");
      setSelectedReports(q.selected_reports ?? []);
      if (typeof window !== "undefined" && q.status === "draft") {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, q.id);
      }
      setStep(10);
      toast.success("Quote opened at Export");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load quote");
    }
  };

  const handleDeleteQuote = async (q: { id: string; status: string }) => {
    if (q.status !== "draft") {
      toast.error("Only draft quotes can be deleted");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("Delete this draft quote?")) return;
    try {
      const res = await fetch(`/api/quote-builder?id=${encodeURIComponent(q.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      if (quote?.id === q.id) {
        setQuote(null);
        setStep(1);
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      fetchHistory();
      toast.success("Draft deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const currentQuote = quote;
  const dcs = currentQuote?.dcs_snapshot;
  const revenue = currentQuote?.revenue_exposure;
  const threat = currentQuote?.threat_data;
  const recommendation = currentQuote?.recommendation;
  const pricing = currentQuote?.pricing_data;
  const displayPrice =
    currentQuote?.price_override ?? currentQuote?.total_monthly_price ?? pricing?.suggestedMin ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Strategic Intelligence Quote Builder</h1>
          <p className="text-gray-600">Generate board-ready proposals in under 7 minutes</p>
        </div>
        <Link
          href="/dashboard/settings?tab=white-label"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-sm font-medium transition-colors"
        >
          <Palette className="w-4 h-4 text-indigo-600" />
          White label / Branding
        </Link>
      </div>

      {/* Mode tabs — clearly interactive; selection changes step flow and internal-only fields */}
      <div className="mb-6">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit" role="tablist" aria-label="Quote builder mode">
          {(["quick", "advanced", "internal"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                mode === m
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {m === "quick" ? "Quick Call" : m === "advanced" ? "Advanced" : "Agency Internal"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {mode === "quick" && "Fewer steps: Domain → Scan → DCS → Recommendation → Reports → Pricing → Export."}
          {mode === "advanced" && "All 10 steps including Market, Risk, and Preview."}
          {mode === "internal" && "Full flow plus internal notes, win probability, and price override log (on Pricing step)."}
        </p>
      </div>

      {/* Step progress — only show steps for current mode */}
      <div className="flex flex-wrap gap-2 mb-8">
        {stepsForMode(mode).map((stepNum, i) => (
          <button
            key={stepNum}
            type="button"
            onClick={() => setStep(stepNum)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full ${
              step === stepNum ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {i + 1}. {STEPS[stepNum]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Domain & Client */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Domain & Client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand / Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand_name} — {p.website_url || "No URL"}
                    </option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Run Brand Analysis first to create a project.
                  </p>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Company name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valid until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <div />
              <button
                onClick={() => setStep(nextStepNumber(1, mode))}
                disabled={!selectedProjectId}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                Next: Scan <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Scan */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Scan</h2>
            {scanning ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                <p className="text-gray-600">Loading DCS, market data, and risk profile…</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Generate a proposal snapshot from your existing brand analysis data. The scan uses:
                </p>
                <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                  <li>DCS (6 layers: AI & Search, Organic, Social, Reputation, Website, Risk)</li>
                  <li>GSC search demand & revenue exposure (3 tiers)</li>
                  <li>Threat engine (competitive pressure, risk indicator)</li>
                  <li>Market data & competitor comparison</li>
                </ul>
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(prevStepNumber(2, mode))}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!selectedProjectId || scanning}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Generate proposal
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: DCS Overview */}
        {step === 3 && currentQuote && dcs && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Digital Control Overview</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-5xl font-bold text-primary-600 mb-2">{dcs.finalScore}</div>
                <p className="text-gray-600">Digital Control Score</p>
                <p className="text-sm text-gray-500 mt-2">
                  Distance to Safety (70): {dcs.distanceToSafetyZone} pts — Distance to Dominance (85): {dcs.distanceToDominanceZone} pts
                </p>
                {dcs.industryAverage != null && !Number.isNaN(dcs.industryAverage) && (
                  <p className="text-sm text-gray-500 mt-1">Industry average: <span className="font-medium text-gray-700">{Math.round(dcs.industryAverage)}</span></p>
                )}
              </div>
              <div className="h-64">
                {dcs.radarChartData?.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={dcs.radarChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="layer" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="DCS" dataKey="score" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {(dcs.layerBreakdown?.length ?? 0) > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Layer breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {dcs.layerBreakdown!.map((layer) => (
                    <div key={layer.name} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700 truncate" title={layer.name}>{layer.name}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-2">{Math.round(layer.score)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dcs.competitorComparison && dcs.competitorComparison.length > 0 && (() => {
              const normalize = (c: { name: unknown; domain?: unknown; score: number }) => {
                const rawName = c.name;
                const rawDomain = c.domain;
                const displayName = typeof rawName === "string" ? rawName : (rawName && typeof rawName === "object" && "name" in rawName ? String((rawName as { name?: string }).name ?? "") : String(rawName ?? ""));
                const domain = typeof rawDomain === "string" ? rawDomain : (rawName && typeof rawName === "object" && "domain" in rawName ? String((rawName as { domain?: string }).domain ?? "") : "");
                return { displayName: displayName || "—", domain: (domain || "").replace(/^(https?:\/\/)?/i, "").trim(), score: c.score };
              };
              const normalized = dcs.competitorComparison.map((c, i) => ({ ...normalize(c), key: typeof c.name === "string" ? c.name : i }));
              return (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Competitor comparison</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={normalized.map((n) => ({ ...n, displayLabel: n.displayName }))}
                        layout="vertical"
                        margin={{ left: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="displayLabel" width={100} tick={{ fontSize: 11 }} />
                        <Bar dataKey="score" fill="#0ea5e9" name="Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {normalized.map((n, i) => {
                      const url = n.domain ? (n.domain.startsWith("http") ? n.domain : `https://${n.domain}`) : null;
                      return url ? (
                        <a
                          key={n.key ?? i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={n.domain}
                          className="text-indigo-600 hover:underline"
                        >
                          {n.displayName} <span className="text-gray-600 font-medium">{n.score}</span>
                        </a>
                      ) : (
                        <span key={n.key ?? i} className="text-gray-600">{n.displayName} <span className="font-medium">{n.score}</span></span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(3, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(3, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Market & Revenue */}
        {step === 4 && currentQuote && revenue && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Market & Revenue Exposure</h2>
            {mode === "advanced" && (
              <p className="text-sm text-gray-500 mb-4">Full market breakdown and revenue exposure (Advanced mode).</p>
            )}
            {currentQuote.market_data && (currentQuote.market_data.marketOpportunityIndex != null || currentQuote.market_data.summary) && (
              <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currentQuote.market_data.marketOpportunityIndex != null && !Number.isNaN(currentQuote.market_data.marketOpportunityIndex) && (
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-medium">Market Opportunity Index</p>
                    <p className="text-xl font-bold text-indigo-900">{Math.round(currentQuote.market_data.marketOpportunityIndex)}</p>
                  </div>
                )}
                {currentQuote.market_data.summary?.competitiveShareOfAttention && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Competitive share of attention</p>
                    <p className="text-lg font-semibold text-gray-900">{currentQuote.market_data.summary.competitiveShareOfAttention}</p>
                  </div>
                )}
                {currentQuote.market_data.summary?.cpcWeightedValue && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">CPC weighted value</p>
                    <p className="text-lg font-semibold text-gray-900">{currentQuote.market_data.summary.cpcWeightedValue}</p>
                  </div>
                )}
                {(currentQuote.market_data.totalSearchDemand ?? revenue.searchDemand) != null && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Total search demand</p>
                    <p className="text-lg font-semibold text-gray-900">{(currentQuote.market_data.totalSearchDemand ?? revenue.searchDemand)?.toLocaleString() ?? "—"}</p>
                  </div>
                )}
              </div>
            )}
            {mode === "advanced" && currentQuote.market_data && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentQuote.market_data.aiQueryGrowthTrend != null && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">AI query growth trend</p>
                    <p className="text-lg font-semibold text-gray-900">{currentQuote.market_data.aiQueryGrowthTrend}%</p>
                  </div>
                )}
                {currentQuote.market_data.geographicSignals != null && currentQuote.market_data.geographicSignals !== "" && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Geographic signals</p>
                    <p className="text-sm font-semibold text-gray-900">{currentQuote.market_data.geographicSignals}</p>
                  </div>
                )}
                {currentQuote.market_data.emergingTopicClusters != null && currentQuote.market_data.emergingTopicClusters.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg sm:col-span-2">
                    <p className="text-xs text-gray-600">Emerging topic clusters</p>
                    <p className="text-sm font-semibold text-gray-900">{currentQuote.market_data.emergingTopicClusters.join(", ")}</p>
                  </div>
                )}
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Search demand</p>
                <p className="text-2xl font-bold text-gray-900">{revenue.searchDemand?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg. deal value</p>
                <p className="text-2xl font-bold text-gray-900">${revenue.avgDealValue?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Revenue Exposure Window</p>
                <p className="text-sm font-semibold text-gray-900">
                  Conservative: ${revenue.revenueExposureWindow?.conservative?.toLocaleString() ?? "—"}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  Strategic: ${revenue.revenueExposureWindow?.strategic?.toLocaleString() ?? "—"}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  Dominance: ${revenue.revenueExposureWindow?.dominance?.toLocaleString() ?? "—"}
                </p>
              </div>
            </div>
            {revenue.disclaimer && (
              <p className="text-xs text-gray-500 border-t pt-4">{revenue.disclaimer}</p>
            )}
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(4, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(4, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Risk <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Risk & Threat */}
        {step === 5 && currentQuote && threat && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Risk & Competitive Pressure</h2>
            {mode === "advanced" && (
              <p className="text-sm text-gray-500 mb-4">Full threat and risk engine output (Advanced mode).</p>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Competitive Pressure Index</p>
                <p className="text-4xl font-bold text-gray-900">{threat.competitivePressureIndex}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Risk Acceleration</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  threat.riskAccelerationIndicator === "HIGH" ? "bg-red-100 text-red-700" :
                  threat.riskAccelerationIndicator === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                }`}>
                  {threat.riskAccelerationIndicator}
                </span>
              </div>
              {threat.projectedDcsSixMonths != null && !Number.isNaN(threat.projectedDcsSixMonths) && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Projected DCS (6 months)</p>
                  <p className="text-xl font-bold text-gray-900">{Math.round(threat.projectedDcsSixMonths)}</p>
                  {threat.projectionDisclaimer && <p className="text-xs text-gray-500 mt-1">{threat.projectionDisclaimer}</p>}
                </div>
              )}
              {threat.legalNegativeMentions != null && threat.legalNegativeMentions !== "" && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Legal / negative mentions</p>
                  <p className="text-gray-900">{threat.legalNegativeMentions}</p>
                </div>
              )}
            </div>
            {threat.signals && Object.keys(threat.signals).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Risk signals</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(threat.signals).map(([k, v]) => (
                    <span key={k} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">{k}: {typeof v === "number" ? v.toFixed(0) : v}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(5, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(5, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Recommendation <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 6: Recommendation */}
        {step === 6 && currentQuote && recommendation && (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Strategic Recommendation</h2>
            <p className="text-gray-600 mb-4">Primary path: <strong className="capitalize">{recommendation.primaryMode?.replace("_", " ")}</strong></p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {(recommendation.allModes || STRATEGIC_MODES).map((m: { id: string; name: string; description: string; pricingAnchor: string }) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-lg border-2 ${
                    m.id === recommendation.primaryMode ? "border-primary-500 bg-primary-50" : "border-gray-200"
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{m.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{m.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{m.pricingAnchor}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(6, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(6, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Reports <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 7: Report selection */}
        {step === 7 && currentQuote && (
          <motion.div
            key="step7"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Report attachments</h2>
            <p className="text-sm text-gray-600 mb-4">Selections affect pricing.</p>
            <div className="space-y-3">
              {REPORT_ADDON_IDS.map((id) => (
                <label
                  key={id}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer ${
                    selectedReports.includes(id) ? "border-primary-500 bg-primary-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(id)}
                      onChange={() => toggleReport(id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                    <span className="font-medium text-gray-900">{REPORT_LABELS[id] || id}</span>
                  </div>
                  <span className="text-sm text-gray-600">+${REPORT_ADDON_PRICES[id] ?? 0}/mo</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(7, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(7, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Pricing <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 8: Pricing */}
        {step === 8 && currentQuote && pricing && (
          <motion.div
            key="step8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Scope & Pricing</h2>
            <div className="mb-6">
              <p className="text-3xl font-bold text-primary-600">
                ${displayPrice.toLocaleString()}
                <span className="text-lg font-normal text-gray-600">/month</span>
              </p>
              {pricing.breakdown && (
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  {Object.entries(pricing.breakdown).map(([k, v]) => (
                    <li key={k}>{v}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price override (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-40 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={priceOverrideReason}
                    onChange={(e) => setPriceOverrideReason(e.target.value)}
                    placeholder="Reason"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button onClick={applyPriceOverride} className="px-4 py-2 bg-gray-800 text-white rounded-lg">
                    Apply
                  </button>
                </div>
              </div>
              {mode === "internal" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Margin estimate (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={marginEstimate}
                      onChange={(e) => setMarginEstimate(e.target.value)}
                      onBlur={() => {
                        const trimmed = marginEstimate.trim();
                        if (trimmed === "") {
                          updateQuote({ margin_estimate: null });
                          return;
                        }
                        const v = parseFloat(trimmed);
                        if (!isNaN(v)) updateQuote({ margin_estimate: v });
                      }}
                      placeholder="e.g. 25"
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Internal notes</label>
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      onBlur={() => updateQuote({ internal_notes: internalNotes || null })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Win probability (0–100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={winProbability ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                        setWinProbability(v);
                        if (v !== null && !isNaN(v)) updateQuote({ win_probability: v });
                      }}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !activityLogOpen;
                        setActivityLogOpen(next);
                        if (next && currentQuote?.id) {
                          fetchActivityLog(currentQuote.id);
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <span className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Proposal history / Price override log
                      </span>
                      {activityLogOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {activityLogOpen && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg max-h-60 overflow-y-auto">
                        {loadingActivity ? (
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                          </p>
                        ) : activityLog.length === 0 ? (
                          <p className="text-sm text-gray-500">No activity yet.</p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {activityLog.map((entry) => {
                              const date = new Date(entry.created_at).toLocaleString();
                              let label = entry.action.replace(/_/g, " ");
                              if (entry.action === "price_override" && entry.new_value && typeof entry.new_value.price_override === "number") {
                                label = `Price override to $${Number(entry.new_value.price_override).toLocaleString()}`;
                                const reason = entry.new_value.price_override_reason;
                                if (reason) label += ` (${String(reason)})`;
                              } else if (entry.action === "status_changed" && entry.new_value && typeof entry.new_value.status === "string") {
                                label = `Status → ${entry.new_value.status}`;
                              } else if (entry.action === "created") {
                                label = "Quote created";
                              }
                              return (
                                <li key={entry.id} className="flex flex-wrap gap-x-2 gap-y-1">
                                  <span className="font-medium text-gray-700">{label}</span>
                                  <span className="text-gray-500">{date}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(8, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(8, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Preview <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 9: Preview */}
        {step === 9 && currentQuote && (
          <motion.div
            key="step9"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Proposal preview</h2>
            <div className="prose max-w-none border rounded-lg p-6 bg-gray-50">
              <h3>Strategic snapshot</h3>
              <p><strong>Client:</strong> {currentQuote.client_name || "—"} | <strong>Domain:</strong> {currentQuote.domain}</p>
              <p><strong>DCS:</strong> {dcs?.finalScore ?? "—"} | <strong>Recommendation:</strong> {recommendation?.primaryMode ?? "—"}</p>
              <p><strong>Investment range:</strong> ${displayPrice.toLocaleString()}/month</p>
              <p><strong>Reports included:</strong> {selectedReports.map((r) => REPORT_LABELS[r] || r).join(", ") || "None"}</p>
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(9, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={() => setStep(nextStepNumber(9, mode))} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Export <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 10: Export */}
        {step === 10 && currentQuote && (
          <motion.div
            key="step10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl p-6 border border-gray-200"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Export & send</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  if (!(currentQuote.client_email || "").trim()) {
                    toast.error("Add client email in Domain & Client to send by email.");
                    return;
                  }
                  setSendProposalRecipientName(
                    (currentQuote.contact_person || currentQuote.client_name || "").trim()
                  );
                  setSendProposalEmail((currentQuote.client_email || "").trim());
                  setSendProposalMessage(
                    "Please find your Strategic Intelligence Proposal attached and the link below."
                  );
                  setShowSendProposalModal(true);
                }}
                disabled={!(currentQuote.client_email || "").trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700"
              >
                <Mail className="w-4 h-4" /> Send proposal email
              </button>
              <button
                onClick={() => {
                  const url = getGmailComposeUrl(currentQuote);
                  window.open(url, "_blank", "noopener,noreferrer");
                  toast.success("Gmail compose opened.");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50"
              >
                <Mail className="w-4 h-4" /> Send via Gmail
              </button>
              <button
                onClick={copyShareLink}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" /> Copy share link
              </button>
              <a
                href={`/proposals/${currentQuote.share_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4" /> Open proposal
              </a>
              <button
                className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium flex items-center gap-2"
                onClick={async () => {
                  if (!currentQuote) return;
                  try {
                    const res = await fetch("/api/quote-builder/white-label");
                    const data = await res.json().catch(() => ({}));
                    const whiteLabelConfig = data.whiteLabelConfig ?? null;
                    const quoteForPdf = { ...currentQuote, selected_reports: selectedReports.length ? selectedReports : (currentQuote.selected_reports ?? []) };
                    await generateProposalPDF(quoteForPdf as any, whiteLabelConfig);
                    toast.success("PDF downloaded");
                  } catch (e) {
                    toast.error("Failed to generate PDF");
                  }
                }}
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              <strong>Send proposal email</strong> sends the proposal (with PDF attachment and link) from this app and marks the proposal as sent automatically. <strong>Send via Gmail</strong> opens Gmail with the link pre-filled.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Share link: {getProposalBaseUrl()}/proposals/{currentQuote.share_token}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              PDF and shared proposal use your organization&apos;s branding.{" "}
              <Link href="/dashboard/settings?tab=white-label" className="text-indigo-600 hover:underline font-medium">
                Configure white label
              </Link>
            </p>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setStep(prevStepNumber(10, mode))} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setQuote(null);
                  setSelectedProjectId("");
                  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                New proposal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send proposal via email modal */}
      {showSendProposalModal && currentQuote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Send proposal via email</h2>
                    <p className="text-sm text-white/90 mt-1">
                      Proposal PDF attached, link included
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSendProposalModal(false)}
                  className="w-8 h-8 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Recipient name
                  </label>
                  <input
                    type="text"
                    value={sendProposalRecipientName}
                    onChange={(e) => setSendProposalRecipientName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={sendProposalEmail}
                    onChange={(e) => setSendProposalEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={sendProposalMessage}
                    onChange={(e) => setSendProposalMessage(e.target.value)}
                    placeholder="Message to include in the email..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-y"
                  />
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-600" />
                    What we&apos;ll send
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Your message (above)</p>
                    <p>• Proposal PDF as attachment</p>
                    <p>• Online proposal link in the email</p>
                    <p>• Domain: {currentQuote.domain}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSendProposalModal(false)}
                  disabled={sendingEmail}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!currentQuote?.id || sendingEmail || !sendProposalEmail.trim()) return;
                    setSendingEmail(true);
                    try {
                      const res = await fetch("/api/quote-builder/white-label");
                      const data = await res.json().catch(() => ({}));
                      const whiteLabelConfig = data.whiteLabelConfig ?? null;
                      const quoteForPdf = {
                        ...currentQuote,
                        selected_reports:
                          selectedReports.length
                            ? selectedReports
                            : (currentQuote.selected_reports ?? []),
                      };
                      const buffer = await generateProposalPDF(
                        quoteForPdf as any,
                        whiteLabelConfig,
                        { returnBuffer: true }
                      );
                      let pdfBase64 = "";
                      if (buffer instanceof ArrayBuffer) {
                        const bytes = new Uint8Array(buffer);
                        const chunk = 8192;
                        let binary = "";
                        for (let i = 0; i < bytes.length; i += chunk) {
                          binary += String.fromCharCode.apply(
                            null,
                            bytes.subarray(i, i + chunk) as unknown as number[]
                          );
                        }
                        pdfBase64 = btoa(binary);
                      }
                      const sendRes = await fetch("/api/quote-builder/send-proposal-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          quoteId: currentQuote.id,
                          to: sendProposalEmail.trim(),
                          message: sendProposalMessage.trim() || undefined,
                          pdfBase64: pdfBase64 || undefined,
                        }),
                      });
                      const sendData = await sendRes.json().catch(() => ({}));
                      if (sendData.success && sendData.sent) {
                        setQuote((prev) =>
                          prev ? { ...prev, status: "sent" } : null
                        );
                        setShowSendProposalModal(false);
                        toast.success("Email sent and proposal marked as sent.");
                      } else {
                        toast.error(sendData.error || "Failed to send email");
                      }
                    } catch (e) {
                      toast.error("Failed to send email");
                    } finally {
                      setSendingEmail(false);
                    }
                  }}
                  disabled={sendingEmail || !sendProposalEmail.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send proposal
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quote history */}
      <div className="mt-10 bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent quotes</h2>
        {loadingHistory ? (
          <p className="text-gray-500">Loading…</p>
        ) : quoteHistory.length === 0 ? (
          <p className="text-gray-500">No quotes yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {quoteHistory.map((q) => (
              <div
                key={q.id}
                role={q.status === "draft" ? "button" : undefined}
                tabIndex={q.status === "draft" ? 0 : undefined}
                onClick={q.status === "draft" ? () => handleOpenDraftAtExport(q.id) : undefined}
                onKeyDown={q.status === "draft" ? (e) => e.key === "Enter" && handleOpenDraftAtExport(q.id) : undefined}
                className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg ${q.status === "draft" ? "cursor-pointer hover:bg-indigo-50 hover:border-indigo-200" : "hover:bg-gray-50"}`}
              >
                <div>
                  <p className="font-medium text-gray-900">{q.client_name || q.domain || "—"}</p>
                  <p className="text-sm text-gray-600">
                    {q.price_override != null
                      ? `$${Number(q.price_override).toLocaleString()} (override)`
                      : `$${(q.total_monthly_price ?? 0).toLocaleString()}`}
                    {" · "}
                    {q.domain}
                    {" · "}
                    {new Date(q.created_at).toLocaleDateString()}
                    {q.win_probability != null && (
                      <>
                        {" · "}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          Win {q.win_probability}%
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(q.status)}`}>
                    {q.status}
                  </span>
                  {mode === "internal" && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActivityModalQuoteId(q.id); }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="Proposal history"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleEditQuote(q.id); }}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="Edit quote"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {q.status === "draft" && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteQuote(q); }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <a href={`/proposals/${q.share_token}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg" title="View proposal" onClick={(e) => e.stopPropagation()}>
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity log modal (Agency Internal – from quote history) */}
      {activityModalQuoteId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setActivityModalQuoteId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Proposal history</h3>
              <button type="button" onClick={() => setActivityModalQuoteId(null)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingActivityModal ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </p>
              ) : activityModalLog.length === 0 ? (
                <p className="text-sm text-gray-500">No activity for this quote.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activityModalLog.map((entry) => {
                    const date = new Date(entry.created_at).toLocaleString();
                    let label = entry.action.replace(/_/g, " ");
                    if (entry.action === "price_override" && entry.new_value && typeof entry.new_value.price_override === "number") {
                      label = `Price override to $${Number(entry.new_value.price_override).toLocaleString()}`;
                      const reason = entry.new_value.price_override_reason;
                      if (reason) label += ` (${String(reason)})`;
                    } else if (entry.action === "status_changed" && entry.new_value && typeof entry.new_value.status === "string") {
                      label = `Status → ${entry.new_value.status}`;
                    } else if (entry.action === "created") {
                      label = "Quote created";
                    }
                    return (
                      <li key={entry.id} className="flex flex-wrap gap-x-2 gap-y-1 py-1 border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-700">{label}</span>
                        <span className="text-gray-500">{date}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
