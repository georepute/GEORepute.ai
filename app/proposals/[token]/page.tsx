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
import { useLanguage } from "@/lib/language-context";
import { getDisclaimerText, getMethodologyDisclaimerTitle } from "@/lib/disclaimer";

const REPORT_LABELS: Record<string, string> = {
  ai_vs_google_gap: "AI vs Google Gap",
  market_share_of_attention: "Market Share of Attention",
  opportunity_blind_spots: "Opportunity & Blind Spots",
  geo_visibility: "GEO Visibility",
};

const REPORT_DESCRIPTIONS: Record<string, string> = {
  ai_vs_google_gap: "Compare brand visibility in AI answers vs traditional search; identify gaps and opportunities.",
  market_share_of_attention: "Measure share of voice and attention across AI and organic channels.",
  opportunity_blind_spots: "Surface untapped queries and content gaps with competitive context.",
  geo_visibility: "Assess visibility and demand by geography; prioritize markets.",
};

const DEFAULT_DISCLAIMER =
  "This proposal is based on publicly available data and comparative market benchmarks. It does not represent official search engine metrics and does not imply algorithm influence or guaranteed results.";

interface Quote {
  id: string;
  domain: string;
  client_name: string | null;
  client_email?: string | null;
  contact_person?: string | null;
  valid_until?: string | null;
  status: string;
  dcs_snapshot: {
    finalScore: number;
    layerBreakdown: { name: string; score: number }[];
    radarChartData: { layer: string; score: number; fullMark: number }[];
    distanceToSafetyZone: number;
    distanceToDominanceZone: number;
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
    competitiveShareOfAttention?: number;
    marketOpportunityIndex?: number;
    summary?: { totalSearchDemand?: number; competitiveShareOfAttention?: string; cpcWeightedValue?: string | null };
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
  const { language } = useLanguage();
  const loc = language === "he" ? "he" : "en";
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [quote, setQuote] = useState<Quote | null>(null);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<Record<string, unknown> | null>(null);
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
        setWhiteLabelConfig(data.whiteLabelConfig ?? null);
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
  const market = quote.market_data;
  const threat = quote.threat_data || {};
  const rec = quote.recommendation || {};
  const primaryMode = rec.allModes?.find((m) => m.id === rec.primaryMode) || rec.allModes?.[0];
  const window = rev.revenueExposureWindow || { conservative: 0, strategic: 0, dominance: 0 };
  const wl = whiteLabelConfig as {
    disclaimerText?: string;
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    agencyFooter?: string;
    poweredByEnabled?: boolean;
  } | null;
  const disclaimer = wl?.disclaimerText || rev.disclaimer || getDisclaimerText(loc);
  const brandName = wl?.companyName || "Strategic Intelligence";
  const primaryColor = wl?.primaryColor || "#6366f1";
  const agencyFooter = wl?.agencyFooter ?? "";
  const showPoweredBy = wl?.poweredByEnabled !== false;

  if (executiveSummary) {
    return (
      <div className="min-h-screen bg-slate-50 text-gray-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <header className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 mb-8" style={{ borderLeft: `4px solid ${primaryColor}` }}>
            {wl?.logoUrl ? (
              <img src={wl.logoUrl} alt={brandName} className="h-8 object-contain mb-3" />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{brandName}</h1>
            )}
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mt-1">Executive Summary</p>
            <p className="text-gray-600 mt-3 text-sm">
              {quote.client_name || "Client"} · {quote.domain}
            </p>
          </header>
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Digital Control Score</h2>
              <p className="text-3xl font-bold mt-2 tabular-nums" style={{ color: primaryColor }}>{Math.round(dcs.finalScore ?? 0)}</p>
            </div>
            {quote.market_data?.marketOpportunityIndex != null && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Market Opportunity Index</h2>
                <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: primaryColor }}>{Math.round(quote.market_data.marketOpportunityIndex)}</p>
              </div>
            )}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recommended path</h2>
              <p className="font-semibold text-gray-900 mt-2">{primaryMode?.name ?? "—"}</p>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed">{primaryMode?.description ?? ""}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Investment (monthly)</h2>
              <p className="text-xl font-bold text-gray-900 mt-2 tabular-nums">
                {quote.price_override != null
                  ? formatCurrency(quote.price_override)
                  : quote.total_monthly_price != null
                    ? formatCurrency(quote.total_monthly_price)
                    : `${formatCurrency(quote.pricing_data?.suggestedMin ?? 0)} – ${formatCurrency(quote.pricing_data?.suggestedMax ?? 0)}`}
              </p>
            </div>
            {disclaimer && (
              <div className="pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 leading-relaxed">{disclaimer}</p>
              </div>
            )}
          </section>
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setExecutiveSummary(false)}
              className="text-sm font-medium hover:underline focus:outline-none"
              style={{ color: primaryColor }}
            >
              View full proposal →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Document header */}
        <header className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden mb-8">
          <div className="px-6 sm:px-8 py-5 sm:py-6" style={{ borderLeft: `4px solid ${primaryColor}` }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                {wl?.logoUrl ? (
                  <img src={wl.logoUrl} alt={brandName} className="h-9 object-contain mb-3" />
                ) : (
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{brandName}</h1>
                )}
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mt-1">Strategic Intelligence Proposal</p>
                <dl className="mt-4 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="text-sm text-gray-500">Client</dt>
                    <dd className="text-sm font-medium text-gray-900">{quote.client_name || "—"}</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="text-sm text-gray-500">Domain</dt>
                    <dd className="text-sm font-medium text-gray-900 break-all">{quote.domain || "—"}</dd>
                  </div>
                  {quote.contact_person && (
                    <div className="flex flex-wrap items-baseline gap-2">
                      <dt className="text-sm text-gray-500">Contact</dt>
                      <dd className="text-sm font-medium text-gray-900">{quote.contact_person}</dd>
                    </div>
                  )}
                  {quote.client_email && (
                    <div className="flex flex-wrap items-baseline gap-2">
                      <dt className="text-sm text-gray-500">Email</dt>
                      <dd className="text-sm font-medium text-gray-900 break-all">{quote.client_email}</dd>
                    </div>
                  )}
                  {quote.valid_until && (
                    <div className="flex flex-wrap items-baseline gap-2">
                      <dt className="text-sm text-gray-500">Valid until</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {typeof quote.valid_until === "string" && quote.valid_until.length >= 10
                          ? new Date(quote.valid_until).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                          : quote.valid_until}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <button
                type="button"
                onClick={() => setExecutiveSummary(true)}
                className="text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
                style={{ color: primaryColor }}
              >
                Executive summary →
              </button>
            </div>
          </div>
        </header>

        {/* Section 1: DCS */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 mb-8">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>1</span>
            Digital Control Score Overview
          </h2>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-3 mb-6">
            <BarChart3 className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
            Overview
          </p>
          <div className="flex flex-wrap items-end gap-8 sm:gap-12">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-0.5">DCS Score</p>
              <p className="text-4xl sm:text-5xl font-bold tabular-nums" style={{ color: primaryColor }}>{Math.round(dcs.finalScore ?? 0)}</p>
            </div>
            <div className="flex flex-wrap gap-6 sm:gap-8 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Distance to Safety (70)</p>
                <p className="font-semibold text-gray-900">{(dcs.distanceToSafetyZone ?? 0) > 0 ? (dcs.distanceToSafetyZone ?? 0).toFixed(0) : "Achieved ✓"}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Distance to Dominance (85)</p>
                <p className="font-semibold text-gray-900">{(dcs.distanceToDominanceZone ?? 0) > 0 ? (dcs.distanceToDominanceZone ?? 0).toFixed(0) : "Achieved ✓"}</p>
              </div>
            </div>
          </div>
          {(dcs.layerBreakdown?.length ?? 0) > 0 && (
            <div className="mt-8 h-64 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dcs.layerBreakdown!.map((l) => ({ name: l.name.slice(0, 20), score: l.score }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Bar dataKey="score" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {(dcs.competitorComparison?.length ?? 0) > 0 && (() => {
            const normalize = (c: { name: unknown; domain?: unknown; score: number }) => {
              const rawName = c.name;
              const rawDomain = c.domain;
              const displayName = typeof rawName === "string" ? rawName : (rawName && typeof rawName === "object" && "name" in rawName ? String((rawName as { name?: string }).name ?? "") : String(rawName ?? ""));
              const domain = typeof rawDomain === "string" ? rawDomain : (rawName && typeof rawName === "object" && "domain" in rawName ? String((rawName as { domain?: string }).domain ?? "") : "");
              return { displayName: displayName || "—", domain: (domain || "").replace(/^(https?:\/\/)?/i, "").trim(), score: c.score };
            };
            const normalized = dcs.competitorComparison!.map((c, i) => ({ ...normalize(c), key: typeof c.name === "string" ? c.name : i }));
            return (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Competitor comparison</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {normalized.map((n, i) => {
                    const url = n.domain ? (n.domain.startsWith("http") ? n.domain : `https://${n.domain}`) : null;
                    return url ? (
                      <a
                        key={n.key ?? i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={n.domain}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        {n.displayName} <span className="text-gray-600 font-medium">{n.score}</span>
                      </a>
                    ) : (
                      <span key={n.key ?? i} className="text-sm text-gray-600">
                        {n.displayName} <span className="font-medium">{n.score}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>

        {/* Section 2: Market & Revenue */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 mb-8">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>2</span>
            Market & Revenue Exposure
          </h2>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-3 mb-6">
            <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
            Market & demand
          </p>
          {(market?.marketOpportunityIndex != null && !Number.isNaN(market.marketOpportunityIndex)) && (
            <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-0.5">Market Opportunity Index</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: primaryColor }}>{Math.round(market.marketOpportunityIndex)}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-500 mb-1">Search demand (monthly)</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{(market?.totalSearchDemand ?? rev.searchDemand ?? 0).toLocaleString()}</p>
            </div>
            {market?.summary?.competitiveShareOfAttention && (
              <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-500 mb-1">Competitive share of attention</p>
                <p className="text-lg font-semibold text-gray-900">{market.summary.competitiveShareOfAttention}</p>
              </div>
            )}
            {market?.summary?.cpcWeightedValue && (
              <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-500 mb-1">CPC weighted value</p>
                <p className="text-lg font-semibold text-gray-900">{market.summary.cpcWeightedValue}</p>
              </div>
            )}
            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-500 mb-1">Avg. deal value</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(rev.avgDealValue ?? 0)}</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Revenue exposure window (estimated)</p>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
              <li className="flex justify-between sm:block py-2 sm:py-0 border-b sm:border-0 border-gray-100">
                <span className="text-gray-500">Conservative</span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(window.conservative ?? 0)}</span>
              </li>
              <li className="flex justify-between sm:block py-2 sm:py-0 border-b sm:border-0 border-gray-100">
                <span className="text-gray-500">Strategic</span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(window.strategic ?? 0)}</span>
              </li>
              <li className="flex justify-between sm:block py-2 sm:py-0">
                <span className="text-gray-500">Dominance</span>
                <span className="font-semibold text-gray-900 tabular-nums">{formatCurrency(window.dominance ?? 0)}</span>
              </li>
            </ul>
            <div className="h-40 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Conservative", value: window.conservative ?? 0 },
                    { name: "Strategic", value: window.strategic ?? 0 },
                    { name: "Dominance", value: window.dominance ?? 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}K` : v}`} />
                  <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {disclaimer && <p className="mt-6 text-xs text-gray-500 max-w-2xl leading-relaxed">{disclaimer}</p>}
        </section>

        {/* Section 3: Risk */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 mb-8">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>3</span>
            Risk & Competitive Pressure
          </h2>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-3 mb-4">
            <Shield className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
            Risk overview
          </p>
          <p className="text-sm text-gray-600 mb-6">
            We assess competitive pressure and risk signals that may affect your digital visibility. Lower CPI and low risk acceleration indicate a stable position.
          </p>
          <div className="flex flex-wrap gap-6 sm:gap-8 mb-6">
            <div className="flex-1 min-w-[140px] p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-500 mb-1">Competitive Pressure Index</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{(threat.competitivePressureIndex ?? 0).toFixed(0)}</p>
            </div>
            <div className="flex-1 min-w-[140px] p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-500 mb-1">Risk acceleration</p>
              <p className="text-lg font-bold text-gray-900 uppercase tracking-wide">{(threat.riskAccelerationIndicator || "—")}</p>
            </div>
          </div>
          {Object.keys(threat.signals || {}).length > 0 && (
            <div className="mt-6 border border-gray-100 rounded-xl p-4 bg-gray-50/50 h-56">
              <p className="text-sm font-semibold text-gray-700 mb-3">Risk signal breakdown</p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={Object.entries(threat.signals || {}).slice(0, 6).map(([k, v]) => ({
                    name: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/^ /, "").slice(0, 14),
                    score: typeof v === "number" ? v : 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, "auto"]} />
                  <Bar dataKey="score" fill={primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {(threat.projectedDcsSixMonths != null && !Number.isNaN(threat.projectedDcsSixMonths)) && (
            <div className="mt-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-500 mb-0.5">Projected DCS (6 months)</p>
              <p className="text-lg font-bold text-gray-900">{threat.projectedDcsSixMonths}</p>
              {threat.projectionDisclaimer && <p className="text-xs text-gray-500 mt-1">{threat.projectionDisclaimer}</p>}
            </div>
          )}
          <div className="mt-6 p-4 rounded-lg border border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-0.5">Legal / negative mentions</p>
            <p className="text-sm text-gray-900">{threat.legalNegativeMentions ?? "Not assessed"}</p>
          </div>
        </section>

        {/* Section 4: Prescription & Investment */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-8 mb-8">
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white" style={{ backgroundColor: primaryColor }}>4</span>
            Strategic Prescription & Investment
          </h2>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-2 mt-3 mb-6">
            <Target className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
            Recommendation & scope
          </p>
          {primaryMode && (
            <div className="mb-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="font-semibold text-gray-900">{primaryMode.name}</p>
              <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">{primaryMode.description}</p>
            </div>
          )}
          <div className="mb-6">
            <p className="text-gray-500 font-medium mb-2">Markets</p>
            <p className="text-gray-900">{quote.selected_markets?.length ? quote.selected_markets.join(", ") : "—"}</p>
          </div>
          {quote.selected_reports?.length ? (
            <div className="mb-6">
              <p className="text-gray-700 font-semibold mb-3">Reports included in this proposal</p>
              <div className="space-y-3">
                {quote.selected_reports.map((r) => (
                  <div key={r} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                    <p className="font-semibold text-gray-900" style={{ color: primaryColor }}>
                      {REPORT_LABELS[r] || r}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {REPORT_DESCRIPTIONS[r] || "Included in retainer scope."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="p-5 rounded-xl border-2 flex items-center gap-4" style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}>
            <DollarSign className="w-8 h-8 flex-shrink-0" style={{ color: primaryColor }} />
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly investment</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {quote.price_override != null
                  ? formatCurrency(quote.price_override)
                  : quote.total_monthly_price != null
                    ? formatCurrency(quote.total_monthly_price)
                    : `${formatCurrency(quote.pricing_data?.suggestedMin ?? 0)} – ${formatCurrency(quote.pricing_data?.suggestedMax ?? 0)}`}
              </p>
            </div>
          </div>
          {disclaimer && (
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">{disclaimer}</p>
            </div>
          )}
        </section>

        <section
          className="bg-gray-50 rounded-xl border border-gray-200 p-5 sm:p-6 mb-8"
          role="note"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {getMethodologyDisclaimerTitle(loc)}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-3xl">
            {getDisclaimerText(loc)}
          </p>
        </section>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 space-y-2">
          {agencyFooter && <p className="font-medium text-gray-600">{agencyFooter}</p>}
          {showPoweredBy && <p>Powered by GEORepute.ai</p>}
        </footer>
      </div>
    </div>
  );
}
