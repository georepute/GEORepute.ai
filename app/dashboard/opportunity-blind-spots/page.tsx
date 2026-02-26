'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
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
import { Target, TrendingUp, AlertCircle, DollarSign, BarChart3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase/client';
import { format, startOfDay, subDays } from 'date-fns';

const GOOGLE_NO_RANK = 999;
type GapType = 'Both' | 'Google only' | 'AI only' | 'Neither';

const GAP_COLORS: Record<GapType, string> = {
  Both: '#10b981',
  'Google only': '#f59e0b',
  'AI only': '#3b82f6',
  Neither: '#ef4444',
};

const ENGINE_DISPLAY_NAMES: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  groq: 'Groq',
};

interface GSCIntegrationData {
  domain_url?: string;
  verification_status?: string;
  [key: string]: unknown;
}

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: GSCIntegrationData | null;
  domain_url?: string;
}

interface OpportunityRow {
  query: string;
  demand: number;
  cpc: number | null;
  gap: GapType;
  estimatedValue: number;
  opportunityNote: string;
}

function normalizeQ(q: string): string {
  return (q || '').trim().toLowerCase();
}

function getOpportunityNote(demand: number, gap: GapType): string {
  if (demand === 0) return 'No demand data';
  if (gap === 'Neither') return 'High demand; no organic, no AI — priority opportunity';
  if (gap === 'Google only') return 'Demand + organic; improve AI visibility';
  if (gap === 'AI only') return 'Demand + AI; improve organic visibility';
  return 'Strong: demand, organic, and AI';
}

export default function OpportunityBlindSpotsPage() {
  const { t, isRtl } = useLanguage();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  type SortKey = 'query' | 'demand' | 'cpc' | 'gap' | 'estimatedValue' | 'opportunityNote';
  const [sortKey, setSortKey] = useState<SortKey>('estimatedValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadDomains = useCallback(async () => {
    try {
      setLoadingDomains(true);
      const res = await fetch('/api/integrations/google-search-console/domains');
      const data = await res.json();
      const list = data.domains || [];
      const verified = list.filter(
        (d: Domain) => (d.gsc_integration as GSCIntegrationData)?.verification_status === 'verified' || (d as any).verification_status === 'verified'
      );
      setDomains(verified);
      if (verified.length > 0 && !selectedDomain) setSelectedDomain(verified[0].id);
    } catch (e) {
      toast.error('Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedDomain) {
      setRows([]);
      return;
    }
    try {
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const daysAgo = 90;
      const startDate = startOfDay(subDays(new Date(), daysAgo));
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Official GSC query data for this domain (from gsc_queries / sync API)
      const gscRes = await fetch(
        `/api/integrations/google-search-console/analytics/queries?domainId=${selectedDomain}&startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${endDate}&sortBy=impressions`
      );
      const gscData = await gscRes.json();
      const gscQueries = gscData.queries || [];

      const impressionsByQuery: Record<string, number> = {};
      const googleQueryToPosition = new Map<string, number>();
      gscQueries.forEach((r: any) => {
        const q = normalizeQ(r.query || '');
        if (!q) return;
        const pos = Number(r.position) || 0;
        const usePos = pos > 0 ? pos : GOOGLE_NO_RANK;
        const existing = googleQueryToPosition.get(q);
        if (existing === undefined || usePos < existing) googleQueryToPosition.set(q, usePos);
        impressionsByQuery[q] = (impressionsByQuery[q] || 0) + Number(r.impressions || 0);
      });

      // AI platform responses: all user's projects (to compute gap per query)
      const { data: projects } = await supabase.from('brand_analysis_projects').select('id').eq('user_id', user.id);
      const projectIds = (projects ?? []).map((p: any) => p.id).filter(Boolean);
      const { data: aiResponses } = projectIds.length > 0
        ? await supabase
            .from('ai_platform_responses')
            .select('prompt, platform, response_metadata')
            .in('project_id', projectIds)
        : { data: [] as any[] };

      const aiQueryToEngines = new Map<string, string[]>();
      (aiResponses ?? []).forEach((r: any) => {
        const q = normalizeQ(r.prompt || '');
        if (!q) return;
        const platform = (r.platform || '').toLowerCase();
        const brandMentioned = r.response_metadata?.brand_mentioned === true;
        if (!aiQueryToEngines.has(q)) aiQueryToEngines.set(q, []);
        const entry = aiQueryToEngines.get(q)!;
        const name = ENGINE_DISPLAY_NAMES[platform];
        if (brandMentioned && name && !entry.includes(name)) entry.push(name);
      });

      // CPC map from keyword forecast plans (same source as Keyword Forecast / Keyword Analytics page)
      const cpcByKeyword = new Map<string, number>();
      try {
        const plansRes = await fetch('/api/keyword-forecast/get-plans');
        const plansData = await plansRes.json();
        const plans = plansData.plans || [];
        for (const plan of plans) {
          let forecasts: Array<{ keyword: string; avgCpc?: number }> = [];
          if (plan.forecast && Array.isArray(plan.forecast) && plan.forecast.length > 0) {
            forecasts = plan.forecast;
          } else {
            const fRes = await fetch(`/api/keyword-forecast/get-forecast?planId=${plan.id}`);
            const fData = await fRes.json();
            if (fData.forecasts) forecasts = fData.forecasts;
          }
          forecasts.forEach((f: any) => {
            const k = normalizeQ(f.keyword || '');
            if (k && f.avgCpc != null && !cpcByKeyword.has(k)) {
              cpcByKeyword.set(k, Number(f.avgCpc));
            }
          });
        }
      } catch (_) {
        // CPC optional
      }

      // Resolve CPC for a query: exact match first, then longest keyword that appears in the query
      const getCpcForQuery = (query: string): number | null => {
        const exact = cpcByKeyword.get(query);
        if (exact != null) return exact;
        let best: { cpc: number; len: number } | null = null;
        for (const [keyword, cpc] of cpcByKeyword.entries()) {
          if (keyword.length < 2) continue;
          if (query.includes(keyword) || keyword.includes(query)) {
            if (!best || keyword.length > best.len) best = { cpc, len: keyword.length };
          }
        }
        return best ? best.cpc : null;
      };

      // Build unique queries and gap + demand + cpc
      const allQueries = new Set<string>([...googleQueryToPosition.keys(), ...aiQueryToEngines.keys()]);
      const tableRows: OpportunityRow[] = Array.from(allQueries).map((query) => {
        const rawPosition = googleQueryToPosition.get(query);
        const googlePosition = rawPosition != null && rawPosition < GOOGLE_NO_RANK ? rawPosition : null;
        const googlePresent = googlePosition != null && googlePosition >= 1 && googlePosition <= 100;
        const aiEngines = aiQueryToEngines.get(query) ?? [];
        const aiMentioned = aiEngines.length > 0;
        const gap: GapType =
          googlePresent && aiMentioned ? 'Both' : googlePresent ? 'Google only' : aiMentioned ? 'AI only' : 'Neither';
        const demand = impressionsByQuery[query] ?? 0;
        const cpc = getCpcForQuery(query);
        const estimatedValue = cpc != null && demand > 0 ? demand * cpc : 0;
        return {
          query: query.length > 120 ? query.slice(0, 120) + '…' : query,
          demand,
          cpc,
          gap,
          estimatedValue,
          opportunityNote: getOpportunityNote(demand, gap),
        };
      });

      // Sort by estimated value desc, then demand desc
      tableRows.sort((a, b) => {
        if (b.estimatedValue !== a.estimatedValue) return b.estimatedValue - a.estimatedValue;
        return b.demand - a.demand;
      });
      setRows(tableRows);
    } catch (e) {
      toast.error('Failed to load report data');
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  }, [selectedDomain]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalQueries = rows.length;
  const priorityGaps = rows.filter((r) => r.gap === 'Neither').length;
  const withCpc = rows.filter((r) => r.cpc != null);
  const avgCpc = withCpc.length > 0 ? withCpc.reduce((s, r) => s + (r.cpc ?? 0), 0) / withCpc.length : 0;
  const revenueAtRisk = rows.filter((r) => r.gap !== 'Both' && r.estimatedValue > 0).reduce((s, r) => s + r.estimatedValue, 0);

  const gapCounts: Record<GapType, number> = { Both: 0, 'Google only': 0, 'AI only': 0, Neither: 0 };
  rows.forEach((r) => gapCounts[r.gap]++);
  const gapPieData = (Object.entries(gapCounts) as [GapType, number][])
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, fill: GAP_COLORS[name] }));

  const topRevenueData = rows
    .filter((r) => r.estimatedValue > 0)
    .slice(0, 10)
    .map((r) => ({
      name: r.query.length > 24 ? r.query.slice(0, 22) + '…' : r.query,
      fullQuery: r.query,
      value: Math.round(r.estimatedValue * 100) / 100,
    }));

  const demandByGapData = (Object.keys(gapCounts) as GapType[]).map((gap) => ({
    name: gap,
    demand: rows.filter((r) => r.gap === gap).reduce((s, r) => s + r.demand, 0),
    fill: GAP_COLORS[gap],
  }));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'query' || key === 'gap' || key === 'opportunityNote' ? 'asc' : 'desc');
    }
  };
  const sortedRows = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'query') cmp = a.query.localeCompare(b.query);
    else if (sortKey === 'demand') cmp = a.demand - b.demand;
    else if (sortKey === 'cpc') cmp = (a.cpc ?? 0) - (b.cpc ?? 0);
    else if (sortKey === 'gap') cmp = a.gap.localeCompare(b.gap);
    else if (sortKey === 'estimatedValue') cmp = a.estimatedValue - b.estimatedValue;
    else if (sortKey === 'opportunityNote') cmp = a.opportunityNote.localeCompare(b.opportunityNote);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const reportTitle = t.dashboard?.reports?.opportunityBlindSpots ?? 'Opportunity & Blind Spots';
  const reportSubtitle = t.dashboard?.reports?.opportunitySubtitle ?? 'Demand (GSC) + CPC vs gap — prioritize queries with high demand and visibility gaps.';
  const showFor = t.dashboard?.reports?.showOpportunityFor ?? 'Domain (GSC data):';
  const tableNote = t.dashboard?.reports?.opportunityTableNote ?? 'Queries sorted by estimated value (demand × CPC). CPC from Keyword Forecast when available.';
  const queryCol = t.dashboard?.reports?.queryColumn ?? 'Query';
  const demandCol = t.dashboard?.reports?.demandImpressions ?? 'Demand (impressions)';
  const cpcCol = t.dashboard?.reports?.cpc ?? 'CPC';
  const gapCol = t.dashboard?.reports?.gap ?? 'Gap';
  const opportunityCol = t.dashboard?.reports?.opportunity ?? 'Opportunity';
  const noData = t.dashboard?.reports?.noOpportunityData ?? 'No opportunity data yet. Sync GSC query data for this domain and run AI Visibility for gap analysis.';
  const chooseProject = t.dashboard?.reports?.chooseProject ?? 'Choose project';
  const opportunityTableTitle = t.dashboard?.reports?.opportunityTableTitle ?? 'Opportunity Table';
  const opportunityTableSubtitle = t.dashboard?.reports?.opportunityTableSubtitle ?? 'Where ROI is hidden — demand, CPC, and visibility gaps';
  const totalQueriesLabel = t.dashboard?.reports?.totalQueries ?? 'Total Queries';
  const priorityGapsLabel = t.dashboard?.reports?.priorityGapsNeither ?? 'Priority Gaps (Neither)';
  const avgCpcLabel = t.dashboard?.reports?.avgCpc ?? 'Avg CPC';
  const revenueAtRiskLabel = t.dashboard?.reports?.revenueAtRisk ?? 'Revenue at Risk';
  const gapDistributionLabel = t.dashboard?.reports?.gapDistribution ?? 'Gap distribution';
  const topRevenueLabel = t.dashboard?.reports?.topRevenueOpportunities ?? 'Top revenue opportunities';
  const demandByGapLabel = t.dashboard?.reports?.demandByGapType ?? 'Demand by gap type';
  const loadingProjectsLabel = t.dashboard?.reports?.loadingProjects ?? 'Loading projects...';
  const noBrandProjectsLabel = t.dashboard?.reports?.noBrandAnalysisProjects ?? 'No Brand Analysis Projects';
  const createProjectLabel = t.dashboard?.reports?.createProjectInAIVisibility ?? 'Create a project in AI Visibility to use this report.';
  const goToAIVisibilityLabel = t.dashboard?.reports?.goToAIVisibility ?? 'Go to AI Visibility';
  const goToGSCSetupLabel = t.dashboard?.reports?.goToGSCSetup ?? 'Go to GSC setup';
  const noRevenueDataLabel = t.dashboard?.reports?.noRevenueData ?? 'No revenue data (connect Keyword Forecast for CPC)';
  const noDataLabel = t.dashboard?.reports?.noData ?? 'No data';
  const noDemandDataLabel = t.dashboard?.reports?.noDemandData ?? 'No demand data';
  const estValueLabel = t.dashboard?.reports?.estValue ?? 'Est. Value';

  if (loadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-gray-600 mt-4">{loadingProjectsLabel}</p>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No GSC Domains</h2>
            <p className="text-gray-600 mb-4">Connect and verify a domain in Google Search Console to use this report.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/dashboard/google-search-console" className="text-emerald-600 font-medium hover:underline">
                {goToGSCSetupLabel}
              </a>
              <span className="text-gray-400">|</span>
              <a href="/dashboard/settings?tab=integrations" className="text-emerald-600 font-medium hover:underline">
                Settings → Integrations
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{reportTitle}</h1>
          <p className="text-gray-600 mt-1">{reportSubtitle}</p>
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">{showFor}</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-[200px]"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{(d.gsc_integration as GSCIntegrationData)?.domain_url || d.domain}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{noData}</p>
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              <a href="/dashboard/ai-visibility" className="text-emerald-600 font-medium hover:underline">
                {goToAIVisibilityLabel}
              </a>
              <span className="text-gray-400">|</span>
              <a href="/dashboard/settings?tab=integrations" className="text-emerald-600 font-medium hover:underline">
                {goToGSCSetupLabel}
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-gray-500 text-sm mb-1">{totalQueriesLabel}</div>
                <p className="text-2xl font-bold text-gray-900">{totalQueries}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-4">
                <div className="flex items-center gap-2 text-amber-700 text-sm mb-1"><AlertCircle className="w-4 h-4" /> {priorityGapsLabel}</div>
                <p className="text-2xl font-bold text-amber-900">{priorityGaps}</p>
              </div>
              <div className="bg-white rounded-lg border border-blue-200 p-4">
                <div className="flex items-center gap-2 text-blue-700 text-sm mb-1"><DollarSign className="w-4 h-4" /> {avgCpcLabel}</div>
                <p className="text-2xl font-bold text-blue-900">{avgCpc > 0 ? `$${avgCpc.toFixed(2)}` : '—'}</p>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700 text-sm mb-1"><TrendingUp className="w-4 h-4" /> {revenueAtRiskLabel}</div>
                <p className="text-2xl font-bold text-green-900">{revenueAtRisk > 0 ? `$${revenueAtRisk.toFixed(0)}` : '—'}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
                <h2 className="text-lg font-bold">{opportunityTableTitle}</h2>
                <p className="text-white/90 text-sm mt-0.5">{opportunityTableSubtitle}</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3">{tableNote}</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">
                          <button type="button" onClick={() => toggleSort('query')} className="flex items-center gap-1 hover:text-emerald-600">
                            {queryCol} {sortKey === 'query' ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">
                          <button type="button" onClick={() => toggleSort('demand')} className="inline-flex items-center gap-1 ml-auto hover:text-emerald-600">
                            {demandCol} {sortKey === 'demand' ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">
                          <button type="button" onClick={() => toggleSort('cpc')} className="inline-flex items-center gap-1 ml-auto hover:text-emerald-600">
                            {cpcCol} {sortKey === 'cpc' ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">
                          <button type="button" onClick={() => toggleSort('gap')} className="flex items-center gap-1 hover:text-emerald-600">
                            {gapCol} {sortKey === 'gap' ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">
                          <button type="button" onClick={() => toggleSort('estimatedValue')} className="inline-flex items-center gap-1 ml-auto hover:text-emerald-600">
                            {estValueLabel} {sortKey === 'estimatedValue' ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">
                          <button type="button" onClick={() => toggleSort('opportunityNote')} className="flex items-center gap-1 hover:text-emerald-600">
                            {opportunityCol} {sortKey === 'opportunityNote' ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sortedRows.slice(0, 100).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-[280px]" title={row.query}>{row.query.length > 60 ? row.query.slice(0, 58) + '…' : row.query}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{row.demand.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{row.cpc != null ? `$${row.cpc.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${GAP_COLORS[row.gap]}20`, color: GAP_COLORS[row.gap] }}>{row.gap}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{row.estimatedValue > 0 ? `$${row.estimatedValue.toFixed(0)}` : '—'}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[240px]" title={row.opportunityNote}>{row.opportunityNote.length > 40 ? row.opportunityNote.slice(0, 38) + '…' : row.opportunityNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{gapDistributionLabel}</h3>
                {gapPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={gapPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                        {gapPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Queries']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm">{noDataLabel}</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{topRevenueLabel}</h3>
                {topRevenueData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topRevenueData} layout="vertical" margin={{ left: 8, right: 48, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Est. value']} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullQuery ?? ''} />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Est. value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{noRevenueDataLabel}</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" /> {demandByGapLabel}</h3>
              {demandByGapData.some((d) => d.demand > 0) ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demandByGapData} margin={{ top: 16, right: 24, left: 24, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Demand']} />
                      <Bar dataKey="demand" name="Demand">
                        {demandByGapData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{noDemandDataLabel}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
