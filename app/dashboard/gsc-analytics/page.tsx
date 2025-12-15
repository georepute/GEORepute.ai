'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, MousePointerClick, Eye, ExternalLink, Search, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface Domain {
  id: string;
  domain_url: string;
  verification_status: string;
  last_synced_at?: string;
}

interface AnalyticsData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Summary {
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgPosition: number;
  trends: {
    clicks: number;
    impressions: number;
  };
}

interface Query {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Page {
  id: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Country {
  id: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchAppearance {
  search_appearance: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

export default function GSCAnalyticsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topQueries, setTopQueries] = useState<Query[]>([]);
  const [topPages, setTopPages] = useState<Page[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchAppearances, setSearchAppearances] = useState<SearchAppearance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'queries' | 'pages' | 'countries' | 'appearances'>('overview');

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadAllData();
    }
  }, [selectedDomain, dateRange]);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      const verifiedDomains = data.domains?.filter((d: Domain) => d.verification_status === 'verified') || [];
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

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSummary(),
        loadAnalytics(),
        loadTopQueries(),
        loadTopPages(),
        loadCountries(),
        loadSearchAppearances(),
      ]);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/summary?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Load summary error:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/sync?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics || []);
      }
    } catch (error) {
      console.error('Load analytics error:', error);
    }
  };

  const loadTopQueries = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/queries?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}&limit=20`
      );
      const data = await response.json();
      
      if (data.success) {
        setTopQueries(data.queries || []);
      }
    } catch (error) {
      console.error('Load queries error:', error);
    }
  };

  const loadTopPages = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/pages?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}&limit=20`
      );
      const data = await response.json();
      
      if (data.success) {
        setTopPages(data.pages || []);
      }
    } catch (error) {
      console.error('Load pages error:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/sync?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}&dataType=country`
      );
      const data = await response.json();
      
      if (data.success) {
        setCountries(data.analytics || []);
      }
    } catch (error) {
      console.error('Load countries error:', error);
    }
  };

  const loadSearchAppearances = async () => {
    try {
      const startDate = getDateDaysAgo(dateRange);
      const endDate = getDateDaysAgo(0);
      
      const response = await fetch(
        `/api/integrations/google-search-console/analytics/sync?domainId=${selectedDomain}&startDate=${startDate}&endDate=${endDate}&dataType=search_appearance`
      );
      const data = await response.json();
      
      if (data.success) {
        // Aggregate search appearance data
        const appearanceMap = new Map<string, SearchAppearance>();
        (data.analytics || []).forEach((item: any) => {
          const appearance = item.search_appearance || 'UNKNOWN';
          if (appearanceMap.has(appearance)) {
            const existing = appearanceMap.get(appearance)!;
            existing.clicks += item.clicks || 0;
            existing.impressions += item.impressions || 0;
          } else {
            appearanceMap.set(appearance, {
              search_appearance: appearance,
              clicks: item.clicks || 0,
              impressions: item.impressions || 0,
              ctr: item.ctr || 0,
            });
          }
        });
        setSearchAppearances(Array.from(appearanceMap.values()));
      }
    } catch (error) {
      console.error('Load search appearances error:', error);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      // Sync summary data
      const summaryResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(30),
          endDate: getDateDaysAgo(0),
          dimensions: ['date'],
        }),
      });

      // Sync query data
      const queryResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(7),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'query'],
          rowLimit: 100,
        }),
      });

      // Sync page data
      const pageResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(7),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'page'],
          rowLimit: 100,
        }),
      });

      // Sync country data
      const countryResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(7),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'country'],
          rowLimit: 50,
        }),
      });

      // Sync search appearance data
      const appearanceResponse = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: selectedDomain,
          startDate: getDateDaysAgo(7),
          endDate: getDateDaysAgo(0),
          dimensions: ['date', 'searchAppearance'],
        }),
      });

      if (summaryResponse.ok) {
        toast.success('Data synced successfully!');
        loadAllData();
      } else {
        toast.error('Failed to sync data');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getCountryName = (code: string) => {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    try {
      return regionNames.of(code.toUpperCase()) || code;
    } catch {
      return code;
    }
  };

  const selectedDomainData = domains.find(d => d.id === selectedDomain);

  // Show loading state while checking for domains
  if (loadingDomains) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading domains...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state only after loading is complete
  if (domains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Verified Domains</h2>
            <p className="text-gray-600 mb-4">
              You need to add and verify a domain before viewing analytics.
            </p>
            <a
              href="/dashboard/google-search-console"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Domain
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Console Analytics</h1>
            <p className="text-gray-600">Track your website's search performance and insights</p>
          </div>
          <a
            href="/dashboard/google-search-console"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" />
            Add Domain
          </a>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="font-medium text-gray-700 text-sm">Domain:</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain_url}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-medium text-gray-700 text-sm">Period:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <button
              onClick={syncData}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>

          {selectedDomainData?.last_synced_at && (
            <p className="text-xs text-gray-500 mt-2">
              Last synced: {new Date(selectedDomainData.last_synced_at).toLocaleString()}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Clicks</h3>
                    <MousePointerClick className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{formatNumber(summary.totalClicks)}</p>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(summary.trends.clicks)}`}>
                    {getTrendIcon(summary.trends.clicks)}
                    <span>{Math.abs(summary.trends.clicks).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Impressions</h3>
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{formatNumber(summary.totalImpressions)}</p>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(summary.trends.impressions)}`}>
                    {getTrendIcon(summary.trends.impressions)}
                    <span>{Math.abs(summary.trends.impressions).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Average CTR</h3>
                    <MousePointerClick className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{summary.avgCTR.toFixed(2)}%</p>
                  <p className="text-sm text-gray-500">Click-through rate</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Average Position</h3>
                    <Search className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{summary.avgPosition.toFixed(1)}</p>
                  <p className="text-sm text-gray-500">Search ranking</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('queries')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'queries'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Top Queries
                  </button>
                  <button
                    onClick={() => setActiveTab('pages')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'pages'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Top Pages
                  </button>
                  <button
                    onClick={() => setActiveTab('countries')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'countries'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="w-4 h-4 inline mr-2" />
                    Countries
                  </button>
                  <button
                    onClick={() => setActiveTab('appearances')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'appearances'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Search Appearances
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Combined Metrics Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics Over Time</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={analytics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                          
                          {/* Left Y-axis for Clicks & Impressions */}
                          <YAxis 
                            yAxisId="left" 
                            stroke="#6b7280" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Clicks & Impressions', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          
                          {/* Right Y-axis for CTR & Position */}
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="#6b7280" 
                            style={{ fontSize: '12px' }}
                            label={{ value: 'CTR (%) & Position', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                          />
                          
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            formatter={(value: number, name: string) => {
                              if (name === 'CTR') return `${(value * 100).toFixed(2)}%`;
                              if (name === 'Position') return value.toFixed(1);
                              return formatNumber(value);
                            }}
                          />
                          <Legend />
                          
                          {/* Lines with different Y-axes */}
                          <Line 
                            yAxisId="left" 
                            type="linear" 
                            dataKey="clicks" 
                            stroke="#3b82f6" 
                            name="Clicks" 
                            strokeWidth={2} 
                            dot={false}
                          />
                          <Line 
                            yAxisId="left" 
                            type="linear" 
                            dataKey="impressions" 
                            stroke="#10b981" 
                            name="Impressions" 
                            strokeWidth={2} 
                            dot={false}
                          />
                          <Line 
                            yAxisId="right" 
                            type="linear" 
                            dataKey="ctr" 
                            stroke="#8b5cf6" 
                            name="CTR" 
                            strokeWidth={2} 
                            dot={false}
                          />
                          <Line 
                            yAxisId="right" 
                            type="linear" 
                            dataKey="position" 
                            stroke="#f97316" 
                            name="Position" 
                            strokeWidth={2} 
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Lower position values indicate better rankings. CTR is shown as a decimal (multiply by 100 for percentage).
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'queries' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Queries</h3>
                    {topQueries.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No query data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Query</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {topQueries.map((query, index) => (
                              <tr key={query.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{query.query}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(query.clicks)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(query.impressions)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{(query.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{query.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pages' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Pages</h3>
                    {topPages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No page data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Page</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {topPages.map((page, index) => (
                              <tr key={page.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate" title={page.page}>
                                  {page.page}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(page.clicks)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(page.impressions)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{(page.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{page.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'countries' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Country</h3>
                    {countries.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No country data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Country</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {countries.slice(0, 20).map((country, index) => (
                              <tr key={country.id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <span className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    {getCountryName(country.country)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(country.clicks)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(country.impressions)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{(country.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{country.position.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'appearances' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Search Appearance</h3>
                    {searchAppearances.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No search appearance data available. Click "Sync Data" to fetch latest data.</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Bar Chart */}
                        <div>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={searchAppearances}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="search_appearance" 
                                angle={-45} 
                                textAnchor="end" 
                                height={100} 
                                style={{ fontSize: '11px' }}
                              />
                              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                              />
                              <Legend />
                              <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                              <Bar dataKey="impressions" fill="#10b981" name="Impressions" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Clicks</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Impressions</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">CTR</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {searchAppearances.map((appearance, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">{appearance.search_appearance}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(appearance.clicks)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(appearance.impressions)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{(appearance.ctr * 100).toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

