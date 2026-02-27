"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Shield,
  Target,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const REPORT_LABELS: Record<string, string> = {
  ai_vs_google_gap: "AI vs Google Gap",
  market_share_of_attention: "Market Share of Attention",
  opportunity_blind_spots: "Opportunity & Blind Spots",
  geo_visibility: "GEO Visibility",
};

const DEFAULT_DISCLAIMER =
  "This proposal is based on publicly available data and estimates. Results may vary. No guarantee of specific outcomes is expressed or implied.";

interface Quote {
  id: string;
  domain: string;
  client_name: string | null;
  status: string;
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
  };
  selected_reports: string[];
  selected_markets: string[];
  total_monthly_price: number | null;
  price_override: number | null;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PublicProposalPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid link");
      setLoading(false);
      return;
    }
    fetch(`/api/proposals/${token}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Proposal not found");
          throw new Error(res.statusText || "Failed to load");
        }
        return res.json();
      })
      .then((data) => {
        setQuote(data.quote);
      })
      .catch((e) => {
        setError(e.message || "Failed to load proposal");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading proposal…</div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="font-medium">{error || "Proposal not found"}</p>
          <p className="text-sm text-gray-500 mt-2">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const dcs = quote.dcs_snapshot || {};
  const rev = quote.revenue_exposure || {};
  const threat = quote.threat_data || {};
  const rec = quote.recommendation || {};
  const primaryMode = rec.allModes?.find((m) => m.id === rec.primaryMode) || rec.allModes?.[0];
  const window = rev.revenueExposureWindow || { conservative: 0, strategic: 0, dominance: 0 };
  const disclaimer = rev.disclaimer || DEFAULT_DISCLAIMER;

  if (executiveSummary) {
    return (
      <div className="min-h-screen bg-white text-gray-900 max-w-3xl mx-auto px-6 py-12">
        <header className="border-b border-gray-200 pb-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Strategic Intelligence Proposal</h1>
          <p className="text-gray-600 mt-1">
            {quote.client_name || "Client"} · {quote.domain}
          </p>
        </header>
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Digital Control Score</h2>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{Math.round(dcs.finalScore ?? 0)}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recommended path</h2>
            <p className="font-medium text-gray-900 mt-1">{primaryMode?.name ?? "—"}</p>
            <p className="text-gray-600 text-sm mt-1">{primaryMode?.description ?? ""}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Investment (monthly)</h2>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {quote.price_override != null
                ? formatCurrency(quote.price_override)
                : quote.total_monthly_price != null
                  ? formatCurrency(quote.total_monthly_price)
                  : `${formatCurrency(quote.pricing_data?.suggestedMin ?? 0)} – ${formatCurrency(quote.pricing_data?.suggestedMax ?? 0)}`}
            </p>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">{disclaimer}</p>
          </div>
        </section>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setExecutiveSummary(false)}
            className="text-sm text-indigo-600 hover:underline"
          >
            View full proposal →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Strategic Intelligence Proposal</h1>
          <p className="text-gray-600 mt-1">
            {quote.client_name || "Client"} · {quote.domain}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setExecutiveSummary(true)}
              className="text-sm text-indigo-600 hover:underline"
            >
              Executive summary
            </button>
          </div>
        </header>

        {/* Page 1: DCS */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            1. Digital Control Score Overview
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-8">
            <div>
              <p className="text-sm text-gray-500">DCS Score</p>
              <p className="text-4xl font-bold text-indigo-600">{Math.round(dcs.finalScore ?? 0)}</p>
            </div>
            <div className="text-sm text-gray-600">
              <p>Distance to Safety (70): {(dcs.distanceToSafetyZone ?? 0) > 0 ? (dcs.distanceToSafetyZone ?? 0).toFixed(0) : "Achieved"}</p>
              <p>Distance to Dominance (85): {(dcs.distanceToDominanceZone ?? 0) > 0 ? (dcs.distanceToDominanceZone ?? 0).toFixed(0) : "Achieved"}</p>
            </div>
          </div>
          {(dcs.layerBreakdown?.length ?? 0) > 0 && (
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dcs.layerBreakdown!.map((l) => ({ name: l.name.slice(0, 20), score: l.score }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {(dcs.competitorComparison?.length ?? 0) > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Competitor comparison</p>
              <div className="flex flex-wrap gap-4">
                {dcs.competitorComparison!.map((c) => (
                  <span key={c.name} className="text-sm text-gray-600">
                    {c.name}: <strong>{c.score}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Page 2: Market & Revenue */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            2. Market & Revenue Exposure
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Search demand (monthly)</p>
              <p className="text-xl font-semibold text-gray-900">{(rev.searchDemand ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. deal value</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(rev.avgDealValue ?? 0)}</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-700 mb-2">Revenue exposure window (estimated)</p>
            <ul className="space-y-1 text-gray-600">
              <li>Conservative: {formatCurrency(window.conservative ?? 0)}</li>
              <li>Strategic: {formatCurrency(window.strategic ?? 0)}</li>
              <li>Dominance: {formatCurrency(window.dominance ?? 0)}</li>
            </ul>
          </div>
          <p className="mt-4 text-xs text-gray-500 max-w-2xl">{disclaimer}</p>
        </section>

        {/* Page 3: Risk */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            3. Risk & Competitive Pressure
          </h2>
          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-gray-500">Competitive Pressure Index</p>
              <p className="text-2xl font-bold text-gray-900">{(threat.competitivePressureIndex ?? 0).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risk acceleration</p>
              <p className="text-lg font-semibold text-gray-900">{(threat.riskAccelerationIndicator || "—").toUpperCase()}</p>
            </div>
          </div>
        </section>

        {/* Page 4: Prescription & Investment */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            4. Strategic Prescription & Investment
          </h2>
          {primaryMode && (
            <div className="mt-4">
              <p className="font-semibold text-gray-900">{primaryMode.name}</p>
              <p className="text-gray-600 text-sm mt-1">{primaryMode.description}</p>
            </div>
          )}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Markets</p>
              <p className="text-gray-900">{quote.selected_markets?.length ? quote.selected_markets.join(", ") : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Reports included</p>
              <p className="text-gray-900">
                {quote.selected_reports?.length
                  ? quote.selected_reports.map((r) => REPORT_LABELS[r] || r).join(", ")
                  : "—"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm text-gray-500">Monthly investment</p>
              <p className="text-xl font-bold text-gray-900">
                {quote.price_override != null
                  ? formatCurrency(quote.price_override)
                  : quote.total_monthly_price != null
                    ? formatCurrency(quote.total_monthly_price)
                    : `${formatCurrency(quote.pricing_data?.suggestedMin ?? 0)} – ${formatCurrency(quote.pricing_data?.suggestedMax ?? 0)}`}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">{disclaimer}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
