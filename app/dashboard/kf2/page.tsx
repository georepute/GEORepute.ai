'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase/client';
import { Target, TrendingUp, Sparkles, Search, Plus, X, ExternalLink, TrendingDown } from 'lucide-react';

interface KeywordIdea {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  lowTopOfPageBid?: number;
  highTopOfPageBid?: number;
}

interface KeywordPlan {
  id: string;
  name: string;
  keywords: string[];
  created_at: string;
}

interface Forecast {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  cost: number;
}

interface Domain {
  id: string;
  organization_id: string;
  domain: string;
  status: 'active' | 'inactive' | 'pending_verification' | 'verification_failed';
  created_at: string;
  updated_at: string;
}

export default function KF2Page() {
  const { isRtl, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ideas' | 'plans' | 'forecasts'>('ideas');
  
  // Generate Ideas state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [keywordIdeas, setKeywordIdeas] = useState<KeywordIdea[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'searches' | 'competition'>('searches');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchFilter, setSearchFilter] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [ideasDataSource, setIdeasDataSource] = useState<{ isReal: boolean; message: string } | null>(null);
  
  // Keyword Plans state
  const [keywordPlans, setKeywordPlans] = useState<KeywordPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planName, setPlanName] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  
  // Forecasts state
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedPlanForForecast, setSelectedPlanForForecast] = useState<string>('');
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastDataSource, setForecastDataSource] = useState<{ isReal: boolean; message: string } | null>(null);

  // Load domains on mount
  useEffect(() => {
    if (activeTab === 'ideas') {
      loadDomains();
    }
  }, [activeTab]);

  // Load keyword plans on mount
  useEffect(() => {
    if (activeTab === 'plans') {
      loadKeywordPlans();
    }
  }, [activeTab]);

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to view domains');
        return;
      }

      // Get organization ID
      const { data: orgUser, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (orgError) throw orgError;

      // Load domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('domains')
        .select('*')
        .eq('organization_id', orgUser.organization_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (domainsError) throw domainsError;

      setDomains(domainsData || []);
      
      // Auto-select first domain if available
      if (domainsData && domainsData.length > 0 && !selectedDomainId) {
        setSelectedDomainId(domainsData[0].id);
      }
    } catch (error: any) {
      console.error('Error loading domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const generateKeywordIdeas = async () => {
    if (!selectedDomainId) {
      toast.error('Please select a domain');
      return;
    }

    const selectedDomain = domains.find(d => d.id === selectedDomainId);
    if (!selectedDomain) {
      toast.error('Selected domain not found');
      return;
    }

    // Construct full URL from domain
    const websiteUrl = selectedDomain.domain.startsWith('http') 
      ? selectedDomain.domain 
      : `https://${selectedDomain.domain}`;

    setGeneratingIdeas(true);
    setIdeasDataSource(null); // Reset data source info
    try {
      const response = await fetch('/api/kf2/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate keyword ideas');
      }

      setKeywordIdeas(data.ideas || []);
      
      // Track data source
      const isRealData = !data.testMode && !data.message?.includes('mock') && !data.message?.includes('Mock');
      setIdeasDataSource({
        isReal: isRealData,
        message: data.message || ''
      });
      
      // Show appropriate toast message
      if (isRealData) {
        toast.success(`✅ Generated ${data.ideas?.length || 0} keyword ideas from Google Ads API!`);
      } else {
        toast(`⚠️ Showing mock data: ${data.message || 'API unavailable'}`, {
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #F59E0B',
          },
        });
      }
    } catch (error: any) {
      console.error('Error generating ideas:', error);
      toast.error(error.message || 'Failed to generate keyword ideas');
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const toggleKeywordSelection = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const toggleAllKeywords = () => {
    const filtered = getFilteredAndSortedKeywords();
    if (selectedKeywords.length === filtered.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(filtered.map(k => k.text));
    }
  };

  const getFilteredAndSortedKeywords = () => {
    let filtered = keywordIdeas;

    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter(idea =>
        idea.text.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Apply competition filter
    if (competitionFilter !== 'ALL') {
      filtered = filtered.filter(idea => idea.competition === competitionFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'searches') {
        compareValue = a.avgMonthlySearches - b.avgMonthlySearches;
      } else if (sortBy === 'competition') {
        const compOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'UNSPECIFIED': 0 };
        compareValue = (compOrder[a.competition as keyof typeof compOrder] || 0) - 
                      (compOrder[b.competition as keyof typeof compOrder] || 0);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  };

  const handleSort = (column: 'searches' | 'competition') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const createKeywordPlan = async () => {
    if (!planName.trim()) {
      toast.error('Please enter a plan name');
      return;
    }
    
    if (selectedKeywords.length === 0) {
      toast.error('Please select at least one keyword');
      return;
    }

    setCreatingPlan(true);
    try {
      const response = await fetch('/api/kf2/create-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName,
          keywords: selectedKeywords,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create keyword plan');
      }

      toast.success('Keyword plan created successfully!');
      setPlanName('');
      setSelectedKeywords([]);
      setActiveTab('plans');
      await loadKeywordPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast.error(error.message || 'Failed to create keyword plan');
    } finally {
      setCreatingPlan(false);
    }
  };

  const loadKeywordPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch('/api/kf2/get-plans');
      const data = await response.json();
      
      if (response.ok) {
        setKeywordPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getForecast = async (planId: string) => {
    if (!planId) {
      toast.error('Please select a plan');
      return;
    }

    setLoadingForecast(true);
    setSelectedPlanForForecast(planId);
    setForecastDataSource(null); // Reset data source info
    
    try {
      const response = await fetch(`/api/kf2/get-forecast?planId=${planId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get forecast');
      }

      setForecasts(data.forecasts || []);
      setActiveTab('forecasts');
      
      // Track data source
      setForecastDataSource({
        isReal: data.isRealData || false,
        message: data.message || ''
      });
      
      // Show appropriate message based on data source
      if (data.isRealData) {
        toast.success('✅ Real-time forecast data from Google Ads API!');
      } else {
        toast(`⚠️ Showing mock data: ${data.message || 'API unavailable'}`, {
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #F59E0B',
          },
        });
      }
    } catch (error: any) {
      console.error('Error getting forecast:', error);
      toast.error(error.message || 'Failed to get forecast');
    } finally {
      setLoadingForecast(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Google Ads Manager</h1>
              <p className="text-gray-600 mt-1">
                Generate keyword ideas, create plans, and get forecasts using Google Ads API
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('ideas')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'ideas'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Generate Ideas</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'plans'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Target className="w-5 h-5" />
                <span>Keyword Plans</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('forecasts')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'forecasts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Forecasts</span>
              </div>
            </button>
          </div>
        </div>

        {/* Generate Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="space-y-6">
            {/* Domain Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Select Domain
              </label>
              
              {loadingDomains ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  <span className="ml-3 text-gray-600">Loading domains...</span>
                </div>
              ) : domains.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <p className="text-blue-900 mb-4">
                    No domains found. Please add a domain in the Domain Management section first.
                  </p>
                  <a
                    href="/dashboard/domains"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Go to Domain Management
                  </a>
                </div>
              ) : (
                <div className="flex gap-3">
                  <select
                    value={selectedDomainId}
                    onChange={(e) => setSelectedDomainId(e.target.value)}
                    className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
                    disabled={generatingIdeas}
                  >
                    <option value="">Select a domain...</option>
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.domain}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={generateKeywordIdeas}
                    disabled={generatingIdeas || !selectedDomainId}
                    className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 whitespace-nowrap"
                  >
                    {generatingIdeas ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Ideas
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Keyword Ideas Results */}
            {keywordIdeas.length > 0 && (
              <>
                {/* Data Source Warning Banner */}
                {ideasDataSource && !ideasDataSource.isReal && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 mb-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-amber-900 font-semibold mb-1">⚠️ Showing Mock Data</h3>
                        <p className="text-amber-800 text-sm">
                          {ideasDataSource.message || 'Unable to fetch live data from Google Ads API. The keyword ideas shown are simulated for demonstration purposes.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Banner for Real Data */}
                {ideasDataSource && ideasDataSource.isReal && (
                  <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 mb-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-green-900 font-semibold mb-1">✅ Live Data from Google Ads</h3>
                        <p className="text-green-800 text-sm">
                          These keyword ideas are real-time data from the Google Ads API.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-100 text-sm font-medium">Total Keywords</span>
                      <Target className="w-5 h-5 text-blue-200" />
                    </div>
                    <div className="text-3xl font-bold">{keywordIdeas.length}</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-100 text-sm font-medium">Avg. Searches</span>
                      <Search className="w-5 h-5 text-green-200" />
                    </div>
                    <div className="text-3xl font-bold">
                      {Math.round(keywordIdeas.reduce((sum, k) => sum + k.avgMonthlySearches, 0) / keywordIdeas.length).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-100 text-sm font-medium">Low Competition</span>
                      <TrendingDown className="w-5 h-5 text-purple-200" />
                    </div>
                    <div className="text-3xl font-bold">
                      {keywordIdeas.filter(k => k.competition === 'LOW').length}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Target className="w-6 h-6 text-blue-600" />
                      Keyword Ideas ({getFilteredAndSortedKeywords().length})
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Selected:</span>
                      <span className="px-3 py-1 bg-blue-600 text-white font-bold rounded-full">
                        {selectedKeywords.length}
                      </span>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Search keywords..."
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    
                    <select
                      value={competitionFilter}
                      onChange={(e) => setCompetitionFilter(e.target.value as any)}
                      className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium bg-white"
                    >
                      <option value="ALL">All Competition</option>
                      <option value="LOW">Low Competition</option>
                      <option value="MEDIUM">Medium Competition</option>
                      <option value="HIGH">High Competition</option>
                    </select>

                    <button
                      onClick={() => {
                        setSearchFilter('');
                        setCompetitionFilter('ALL');
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Create Plan Section - Now Above Table */}
                {selectedKeywords.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-green-600" />
                      Create Keyword Plan ({selectedKeywords.length} selected)
                    </h4>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder="Enter plan name..."
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      />
                      <button
                        onClick={createKeywordPlan}
                        disabled={creatingPlan || !planName.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg hover:shadow-green-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 whitespace-nowrap"
                      >
                        {creatingPlan ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5" />
                            Create Plan
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Scrollable Table Container */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={selectedKeywords.length === getFilteredAndSortedKeywords().length && getFilteredAndSortedKeywords().length > 0}
                            onChange={toggleAllKeywords}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4 text-left">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Keyword
                          </span>
                        </th>
                        <th 
                          className="px-6 py-4 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('searches')}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Avg Monthly Searches
                            </span>
                            {sortBy === 'searches' && (
                              <span className="text-blue-600">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('competition')}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Competition
                            </span>
                            {sortBy === 'competition' && (
                              <span className="text-blue-600">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredAndSortedKeywords().map((idea, index) => (
                        <tr
                          key={index}
                          onClick={() => toggleKeywordSelection(idea.text)}
                          className={`cursor-pointer transition-all hover:bg-blue-50/50 ${
                            selectedKeywords.includes(idea.text) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedKeywords.includes(idea.text)}
                              onChange={() => {}}
                              className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                              {idea.text}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Search className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-gray-900">
                                {idea.avgMonthlySearches.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              idea.competition === 'LOW' 
                                ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20' :
                              idea.competition === 'MEDIUM' 
                                ? 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-600/20' :
                              idea.competition === 'HIGH'
                                ? 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
                                : 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20'
                            }`}>
                              {idea.competition}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* No Results */}
                  {getFilteredAndSortedKeywords().length === 0 && (
                    <div className="p-12 text-center">
                      <div className="text-gray-400 mb-2">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      </div>
                      <p className="text-gray-600 font-medium">No keywords match your filters</p>
                      <button
                        onClick={() => {
                          setSearchFilter('');
                          setCompetitionFilter('ALL');
                        }}
                        className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
              </div>
              </>
            )}

            {/* Empty State */}
            {keywordIdeas.length === 0 && !generatingIdeas && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/10">
                    <Sparkles className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Generate Keyword Ideas
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Enter a website URL to get keyword suggestions from Google Ads API
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keyword Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {loadingPlans ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
                <div className="text-center">
                  <svg className="w-14 h-14 animate-spin text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  <p className="text-gray-600 font-medium">Loading plans...</p>
                </div>
              </div>
            ) : keywordPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {keywordPlans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {plan.keywords.length}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {plan.keywords.slice(0, 3).map((keyword, idx) => (
                        <div key={idx} className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                          {keyword}
                        </div>
                      ))}
                      {plan.keywords.length > 3 && (
                        <div className="text-sm text-gray-500 text-center">
                          +{plan.keywords.length - 3} more keywords
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => getForecast(plan.id)}
                      disabled={loadingForecast}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-5 h-5" />
                      Get Forecast
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/10">
                    <Target className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No Keyword Plans Yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Create your first keyword plan by generating ideas and selecting keywords
                  </p>
                  <button
                    onClick={() => setActiveTab('ideas')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all font-semibold inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Ideas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Forecasts Tab */}
        {activeTab === 'forecasts' && (
          <div className="space-y-6">
            {forecasts.length > 0 ? (
              <>
                {/* Data Source Warning Banner */}
                {forecastDataSource && !forecastDataSource.isReal && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-amber-900 font-semibold mb-1">⚠️ Showing Mock Forecast Data</h3>
                        <p className="text-amber-800 text-sm">
                          {forecastDataSource.message || 'Unable to fetch live forecast data from Google Ads API. The forecast metrics shown are simulated estimates for demonstration purposes.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Banner for Real Data */}
                {forecastDataSource && forecastDataSource.isReal && (
                  <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-green-900 font-semibold mb-1">✅ Live Forecast Data from Google Ads</h3>
                        <p className="text-green-800 text-sm">
                          These forecasts are based on real-time data from the Google Ads API using historical metrics.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-7 h-7 text-blue-600" />
                  Keyword Forecasts
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-bold text-gray-700">Keyword</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">Impressions</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">Clicks</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">CTR</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">Avg CPC</th>
                        <th className="text-right py-3 px-4 font-bold text-gray-700">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecasts.map((forecast, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{forecast.keyword}</td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {forecast.impressions.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {forecast.clicks.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {(forecast.ctr * 100).toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            ${forecast.avgCpc.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-600">
                            ${forecast.cost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">
                      {forecasts.reduce((sum, f) => sum + f.impressions, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Total Impressions</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">
                      {forecasts.reduce((sum, f) => sum + f.clicks, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Total Clicks</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600">
                      {((forecasts.reduce((sum, f) => sum + f.clicks, 0) / 
                         forecasts.reduce((sum, f) => sum + f.impressions, 0)) * 100).toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Avg CTR</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl">
                    <div className="text-2xl font-bold text-orange-600">
                      ${forecasts.reduce((sum, f) => sum + f.cost, 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 font-medium mt-1">Total Cost</div>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/10">
                    <TrendingUp className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No Forecast Data
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Select a keyword plan to view forecast metrics
                  </p>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all font-semibold inline-flex items-center gap-2"
                  >
                    <Target className="w-5 h-5" />
                    View Plans
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

