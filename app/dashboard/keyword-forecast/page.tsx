'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase/client';
// Icons replaced with inline SVGs

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

export default function KeywordForecastPage() {
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
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);
  
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

  // Load keyword plans whenever the plans or forecasts tab is active
  useEffect(() => {
    if (activeTab === 'plans' || activeTab === 'forecasts') {
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
      const response = await fetch('/api/keyword-forecast/generate-ideas', {
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
        toast.success(`Generated ${data.ideas?.length || 0} keyword ideas.`);
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
      const response = await fetch('/api/keyword-forecast/create-plan', {
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
      setActiveTab('plans'); // This will trigger the useEffect to reload plans
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
      const response = await fetch('/api/keyword-forecast/get-plans');
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
      // First check if the plan has cached forecast data
      const planWithForecast = keywordPlans.find(p => p.id === planId);
      
      if (planWithForecast?.forecast && Array.isArray(planWithForecast.forecast) && planWithForecast.forecast.length > 0) {
        // Use cached forecast data
        setForecasts(planWithForecast.forecast);
        setActiveTab('forecasts');
        setForecastDataSource({
          isReal: false,
          message: 'Showing previously generated forecast data from cache'
        });
        toast.success('✅ Loaded cached forecast data');
        setLoadingForecast(false);
        return;
      }

      // Otherwise fetch new forecast data
      const response = await fetch(`/api/keyword-forecast/get-forecast?planId=${planId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get forecast');
      }

      setForecasts(data.forecasts || []);
      setActiveTab('forecasts');
      
      // Reload plans to get the updated forecast data
      await loadKeywordPlans();
      
      // Track data source
      setForecastDataSource({
        isReal: data.isRealData || false,
        message: data.message || ''
      });
      
      // Show appropriate message based on data source
      if (data.isRealData) {
        toast.success('Real-time forecast data');
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

  const openDeleteModal = (planId: string, planName: string) => {
    setPlanToDelete({ id: planId, name: planName });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPlanToDelete(null);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;

    const planId = planToDelete.id;
    setDeletingPlanId(planId);
    
    try {
      const response = await fetch(`/api/keyword-forecast/delete-plan?planId=${planId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete keyword plan');
      }

      toast.success('Keyword plan deleted successfully!');
      await loadKeywordPlans();
      
      // Clear forecasts if the deleted plan was selected
      if (selectedPlanForForecast === planId) {
        setForecasts([]);
        setForecastDataSource(null);
      }
      
      closeDeleteModal();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error(error.message || 'Failed to delete keyword plan');
    } finally {
      setDeletingPlanId(null);
    }
  };

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
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Keyword Forecast
                </h1>
                <p className="text-gray-600 mt-1.5 text-sm">
                  Generate keyword ideas, create plans, and get forecasts using Google Ads API
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">System Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200/80">
            <button
              onClick={() => setActiveTab('ideas')}
              className={`group flex-1 px-6 py-5 font-semibold transition-all relative ${
                activeTab === 'ideas'
                  ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
              }`}
            >
              {activeTab === 'ideas' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              )}
              <div className="flex items-center justify-center gap-2.5">
                <div className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === 'ideas' 
                    ? 'bg-blue-100' 
                    : 'group-hover:bg-gray-100'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-base">Generate Ideas</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`group flex-1 px-6 py-5 font-semibold transition-all relative ${
                activeTab === 'plans'
                  ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
              }`}
            >
              {activeTab === 'plans' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              )}
              <div className="flex items-center justify-center gap-2.5">
                <div className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === 'plans' 
                    ? 'bg-blue-100' 
                    : 'group-hover:bg-gray-100'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <span className="text-base">Keyword Plans</span>
                {keywordPlans.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                    {keywordPlans.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('forecasts')}
              className={`group flex-1 px-6 py-5 font-semibold transition-all relative ${
                activeTab === 'forecasts'
                  ? 'text-blue-600 bg-gradient-to-br from-blue-50 to-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
              }`}
            >
              {activeTab === 'forecasts' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              )}
              <div className="flex items-center justify-center gap-2.5">
                <div className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === 'forecasts' 
                    ? 'bg-blue-100' 
                    : 'group-hover:bg-gray-100'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-base">Forecasts</span>
                {forecasts.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded-full">
                    {forecasts.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Generate Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="space-y-6">
            {/* Domain Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8">
              <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                Select Domain
              </label>
              
              {loadingDomains ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="w-10 h-10 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  <span className="ml-3 text-gray-600 font-medium">Loading domains...</span>
                </div>
              ) : domains.length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <p className="text-blue-900 mb-4 font-medium">
                    No domains found. Please add a domain in the Domain Management section first.
                  </p>
                  <a
                    href="/dashboard/domains"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Go to Domain Management
                  </a>
                </div>
              ) : (
                <div className="flex gap-4">
                  <select
                    value={selectedDomainId}
                    onChange={(e) => setSelectedDomainId(e.target.value)}
                    className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-medium text-gray-900 shadow-sm hover:border-gray-400"
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
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white rounded-xl hover:shadow-xl hover:shadow-blue-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-3 whitespace-nowrap shadow-lg"
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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
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
                {/* Data Source Warning Banner - Only show for mock data */}
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
                          {ideasDataSource.message || 'Unable to fetch live data. The keyword ideas shown are simulated for demonstration purposes.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
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
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                        </svg>
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

                {/* Create Plan Section - Always Show */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Keyword Plan {selectedKeywords.length > 0 && `(${selectedKeywords.length} selected)`}
                  </h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="Enter plan name..."
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                    />
                    <div className="relative group">
                      <button
                        onClick={createKeywordPlan}
                        disabled={creatingPlan || !planName.trim() || selectedKeywords.length < 1}
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
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Create Plan
                          </>
                        )}
                      </button>
                      {/* Tooltip */}
                      {selectedKeywords.length < 1 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Select keywords to create a plan
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                              </svg>
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
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                        </svg>
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
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Generate Keyword Ideas
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Enter a website URL to get keyword suggestions.
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
              <>
                {/* Plans Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b-2 border-gray-200">
                          <th className="text-left py-5 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                              </svg>
                              Plan Name
                            </div>
                          </th>
                          <th className="text-center py-5 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                              </svg>
                              Keywords
                            </div>
                          </th>
                          <th className="text-left py-5 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Preview
                            </div>
                          </th>
                          <th className="text-center py-5 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Created
                            </div>
                          </th>
                          <th className="text-center py-5 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywordPlans.map((plan, index) => (
                          <tr 
                            key={plan.id} 
                            className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 transition-all group"
                          >
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="6" />
                                    <circle cx="12" cy="12" r="2" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-base">{plan.name}</div>
                                  <div className="text-xs text-gray-500 font-medium">Plan #{index + 1}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-center">
                              <span className="text-2xl font-bold text-blue-600">{plan.keywords.length}</span>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex flex-wrap gap-2 max-w-md">
                                {plan.keywords.slice(0, 3).map((keyword, idx) => (
                                  <span 
                                    key={idx} 
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 border border-gray-200 transition-all font-medium group-hover:border-blue-300"
                                  >
                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                      <circle cx="11" cy="11" r="8" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                                    </svg>
                                    {keyword}
                                  </span>
                                ))}
                                {plan.keywords.length > 3 && (
                                  <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg text-xs text-blue-700 font-bold border border-blue-200">
                                    +{plan.keywords.length - 3} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-5 px-6 text-center">
                              <div className="text-sm text-gray-900 font-semibold">
                                {new Date(plan.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </div>
                              <div className="text-xs text-gray-500 font-medium mt-0.5">
                                {new Date(plan.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => getForecast(plan.id)}
                                  disabled={loadingForecast}
                                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-2 text-sm relative"
                                >
                                  {loadingForecast ? (
                                    <>
                                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                                        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                                      </svg>
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      {plan.forecast ? 'View Forecast' : 'Get Forecast'}
                                      {plan.forecast && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white"></span>
                                      )}
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => openDeleteModal(plan.id, plan.name)}
                                  disabled={deletingPlanId === plan.id}
                                  className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-2 text-sm"
                                  title="Delete plan"
                                >
                                  {deletingPlanId === plan.id ? (
                                    <>
                                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                                        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                                      </svg>
                                    </>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/10">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
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
            {/* Plan Selection Dropdown */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8">
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2 uppercase tracking-wide">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  Select Plan to View Forecast
                </label>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
                  </svg>
                  Plans with <span className="font-bold text-green-600">✓</span> have forecast data. Plans with <span className="font-bold text-red-600">✗</span> need forecast generation.
                </p>
              </div>
              
              {keywordPlans.length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <p className="text-blue-900 mb-4 font-medium">
                    No keyword plans found. Create a plan first to view forecasts.
                  </p>
                  <button
                    onClick={() => setActiveTab('ideas')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Ideas
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <select
                    value={selectedPlanForForecast}
                    onChange={(e) => {
                      const planId = e.target.value;
                      if (planId) {
                        // Find the selected plan
                        const selectedPlan = keywordPlans.find(p => p.id === planId);
                        
                        // Check if plan has forecast data
                        if (selectedPlan?.forecast && Array.isArray(selectedPlan.forecast) && selectedPlan.forecast.length > 0) {
                          // Plan has cached forecast, display it
                          setSelectedPlanForForecast(planId);
                          setForecasts(selectedPlan.forecast);
                          setForecastDataSource({
                            isReal: false,
                            message: 'Showing previously generated forecast data from cache'
                          });
                          toast.success('✅ Loaded cached forecast data');
                        } else {
                          // Plan doesn't have forecast, prompt user to generate it
                          toast.error('This plan does not have forecast data. Please generate forecast from the Plans tab.', {
                            duration: 4000,
                          });
                          // Redirect to plans tab after a short delay
                          setTimeout(() => {
                            setActiveTab('plans');
                          }, 1500);
                        }
                      } else {
                        setSelectedPlanForForecast('');
                        setForecasts([]);
                        setForecastDataSource(null);
                      }
                    }}
                    className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-medium text-gray-900 shadow-sm hover:border-gray-400"
                    disabled={loadingForecast}
                  >
                    <option value="">Select a plan...</option>
                    {keywordPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.keywords.length} keywords)
                        {plan.forecast && Array.isArray(plan.forecast) && plan.forecast.length > 0 ? ' ✓' : ' ✗'}
                      </option>
                    ))}
                  </select>
                  {selectedPlanForForecast && (
                    <button
                      onClick={() => {
                        setSelectedPlanForForecast('');
                        setForecasts([]);
                        setForecastDataSource(null);
                      }}
                      className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all font-semibold flex items-center gap-2"
                      title="Clear selection"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {forecasts.length > 0 && (
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 overflow-hidden">
                  <div className="p-6 border-b border-gray-200/80 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      Keyword Forecasts
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border-b-2 border-gray-200">
                        <th className="text-left py-4 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">Keyword</th>
                        <th className="text-right py-4 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">Impressions</th>
                        <th className="text-right py-4 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">Clicks</th>
                        <th className="text-right py-4 px-6 font-bold text-gray-700 uppercase text-xs tracking-wider">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecasts.map((forecast, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 group-hover:bg-blue-100 rounded-lg transition-colors">
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <circle cx="11" cy="11" r="8" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                                </svg>
                              </div>
                              <span className="font-semibold text-gray-900">{forecast.keyword}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-bold text-gray-900">
                              {forecast.impressions.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-bold text-gray-900">
                              {forecast.clicks.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-lg font-bold text-sm border border-green-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {(forecast.ctr * 100).toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delete Keyword Plan</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the keyword plan:
              </p>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-bold text-gray-900">{planToDelete?.name}</p>
              </div>
              <p className="text-sm text-red-600 mt-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                All associated data and forecasts will be permanently deleted
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deletingPlanId !== null}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePlan}
                disabled={deletingPlanId !== null}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingPlanId ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Plan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

