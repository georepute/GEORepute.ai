"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  Target,
  Plus,
  Filter,
  Download,
  BarChart3,
  Eye,
  DollarSign,
  RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

interface KeywordData {
  keyword_id: string;
  keyword_text: string;
  ranking_score: number | null;
  search_volume: number;
  difficulty: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function Keywords() {
  const { isRtl, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch keywords from API
  const fetchKeywords = async () => {
    try {
      const response = await fetch('/api/keywords');
      if (!response.ok) {
        throw new Error('Failed to fetch keywords');
      }
      const { data } = await response.json();
      setKeywords(data || []);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast.error('Failed to load keywords');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchKeywords();
    toast.success('Keywords refreshed');
  };


  // Filter keywords based on search term
  const filteredKeywords = keywords.filter((kw) =>
    kw.keyword_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: keywords.length,
    improvements: keywords.filter(kw => kw.ranking_score && kw.ranking_score <= 10).length,
    avgVisibility: keywords.length > 0 
      ? Math.round(keywords.filter(kw => kw.ranking_score && kw.ranking_score <= 100).length / keywords.length * 100)
      : 0,
    totalValue: keywords.reduce((sum, kw) => sum + (kw.search_volume || 0), 0),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.dashboard.keywords.title}</h1>
        <p className="text-gray-600">{t.dashboard.keywords.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-gray-600">{t.dashboard.keywords.keywordsTracked}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.improvements}</span>
          </div>
          <p className="text-gray-600">{t.dashboard.keywords.top10Rankings}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.avgVisibility}%</span>
          </div>
          <p className="text-gray-600">{t.dashboard.keywords.avgVisibility}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">
              {(stats.totalValue / 1000).toFixed(0)}K
            </span>
          </div>
          <p className="text-gray-600">{t.dashboard.keywords.totalSearchVolume}</p>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t.dashboard.keywords.searchKeywords}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all`}
            />
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t.dashboard.common.refresh}</span>
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">{t.dashboard.common.filter}</span>
            </button>
            <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">{t.dashboard.common.export}</span>
            </button>
            <button className="px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t.dashboard.keywords.addKeyword}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Keywords Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t.dashboard.common.loading}</p>
          </div>
        ) : filteredKeywords.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {searchTerm ? t.dashboard.common.noData : t.dashboard.keywords.noKeywords}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-6 text-sm font-semibold text-gray-600`}>{t.dashboard.keywords.keyword}</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">{t.dashboard.common.score}</th>
                  <th className={`${isRtl ? 'text-left' : 'text-right'} py-4 px-6 text-sm font-semibold text-gray-600`}>{t.dashboard.keywords.volume}</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">{t.dashboard.keywords.difficulty}</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">{t.dashboard.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((item, index) => (
                  <motion.tr
                    key={item.keyword_id}
                    initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{item.keyword_text}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {item.ranking_score ? (
                        <span className="inline-flex items-center justify-center min-w-[32px] h-8 bg-primary-100 text-primary-700 rounded-full font-bold text-sm px-2">
                          {item.ranking_score}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className={`py-4 px-6 ${isRtl ? 'text-left' : 'text-right'} text-gray-900 font-medium`}>
                      {item.search_volume?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                            style={{ width: `${item.difficulty}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{item.difficulty}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                        {t.dashboard.common.details}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* AI Insights */}
      {filteredKeywords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Tracking Status</h3>
              <p className="text-gray-700 leading-relaxed">
                You are currently tracking <span className="font-semibold">{filteredKeywords.length}</span> keyword(s). 
                {filteredKeywords.filter(kw => kw.ranking_score && kw.ranking_score <= 10).length > 0 ? (
                  <>
                    {' '}<span className="font-semibold">{filteredKeywords.filter(kw => kw.ranking_score && kw.ranking_score <= 10).length}</span> keyword(s) are ranking in the top 10.
                  </>
                ) : (
                  ' Rankings will appear here once position data is available.'
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

