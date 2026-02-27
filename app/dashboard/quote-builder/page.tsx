"use client";

import { useState, useEffect, useCallback } from "react";
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

const STEPS = [
  "Domain & Client",
  "Scan",
  "DCS Overview",
  "Market & Revenue",
  "Risk & Threat",
  "Recommendation",
  "Reports",
  "Pricing",
  "Preview",
  "Export",
];

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
    competitorComparison?: { name: string; score: number }[];
  };
  revenue_exposure: {
    searchDemand: number;
    revenueExposureWindow: { conservative: number; strategic: number; dominance: number };
    avgDealValue: number;
    disclaimer?: string;
  };
  threat_data: {
    competitivePressureIndex: number;
    riskAccelerationIndicator: string;
    signals?: Record<string, number>;
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
  const [quoteHistory, setQuoteHistory] = useState<{ id: string; share_token: string; client_name: string | null; status: string; total_monthly_price: number | null; created_at: string; domain: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
  }, [supabase]);

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

  useEffect(() => {
    if (quote) {
      setInternalNotes(quote.internal_notes ?? "");
      setWinProbability(quote.win_probability ?? null);
      setPriceOverride(quote.price_override != null ? String(quote.price_override) : "");
    }
  }, [quote?.id]);

  const handleGenerate = async () => {
    if (!selectedProjectId || !domain) {
      toast.error("Select a project first");
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
  };

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
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/proposals/${quote.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Strategic Intelligence Quote Builder</h1>
        <p className="text-gray-600">Generate board-ready proposals in under 7 minutes</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(["quick", "advanced", "internal"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize ${
              mode === m ? "bg-primary-100 text-primary-700 border-b-2 border-primary-600" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {m === "quick" ? "Quick Call" : m === "advanced" ? "Advanced" : "Agency Internal"}
          </button>
        ))}
      </div>

      {/* Step progress */}
      <div className="flex flex-wrap gap-2 mb-8">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i + 1)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full ${
              step === i + 1 ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {i + 1}. {label}
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
                onClick={() => setStep(2)}
                disabled={!selectedProjectId}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
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
                  Generate a proposal snapshot from your existing brand analysis data. This uses your
                  DCS, revenue exposure, and threat data.
                </p>
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!selectedProjectId || scanning}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
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
            {dcs.competitorComparison && dcs.competitorComparison.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Competitor comparison</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dcs.competitorComparison} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                      <Bar dataKey="score" fill="#0ea5e9" name="Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(4)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
                Next: Market & Revenue <ChevronRight className="w-4 h-4" />
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
              <button onClick={() => setStep(3)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(5)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
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
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(4)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(6)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
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
              <button onClick={() => setStep(5)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(7)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
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
              <button onClick={() => setStep(6)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(8)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
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
                </>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(7)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(9)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
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
              <p className="text-xs text-gray-500 mt-4">
                This proposal is based on publicly available data and comparative market benchmarks. It does not represent official search engine metrics and does not imply algorithm influence or guaranteed results.
              </p>
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(8)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(10)} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2">
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
                onClick={() => {
                  updateQuote({ status: "sent" });
                  toast.success("Marked as sent");
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Mark as sent
              </button>
              <button
                className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium flex items-center gap-2"
                onClick={async () => {
                  if (!currentQuote) return;
                  try {
                    await generateProposalPDF(currentQuote as any);
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
              Share link: {typeof window !== "undefined" ? window.location.origin : ""}/proposals/{currentQuote.share_token}
            </p>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(9)} className="px-4 py-2 border border-gray-300 rounded-lg font-medium flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => { setStep(1); setQuote(null); setSelectedProjectId(""); }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                New proposal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{q.client_name || q.domain || "—"}</p>
                  <p className="text-sm text-gray-600">
                    ${(q.total_monthly_price ?? 0).toLocaleString()} · {q.domain} · {new Date(q.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(q.status)}`}>
                    {q.status}
                  </span>
                  <a href={`/proposals/${q.share_token}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-600" title="View proposal">
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
