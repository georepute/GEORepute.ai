'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface KeywordIdea {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  lowTopOfPageBid?: number;
  highTopOfPageBid?: number;
}

interface KeywordPlan {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  keywords: string[];
  created_at: string;
  forecast?: Forecast[] | null;
  keyword_ideas?: KeywordIdea[] | null;
}

interface Forecast {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  cost: number;
}

export default function AnalyticsPage() {
  const { isRtl, t } = useLanguage();
  const [keywordPlans, setKeywordPlans] = useState<KeywordPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Extract keyword ideas and forecasts from selected plan
  const keywordIdeas: KeywordIdea[] = useMemo(() => {
    if (!selectedPlanId) return [];
    const plan = keywordPlans.find(p => p.id === selectedPlanId);
    if (!plan) return [];
    
    // First, try to use keyword_ideas if available (full data from generation)
    if (plan.keyword_ideas && Array.isArray(plan.keyword_ideas) && plan.keyword_ideas.length > 0) {
      return plan.keyword_ideas as KeywordIdea[];
    }
    
    // Fallback: Reconstruct keyword ideas from forecast data if available
    if (plan.forecast && plan.forecast.length > 0) {
      return plan.forecast.map(f => {
        // Estimate average monthly searches from impressions (rough approximation)
        const avgMonthlySearches = Math.round(f.impressions / 0.8); // Reverse of 80% impression share
        
        // Determine competition based on CPC
        let competition = 'MEDIUM';
        if (f.avgCpc < 1.5) competition = 'LOW';
        else if (f.avgCpc > 3.5) competition = 'HIGH';
        
        return {
          text: f.keyword,
          avgMonthlySearches,
          competition,
          lowTopOfPageBid: f.avgCpc * 0.7, // Estimate low bid
          highTopOfPageBid: f.avgCpc * 1.3, // Estimate high bid
        };
      });
    }
    
    // Last resort: Basic keyword data without metrics
    return plan.keywords.map(keyword => ({
      text: keyword,
      avgMonthlySearches: 0,
      competition: 'UNKNOWN',
      lowTopOfPageBid: 0,
      highTopOfPageBid: 0,
    }));
  }, [selectedPlanId, keywordPlans]);

  const forecasts: Forecast[] = useMemo(() => {
    if (!selectedPlanId) return [];
    const plan = keywordPlans.find(p => p.id === selectedPlanId);
    return plan?.forecast || [];
  }, [selectedPlanId, keywordPlans]);

  // Load keyword plans on mount
  useEffect(() => {
    loadKeywordPlans();
  }, []);

  const loadKeywordPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/keyword-forecast/get-plans');
      const data = await response.json();
      
      if (response.ok) {
        setKeywordPlans(data.plans || []);
        // Auto-select first plan with forecast data
        const planWithForecast = data.plans?.find((p: KeywordPlan) => 
          p.forecast && Array.isArray(p.forecast) && p.forecast.length > 0
        );
        if (planWithForecast) {
          setSelectedPlanId(planWithForecast.id);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load keyword plans');
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics data for Forecast Metrics
  const analyticsData = useMemo(() => {
    // Forecast Summary Metrics
    const totalImpressions = forecasts.reduce((sum, f) => sum + f.impressions, 0);
    const totalClicks = forecasts.reduce((sum, f) => sum + f.clicks, 0);
    const avgCTR = forecasts.length > 0 ? forecasts.reduce((sum, f) => sum + f.ctr, 0) / forecasts.length : 0;
    const totalCost = forecasts.reduce((sum, f) => sum + f.cost, 0);
    const avgCPC = forecasts.length > 0 ? forecasts.reduce((sum, f) => sum + f.avgCpc, 0) / forecasts.length : 0;

    // Calculate dynamic thresholds based on data
    const sortedCTRs = forecasts.map(f => f.ctr).sort((a, b) => b - a);
    const highCTRThreshold = sortedCTRs[Math.floor(sortedCTRs.length * 0.25)] || 0.04; // Top 25%
    const mediumCTRThreshold = sortedCTRs[Math.floor(sortedCTRs.length * 0.5)] || 0.025; // Median

    // CTR Performance
    const ctrData = [...forecasts]
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 10)
      .map(f => ({
        keyword: f.keyword.length > 20 ? f.keyword.substring(0, 20) + '...' : f.keyword,
        ctr: (f.ctr * 100).toFixed(2),
        fill: f.ctr >= highCTRThreshold ? '#10B981' : f.ctr >= mediumCTRThreshold ? '#F59E0B' : '#EF4444'
      }));

    // Clicks vs Cost
    const clicksCostData = forecasts.map(f => ({
      keyword: f.keyword.length > 15 ? f.keyword.substring(0, 15) + '...' : f.keyword,
      clicks: f.clicks,
      cost: f.cost
    }));

    // Calculate realistic growth projection based on current CTR performance
    // Better CTR = higher growth potential
    const avgCTRPercent = avgCTR * 100;
    let projectedGrowthRate = 0.20; // Default 20% growth
    
    if (avgCTRPercent < 2) {
      projectedGrowthRate = 0.45; // High growth potential - 45%
    } else if (avgCTRPercent < 3.5) {
      projectedGrowthRate = 0.35; // Good growth potential - 35%
    } else if (avgCTRPercent < 5) {
      projectedGrowthRate = 0.25; // Moderate growth potential - 25%
    } else {
      projectedGrowthRate = 0.15; // Already performing well - 15%
    }

    // Calculate cost reduction potential based on CPC variance
    const cpcVariance = forecasts.length > 1 
      ? Math.sqrt(forecasts.reduce((sum, f) => sum + Math.pow(f.avgCpc - avgCPC, 2), 0) / forecasts.length)
      : 0;
    const costReductionPotential = Math.min(25, Math.max(5, Math.round((cpcVariance / avgCPC) * 100)));

    return {
      totalImpressions,
      totalClicks,
      avgCTR,
      totalCost,
      avgCPC,
      ctrData,
      clicksCostData,
      projectedGrowthRate,
      costReductionPotential,
      highCTRThreshold,
      mediumCTRThreshold,
    };
  }, [forecasts]);

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/20 p-6 flex items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <svg className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/20 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
      {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-20"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30 ring-2 ring-white">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Keyword Analytics
                </h1>
                <p className="text-gray-600 mt-1.5 text-sm">
                  Comprehensive insights and visualizations for your keyword strategy
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Selector */}
        {keywordPlans.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Select Keyword Plan to Analyze
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-medium text-gray-900 shadow-sm hover:border-gray-400"
            >
              <option value="">Select a plan...</option>
              {keywordPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.keywords.length} keywords)
                  {plan.forecast && Array.isArray(plan.forecast) && plan.forecast.length > 0 ? ' ✓ Has Forecast' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Empty States */}
        {keywordPlans.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/10">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Analytics Data Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create keyword plans and generate forecasts in the Keyword Forecast tab to see analytics.
              </p>
              <a
                href="/dashboard/keyword-forecast"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Go to Keyword Forecast
              </a>
            </div>
      </div>
        )}

        {!selectedPlanId && keywordPlans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-600/10">
                <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
            </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Select a Keyword Plan
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Choose a keyword plan from the dropdown above to view its analytics and insights.
              </p>
            </div>
          </div>
        )}

        {/* Forecast Performance Metrics */}
        {forecasts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              Forecast Performance Metrics
            </h3>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Impressions</p>
                <p className="text-3xl font-bold">{Math.round(analyticsData.totalImpressions).toLocaleString()}</p>
      </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-green-100 text-sm font-medium mb-1">Total Clicks</p>
                <p className="text-3xl font-bold">{Math.round(analyticsData.totalClicks).toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-purple-100 text-sm font-medium mb-1">Average CTR</p>
                <p className="text-3xl font-bold">{(analyticsData.avgCTR * 100).toFixed(1)}%</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-orange-100 text-sm font-medium mb-1">Total Cost</p>
                <p className="text-3xl font-bold">${Math.round(analyticsData.totalCost).toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-pink-100 text-sm font-medium mb-1">Average CPC</p>
                <p className="text-3xl font-bold">${analyticsData.avgCPC.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Clicks vs Cost */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  Clicks vs Cost Analysis
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.clicksCostData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="keyword" angle={-45} textAnchor="end" height={80} style={{ fontSize: '10px' }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#10B981" strokeWidth={2} name="Clicks" />
                    <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#EF4444" strokeWidth={2} name="Cost ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* CTR Performance */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  CTR Performance
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.ctrData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="%" />
                    <YAxis dataKey="keyword" type="category" width={100} style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Bar dataKey="ctr" radius={[0, 8, 8, 0]}>
                      {analyticsData.ctrData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

            {/* NEW GRAPHS - Three additional charts */}
            <div className="grid grid-cols-1 gap-8 mt-8">
              {/* 1. Keywords vs Impressions Bar Chart */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  Keywords vs Impressions
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Compare impression volumes across your keyword portfolio
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={forecasts.slice(0, 15).map(f => ({
                      keyword: f.keyword.length > 25 ? f.keyword.substring(0, 25) + '...' : f.keyword,
                      impressions: f.impressions,
                      fill: f.impressions > analyticsData.totalImpressions / forecasts.length 
                        ? '#6366F1' // Indigo for above average
                        : '#94A3B8' // Gray for below average
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="keyword" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                      tick={{ fill: '#64748B' }}
                    />
                    <YAxis 
                      label={{ value: 'Impressions', angle: -90, position: 'insideLeft', style: { fill: '#64748B' } }}
                      tick={{ fill: '#64748B' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      formatter={(value: any) => [value.toLocaleString(), 'Impressions']}
                    />
                    <Bar dataKey="impressions" radius={[8, 8, 0, 0]}>
                      {forecasts.slice(0, 15).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.impressions > analyticsData.totalImpressions / forecasts.length ? '#6366F1' : '#94A3B8'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
      </div>

              {/* 2. Cost Per Click (CPC) Analysis Chart */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-rose-100 rounded-lg">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Cost Per Click (CPC) Distribution
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Analyze your CPC across keywords to optimize budget allocation
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={forecasts
                      .slice()
                      .sort((a, b) => b.avgCpc - a.avgCpc)
                      .slice(0, 12)
                      .map(f => ({
                        keyword: f.keyword.length > 25 ? f.keyword.substring(0, 25) + '...' : f.keyword,
                        cpc: parseFloat(f.avgCpc.toFixed(2)),
                        fill: f.avgCpc > analyticsData.avgCPC 
                          ? '#F43F5E' // Rose for expensive
                          : f.avgCpc > analyticsData.avgCPC * 0.5
                            ? '#FB923C' // Orange for moderate
                            : '#10B981' // Green for cheap
                      }))
                    }
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="keyword" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      style={{ fontSize: '11px' }}
                      tick={{ fill: '#64748B' }}
                    />
                    <YAxis 
                      label={{ value: 'Cost Per Click ($)', angle: -90, position: 'insideLeft', style: { fill: '#64748B' } }}
                      tick={{ fill: '#64748B' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'CPC']}
                    />
                    <Bar dataKey="cpc" radius={[8, 8, 0, 0]}>
                      {forecasts
                        .slice()
                        .sort((a, b) => b.avgCpc - a.avgCpc)
                        .slice(0, 12)
                        .map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.avgCpc > analyticsData.avgCPC 
                              ? '#F43F5E' 
                              : entry.avgCpc > analyticsData.avgCPC * 0.5
                                ? '#FB923C'
                                : '#10B981'
                            } 
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 3. Projection Graph - Performance Improvement Forecast */}
              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      Performance Improvement Projection
                    </h4>
                    <p className="text-sm text-gray-600">
                      Projected improvements if planned keywords are implemented with optimal strategies
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                    Predictive Analysis
                  </div>
                </div>

                {/* Projection Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Current Performance</p>
                    <p className="text-2xl font-bold text-gray-900">{analyticsData.totalClicks.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Clicks</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-4 shadow-lg text-white">
                    <p className="text-xs text-green-100 mb-1">Projected Growth</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      +{Math.round(analyticsData.totalClicks * analyticsData.projectedGrowthRate).toLocaleString()}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </p>
                    <p className="text-xs text-green-100">+{(analyticsData.projectedGrowthRate * 100).toFixed(0)}% Improvement</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">CTR Improvement</p>
                    <p className="text-2xl font-bold text-purple-600">+{((analyticsData.avgCTR * analyticsData.projectedGrowthRate * 0.7) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Projected Increase</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Cost Efficiency</p>
                    <p className="text-2xl font-bold text-blue-600">-{analyticsData.costReductionPotential}%</p>
                    <p className="text-xs text-gray-500">Reduced CPC</p>
                  </div>
                </div>

                {/* Projection Line Chart */}
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart 
                    data={[
                      { 
                        month: 'Current', 
                        current: analyticsData.totalClicks, 
                        projected: analyticsData.totalClicks, 
                        improvement: 0 
                      },
                      { 
                        month: 'Month 1', 
                        current: analyticsData.totalClicks, 
                        projected: Math.round(analyticsData.totalClicks * (1 + analyticsData.projectedGrowthRate * 0.2)), 
                        improvement: Math.round(analyticsData.totalClicks * analyticsData.projectedGrowthRate * 0.2) 
                      },
                      { 
                        month: 'Month 2', 
                        current: analyticsData.totalClicks, 
                        projected: Math.round(analyticsData.totalClicks * (1 + analyticsData.projectedGrowthRate * 0.4)), 
                        improvement: Math.round(analyticsData.totalClicks * analyticsData.projectedGrowthRate * 0.4) 
                      },
                      { 
                        month: 'Month 3', 
                        current: analyticsData.totalClicks, 
                        projected: Math.round(analyticsData.totalClicks * (1 + analyticsData.projectedGrowthRate * 0.7)), 
                        improvement: Math.round(analyticsData.totalClicks * analyticsData.projectedGrowthRate * 0.7) 
                      },
                      { 
                        month: 'Month 4', 
                        current: analyticsData.totalClicks, 
                        projected: Math.round(analyticsData.totalClicks * (1 + analyticsData.projectedGrowthRate * 0.9)), 
                        improvement: Math.round(analyticsData.totalClicks * analyticsData.projectedGrowthRate * 0.9) 
                      },
                      { 
                        month: 'Month 5', 
                        current: analyticsData.totalClicks, 
                        projected: Math.round(analyticsData.totalClicks * (1 + analyticsData.projectedGrowthRate)), 
                        improvement: Math.round(analyticsData.totalClicks * analyticsData.projectedGrowthRate) 
                      },
                    ]}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: '#64748B' }}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      label={{ value: 'Total Clicks', angle: -90, position: 'insideLeft', style: { fill: '#64748B' } }}
                      tick={{ fill: '#64748B' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      formatter={(value: any, name: string) => {
                        if (name === 'current') return [value.toLocaleString(), 'Current Performance'];
                        if (name === 'projected') return [value.toLocaleString(), 'Projected Performance'];
                        if (name === 'improvement') return ['+' + value.toLocaleString(), 'Additional Clicks'];
                        return [value, name];
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      formatter={(value) => {
                        if (value === 'current') return 'Current Performance';
                        if (value === 'projected') return 'Projected with Keywords';
                        if (value === 'improvement') return 'Improvement Gain';
                        return value;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="current" 
                      stroke="#94A3B8" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#8B5CF6' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="improvement" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 4, fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Insights */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h5 className="font-semibold text-gray-900">Best Performers</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Focus on top {Math.round(forecasts.length * 0.2)} keywords with highest CTR potential for fastest results
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h5 className="font-semibold text-gray-900">Budget Optimization</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Reallocate budget to low-CPC, high-volume keywords for {analyticsData.costReductionPotential}% cost reduction
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h5 className="font-semibold text-gray-900">Quick Wins</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Target {Math.round(forecasts.length * 0.15)} low-competition keywords for immediate traffic boost
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no forecasts */}
        {forecasts.length === 0 && selectedPlanId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-600/10">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Forecast Data for This Plan
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Generate a forecast for this plan in the Keyword Forecast tab.
              </p>
              <a
                href="/dashboard/keyword-forecast"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg hover:shadow-green-600/30 transition-all font-semibold"
              >
                Generate Forecast
              </a>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
