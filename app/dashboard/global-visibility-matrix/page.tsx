'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Globe, TrendingUp, TrendingDown, MousePointerClick, Eye, Target, RefreshCw, Download, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight, Check, X, Brain, Sparkles, Bot, Zap, MessageSquare, Video, Loader2, Play, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

interface Domain {
  id: string;
  domain: string;
  gsc_integration?: {
    domain_url?: string;
    verification_status?: 'pending' | 'verified' | 'failed';
    last_synced_at?: string;
  } | null;
}

interface MatrixCountry {
  id: string;
  country_code: string;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: number;
  gsc_avg_position: number;
  organic_score: number;
  ai_visibility_score: number;
  demand_score: number;
  overall_visibility_score: number;
  quadrant: 'strong' | 'emerging' | 'declining' | 'absent';
  opportunity_score: number;
  // New source-based fields
  ai_domain_found?: boolean;
  ai_best_position?: number | null;
  ai_mentioned_competitors?: string[];
  ai_platforms_present?: string[];
}

export default function GlobalVisibilityMatrixPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [countries, setCountries] = useState<MatrixCountry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof MatrixCountry>('opportunity_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [aiCheckEnabled] = useState(true); // Always enabled
  const [aiResults, setAiResults] = useState<any>(null);
  const [detectedIndustry, setDetectedIndustry] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ai' | 'google'>('ai');
  const [calcProgress, setCalcProgress] = useState<{ processed: number; total: number; percentage: number; message?: string } | null>(null);

  const [videoAi, setVideoAi] = useState<VideoState>({ status: 'idle', url: null, generatedAt: null, requestId: null });
  const [videoGoogle, setVideoGoogle] = useState<VideoState>({ status: 'idle', url: null, generatedAt: null, requestId: null });
  const [generatingVideoAi, setGeneratingVideoAi] = useState(false);
  const [generatingVideoGoogle, setGeneratingVideoGoogle] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState('en');
  const videoLanguageRef = useRef(videoLanguage);
  videoLanguageRef.current = videoLanguage;
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showVideoModalTab, setShowVideoModalTab] = useState<'ai' | 'google'>('ai');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const videoAiStatusRef = useRef(videoAi.status);
  const videoGoogleStatusRef = useRef(videoGoogle.status);
  videoAiStatusRef.current = videoAi.status;
  videoGoogleStatusRef.current = videoGoogle.status;

  useEffect(() => { return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); }; }, []);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowVideoModal(false); };
    if (showVideoModal) { window.addEventListener('keydown', onKeyDown); document.body.style.overflow = 'hidden'; }
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [showVideoModal]);
  useEffect(() => {
    const anyPending = videoAi.status === 'pending' || videoGoogle.status === 'pending';
    if (anyPending && selectedDomain) { startPolling(); } else { stopPolling(); }
    return () => stopPolling();
  }, [videoAi.status, videoGoogle.status, selectedDomain]);

  const resetVideo = () => {
    stopPolling();
    setVideoAi({ status: 'idle', url: null, generatedAt: null, requestId: null });
    setVideoGoogle({ status: 'idle', url: null, generatedAt: null, requestId: null });
  };
  const startPolling = () => { stopPolling(); pollCountRef.current = 0; pollTimerRef.current = setInterval(pollVideoStatus, POLL_INTERVAL_MS); };
  const stopPolling = () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };

  const generateVideoReport = async (tab: 'ai' | 'google') => {
    if (!selectedDomain || countries.length === 0) return;
    try {
      if (tab === 'ai') setGeneratingVideoAi(true); else setGeneratingVideoGoogle(true);
      toast.loading(`Starting ${tab === 'ai' ? 'Region vs AI' : 'Region vs Google'} video report...`, { id: 'gen-gvm-video' });
      const domain = domains.find(d => d.id === selectedDomain);
      if (tab === 'ai') {
        const summary = {
          totalCountries: countries.length,
          strongCountries: countries.filter(c => c.quadrant === 'strong').length,
          emergingCountries: countries.filter(c => c.quadrant === 'emerging').length,
          decliningCountries: countries.filter(c => c.quadrant === 'declining').length,
          absentCountries: countries.filter(c => c.quadrant === 'absent').length,
          avgVisibilityScore: countries.reduce((s, c) => s + (c.overall_visibility_score || 0), 0) / countries.length,
          topOpportunities: [...countries].sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0)).slice(0, 5).map(c => ({ country: c.country_code, opportunityScore: c.opportunity_score || 0, demandScore: c.demand_score || 0, presenceScore: c.overall_visibility_score || 0 })),
        };
        const reportData = {
          domain: domain?.domain || '',
          matrixData: countries.map(c => ({ country_code: c.country_code, country_name: getCountryName(c.country_code), quadrant: c.quadrant, overall_visibility_score: c.overall_visibility_score || 0, ai_visibility_score: c.ai_visibility_score || 0, organic_score: c.organic_score || 0, opportunity_score: c.opportunity_score || 0, gsc_impressions: c.gsc_impressions || 0 })),
          summary: { ...summary, topOpportunities: summary.topOpportunities.map(o => ({ ...o, country: getCountryName(o.country) })) },
          generatedAt: new Date().toISOString(),
        };
        const res = await fetch('/api/reports/global-visibility-matrix/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domainId: selectedDomain, reportData, language: videoLanguageRef.current, tab: 'ai' }) });
        const data = await res.json();
        if (data.success && data.requestId) {
          setVideoAi({ status: 'pending', url: null, generatedAt: null, requestId: data.requestId });
          toast.success("Video generation started! A 15-second video usually takes 2–8 minutes. We'll check automatically.", { id: 'gen-gvm-video', duration: 6000 });
        } else { toast.error(data.error || 'Failed to start video generation', { id: 'gen-gvm-video' }); }
      } else {
        const totalClicks = countries.reduce((s, c) => s + c.gsc_clicks, 0);
        const totalImpressions = countries.reduce((s, c) => s + c.gsc_impressions, 0);
        const reportDataGoogle = {
          domain: domain?.domain || '',
          matrixData: countries.map(c => ({ country_code: c.country_code, country_name: getCountryName(c.country_code), quadrant: c.quadrant, overall_visibility_score: c.overall_visibility_score || 0, ai_visibility_score: c.ai_visibility_score || 0, organic_score: c.organic_score || 0, opportunity_score: c.opportunity_score || 0, gsc_impressions: c.gsc_impressions || 0 })),
          summary: {
            totalCountries: countries.length,
            totalClicks,
            totalImpressions,
            avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            topByClicks: [...countries].sort((a, b) => b.gsc_clicks - a.gsc_clicks).slice(0, 5).map(c => ({ country: getCountryName(c.country_code), clicks: c.gsc_clicks })),
            topByImpressions: [...countries].sort((a, b) => b.gsc_impressions - a.gsc_impressions).slice(0, 5).map(c => ({ country: getCountryName(c.country_code), impressions: c.gsc_impressions })),
          },
          generatedAt: new Date().toISOString(),
        };
        const res = await fetch('/api/reports/global-visibility-matrix/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domainId: selectedDomain, reportDataGoogle, language: videoLanguageRef.current, tab: 'google' }) });
        const data = await res.json();
        if (data.success && data.requestId) {
          setVideoGoogle({ status: 'pending', url: null, generatedAt: null, requestId: data.requestId });
          toast.success("Video generation started! A 15-second video usually takes 2–8 minutes. We'll check automatically.", { id: 'gen-gvm-video', duration: 6000 });
        } else { toast.error(data.error || 'Failed to start video generation', { id: 'gen-gvm-video' }); }
      }
    } catch (err) { console.error('Generate video error:', err); toast.error('Failed to start video generation', { id: 'gen-gvm-video' }); }
    finally { if (tab === 'ai') setGeneratingVideoAi(false); else setGeneratingVideoGoogle(false); }
  };

  const pollVideoStatus = async (manualTab?: 'ai' | 'google') => {
    if (!selectedDomain) return;
    const pollAi = manualTab ? manualTab === 'ai' : videoAiStatusRef.current === 'pending';
    const pollGoogle = manualTab ? manualTab === 'google' : videoGoogleStatusRef.current === 'pending';
    if (!pollAi && !pollGoogle) return;

    if (!manualTab) pollCountRef.current += 1;
    if (!manualTab && pollCountRef.current > POLL_MAX_COUNT) {
      stopPolling();
      setVideoAi(prev => prev.status === 'pending' ? { status: 'failed' as const, url: null, generatedAt: null, requestId: null } : prev);
      setVideoGoogle(prev => prev.status === 'pending' ? { status: 'failed' as const, url: null, generatedAt: null, requestId: null } : prev);
      toast.error('Video generation is taking too long. Please try again.');
      return;
    }
    try {
      const fetches: Promise<Response>[] = [];
      if (pollAi) fetches.push(fetch(`/api/reports/global-visibility-matrix/video?domainId=${selectedDomain}&tab=ai`));
      if (pollGoogle) fetches.push(fetch(`/api/reports/global-visibility-matrix/video?domainId=${selectedDomain}&tab=google`));
      const responses = await Promise.all(fetches);
      const updateFromResponse = (v: { status?: string; url?: string; generatedAt?: string } | null, setter: (s: VideoState) => void, label: string) => {
        if (!v) return;
        if (v.status === 'done' && v.url) { setter({ status: 'done', url: v.url, generatedAt: v.generatedAt || null, requestId: null }); toast.success(`${label} video is ready!`, { duration: 5000 }); }
        else if (v.status === 'failed') { setter({ status: 'failed', url: null, generatedAt: null, requestId: null }); toast.error(`${label} video generation failed.`); }
      };
      let aiStillPending = false;
      let googleStillPending = false;
      let idx = 0;
      if (pollAi) {
        const dataAi = await responses[idx++].json();
        if (dataAi.success && dataAi.video) {
          updateFromResponse(dataAi.video, setVideoAi, 'Region vs AI');
          aiStillPending = dataAi.video.status === 'pending';
        }
      }
      if (pollGoogle) {
        const dataGoogle = await responses[idx].json();
        if (dataGoogle.success && dataGoogle.video) {
          updateFromResponse(dataGoogle.video, setVideoGoogle, 'Region vs Google');
          googleStillPending = dataGoogle.video.status === 'pending';
        }
      }
      if (!manualTab && !aiStillPending && !googleStillPending) stopPolling();
    } catch (err) { console.error('Poll video status error:', err); }
  };

  const downloadVideo = async (tab: 'ai' | 'google') => {
    const video = tab === 'ai' ? videoAi : videoGoogle;
    if (!video.url) return;
    try {
      const res = await fetch(video.url); const blob = await res.blob(); const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl; a.download = `visibility-matrix-${tab}-video-${selectedDomain}-${Date.now()}.mp4`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl); toast.success('Download started!');
    } catch { window.open(video.url!, '_blank'); }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const prevDomainRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedDomain) {
      const isDomainSwitch = prevDomainRef.current !== null && prevDomainRef.current !== selectedDomain;
      if (isDomainSwitch) resetVideo();
      prevDomainRef.current = selectedDomain;
      loadMatrixData();
    }
  }, [selectedDomain]);

  // Poll progress when calculating
  useEffect(() => {
    if (!calculating || !selectedDomain) {
      setCalcProgress(null);
      return;
    }

    const pollProgress = async () => {
      try {
        const res = await fetch(`/api/global-visibility-matrix/progress?domainId=${selectedDomain}`);
        const data = await res.json();
        if (data.success && data.progress) {
          setCalcProgress({
            processed: data.progress.processed,
            total: data.progress.total,
            percentage: data.progress.percentage ?? 0,
            message: data.progress.message,
          });
        }
      } catch {
        // Ignore poll errors
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, 800);
    return () => clearInterval(interval);
  }, [calculating, selectedDomain]);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      
      const verifiedDomains = (data.domains || []).filter((d: Domain) => 
        d.gsc_integration?.verification_status === 'verified'
      );
      
      setDomains(verifiedDomains);
      
      if (verifiedDomains.length > 0 && !selectedDomain) {
        setSelectedDomain(verifiedDomains[0].id);
      }
    } catch (error) {
      console.error('Load domains error:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const loadMatrixData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/global-visibility-matrix?domainId=${selectedDomain}`
      );
      const data = await response.json();
      
      if (data.success) {
        setCountries(data.data || []);
        
        if (data.data.length === 0) {
          toast(data.message || 'No data available. Calculate the matrix to get started.', {
            icon: '📊',
          });
        }
      } else {
        toast.error(data.error || 'Failed to load matrix data');
      }
    } catch (error) {
      console.error('Load matrix error:', error);
      toast.error('Failed to load matrix data');
    } finally {
      setLoading(false);
    }
    // Restore video state for both tabs
    if (selectedDomain) {
      try {
        const [vResAi, vResGoogle] = await Promise.all([
          fetch(`/api/reports/global-visibility-matrix/video?domainId=${selectedDomain}&tab=ai`),
          fetch(`/api/reports/global-visibility-matrix/video?domainId=${selectedDomain}&tab=google`),
        ]);
        const vDataAi = await vResAi.json();
        const vDataGoogle = await vResGoogle.json();
        const applyVideo = (v: any, setter: (s: VideoState) => void) => {
          if (!v) {
            setter({ status: 'idle', url: null, generatedAt: null, requestId: null });
            return;
          }
          if (v.status === 'done' && v.url) setter({ status: 'done', url: v.url, generatedAt: v.generatedAt, requestId: null });
          else if (v.status === 'pending') setter({ status: 'pending', url: null, generatedAt: null, requestId: null });
          else if (v.status === 'failed') setter({ status: 'failed', url: null, generatedAt: null, requestId: null });
          else setter({ status: 'idle', url: null, generatedAt: null, requestId: null });
        };
        if (vDataAi.success) applyVideo(vDataAi.video, setVideoAi);
        if (vDataGoogle.success) applyVideo(vDataGoogle.video, setVideoGoogle);
      } catch { /* ignore */ }
    }
  };

  const calculateMatrix = async () => {
    if (!selectedDomain) {
      toast.error('Please select a domain');
      return;
    }

    // Get domain URL for brand name
    const selectedDomainData = domains.find(d => d.id === selectedDomain);
    if (!selectedDomainData) {
      toast.error('Domain not found');
      return;
    }

    try {
      setCalculating(true);
      toast.loading('Analyzing domain and checking AI presence across countries (this may take 2-3 minutes)...', { id: 'calculate' });
      
      const domainUrl = selectedDomainData.gsc_integration?.domain_url || selectedDomainData.domain;
      
      const response = await fetch('/api/global-visibility-matrix/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          domainUrl, // Pass domain URL for brand extraction and industry detection
          aiCheckEnabled: true, // Always enabled
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Matrix calculated successfully!', { id: 'calculate' });
        
        // Store detected industry
        if (data.detectedIndustry) {
          setDetectedIndustry(data.detectedIndustry);
        }
        
        // Store AI results if available
        if (data.aiPresence) {
          setAiResults(data.aiPresence);
          
          // Show summary of AI results with detected info
          const weakCount = data.aiPresence.weakPresence?.length || 0;
          const absentCount = data.aiPresence.absentCountries?.length || 0;
          
          const industryInfo = data.detectedIndustry ? ` (Industry: ${data.detectedIndustry})` : '';
          
          if (absentCount > 0 || weakCount > 0) {
            toast(
              `AI Check${industryInfo}: ${weakCount} weak, ${absentCount} absent`,
              { icon: '🤖', duration: 5000 }
            );
          }
        }
        
        await loadMatrixData();
      } else {
        toast.error(data.error || 'Failed to calculate matrix', { id: 'calculate' });
      }
    } catch (error) {
      console.error('Calculate matrix error:', error);
      toast.error('Failed to calculate matrix', { id: 'calculate' });
    } finally {
      setCalculating(false);
      setCalcProgress(null);
    }
  };

  const getCountryName = (code: string) => {
    if (!code || code === 'UNKNOWN') return 'Unknown';

    const upperCode = code.toUpperCase();

    // Comprehensive mapping for 3-letter ISO (ISO 3166-1 alpha-3) and 2-letter (alpha-2) - from regional strength comparison
    const countryMapping: { [key: string]: string } = {
      'AFG': 'Afghanistan', 'ALA': 'Åland Islands', 'ALB': 'Albania', 'DZA': 'Algeria',
      'ASM': 'American Samoa', 'AND': 'Andorra', 'AGO': 'Angola', 'AIA': 'Anguilla',
      'ATA': 'Antarctica', 'ATG': 'Antigua and Barbuda', 'ARG': 'Argentina', 'ARM': 'Armenia',
      'ABW': 'Aruba', 'AUS': 'Australia', 'AUT': 'Austria', 'AZE': 'Azerbaijan',
      'BHS': 'Bahamas', 'BHR': 'Bahrain', 'BGD': 'Bangladesh', 'BRB': 'Barbados',
      'BLR': 'Belarus', 'BEL': 'Belgium', 'BLZ': 'Belize', 'BEN': 'Benin',
      'BMU': 'Bermuda', 'BTN': 'Bhutan', 'BOL': 'Bolivia', 'BES': 'Bonaire, Sint Eustatius and Saba',
      'BIH': 'Bosnia and Herzegovina', 'BWA': 'Botswana', 'BVT': 'Bouvet Island', 'BRA': 'Brazil',
      'IOT': 'British Indian Ocean Territory', 'BRN': 'Brunei', 'BGR': 'Bulgaria', 'BFA': 'Burkina Faso',
      'BDI': 'Burundi',
      'CPV': 'Cabo Verde', 'KHM': 'Cambodia', 'CMR': 'Cameroon', 'CAN': 'Canada',
      'CYM': 'Cayman Islands', 'CAF': 'Central African Republic', 'TCD': 'Chad', 'CHL': 'Chile',
      'CHN': 'China', 'CXR': 'Christmas Island', 'CCK': 'Cocos (Keeling) Islands', 'COL': 'Colombia',
      'COM': 'Comoros', 'COG': 'Congo', 'COD': 'Congo (Democratic Republic)', 'COK': 'Cook Islands',
      'CRI': 'Costa Rica', 'CIV': 'Côte d\'Ivoire', 'HRV': 'Croatia', 'CUB': 'Cuba',
      'CUW': 'Curaçao', 'CYP': 'Cyprus', 'CZE': 'Czech Republic',
      'DNK': 'Denmark', 'DJI': 'Djibouti', 'DMA': 'Dominica', 'DOM': 'Dominican Republic',
      'ECU': 'Ecuador', 'EGY': 'Egypt', 'SLV': 'El Salvador', 'GNQ': 'Equatorial Guinea',
      'ERI': 'Eritrea', 'EST': 'Estonia', 'SWZ': 'Eswatini', 'ETH': 'Ethiopia',
      'FLK': 'Falkland Islands', 'FRO': 'Faroe Islands', 'FJI': 'Fiji', 'FIN': 'Finland',
      'FRA': 'France', 'GUF': 'French Guiana', 'PYF': 'French Polynesia', 'ATF': 'French Southern Territories',
      'GAB': 'Gabon', 'GMB': 'Gambia', 'GEO': 'Georgia', 'DEU': 'Germany',
      'GHA': 'Ghana', 'GIB': 'Gibraltar', 'GRC': 'Greece', 'GRL': 'Greenland',
      'GRD': 'Grenada', 'GLP': 'Guadeloupe', 'GUM': 'Guam', 'GTM': 'Guatemala',
      'GGY': 'Guernsey', 'GIN': 'Guinea', 'GNB': 'Guinea-Bissau', 'GUY': 'Guyana',
      'HTI': 'Haiti', 'HMD': 'Heard Island and McDonald Islands', 'VAT': 'Holy See', 'HND': 'Honduras',
      'HKG': 'Hong Kong', 'HUN': 'Hungary',
      'ISL': 'Iceland', 'IND': 'India', 'IDN': 'Indonesia', 'IRN': 'Iran',
      'IRQ': 'Iraq', 'IRL': 'Ireland', 'IMN': 'Isle of Man', 'ISR': 'Israel', 'ITA': 'Italy',
      'JAM': 'Jamaica', 'JPN': 'Japan', 'JEY': 'Jersey', 'JOR': 'Jordan',
      'KAZ': 'Kazakhstan', 'KEN': 'Kenya', 'KIR': 'Kiribati', 'PRK': 'North Korea',
      'KOR': 'South Korea', 'KWT': 'Kuwait', 'KGZ': 'Kyrgyzstan',
      'LAO': 'Laos', 'LVA': 'Latvia', 'LBN': 'Lebanon', 'LSO': 'Lesotho',
      'LBR': 'Liberia', 'LBY': 'Libya', 'LIE': 'Liechtenstein', 'LTU': 'Lithuania', 'LUX': 'Luxembourg',
      'MAC': 'Macao', 'MDG': 'Madagascar', 'MWI': 'Malawi', 'MYS': 'Malaysia',
      'MDV': 'Maldives', 'MLI': 'Mali', 'MLT': 'Malta', 'MHL': 'Marshall Islands',
      'MTQ': 'Martinique', 'MRT': 'Mauritania', 'MUS': 'Mauritius', 'MYT': 'Mayotte',
      'MEX': 'Mexico', 'FSM': 'Micronesia', 'MDA': 'Moldova', 'MCO': 'Monaco',
      'MNG': 'Mongolia', 'MNE': 'Montenegro', 'MSR': 'Montserrat', 'MAR': 'Morocco',
      'MOZ': 'Mozambique', 'MMR': 'Myanmar',
      'NAM': 'Namibia', 'NRU': 'Nauru', 'NPL': 'Nepal', 'NLD': 'Netherlands',
      'NCL': 'New Caledonia', 'NZL': 'New Zealand', 'NIC': 'Nicaragua', 'NER': 'Niger',
      'NGA': 'Nigeria', 'NIU': 'Niue', 'NFK': 'Norfolk Island', 'MKD': 'North Macedonia',
      'MNP': 'Northern Mariana Islands', 'NOR': 'Norway', 'OMN': 'Oman',
      'PAK': 'Pakistan', 'PLW': 'Palau', 'PSE': 'Israel', 'PAN': 'Panama',
      'PNG': 'Papua New Guinea', 'PRY': 'Paraguay', 'PER': 'Peru', 'PHL': 'Philippines',
      'PCN': 'Pitcairn', 'POL': 'Poland', 'PRT': 'Portugal', 'PRI': 'Puerto Rico',
      'QAT': 'Qatar', 'REU': 'Réunion', 'ROU': 'Romania', 'RUS': 'Russia', 'RWA': 'Rwanda',
      'BLM': 'Saint Barthélemy', 'SHN': 'Saint Helena', 'KNA': 'Saint Kitts and Nevis',
      'LCA': 'Saint Lucia', 'MAF': 'Saint Martin', 'SPM': 'Saint Pierre and Miquelon',
      'VCT': 'Saint Vincent and the Grenadines', 'WSM': 'Samoa', 'SMR': 'San Marino',
      'STP': 'Sao Tome and Principe', 'SAU': 'Saudi Arabia', 'SEN': 'Senegal', 'SRB': 'Serbia',
      'SYC': 'Seychelles', 'SLE': 'Sierra Leone', 'SGP': 'Singapore', 'SXM': 'Sint Maarten',
      'SVK': 'Slovakia', 'SVN': 'Slovenia', 'SLB': 'Solomon Islands', 'SOM': 'Somalia',
      'ZAF': 'South Africa', 'SGS': 'South Georgia and the South Sandwich Islands', 'SSD': 'South Sudan',
      'ESP': 'Spain', 'LKA': 'Sri Lanka', 'SDN': 'Sudan', 'SUR': 'Suriname',
      'SJM': 'Svalbard and Jan Mayen', 'SWE': 'Sweden', 'CHE': 'Switzerland', 'SYR': 'Syria',
      'TWN': 'Taiwan', 'TJK': 'Tajikistan', 'TZA': 'Tanzania', 'THA': 'Thailand',
      'TLS': 'Timor-Leste', 'TGO': 'Togo', 'TKL': 'Tokelau', 'TON': 'Tonga',
      'TTO': 'Trinidad and Tobago', 'TUN': 'Tunisia', 'TUR': 'Turkey', 'TKM': 'Turkmenistan',
      'TCA': 'Turks and Caicos Islands', 'TUV': 'Tuvalu',
      'UGA': 'Uganda', 'UKR': 'Ukraine', 'ARE': 'United Arab Emirates', 'GBR': 'United Kingdom',
      'USA': 'United States', 'UMI': 'United States Minor Outlying Islands', 'URY': 'Uruguay',
      'UZB': 'Uzbekistan',
      'VUT': 'Vanuatu', 'VEN': 'Venezuela', 'VNM': 'Vietnam', 'VGB': 'Virgin Islands (British)',
      'VIR': 'Virgin Islands (U.S.)', 'WLF': 'Wallis and Futuna', 'ESH': 'Western Sahara',
      'YEM': 'Yemen', 'ZMB': 'Zambia', 'ZWE': 'Zimbabwe',
      'AF': 'Afghanistan', 'AX': 'Åland Islands', 'AL': 'Albania', 'DZ': 'Algeria',
      'AS': 'American Samoa', 'AD': 'Andorra', 'AO': 'Angola', 'AI': 'Anguilla',
      'AQ': 'Antarctica', 'AG': 'Antigua and Barbuda', 'AR': 'Argentina', 'AM': 'Armenia',
      'AW': 'Aruba', 'AU': 'Australia', 'AT': 'Austria', 'AZ': 'Azerbaijan',
      'BS': 'Bahamas', 'BH': 'Bahrain', 'BD': 'Bangladesh', 'BB': 'Barbados',
      'BY': 'Belarus', 'BE': 'Belgium', 'BZ': 'Belize', 'BJ': 'Benin',
      'BM': 'Bermuda', 'BT': 'Bhutan', 'BO': 'Bolivia', 'BQ': 'Bonaire, Sint Eustatius and Saba',
      'BA': 'Bosnia and Herzegovina', 'BW': 'Botswana', 'BV': 'Bouvet Island', 'BR': 'Brazil',
      'IO': 'British Indian Ocean Territory', 'BN': 'Brunei', 'BG': 'Bulgaria', 'BF': 'Burkina Faso',
      'BI': 'Burundi', 'CV': 'Cabo Verde', 'KH': 'Cambodia', 'CM': 'Cameroon',
      'CA': 'Canada', 'KY': 'Cayman Islands', 'CF': 'Central African Republic', 'TD': 'Chad',
      'CL': 'Chile', 'CN': 'China', 'CX': 'Christmas Island', 'CC': 'Cocos (Keeling) Islands',
      'CO': 'Colombia', 'KM': 'Comoros', 'CG': 'Congo', 'CD': 'Congo (Democratic Republic)',
      'CK': 'Cook Islands', 'CR': 'Costa Rica', 'CI': 'Côte d\'Ivoire', 'HR': 'Croatia',
      'CU': 'Cuba', 'CW': 'Curaçao', 'CY': 'Cyprus', 'CZ': 'Czech Republic',
      'DK': 'Denmark', 'DJ': 'Djibouti', 'DM': 'Dominica', 'DO': 'Dominican Republic',
      'EC': 'Ecuador', 'EG': 'Egypt', 'SV': 'El Salvador', 'GQ': 'Equatorial Guinea',
      'ER': 'Eritrea', 'EE': 'Estonia', 'SZ': 'Eswatini', 'ET': 'Ethiopia',
      'FK': 'Falkland Islands', 'FO': 'Faroe Islands', 'FJ': 'Fiji', 'FI': 'Finland',
      'FR': 'France', 'GF': 'French Guiana', 'PF': 'French Polynesia', 'TF': 'French Southern Territories',
      'GA': 'Gabon', 'GM': 'Gambia', 'GE': 'Georgia', 'DE': 'Germany',
      'GH': 'Ghana', 'GI': 'Gibraltar', 'GR': 'Greece', 'GL': 'Greenland',
      'GD': 'Grenada', 'GP': 'Guadeloupe', 'GU': 'Guam', 'GT': 'Guatemala',
      'GG': 'Guernsey', 'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'GY': 'Guyana',
      'HT': 'Haiti', 'HM': 'Heard Island and McDonald Islands', 'VA': 'Holy See',
      'HN': 'Honduras', 'HK': 'Hong Kong', 'HU': 'Hungary', 'IS': 'Iceland',
      'IN': 'India', 'ID': 'Indonesia', 'IR': 'Iran', 'IQ': 'Iraq',
      'IE': 'Ireland', 'IM': 'Isle of Man', 'IL': 'Israel', 'IT': 'Italy',
      'JM': 'Jamaica', 'JP': 'Japan', 'JE': 'Jersey', 'JO': 'Jordan',
      'KZ': 'Kazakhstan', 'KE': 'Kenya', 'KI': 'Kiribati', 'KP': 'North Korea',
      'KR': 'South Korea', 'KW': 'Kuwait', 'KG': 'Kyrgyzstan', 'LA': 'Laos',
      'LV': 'Latvia', 'LB': 'Lebanon', 'LS': 'Lesotho', 'LR': 'Liberia',
      'LY': 'Libya', 'LI': 'Liechtenstein', 'LT': 'Lithuania', 'LU': 'Luxembourg',
      'MO': 'Macao', 'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaysia',
      'MV': 'Maldives', 'ML': 'Mali', 'MT': 'Malta', 'MH': 'Marshall Islands',
      'MQ': 'Martinique', 'MR': 'Mauritania', 'MU': 'Mauritius', 'YT': 'Mayotte',
      'MX': 'Mexico', 'FM': 'Micronesia', 'MD': 'Moldova', 'MC': 'Monaco',
      'MN': 'Mongolia', 'ME': 'Montenegro', 'MS': 'Montserrat', 'MA': 'Morocco',
      'MZ': 'Mozambique', 'MM': 'Myanmar', 'NA': 'Namibia', 'NR': 'Nauru',
      'NP': 'Nepal', 'NL': 'Netherlands', 'NC': 'New Caledonia', 'NZ': 'New Zealand',
      'NI': 'Nicaragua', 'NE': 'Niger', 'NG': 'Nigeria', 'NU': 'Niue',
      'NF': 'Norfolk Island', 'MK': 'North Macedonia', 'MP': 'Northern Mariana Islands',
      'NO': 'Norway', 'OM': 'Oman', 'PK': 'Pakistan', 'PW': 'Palau',
      'PS': 'Israel', 'PA': 'Panama', 'PG': 'Papua New Guinea', 'PY': 'Paraguay',
      'PE': 'Peru', 'PH': 'Philippines', 'PN': 'Pitcairn', 'PL': 'Poland',
      'PT': 'Portugal', 'PR': 'Puerto Rico', 'QA': 'Qatar', 'RE': 'Réunion',
      'RO': 'Romania', 'RU': 'Russia', 'RW': 'Rwanda', 'BL': 'Saint Barthélemy',
      'SH': 'Saint Helena', 'KN': 'Saint Kitts and Nevis', 'LC': 'Saint Lucia',
      'MF': 'Saint Martin', 'PM': 'Saint Pierre and Miquelon', 'VC': 'Saint Vincent and the Grenadines',
      'WS': 'Samoa', 'SM': 'San Marino', 'ST': 'Sao Tome and Principe', 'SA': 'Saudi Arabia',
      'SN': 'Senegal', 'RS': 'Serbia', 'SC': 'Seychelles', 'SL': 'Sierra Leone',
      'SG': 'Singapore', 'SX': 'Sint Maarten', 'SK': 'Slovakia', 'SI': 'Slovenia',
      'SB': 'Solomon Islands', 'SO': 'Somalia', 'ZA': 'South Africa',
      'GS': 'South Georgia and the South Sandwich Islands', 'SS': 'South Sudan',
      'ES': 'Spain', 'LK': 'Sri Lanka', 'SD': 'Sudan', 'SR': 'Suriname',
      'SJ': 'Svalbard and Jan Mayen', 'SE': 'Sweden', 'CH': 'Switzerland', 'SY': 'Syria',
      'TW': 'Taiwan', 'TJ': 'Tajikistan', 'TZ': 'Tanzania', 'TH': 'Thailand',
      'TL': 'Timor-Leste', 'TG': 'Togo', 'TK': 'Tokelau', 'TO': 'Tonga',
      'TT': 'Trinidad and Tobago', 'TN': 'Tunisia', 'TR': 'Turkey', 'TM': 'Turkmenistan',
      'TC': 'Turks and Caicos Islands', 'TV': 'Tuvalu', 'UG': 'Uganda', 'UA': 'Ukraine',
      'AE': 'United Arab Emirates', 'GB': 'United Kingdom', 'US': 'United States',
      'UM': 'United States Minor Outlying Islands', 'UY': 'Uruguay', 'UZ': 'Uzbekistan',
      'VU': 'Vanuatu', 'VE': 'Venezuela', 'VN': 'Vietnam', 'VG': 'Virgin Islands (British)',
      'VI': 'Virgin Islands (U.S.)', 'WF': 'Wallis and Futuna', 'EH': 'Western Sahara',
      'YE': 'Yemen', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
    };

    if (countryMapping[upperCode]) return countryMapping[upperCode];
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      if (upperCode.length === 2) return regionNames.of(upperCode) || code;
    } catch {
      return code;
    }
    return code;
  };

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case 'strong': return 'bg-green-100 text-green-700 border-green-300';
      case 'emerging': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'declining': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'absent': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getQuadrantIcon = (quadrant: string) => {
    switch (quadrant) {
      case 'strong': return <CheckCircle className="w-4 h-4" />;
      case 'emerging': return <ArrowUpRight className="w-4 h-4" />;
      case 'declining': return <ArrowDownRight className="w-4 h-4" />;
      case 'absent': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleSort = (field: keyof MatrixCountry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedCountries = countries
    .filter(country => {
      if (searchQuery && !getCountryName(country.country_code).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField] as number;
      const bValue = b[sortField] as number;
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatDecimal = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  if (loadingDomains) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Global Visibility Matrix</h1>
        </div>
        <p className="text-gray-600">
          Identify where your brand doesn't exist globally and discover gaps in AI platform visibility
        </p>
      </div>


      {/* Controls */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.gsc_integration?.domain_url || domain.domain}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={calculateMatrix}
              disabled={calculating || !selectedDomain}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculating...' : 'Calculate All-Time Matrix'}
            </button>
          </div>
        </div>
        {calculating && calcProgress && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{calcProgress.message || 'Processing...'}</span>
              <span>{calcProgress.percentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300 ease-out"
                style={{ width: `${calcProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('ai')}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'ai'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Brain className="w-5 h-5" />
              Region VS AI
            </button>
            <button
              onClick={() => setActiveTab('google')}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'google'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Globe className="w-5 h-5" />
              Region VS Google Search
            </button>
          </nav>
        </div>
      </div>

      {/* AI Results Alert */}
      {aiResults && (aiResults.weakPresence?.length > 0 || aiResults.absentCountries?.length > 0) && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Presence Alert</h3>
              
              {aiResults.absentCountries?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-700 mb-1">
                    ❌ Brand NOT mentioned in {aiResults.absentCountries.length} countries:
                  </p>
                  <p className="text-sm text-gray-700">
                    {aiResults.absentCountries.slice(0, 10).join(', ')}
                    {aiResults.absentCountries.length > 10 && ` and ${aiResults.absentCountries.length - 10} more`}
                  </p>
                </div>
              )}
              
              {aiResults.weakPresence?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-1">
                    ⚠️ Weak AI presence in {aiResults.weakPresence.length} countries:
                  </p>
                  <div className="text-sm text-gray-700">
                    {aiResults.weakPresence.slice(0, 5).map((item: any, idx: number) => (
                      <span key={idx}>
                        {item.country} (score: {item.score})
                        {idx < Math.min(4, aiResults.weakPresence.length - 1) && ', '}
                      </span>
                    ))}
                    {aiResults.weakPresence.length > 5 && ` and ${aiResults.weakPresence.length - 5} more`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'ai' ? (
        // Region VS AI Tab
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : countries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Data Available</h3>
              <p className="text-gray-600 mb-6">
                Click "Calculate Matrix" to generate your AI visibility report.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={calculateMatrix}
                  disabled={calculating || !selectedDomain}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                  {calculating ? 'Calculating...' : 'Calculate Matrix'}
                </button>
                {calculating && calcProgress && (
                  <div className="w-full max-w-md space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{calcProgress.message || 'Processing...'}</span>
                      <span>{calcProgress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-300 ease-out"
                        style={{ width: `${calcProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
          {/* ========== VIDEO REPORT SECTION (Region vs AI) ========== */}
          {countries.length > 0 && (
            <div className="mb-6">
              {videoAi.status === 'idle' && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Video className="w-6 h-6 text-violet-600" /></div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Region vs AI Video Report</h3><p className="text-sm text-gray-600 mt-0.5">Generate an AI-powered video of your AI visibility by region — quadrants, opportunities, and absent markets.</p></div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideoAi} className="px-3 py-2.5 border border-violet-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]" title="Video language">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                    <button onClick={() => generateVideoReport('ai')} disabled={generatingVideoAi} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium text-sm whitespace-nowrap"><Play className="w-4 h-4" />Generate Video</button>
                  </div>
                </div>
              )}
              {videoAi.status === 'pending' && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Loader2 className="w-6 h-6 text-violet-600 animate-spin" /></div>
                    <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Generating Region vs AI Video…</h3><p className="text-sm text-gray-600 mt-0.5">xAI Aurora is rendering your 15-second video. This typically takes <strong>2–8 minutes</strong>. We&apos;re checking automatically every 12 seconds.</p></div>
                    <button onClick={() => pollVideoStatus('ai')} className="flex-shrink-0 px-4 py-2 bg-white text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 flex items-center gap-2 text-sm font-medium"><RefreshCw className="w-4 h-4" />Check Now</button>
                  </div>
                </div>
              )}
              {videoAi.status === 'failed' && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-6 h-6 text-red-600" /></div>
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Video Generation Failed</h3><p className="text-sm text-gray-600 mt-0.5">The video generation request expired or failed. Please try again.</p></div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideoAi} className="px-3 py-2 border border-red-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]" title="Video language">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                    <button onClick={() => generateVideoReport('ai')} disabled={generatingVideoAi} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"><RotateCcw className="w-4 h-4" />Retry</button>
                  </div>
                </div>
              )}
              {videoAi.status === 'done' && videoAi.url && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div><div><h3 className="font-semibold text-gray-900">Region vs AI Video Report</h3>{videoAi.generatedAt && <p className="text-xs text-gray-500 mt-0.5">Generated {new Date(videoAi.generatedAt).toLocaleString()}</p>}</div></div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => { setShowVideoModalTab('ai'); setShowVideoModal(true); }} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 flex items-center gap-2 text-sm font-medium"><Play className="w-4 h-4" />Preview Video</button>
                      <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideoAi} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[100px]" title="Video language for regeneration">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                      <button onClick={() => generateVideoReport('ai')} disabled={generatingVideoAi} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"><RotateCcw className="w-4 h-4" />Regenerate</button>
                      <button onClick={() => downloadVideo('ai')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium"><Download className="w-4 h-4" />Download</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Cards - Focus on Brand Absence */}
          {countries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">Brand Absent</span>
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-900">
                  {countries.filter(c => c.ai_visibility_score === 0).length}
                </div>
                <p className="text-xs text-red-600 mt-1">Zero AI presence</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Weak Presence</span>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-orange-900">
                  {countries.filter(c => c.ai_visibility_score > 0 && c.ai_visibility_score < 30).length}
                </div>
                <p className="text-xs text-orange-600 mt-1">AI score 1-29</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-700">Limited Coverage</span>
                  <TrendingDown className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-3xl font-bold text-yellow-900">
                  {countries.filter(c => (c.ai_platforms_present?.length || 0) <= 1).length}
                </div>
                <p className="text-xs text-yellow-600 mt-1">≤ 1 platform</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Global Gap</span>
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {((countries.filter(c => c.ai_visibility_score < 30).length / countries.length) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-blue-600 mt-1">Regions need help</p>
              </div>
            </div>
          )}

          {/* Charts Section - Focus on Brand Absence */}
          <div className="space-y-6 mb-6">
            {/* Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries with Zero/Lowest AI Presence */}
              <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Absent/Weakest - Bottom 10 Countries</h3>
                <p className="text-sm text-gray-600 mb-4">Countries where brand has minimal or no AI presence</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice().sort((a, b) => a.ai_visibility_score - b.ai_visibility_score).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
                    fullName: getCountryName(c.country_code),
                    score: c.ai_visibility_score,
                    platforms: c.ai_platforms_present?.length || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'AI Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="score" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Countries with No Platform Coverage */}
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 - Minimal Platform Coverage</h3>
                <p className="text-sm text-gray-600 mb-4">Countries with fewest AI platforms mentioning the brand</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice().sort((a, b) => (a.ai_platforms_present?.length || 0) - (b.ai_platforms_present?.length || 0)).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
                    fullName: getCountryName(c.country_code),
                    platforms: c.ai_platforms_present?.length || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 5]} label={{ value: 'Platforms', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [`${value}/5 platforms`, 'Coverage']}
                    />
                    <Bar dataKey="platforms" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Third Row: Zero AI Presence and Biggest Gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Countries with Zero AI Presence */}
              <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Countries with Zero AI Presence</h3>
                <p className="text-sm text-gray-600 mb-4">Regions where brand is completely absent from AI</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.filter(c => c.ai_visibility_score === 0).sort((a, b) => b.organic_score - a.organic_score).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
                    fullName: getCountryName(c.country_code),
                    organic: c.organic_score,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Organic Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [Number(value).toFixed(1), 'Organic Score']}
                    />
                    <Bar dataKey="organic" fill="#dc2626" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Biggest AI Gaps */}
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 10 - Biggest AI Visibility Gaps</h3>
                <p className="text-sm text-gray-600 mb-4">Countries where organic is strong but AI is weak</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice().sort((a, b) => (b.organic_score - b.ai_visibility_score) - (a.organic_score - a.ai_visibility_score)).slice(0, 10).map(c => ({
                    name: getCountryName(c.country_code),
                    fullName: getCountryName(c.country_code),
                    gap: c.organic_score - c.ai_visibility_score,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Gap Score', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [Number(value).toFixed(1), 'Gap']}
                    />
                    <Bar dataKey="gap" fill="#a855f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fourth Row: Global Weakness Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bottom 15 Regions - Global Weakness Analysis</h3>
              <p className="text-sm text-gray-600 mb-4">Countries with lowest AI visibility showing the visibility gap</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={countries.slice().sort((a, b) => a.ai_visibility_score - b.ai_visibility_score).slice(0, 15).map(c => ({
                  name: getCountryName(c.country_code),
                  fullName: getCountryName(c.country_code),
                  organic: c.organic_score,
                  ai: c.ai_visibility_score
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120} 
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="organic" fill="#10b981" radius={[4, 4, 0, 0]} name="Organic Score" />
                  <Bar dataKey="ai" fill="#ef4444" radius={[4, 4, 0, 0]} name="AI Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Countries Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      onClick={() => handleSort('country_code')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Country {sortField === 'country_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('organic_score')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Organic {sortField === 'organic_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('ai_visibility_score')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      AI Score {sortField === 'ai_visibility_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Quadrant
                    </th>
                    <th 
                      onClick={() => handleSort('gsc_clicks')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Clicks {sortField === 'gsc_clicks' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('gsc_impressions')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Impressions {sortField === 'gsc_impressions' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      AI Platforms (5)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedCountries.map((country) => (
                    <tr key={country.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {getCountryName(country.country_code)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full" 
                              style={{ width: `${country.organic_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{formatDecimal(country.organic_score)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                country.ai_visibility_score === 0 ? 'bg-red-500' :
                                country.ai_visibility_score < 30 ? 'bg-orange-500' :
                                country.ai_visibility_score < 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${country.ai_visibility_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{formatDecimal(country.ai_visibility_score)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getQuadrantColor(country.quadrant)}`}>
                          {getQuadrantIcon(country.quadrant)}
                          {country.quadrant.charAt(0).toUpperCase() + country.quadrant.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(country.gsc_clicks)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(country.gsc_impressions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {[
                            { key: 'chatgpt', name: 'ChatGPT' },
                            { key: 'claude', name: 'Claude' },
                            { key: 'gemini', name: 'Gemini' },
                            { key: 'perplexity', name: 'Perplexity' },
                            { key: 'groq', name: 'Groq' }
                          ].map(({ key, name }) => {
                            const isPresent = country.ai_platforms_present?.includes(key);
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  isPresent
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-gray-100 text-gray-500 border border-gray-300'
                                }`}
                                title={isPresent ? 'Domain found' : 'Domain not found'}
                              >
                                {name}
                                {isPresent ? (
                                  <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                                ) : (
                                  <X className="w-3 h-3 text-gray-400" strokeWidth={3} />
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-center mt-1">
                          <span className="text-xs font-semibold text-gray-700">
                            {country.ai_platforms_present?.length || 0}/5 platforms
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredAndSortedCountries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No countries match your filters.
            </div>
          )}
            </>
          )}
        </>
      ) : (
        // Region VS Google Search Tab
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : countries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-6">
                Click "Calculate Matrix" to generate your visibility report.
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={calculateMatrix}
                  disabled={calculating || !selectedDomain}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${calculating ? 'animate-spin' : ''}`} />
                  {calculating ? 'Calculating...' : 'Calculate Matrix'}
                </button>
                {calculating && calcProgress && (
                  <div className="w-full max-w-md space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{calcProgress.message || 'Processing...'}</span>
                      <span>{calcProgress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{ width: `${calcProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ========== VIDEO REPORT SECTION (Region vs Google Search) ========== */}
              {countries.length > 0 && (
                <div className="mb-6">
                  {videoGoogle.status === 'idle' && (
                    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Video className="w-6 h-6 text-violet-600" /></div>
                      <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Region vs Google Search Video Report</h3><p className="text-sm text-gray-600 mt-0.5">Generate an AI-powered video of your Google Search Console performance by region — clicks, impressions, and top countries.</p></div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideoGoogle} className="px-3 py-2.5 border border-violet-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]" title="Video language">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                        <button onClick={() => generateVideoReport('google')} disabled={generatingVideoGoogle} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium text-sm whitespace-nowrap"><Play className="w-4 h-4" />Generate Video</button>
                      </div>
                    </div>
                  )}
                  {videoGoogle.status === 'pending' && (
                    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center"><Loader2 className="w-6 h-6 text-violet-600 animate-spin" /></div>
                        <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Generating Region vs Google Video…</h3><p className="text-sm text-gray-600 mt-0.5">xAI Aurora is rendering your 15-second video. This typically takes <strong>2–8 minutes</strong>. We&apos;re checking automatically every 12 seconds.</p></div>
                        <button onClick={() => pollVideoStatus('google')} className="flex-shrink-0 px-4 py-2 bg-white text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 flex items-center gap-2 text-sm font-medium"><RefreshCw className="w-4 h-4" />Check Now</button>
                      </div>
                    </div>
                  )}
                  {videoGoogle.status === 'failed' && (
                    <div className="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><XCircle className="w-6 h-6 text-red-600" /></div>
                      <div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">Video Generation Failed</h3><p className="text-sm text-gray-600 mt-0.5">The video generation request expired or failed. Please try again.</p></div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideoGoogle} className="px-3 py-2 border border-red-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[120px]" title="Video language">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                        <button onClick={() => generateVideoReport('google')} disabled={generatingVideoGoogle} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"><RotateCcw className="w-4 h-4" />Retry</button>
                      </div>
                    </div>
                  )}
                  {videoGoogle.status === 'done' && videoGoogle.url && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3"><div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div><div><h3 className="font-semibold text-gray-900">Region vs Google Video Report</h3>{videoGoogle.generatedAt && <p className="text-xs text-gray-500 mt-0.5">Generated {new Date(videoGoogle.generatedAt).toLocaleString()}</p>}</div></div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => { setShowVideoModalTab('google'); setShowVideoModal(true); }} className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 flex items-center gap-2 text-sm font-medium"><Play className="w-4 h-4" />Preview Video</button>
                          <select value={videoLanguage} onChange={(e) => { const v = e.target.value; setVideoLanguage(v); videoLanguageRef.current = v; }} disabled={generatingVideoGoogle} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm font-medium disabled:opacity-50 min-w-[100px]" title="Video language for regeneration">{VIDEO_LANGUAGE_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                          <button onClick={() => generateVideoReport('google')} disabled={generatingVideoGoogle} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"><RotateCcw className="w-4 h-4" />Regenerate</button>
                          <button onClick={() => downloadVideo('google')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5 text-sm font-medium"><Download className="w-4 h-4" />Download</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Google Search Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Countries</span>
                    <Globe className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{countries.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Regions analyzed</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Total Clicks</span>
                    <MousePointerClick className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-900">
                    {formatNumber(countries.reduce((sum, c) => sum + c.gsc_clicks, 0))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Across all regions</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Total Impressions</span>
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-900">
                    {formatNumber(countries.reduce((sum, c) => sum + c.gsc_impressions, 0))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Total visibility</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Avg CTR</span>
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-900">
                    {((countries.reduce((sum, c) => sum + c.gsc_clicks, 0) / countries.reduce((sum, c) => sum + c.gsc_impressions, 0)) * 100).toFixed(2)}%
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Click-through rate</p>
                </div>
              </div>

              {/* Google Search Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Top Countries by Clicks */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Clicks</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countries.slice().sort((a, b) => b.gsc_clicks - a.gsc_clicks).slice(0, 10).map(c => ({
                      name: getCountryName(c.country_code),
                      clicks: c.gsc_clicks,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100} 
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any) => [formatNumber(Number(value)), 'Clicks']}
                      />
                      <Legend />
                      <Bar dataKey="clicks" fill="#10b981" radius={[8, 8, 0, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Countries by Impressions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Countries by Impressions</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countries.slice().sort((a, b) => b.gsc_impressions - a.gsc_impressions).slice(0, 10).map(c => ({
                      name: getCountryName(c.country_code),
                      impressions: c.gsc_impressions,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100} 
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: any) => [formatNumber(Number(value)), 'Impressions']}
                      />
                      <Legend />
                      <Bar dataKey="impressions" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Impressions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Google Search Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-6 h-6 text-blue-600" />
                    Google Search Performance by Region
                  </h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Search console data across {countries.length} {countries.length === 1 ? 'region' : 'regions'}
                  </p>
                </div>

                {/* Search */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th 
                          onClick={() => handleSort('country_code')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Country {sortField === 'country_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('gsc_clicks')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Clicks {sortField === 'gsc_clicks' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleSort('gsc_impressions')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Impressions {sortField === 'gsc_impressions' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          CTR
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Avg Position
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedCountries.map((country) => (
                        <tr key={country.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getCountryName(country.country_code)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(country.gsc_clicks)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(country.gsc_impressions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(country.gsc_ctr * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {country.gsc_avg_position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Shared Video Modal */}
      {showVideoModal && (showVideoModalTab === 'ai' ? videoAi.url : videoGoogle.url) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowVideoModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50"><h3 className="font-semibold text-gray-900">{showVideoModalTab === 'ai' ? 'Region vs AI Video Report' : 'Region vs Google Video Report'}</h3><div className="flex items-center gap-2"><button onClick={() => downloadVideo(showVideoModalTab)} className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-1.5">Download</button><button onClick={() => setShowVideoModal(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors" aria-label="Close"><X className="w-5 h-5" /></button></div></div>
            <div className="flex-1 min-h-0 bg-gray-950 flex items-center justify-center p-4"><video src={showVideoModalTab === 'ai' ? videoAi.url! : videoGoogle.url!} controls autoPlay className="max-w-full max-h-[calc(90vh-80px)]">Your browser does not support the video tag.</video></div>
          </div>
        </div>
      )}
    </div>
  );
}
