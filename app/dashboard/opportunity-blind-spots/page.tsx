'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
import { Target, TrendingUp, AlertCircle, DollarSign, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Brain, Video, Download, Loader2, Play, RotateCcw, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';

type VideoStatus = 'idle' | 'pending' | 'done' | 'failed';
interface VideoState { status: VideoStatus; url: string | null; generatedAt: string | null; requestId: string | null; }
const POLL_INTERVAL_MS = 12000;
const POLL_MAX_COUNT = 75;
const VIDEO_LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' }, { code: 'ar', name: 'Arabic' }, { code: 'zh', name: 'Chinese' },
  { code: 'da', name: 'Danish' }, { code: 'nl', name: 'Dutch' }, { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' }, { code: 'de', name: 'German' }, { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' }, { code: 'id', name: 'Indonesian' }, { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' }, { code: 'no', name: 'Norwegian' },
  { code: 'pl', name: 'Polish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' }, { code: 'sv', name: 'Swedish' }, { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' }, { code: 'ur', name: 'Urdu' }, { code: 'vi', name: 'Vietnamese' },
];

type GapType = 'Both' | 'Google only' | 'AI only' | 'Neither';

const GAP_COLORS: Record<GapType, string> = {
  Both: '#10b981',
  'Google only': '#f59e0b',
  'AI only': '#3b82f6',
  Neither: '#ef4444',
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
  googleScore?: number | null;
  aiScore?: number | null;
  gapScore?: number | null;
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

/** Map AI vs Google Gap report band to Opportunity gap type */
function bandToGapType(band: string): GapType {
  switch (band) {
    case 'ai_risk':
    case 'moderate_gap':
      return 'Google only';
    case 'balanced':
      return 'Both';
    case 'seo_opportunity':
      return 'AI only';
    case 'seo_failure':
      return 'Neither';
    default:
      return 'Neither';
  }
}

export default function OpportunityBlindSpotsPage() {
  const { t, isRtl } = useLanguage();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [usingGapReport, setUsingGapReport] = useState(false);
  const [hasAiVsGoogleReport, setHasAiVsGoogleReport] = useState<boolean | null>(null);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [generating, setGenerating] = useState(false);
  type SortKey = 'query' | 'demand' | 'googleScore' | 'aiScore' | 'gapScore' | 'cpc' | 'gap' | 'estimatedValue' | 'opportunityNote';
  const [sortKey, setSortKey] = useState<SortKey>('estimatedValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [reportMeta, setReportMeta] = useState<{ domain: string; summary: any; enginesUsed: string[]; generatedAt: string } | null>(null);
  const [video, setVideo] = useState<VideoState>({ status: 'idle', url: null, generatedAt: null, requestId: null });
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState('en');
  const videoLanguageRef = useRef(videoLanguage);
  videoLanguageRef.current = videoLanguage;
  const [showVideoModal, setShowVideoModal] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => { return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); }; }, []);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowVideoModal(false); };
    if (showVideoModal) { window.addEventListener('keydown', onKeyDown); document.body.style.overflow = 'hidden'; }
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [showVideoModal]);
  useEffect(() => {
    if (video.status === 'pending' && selectedDomain) { startPolling(); } else { stopPolling(); }
    return () => stopPolling();
  }, [video.status, selectedDomain]);

  const resetVideo = () => { stopPolling(); setVideo({ status: 'idle', url: null, generatedAt: null, requestId: null }); };
  const startPolling = () => { stopPolling(); pollCountRef.current = 0; pollTimerRef.current = setInterval(pollVideoStatus, POLL_INTERVAL_MS); };
  const stopPolling = () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };

  const generateVideoReport = async () => {
    if (!selectedDomain || !reportMeta || rows.length === 0) return;
    try {
      setGeneratingVideo(true);
      toast.loading('Starting video report generation with xAI Aurora...', { id: 'gen-opp-video' });
      const reportData = { domain: reportMeta.domain, queries: rows.map(r => ({ query: r.query, demand: r.demand, cpc: r.cpc, gap: r.gap, estimatedValue: r.estimatedValue, opportunityNote: r.opportunityNote })), summary: reportMeta.summary, enginesUsed: reportMeta.enginesUsed, generatedAt: reportMeta.generatedAt };
      const languageToUse = videoLanguageRef.current;
      const res = await fetch('/api/reports/opportunity-blind-spots/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domainId: selectedDomain, reportData, language: languageToUse }) });
      const data = await res.json();
      if (data.success && data.requestId) {
        setVideo({ status: 'pending', url: null, generatedAt: null, requestId: data.requestId });
        toast.success("Video generation started! A 15-second video usually takes 2–8 minutes. We'll check automatically.", { id: 'gen-opp-video', duration: 6000 });
      } else { toast.error(data.error || 'Failed to start video generation', { id: 'gen-opp-video' }); }
    } catch (err) { console.error('Generate video error:', err); toast.error('Failed to start video generation', { id: 'gen-opp-video' }); }
    finally { setGeneratingVideo(false); }
  };

  const pollVideoStatus = async () => {
    if (!selectedDomain) return;
    pollCountRef.current += 1;
    if (pollCountRef.current > POLL_MAX_COUNT) { stopPolling(); setVideo({ status: 'failed', url: null, generatedAt: null, requestId: null }); toast.error('Video generation is taking too long. Please try again.'); return; }
    try {
      const res = await fetch(`/api/reports/opportunity-blind-spots/video?domainId=${selectedDomain}`);
      const data = await res.json();
      if (!data.success) return;
      const v = data.video;
      if (!v) return;
      if (v.status === 'done' && v.url) { stopPolling(); setVideo({ status: 'done', url: v.url, generatedAt: v.generatedAt, requestId: null }); toast.success('Video report is ready!', { duration: 5000 }); }
      else if (v.status === 'failed') { stopPolling(); setVideo({ status: 'failed', url: null, generatedAt: null, requestId: null }); toast.error('Video generation failed. Please try again.'); }
    } catch (err) { console.error('Poll video status error:', err); }
  };

  const downloadVideo = async () => {
    if (!video.url) return;
    try {
      const res = await fetch(video.url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl; a.download = `opportunity-video-${reportMeta?.domain || 'report'}-${Date.now()}.mp4`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl); toast.success('Download started!');
    } catch { window.open(video.url!, '_blank'); }
  };

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

  const checkAiVsGoogleReportExists = useCallback(async (domainId: string) => {
    try {
      const res = await fetch(`/api/reports/ai-vs-google-gap?domainId=${domainId}`);
      const data = await res.json();
      const exists = data.success && data.data?.queries?.length > 0;
      setHasAiVsGoogleReport(exists);
    } catch {
      setHasAiVsGoogleReport(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedDomain) {
      setRows([]);
      setUsingGapReport(false);
      setHasAiVsGoogleReport(null);
      return;
    }
    resetVideo();
    try {
      setLoadingData(true);
      setHasAiVsGoogleReport(null);

      // Check if AI vs Google Gap report exists (required for this report)
      checkAiVsGoogleReportExists(selectedDomain);

      // Load stored Opportunity report from Supabase (includes CPC from Google Ads, gap from AI vs Google Gap)
      const res = await fetch(`/api/reports/opportunity-blind-spots?domainId=${selectedDomain}`);
      const data = await res.json();

      if (data.success && data.data?.queries?.length) {
        const tableRows: OpportunityRow[] = data.data.queries.map((r: any) => ({
          query: (r.query || '').length > 120 ? (r.query || '').slice(0, 120) + '…' : (r.query || ''),
          demand: Number(r.demand || 0),
          googleScore: r.googleScore != null ? Number(r.googleScore) : null,
          aiScore: r.aiScore != null ? Number(r.aiScore) : null,
          gapScore: r.gapScore != null ? Number(r.gapScore) : null,
          cpc: r.cpc != null ? Number(r.cpc) : null,
          gap: r.gap || 'Neither',
          estimatedValue: Number(r.estimatedValue || 0),
          opportunityNote: r.opportunityNote || getOpportunityNote(Number(r.demand || 0), r.gap || 'Neither'),
        }));
        setRows(tableRows);
        setUsingGapReport(true);
        const d = data.data;
        setReportMeta({ domain: d.domain || '', summary: d.summary, enginesUsed: d.enginesUsed || [], generatedAt: d.generatedAt });
        if (d.videoStatus === 'done' && d.videoUrl) setVideo({ status: 'done', url: d.videoUrl, generatedAt: d.videoGeneratedAt, requestId: null });
        else if (d.videoStatus === 'pending') setVideo({ status: 'pending', url: null, generatedAt: null, requestId: null });
        else if (d.videoStatus === 'failed') setVideo({ status: 'failed', url: null, generatedAt: null, requestId: null });
        else resetVideo();
      } else {
        setRows([]);
        setUsingGapReport(false);
        setReportMeta(null);
        resetVideo();
      }
    } catch (e) {
      toast.error('Failed to load report data');
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  }, [selectedDomain, checkAiVsGoogleReportExists]);

  const generateReport = useCallback(async () => {
    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }
    try {
      setGenerating(true);
      toast.loading('Generating report (fetching CPC from Google Ads, this may take a minute)...', { id: 'gen-opp' });
      const res = await fetch('/api/reports/opportunity-blind-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: selectedDomain }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const tableRows: OpportunityRow[] = data.data.queries.map((r: any) => ({
          query: (r.query || '').length > 120 ? (r.query || '').slice(0, 120) + '…' : (r.query || ''),
          demand: Number(r.demand || 0),
          googleScore: r.googleScore != null ? Number(r.googleScore) : null,
          aiScore: r.aiScore != null ? Number(r.aiScore) : null,
          gapScore: r.gapScore != null ? Number(r.gapScore) : null,
          cpc: r.cpc != null ? Number(r.cpc) : null,
          gap: r.gap || 'Neither',
          estimatedValue: Number(r.estimatedValue || 0),
          opportunityNote: r.opportunityNote || getOpportunityNote(Number(r.demand || 0), r.gap || 'Neither'),
        }));
        setRows(tableRows);
        setUsingGapReport(true);
        resetVideo();
        setReportMeta({ domain: data.data.domain || '', summary: data.data.summary, enginesUsed: data.data.enginesUsed || [], generatedAt: data.data.generatedAt });
        toast.success('Report generated and saved! Generate a video report to visualize your data.', { id: 'gen-opp' });
      } else {
        toast.error(data.error || 'Failed to generate report', { id: 'gen-opp' });
      }
    } catch (e) {
      toast.error('Failed to generate report', { id: 'gen-opp' });
    } finally {
      setGenerating(false);
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

  // Revenue at risk (est. value) by gap type (excludes 'Both' - no risk)
  const revenueByGapData = (['Neither', 'Google only', 'AI only'] as GapType[]).map((gap) => ({
    name: gap,
    value: rows.filter((r) => r.gap === gap && r.estimatedValue > 0).reduce((s, r) => s + r.estimatedValue, 0),
    fill: GAP_COLORS[gap],
  })).filter((d) => d.value > 0);

  // Avg CPC by gap type (when CPC data available)
  const avgCpcByGapData = (Object.keys(gapCounts) as GapType[]).map((gap) => {
    const withCpc = rows.filter((r) => r.gap === gap && r.cpc != null);
    const avg = withCpc.length > 0 ? withCpc.reduce((s, r) => s + (r.cpc ?? 0), 0) / withCpc.length : 0;
    return { name: gap, value: avg, fill: GAP_COLORS[gap], count: withCpc.length };
  }).filter((d) => d.count > 0);

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
    else if (sortKey === 'googleScore') cmp = (a.googleScore ?? 0) - (b.googleScore ?? 0);
    else if (sortKey === 'aiScore') cmp = (a.aiScore ?? 0) - (b.aiScore ?? 0);
    else if (sortKey === 'gapScore') cmp = (a.gapScore ?? 0) - (b.gapScore ?? 0);
    else if (sortKey === 'cpc') cmp = (a.cpc ?? 0) - (b.cpc ?? 0);
    else if (sortKey === 'gap') cmp = a.gap.localeCompare(b.gap);
    else if (sortKey === 'estimatedValue') cmp = a.estimatedValue - b.estimatedValue;
    else if (sortKey === 'opportunityNote') cmp = a.opportunityNote.localeCompare(b.opportunityNote);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const reportTitle = t.dashboard?.reports?.opportunityBlindSpots ?? 'Opportunity & Blind Spots';
  const reportSubtitle = t.dashboard?.reports?.opportunitySubtitle ?? 'Demand (GSC) + CPC vs gap — prioritize queries with high demand and visibility gaps.';
  const businessMeaning = t.dashboard?.reports?.opportunityBusinessMeaning ?? 'Revenue opportunities leaking';
  const dataSourcesLabel = t.dashboard?.reports?.dataSources ?? 'Data Sources';
  const dataSourcesValue = t.dashboard?.reports?.opportunityDataSources ?? 'GSC, AI, CPC';
  const crossAnalysisLabel = t.dashboard?.reports?.crossAnalysis ?? 'Cross-Analysis';
  const crossAnalysisValue = t.dashboard?.reports?.opportunityCrossAnalysis ?? 'Demand + CPC vs Gap';
  const showFor = t.dashboard?.reports?.showOpportunityFor ?? 'Domain (GSC data):';
  const tableNote = t.dashboard?.reports?.opportunityTableNote ?? 'Queries sorted by estimated value (demand × CPC). CPC from Keyword Forecast (Google Ads API) when connected. Demand from GSC impressions; gap from AI Visibility.';
  const queryCol = t.dashboard?.reports?.queryColumn ?? 'Query';
  const demandCol = t.dashboard?.reports?.demandImpressions ?? 'Demand (impressions)';
  const cpcCol = t.dashboard?.reports?.cpc ?? 'CPC';
  const gapCol = t.dashboard?.reports?.gap ?? 'Gap';
  const gapTypeCol = t.dashboard?.reports?.gapType ?? 'Type';
  const gscScoreCol = t.dashboard?.reports?.gscScore ?? 'GSC Score';
  const aiScoreCol = t.dashboard?.reports?.aiScore ?? 'AI Score';
  const gapScoreCol = t.dashboard?.reports?.gapScore ?? 'Gap';
  const opportunityCol = t.dashboard?.reports?.opportunity ?? 'Opportunity';
  const noData = t.dashboard?.reports?.noOpportunityData ?? 'Generate the AI vs Google Gap report for this domain first.';
  const chooseProject = t.dashboard?.reports?.chooseProject ?? 'Choose project';
  const opportunityTableTitle = t.dashboard?.reports?.opportunityTableTitle ?? 'Opportunity Table';
  const opportunityTableSubtitle = t.dashboard?.reports?.opportunityTableSubtitle ?? 'Where ROI is hidden — demand, CPC, and visibility gaps';
  const totalQueriesLabel = t.dashboard?.reports?.totalQueries ?? 'Total Queries';
  const priorityGapsLabel = t.dashboard?.reports?.priorityGapsNeither ?? 'Priority Gaps (Neither)';
  const avgCpcLabel = t.dashboard?.reports?.avgCpc ?? 'Avg CPC';
  const revenueAtRiskLabel = t.dashboard?.reports?.revenueAtRisk ?? 'Revenue at Risk';
  const gapDistributionLabel = t.dashboard?.reports?.gapDistribution ?? 'Gap distribution';
  const topRevenueLabel = t.dashboard?.reports?.topRevenueOpportunities ?? 'Top revenue opportunities';
  const loadingProjectsLabel = t.dashboard?.reports?.loadingProjects ?? 'Loading projects...';
  const noBrandProjectsLabel = t.dashboard?.reports?.noBrandAnalysisProjects ?? 'No Brand Analysis Projects';
  const createProjectLabel = t.dashboard?.reports?.createProjectInAIVisibility ?? 'Create a project in AI Visibility to use this report.';
  const goToAIVisibilityLabel = t.dashboard?.reports?.goToAIVisibility ?? 'Go to AI Visibility';
  const goToGSCSetupLabel = t.dashboard?.reports?.goToGSCSetup ?? 'Go to GSC setup';
  const noRevenueDataLabel = t.dashboard?.reports?.noRevenueData ?? 'No revenue data (connect Keyword Forecast for CPC)';
  const noDataLabel = t.dashboard?.reports?.noData ?? 'No data';
  const estValueLabel = t.dashboard?.reports?.estValue ?? 'Est. Value';
  const revenueByGapLabel = t.dashboard?.reports?.revenueByGapType ?? 'Revenue at risk by gap type';
  const avgCpcByGapLabel = t.dashboard?.reports?.avgCpcByGapType ?? 'Avg CPC by gap type';
  const noCpcDataLabel = t.dashboard?.reports?.noCpcData ?? 'No CPC data (connect Keyword Forecast for CPC)';
  const gapFromReportLabel = t.dashboard?.reports?.gapFromAiVsGoogleReport ?? 'Gap from AI vs Google Gap report';

  if (loadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="text-gray-600 mt-4">{loadingProjectsLabel}</p>
        </div>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No GSC Domains</h2>
            <p className="text-gray-600 mb-4">Connect and verify a domain in Google Search Console to use this report.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/dashboard/google-search-console" className="text-primary-600 font-medium hover:underline">
                {goToGSCSetupLabel}
              </a>
              <span className="text-gray-400">|</span>
              <a href="/dashboard/settings?tab=integrations" className="text-primary-600 font-medium hover:underline">
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">{reportTitle}</h1>
          </div>
          <p className="text-gray-600">{reportSubtitle}</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="font-medium text-gray-700 text-sm">{showFor}</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>{(d.gsc_integration as GSCIntegrationData)?.domain_url || d.domain}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={!selectedDomain || loadingData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={generateReport}
              disabled={!selectedDomain || generating || hasAiVsGoogleReport !== true}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              <Brain className={`w-4 h-4 ${generating ? 'animate-pulse' : ''}`} />
              {rows.length > 0 ? 'Regenerate' : 'Generate'} Report
            </button>
          </div>
          {hasAiVsGoogleReport === false && selectedDomain && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Generate AI vs Google Gap first.</strong> This report requires the AI vs Google Gap report for the selected domain.{' '}
              <a href="/dashboard/ai-vs-google-gap" className="font-medium text-primary-600 hover:underline">
                Go to AI vs Google Gap →
              </a>
            </div>
          )}
        </div>

        {/* ========== VIDEO REPORT SECTION ========== */}
        {rows.length > 0 && (
          <div className="mb-6">
            {video.status === 'idle' && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Video className="w-6 h-6 text-violet-600" /></div>
                <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Video Report</h3><p className="text-sm text-gray-600 mt-0.5">Generate an AI-powered video presentation of this report — all charts, data, and insights visualized with professional animations, powered by xAI Aurora.</p></div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideo} className="px-3 py-2.5 border border-violet-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]" title="Video language">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                  <button onClick={generateVideoReport} disabled={generatingVideo} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium text-sm whitespace-nowrap"><Play className="w-4 h-4" />Generate Video Report</button>
                </div>
              </div>
            )}
            {video.status === 'pending' && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Loader2 className="w-6 h-6 text-violet-600 animate-spin" /></div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Generating Video Report…</h3><p className="text-sm text-gray-600 mt-0.5">xAI Aurora is rendering your 15-second professional video. This typically takes <strong>2–8 minutes</strong>. We&apos;re checking automatically every 12 seconds.</p><div className="mt-3 flex items-center gap-2"><div className="flex gap-1"><span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div><span className="text-xs text-violet-600">Scenes being rendered with all your data</span></div></div>
                  <button onClick={pollVideoStatus} className="flex-shrink-0 px-4 py-2 bg-white text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 flex items-center gap-2 text-sm font-medium"><RefreshCw className="w-4 h-4" />Check Now</button>
                </div>
              </div>
            )}
            {video.status === 'failed' && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-6 h-6 text-red-600" /></div>
                <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Video Generation Failed</h3><p className="text-sm text-gray-600 mt-0.5">The video generation request expired or failed. Please try again.</p></div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideo} className="px-3 py-2 border border-red-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]" title="Video language">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                  <button onClick={generateVideoReport} disabled={generatingVideo} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"><RotateCcw className="w-4 h-4" />Retry</button>
                </div>
              </div>
            )}
            {video.status === 'done' && video.url && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div><div><h3 className="font-semibold text-gray-900">Video Report</h3>{video.generatedAt && <p className="text-xs text-gray-500 mt-0.5">Generated {new Date(video.generatedAt).toLocaleString()}</p>}</div></div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setShowVideoModal(true)} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 flex items-center gap-2 text-sm font-medium"><Play className="w-4 h-4" />Preview Video</button>
                    <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideo} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[100px]" title="Video language for regeneration">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                    <button onClick={generateVideoReport} disabled={generatingVideo} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"><RotateCcw className="w-4 h-4" />Regenerate</button>
                    <button onClick={downloadVideo} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium"><Download className="w-4 h-4" />Download</button>
                  </div>
                </div>
              </div>
            )}
            {showVideoModal && video.url && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowVideoModal(false)}>
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50"><h3 className="font-semibold text-gray-900">Video Report</h3><div className="flex items-center gap-2"><button onClick={downloadVideo} className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-1.5"><Download className="w-4 h-4" />Download</button><button onClick={() => setShowVideoModal(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors" aria-label="Close"><X className="w-5 h-5" /></button></div></div>
                  <div className="flex-1 min-h-0 bg-gray-950 flex items-center justify-center p-4"><video src={video.url} controls autoPlay className="max-w-full max-h-[calc(90vh-80px)]">Your browser does not support the video tag.</video></div>
                </div>
              </div>
            )}
          </div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-600">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            {hasAiVsGoogleReport === false ? (
              <>
                <p className="font-medium text-amber-800">Generate AI vs Google Gap report first</p>
                <p className="text-sm text-gray-500 mt-2">This report requires the AI vs Google Gap report for the selected domain. Create that report, then return here to generate this one.</p>
                <a
                  href="/dashboard/ai-vs-google-gap"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Go to AI vs Google Gap →
                </a>
              </>
            ) : (
              <>
                <p>{noData}</p>
                <p className="text-sm text-gray-500 mt-2">Generate AI vs Google Gap first, then generate this report to fetch CPC from Google Ads.</p>
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  <a href="/dashboard/ai-vs-google-gap" className="text-primary-600 font-medium hover:underline">
                    {t.dashboard?.reports?.aiVsGoogleGap ?? 'AI vs Google Gap'}
                  </a>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={generateReport}
                    disabled={generating || hasAiVsGoogleReport !== true}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                  >
                    <Brain className={`w-4 h-4 ${generating ? 'animate-pulse' : ''}`} />
                    Generate Report
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{totalQueriesLabel}</span>
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalQueries}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-700">{priorityGapsLabel}</span>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-3xl font-bold text-amber-900">{priorityGaps}</div>
                <p className="text-xs text-amber-600 mt-1">No organic, no AI</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">{avgCpcLabel}</span>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">{avgCpc > 0 ? `$${avgCpc.toFixed(2)}` : '—'}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-sm border border-emerald-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-700">{revenueAtRiskLabel}</span>
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold text-emerald-900">{revenueAtRisk > 0 ? `$${revenueAtRisk.toFixed(0)}` : '—'}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{gapDistributionLabel}</h3>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{topRevenueLabel}</h3>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{revenueByGapLabel}</h3>
                {revenueByGapData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByGapData} margin={{ top: 16, right: 24, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                        <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, 'Revenue at risk']} />
                        <Bar dataKey="value" name="Revenue at risk">
                          {revenueByGapData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{noRevenueDataLabel}</p>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{avgCpcByGapLabel}</h3>
                {avgCpcByGapData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={avgCpcByGapData} margin={{ top: 16, right: 24, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                        <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Avg CPC']} />
                        <Bar dataKey="value" name="Avg CPC">
                          {avgCpcByGapData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{noCpcDataLabel}</p>
                )}
              </div>
            </div>

            {/* Opportunity table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{opportunityTableTitle}</h3>
              <p className="text-sm text-gray-500 mb-4">{opportunityTableSubtitle}</p>
              <p className="text-xs text-gray-500 mb-4">{tableNote}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('query')} className="inline-flex items-center gap-1 hover:text-gray-900">
                          {queryCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('demand')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                          {demandCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('googleScore')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                          {gscScoreCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('aiScore')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                          {aiScoreCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('gapScore')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                          {gapScoreCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('cpc')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                          {cpcCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('gap')} className="inline-flex items-center gap-1 hover:text-gray-900">
                          {gapTypeCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('estimatedValue')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                          {estValueLabel} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">
                        <button type="button" onClick={() => toggleSort('opportunityNote')} className="inline-flex items-center gap-1 hover:text-gray-900">
                          {opportunityCol} <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-900 max-w-[200px] truncate" title={row.query}>{row.query}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{row.demand.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{row.googleScore != null ? row.googleScore.toFixed(1) : '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{row.aiScore != null ? row.aiScore.toFixed(1) : '—'}</td>
                        <td className="py-2 px-2 text-right font-medium text-gray-700">{row.gapScore != null ? row.gapScore.toFixed(1) : '—'}</td>
                        <td className="py-2 px-2 text-right text-gray-700">{row.cpc != null ? `$${row.cpc.toFixed(2)}` : '—'}</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${GAP_COLORS[row.gap]}20`, color: GAP_COLORS[row.gap] }}>
                            {row.gap}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-gray-900">{row.estimatedValue > 0 ? `$${row.estimatedValue.toFixed(2)}` : '—'}</td>
                        <td className="py-2 px-2 text-gray-600 max-w-[220px] text-xs">{row.opportunityNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {usingGapReport && (
                <p className="text-xs text-gray-500 mt-3">{gapFromReportLabel}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
