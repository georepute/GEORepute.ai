'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Globe,
  RefreshCw,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';

interface GSCIntegrationData {
  domain_url?: string;
  verification_status?: string;
  last_synced_at?: string;
  [key: string]: unknown;
}

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: GSCIntegrationData | null;
  domain_url?: string;
  verification_status?: string;
}

interface MatrixRow {
  country_code: string;
  gsc_impressions: number;
  gsc_clicks: number;
  organic_score: number;
  ai_visibility_score: number;
  demand_score: number;
  opportunity_score: number;
  overall_visibility_score: number;
  quadrant?: string;
  ai_platforms_present?: string[];
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
const QUADRANT_COLORS: Record<string, string> = {
  strong: '#10b981',
  emerging: '#3b82f6',
  declining: '#f59e0b',
  absent: '#ef4444',
};

function getCountryName(code: string): string {
  if (!code || code === 'UNKNOWN') return 'Unknown';
  const upper = code.toUpperCase();
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    if (upper.length === 2) return regionNames.of(upper) || code;
    if (upper.length === 3) {
      const alpha3ToAlpha2: Record<string, string> = {
        USA: 'US', GBR: 'GB', DEU: 'DE', FRA: 'FR', IND: 'IN', JPN: 'JP',
        BRA: 'BR', CAN: 'CA', AUS: 'AU', CHE: 'CH', NLD: 'NL', ESP: 'ES',
        ITA: 'IT', KOR: 'KR', MEX: 'MX', RUS: 'RU', CHN: 'CN', ISR: 'IL',
      };
      const a2 = alpha3ToAlpha2[upper];
      return a2 ? regionNames.of(a2) || code : code;
    }
  } catch {
    return code;
  }
  return code;
}

export default function GeoVisibilityMarketCoveragePage() {
  const { t, isRtl } = useLanguage();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState<{
    processed: number;
    total: number;
    percentage: number;
    message?: string;
  } | null>(null);

  const loadDomains = useCallback(async () => {
    try {
      setLoadingDomains(true);
      const res = await fetch('/api/integrations/google-search-console/domains');
      const data = await res.json();
      const list = data.domains || [];
      const verified = list.filter(
        (d: Domain) => (d.gsc_integration as GSCIntegrationData)?.verification_status === 'verified' || d.verification_status === 'verified'
      );
      setDomains(verified);
      if (verified.length > 0 && !selectedDomain) {
        setSelectedDomain(verified[0].id);
      }
    } catch {
      toast.error('Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  }, [selectedDomain]);

  const loadMatrix = useCallback(async () => {
    if (!selectedDomain) return;
    try {
      setLoadingMatrix(true);
      const res = await fetch(`/api/global-visibility-matrix?domainId=${selectedDomain}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMatrixData(data.data);
      } else {
        setMatrixData([]);
      }
    } catch {
      setMatrixData([]);
      toast.error('Failed to load matrix data');
    } finally {
      setLoadingMatrix(false);
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) loadMatrix();
    else setMatrixData([]);
  }, [selectedDomain, loadMatrix]);

  useEffect(() => {
    if (!calculating || !selectedDomain) {
      setCalcProgress(null);
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/global-visibility-matrix/progress?domainId=${selectedDomain}`);
        const data = await res.json();
        if (data.success && data.progress) {
          setCalcProgress({
            processed: data.progress.processed ?? 0,
            total: data.progress.total ?? 0,
            percentage: data.progress.percentage ?? 0,
            message: data.progress.message,
          });
        }
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 800);
    return () => clearInterval(interval);
  }, [calculating, selectedDomain]);

  const calculateMatrix = async () => {
    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }
    const domainObj = domains.find((d) => d.id === selectedDomain);
    if (!domainObj) return;
    try {
      setCalculating(true);
      toast.loading('Calculating matrix (this may take 2–3 minutes)...', { id: 'calc' });
      const domainUrl = (domainObj.gsc_integration as GSCIntegrationData)?.domain_url || domainObj.domain;
      const res = await fetch('/api/global-visibility-matrix/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          domainUrl,
          aiCheckEnabled: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Matrix calculated successfully', { id: 'calc' });
        await loadMatrix();
      } else {
        toast.error(data.error || 'Failed to calculate matrix', { id: 'calc' });
      }
    } catch {
      toast.error('Failed to calculate matrix', { id: 'calc' });
    } finally {
      setCalculating(false);
      setCalcProgress(null);
    }
  };

  const totalMarkets = matrixData.length;
  const demandNoAi = matrixData.filter(
    (r) => (r.gsc_impressions || 0) > 0 && (r.ai_visibility_score || 0) < 30
  ).length;
  const avgAiScore =
    totalMarkets > 0
      ? matrixData.reduce((s, r) => s + (r.ai_visibility_score || 0), 0) / totalMarkets
      : 0;
  const avgOrganicScore =
    totalMarkets > 0
      ? matrixData.reduce((s, r) => s + (r.organic_score || 0), 0) / totalMarkets
      : 0;

  const tableRows = matrixData.map((r) => {
    const demand = r.gsc_impressions || 0;
    const organic = r.gsc_clicks || 0;
    const aiPct = r.ai_visibility_score ?? 0;
    let gapNote = '';
    if (demand > 0 && aiPct < 30) gapNote = 'Demand exists; AI visibility low';
    else if (demand > 0 && organic === 0) gapNote = 'Demand exists; no organic clicks';
    return {
      region: getCountryName(r.country_code),
      countryCode: r.country_code,
      demand,
      organic,
      organicScore: Math.round((r.organic_score ?? 0) * 10) / 10,
      aiPct: Math.round(aiPct * 10) / 10,
      opportunityScore: Math.round((r.opportunity_score ?? 0) * 10) / 10,
      quadrant: r.quadrant || '—',
      gapNote,
    };
  });

  const barChartData = matrixData
    .slice()
    .sort((a, b) => (b.gsc_impressions || 0) - (a.gsc_impressions || 0))
    .slice(0, 12)
    .map((r) => ({
      name: getCountryName(r.country_code).length > 12
        ? getCountryName(r.country_code).slice(0, 10) + '…'
        : getCountryName(r.country_code),
      fullName: getCountryName(r.country_code),
      Demand: r.gsc_impressions || 0,
      Organic: r.gsc_clicks || 0,
      'AI visibility %': r.ai_visibility_score ?? 0,
    }));

  const quadrantCounts: Record<string, number> = {
    strong: 0,
    emerging: 0,
    declining: 0,
    absent: 0,
  };
  matrixData.forEach((r) => {
    const q = (r.quadrant || 'absent').toLowerCase();
    if (quadrantCounts[q] !== undefined) quadrantCounts[q]++;
  });
  const quadrantPieData = Object.entries(quadrantCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: QUADRANT_COLORS[name] || '#94a3b8',
    }));

  const topOpportunities = matrixData
    .slice()
    .sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0))
    .slice(0, 5);

  // Top 10 by opportunity score (for horizontal bar chart)
  const opportunityBarData = matrixData
    .slice()
    .sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0))
    .slice(0, 10)
    .map((r) => ({
      name: getCountryName(r.country_code),
      opportunity: Math.round((r.opportunity_score ?? 0) * 10) / 10,
      fullName: getCountryName(r.country_code),
    }));

  // Demand share: % of total impressions by country (top 10)
  const totalImpressions = matrixData.reduce((s, r) => s + (r.gsc_impressions || 0), 0);
  const demandShareData = matrixData
    .slice()
    .sort((a, b) => (b.gsc_impressions || 0) - (a.gsc_impressions || 0))
    .slice(0, 10)
    .map((r, i) => ({
      name: getCountryName(r.country_code),
      value: totalImpressions > 0 ? Math.round(((r.gsc_impressions || 0) / totalImpressions) * 1000) / 10 : 0,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .filter((d) => d.value > 0);

  // Gap breakdown: count by gap type
  const gapBreakdown = { demandNoOrganic: 0, demandLowAi: 0, noGap: 0 };
  tableRows.forEach((row) => {
    if (row.demand > 0 && row.organic === 0) gapBreakdown.demandNoOrganic++;
    else if (row.demand > 0 && row.aiPct < 30) gapBreakdown.demandLowAi++;
    else if (row.demand > 0) gapBreakdown.noGap++;
  });
  const gapBreakdownData = [
    { name: 'Demand, no organic clicks', value: gapBreakdown.demandNoOrganic, fill: '#f59e0b' },
    { name: 'Demand, AI visibility low', value: gapBreakdown.demandLowAi, fill: '#8b5cf6' },
    { name: 'Demand met (no gap)', value: gapBreakdown.noGap, fill: '#10b981' },
  ].filter((d) => d.value > 0);

  const reportTitle = t.dashboard?.reports?.geoVisibilityMarketCoverage ?? 'GEO Visibility & Market Coverage';
  const reportSubtitle = t.dashboard?.reports?.geoVisibilitySubtitle ?? 'Demand (GSC), organic clicks, and AI visibility by region';
  const geoDataNote = t.dashboard?.reports?.geoDataNote ?? 'Data is based on connected GSC and AI Visibility (Brand Analysis) data.';
  const noRegionalData = t.dashboard?.reports?.noRegionalData ?? 'No regional data yet. Connect GSC and run Brand Analysis from AI Visibility to see demand vs organic vs AI by region.';
  const goToAIVisibility = t.dashboard?.reports?.goToAIVisibility ?? 'Go to AI Visibility';
  const regionProject = t.dashboard?.reports?.regionProject ?? 'Region / Project';
  const demandGscImpressions = t.dashboard?.reports?.demandGscImpressions ?? 'Demand (GSC impressions)';
  const organicGscClicks = t.dashboard?.reports?.organicGscClicks ?? 'Organic (GSC clicks)';
  const aiVisibilityPct = t.dashboard?.reports?.aiVisibilityPct ?? 'AI visibility %';
  const gapNoteLabel = t.dashboard?.reports?.gapNote ?? 'Gap note';
  const totalMarketsLabel = t.dashboard?.reports?.totalMarkets ?? 'Total Markets';
  const demandButNoAiLabel = t.dashboard?.reports?.demandButNoAi ?? 'Demand but No AI';
  const avgAiVisibilityLabel = t.dashboard?.reports?.avgAiVisibility ?? 'Avg AI Visibility';
  const avgOrganicScoreLabel = t.dashboard?.reports?.avgOrganicScore ?? 'Avg Organic Score';
  const organicScoreLabel = t.dashboard?.reports?.organicScore ?? 'Organic Score';
  const opportunityLabel = t.dashboard?.reports?.opportunity ?? 'Opportunity';
  const quadrantLabel = t.dashboard?.reports?.quadrant ?? 'Quadrant';
  const calculateMatrixLabel = t.dashboard?.reports?.calculateMatrix ?? 'Calculate Matrix';
  const regionalTableLabel = t.dashboard?.reports?.regionalTable ?? 'Regional Table';
  const quadrantDistributionLabel = t.dashboard?.reports?.quadrantDistribution ?? 'Quadrant Distribution';
  const priorityActionsLabel = t.dashboard?.reports?.priorityActions ?? 'Priority Actions';

  if (loadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading domains...</p>
          </div>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
            <p className="text-gray-600 mb-4">
              Connect and verify a domain in Google Search Console to use this report.
            </p>
            <a
              href="/dashboard/google-search-console"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Add Domain
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{reportTitle}</h1>
              <p className="text-gray-600 mt-1">{reportSubtitle}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Domain</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {(d.gsc_integration as GSCIntegrationData)?.domain_url || d.domain}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={calculateMatrix}
                  disabled={calculating || !selectedDomain}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
                  {calculating ? 'Calculating...' : calculateMatrixLabel}
                </button>
              </div>
            </div>
          </div>
          {calculating && calcProgress && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{calcProgress.message || 'Processing...'}</span>
                <span>{calcProgress.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${calcProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {loadingMatrix ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading report data...</p>
            </div>
          </div>
        ) : matrixData.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <h2 className="text-xl font-bold">{reportTitle}</h2>
              <p className="text-white/90 text-sm mt-0.5">{reportSubtitle}</p>
            </div>
            <div className="px-6 py-8">
              <p className="text-sm text-gray-600 mb-4">{geoDataNote}</p>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-8 text-center text-gray-600">
                <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="mb-4">{noRegionalData}</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a
                    href="/dashboard/ai-visibility"
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    {goToAIVisibility}
                  </a>
                  <span className="text-gray-400">|</span>
                  <a
                    href="/dashboard/global-visibility-matrix"
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    Global Visibility Matrix
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <MapPin className="w-4 h-4" />
                  {totalMarketsLabel}
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalMarkets}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-4">
                <div className="flex items-center gap-2 text-amber-700 text-sm mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Demand but No AI
                </div>
                <p className="text-2xl font-bold text-amber-900">{demandNoAi}</p>
                <p className="text-xs text-amber-600 mt-0.5">Impressions &gt; 0, AI &lt; 30%</p>
              </div>
              <div className="bg-white rounded-lg border border-blue-200 p-4">
                <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  {avgAiVisibilityLabel}
                </div>
                <p className="text-2xl font-bold text-blue-900">{avgAiScore.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                  <CheckCircle className="w-4 h-4" />
                  {avgOrganicScoreLabel}
                </div>
                <p className="text-2xl font-bold text-green-900">{avgOrganicScore.toFixed(1)}</p>
              </div>
            </div>

            {/* Regional Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
                <h2 className="text-lg font-bold">{regionalTableLabel}</h2>
                <p className="text-white/90 text-sm mt-0.5">Where demand exists but visibility is missing</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-900">
                        {regionProject}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                        {demandGscImpressions}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                        {organicGscClicks}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                        {organicScoreLabel}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                        {aiVisibilityPct}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                        {opportunityLabel}
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-900">
                        {quadrantLabel}
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-900">
                        {gapNoteLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableRows.map((row, i) => (
                      <tr key={row.countryCode + i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.region}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {row.demand.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {row.organic.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{row.organicScore}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{row.aiPct}%</td>
                        <td className="px-4 py-3 text-right text-gray-700">{row.opportunityScore}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${QUADRANT_COLORS[row.quadrant as string] || '#e5e7eb'}20`,
                              color: QUADRANT_COLORS[row.quadrant as string] || '#374151',
                            }}
                          >
                            {row.quadrant}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-amber-700 text-xs">{row.gapNote || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Demand vs Organic vs AI Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Demand vs Organic vs AI (top 12 by demand)
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'AI visibility %' ? [`${value}%`, name] : [value.toLocaleString(), name]
                      }
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.fullName ?? ''
                      }
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Demand" fill="#10b981" name="Demand" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Organic" fill="#3b82f6" name="Organic" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="AI visibility %" fill="#8b5cf6" name="AI visibility %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Opportunity Score + Demand Share */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  Opportunity score by market (top 10)
                </h3>
                <p className="text-sm text-gray-500 mb-4">Higher = more unrealized demand; prioritize these markets.</p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={opportunityBarData}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => [value, 'Opportunity']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                      />
                      <Bar dataKey="opportunity" fill="#f59e0b" name="Opportunity" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Demand share by market (top 10)
                </h3>
                <p className="text-sm text-gray-500 mb-4">Where your GSC impressions are concentrated.</p>
                {demandShareData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={demandShareData} margin={{ top: 16, right: 24, left: 8, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          angle={-35}
                          textAnchor="end"
                          height={56}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 'auto']} />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, 'Share of demand']}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Share of demand"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No demand data to show.</p>
                )}
              </div>
            </div>

            {/* Gap breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Gap breakdown
              </h3>
              <p className="text-sm text-gray-500 mb-4">How many markets fall into each visibility gap category.</p>
              {gapBreakdownData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gapBreakdownData} margin={{ top: 16, right: 24, left: 24, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={56} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [value, 'Markets']} />
                      <Bar dataKey="value" name="Markets" radius={[4, 4, 0, 0]}>
                        {gapBreakdownData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No gap breakdown (no demand data).</p>
              )}
            </div>

            {/* Quadrant Distribution + Priority Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{quadrantDistributionLabel}</h3>
                {quadrantPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={quadrantPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {quadrantPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Countries']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm">No quadrant data</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  {priorityActionsLabel} (top 5 opportunity)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Markets with unrealized demand — improve representation here first.
                </p>
                <ul className="space-y-3">
                  {topOpportunities.map((r, i) => (
                    <li
                      key={r.country_code}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <span className="font-medium text-gray-900">
                        {i + 1}. {getCountryName(r.country_code)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Opportunity: <strong>{(r.opportunity_score ?? 0).toFixed(1)}</strong>
                        {' · '}
                        Demand: {(r.demand_score ?? 0).toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
