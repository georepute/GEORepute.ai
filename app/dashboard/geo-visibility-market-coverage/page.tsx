'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  Video,
  Download,
  Loader2,
  Play,
  RotateCcw,
  XCircle,
  X,
} from 'lucide-react';
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
    if (!selectedDomain || matrixData.length === 0) return;
    try {
      setGeneratingVideo(true);
      toast.loading('Starting video report generation with xAI Aurora...', { id: 'gen-geo-video' });
      const domain = domains.find(d => d.id === selectedDomain);
      const covered = matrixData.filter(r => r.overall_visibility_score >= 30).length;
      const gapRegions = matrixData.filter(r => r.overall_visibility_score < 30 || r.quadrant === 'absent').length;
      const summary = { totalRegions: matrixData.length, coveredRegions: covered, strongRegions: matrixData.filter(r => r.quadrant === 'strong').length, gapRegions, avgVisibilityScore: matrixData.reduce((s, r) => s + (r.overall_visibility_score || 0), 0) / matrixData.length, totalImpressions: matrixData.reduce((s, r) => s + (r.gsc_impressions || 0), 0) };
      const reportData = { domain: domain?.domain || '', regions: matrixData.map(r => ({ region: getCountryName(r.country_code), country_code: r.country_code, visibilityScore: r.overall_visibility_score || 0, aiScore: r.ai_visibility_score || 0, organicScore: r.organic_score || 0, coverageStatus: r.quadrant || 'absent' })), summary, generatedAt: new Date().toISOString() };
      const res = await fetch('/api/reports/geo-visibility-market-coverage/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domainId: selectedDomain, reportData, language: videoLanguageRef.current }) });
      const data = await res.json();
      if (data.success && data.requestId) {
        setVideo({ status: 'pending', url: null, generatedAt: null, requestId: data.requestId });
        toast.success("Video generation started! A 15-second video usually takes 2–8 minutes. We'll check automatically.", { id: 'gen-geo-video', duration: 6000 });
      } else { toast.error(data.error || 'Failed to start video generation', { id: 'gen-geo-video' }); }
    } catch (err) { console.error('Generate video error:', err); toast.error('Failed to start video generation', { id: 'gen-geo-video' }); }
    finally { setGeneratingVideo(false); }
  };

  const pollVideoStatus = async () => {
    if (!selectedDomain) return;
    pollCountRef.current += 1;
    if (pollCountRef.current > POLL_MAX_COUNT) { stopPolling(); setVideo({ status: 'failed', url: null, generatedAt: null, requestId: null }); toast.error('Video generation is taking too long. Please try again.'); return; }
    try {
      const res = await fetch(`/api/reports/geo-visibility-market-coverage/video?domainId=${selectedDomain}`);
      const data = await res.json();
      if (!data.success) return;
      const v = data.video;
      if (!v) { stopPolling(); setVideo({ status: 'idle', url: null, generatedAt: null, requestId: null }); return; }
      if (v.status === 'done' && v.url) { stopPolling(); setVideo({ status: 'done', url: v.url, generatedAt: v.generatedAt, requestId: null }); toast.success('Video report is ready!', { duration: 5000 }); }
      else if (v.status === 'failed') { stopPolling(); setVideo({ status: 'failed', url: null, generatedAt: null, requestId: null }); toast.error('Video generation failed. Please try again.'); }
    } catch (err) { console.error('Poll video status error:', err); }
  };

  const downloadVideo = async () => {
    if (!video.url) return;
    try {
      const res = await fetch(video.url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl; a.download = `geo-visibility-video-${selectedDomain}-${Date.now()}.mp4`;
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
    resetVideo();
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
    // Restore video state for this domain
    try {
      const vRes = await fetch(`/api/reports/geo-visibility-market-coverage/video?domainId=${selectedDomain}`);
      const vData = await vRes.json();
      if (vData.success && vData.video) {
        const v = vData.video;
        if (v.status === 'done' && v.url) setVideo({ status: 'done', url: v.url, generatedAt: v.generatedAt, requestId: null });
        else if (v.status === 'pending') setVideo({ status: 'pending', url: null, generatedAt: null, requestId: null });
        else if (v.status === 'failed') setVideo({ status: 'failed', url: null, generatedAt: null, requestId: null });
      }
    } catch { /* ignore */ }
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
            <p className="text-gray-600 mb-4">
              Connect and verify a domain in Google Search Console to use this report.
            </p>
            <a
              href="/dashboard/google-search-console"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
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
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">{reportTitle}</h1>
          </div>
          <p className="text-gray-600">{reportSubtitle}</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="font-medium text-gray-700 text-sm">Domain (GSC data):</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {(d.gsc_integration as GSCIntegrationData)?.domain_url || d.domain}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadMatrix}
              disabled={!selectedDomain || loadingMatrix}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMatrix ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={calculateMatrix}
              disabled={calculating || !selectedDomain}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculating...' : calculateMatrixLabel}
            </button>
          </div>
          {calculating && calcProgress && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{calcProgress.message || 'Processing...'}</span>
                <span>{calcProgress.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-300"
                  style={{ width: `${calcProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {loadingMatrix ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : matrixData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-600">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="mb-4">{noRegionalData}</p>
            <p className="text-sm text-gray-500 mb-4">{geoDataNote}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="/dashboard/ai-visibility" className="text-primary-600 font-medium hover:underline">
                {goToAIVisibility}
              </a>
              <span className="text-gray-400">|</span>
              <a href="/dashboard/global-visibility-matrix" className="text-primary-600 font-medium hover:underline">
                Global Visibility Matrix
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* ========== VIDEO REPORT SECTION ========== */}
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

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{totalMarketsLabel}</span>
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalMarkets}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-700">{demandButNoAiLabel}</span>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-3xl font-bold text-amber-900">{demandNoAi}</div>
                <p className="text-xs text-amber-600 mt-1">Impressions &gt; 0, AI &lt; 30%</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">{avgAiVisibilityLabel}</span>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">{avgAiScore.toFixed(1)}%</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-sm border border-emerald-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-700">{avgOrganicScoreLabel}</span>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold text-emerald-900">{avgOrganicScore.toFixed(1)}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-600" />
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{quadrantDistributionLabel}</h3>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
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

            {/* Regional Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{regionalTableLabel}</h3>
              <p className="text-sm text-gray-500 mb-4">Where demand exists but visibility is missing</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
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
                  <tbody className="divide-y divide-gray-200">
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
          </>
        )}
      </div>
    </div>
  );
}
