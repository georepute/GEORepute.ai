"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Search,
  Target,
  DollarSign,
  BarChart3,
  Zap,
  AlertCircle,
  Plus,
  X,
  Gauge,
  TrendingDown,
  Activity,
  Award,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface KeywordScore {
  keyword: string;
  overallScore: number;
  priority: "critical" | "high" | "medium" | "low";
  breakdown: {
    searchVolumeScore: number;
    difficultyScore: number;
    competitionScore: number;
    roiScore: number;
    rankingPotentialScore: number;
    trendScore: number;
    geoStrategyScore: number;
    historicalPerformanceScore: number;
  };
  weightedFactors: Array<{
    factor: string;
    weight: number;
    score: number;
    contribution: number;
  }>;
  recommendations: string[];
  geoStrategyAlignment: number;
  historicalComparison?: {
    previousScore?: number;
    scoreChange?: number;
    trend?: "improving" | "declining" | "stable";
  };
  reasoning: string;
}

export default function KeywordForecastPage() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [keywordScores, setKeywordScores] = useState<Record<string, KeywordScore>>({});
  const [loading, setLoading] = useState(false);
  const [scoringKeywords, setScoringKeywords] = useState<Set<string>>(new Set());

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    if (keywords.includes(trimmed)) {
      toast.error("Keyword already added");
      return;
    }
    setKeywords([...keywords, trimmed]);
    setKeywordInput("");
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const runForecasts = async () => {
    if (keywords.length === 0) {
      toast.error("Please add at least one keyword");
      return;
    }

    setLoading(true);
    try {
      // REAL AI Forecast Generation using OpenAI GPT-4 Turbo
      const response = await fetch('/api/geo-core/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywords,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate forecasts');
      }

      const data = await response.json();

      setForecasts(data.forecasts);
      toast.success(`Forecasts generated! ${keywords.length} keyword(s) are now being tracked.`);
      
      // Generate advanced scores for each keyword
      await generateScoresForKeywords(data.forecasts);
    } catch (error) {
      console.error("Forecast error:", error);
      toast.error("Forecast generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateScoresForKeywords = async (forecasts: any[]) => {
    const newScores: Record<string, KeywordScore> = {};
    const scoringSet = new Set<string>();
    
    for (const forecast of forecasts) {
      scoringSet.add(forecast.keyword);
      
      try {
        const scoreResponse = await fetch('/api/geo-core/keyword-score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword: forecast.keyword,
            searchVolume: forecast.searchVolume,
            difficulty: forecast.difficulty,
            competition: forecast.competition,
            currentRanking: forecast.predictedRanking,
          }),
        });

        if (scoreResponse.ok) {
          const scoreData = await scoreResponse.json();
          newScores[forecast.keyword] = scoreData;
        }
      } catch (error) {
        console.error(`Error scoring keyword ${forecast.keyword}:`, error);
      }
    }
    
    setKeywordScores(newScores);
    setScoringKeywords(scoringSet);
  };

  const getScoreForKeyword = (keyword: string): KeywordScore | null => {
    return keywordScores[keyword] || null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 65) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "hard":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCompetitionColor = (comp: string) => {
    switch (comp?.toLowerCase()) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case "rising":
        return "text-green-600";
      case "stable":
        return "text-blue-600";
      case "declining":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Keyword ROI Forecasts
            </h1>
            <p className="text-gray-600 mt-1">
              AI-powered predictions for keyword performance and revenue potential
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">AI Forecasting Engine</span>: Uses GPT-4 Turbo to analyze search trends, competition, and your site's potential to predict ROI, traffic, and ranking outcomes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Input Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary-600" />
              Add Keywords
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter keyword or phrase
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                    placeholder="e.g., local seo"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <Button onClick={addKeyword} variant="outline" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Keywords List */}
              {keywords.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    Keywords ({keywords.length})
                  </div>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {keywords.map((keyword) => (
                      <div
                        key={keyword}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-gray-900">{keyword}</span>
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={runForecasts}
                disabled={loading || keywords.length === 0}
                variant="primary"
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Forecasts
                  </>
                )}
              </Button>
            </div>

            {/* Stats */}
            {forecasts.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-900">
                      {
                        forecasts.filter((f) =>
                          f.difficulty?.toLowerCase() === "easy"
                        ).length
                      }
                    </div>
                    <div className="text-xs text-green-700">Easy Keywords</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-900">
                      {
                        forecasts.filter((f) =>
                          f.trend?.toLowerCase() === "rising"
                        ).length
                      }
                    </div>
                    <div className="text-xs text-blue-700">Rising Trends</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Forecast Results */}
        <div className="lg:col-span-2">
          {forecasts.length === 0 && !loading && (
            <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Add keywords and run forecasts
              </p>
              <p className="text-sm text-gray-500">
                AI will analyze each keyword and predict its ROI potential
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">
                AI analyzing keywords...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This may take a few seconds
              </p>
            </div>
          )}

          {forecasts.length > 0 && !loading && (
            <div className="space-y-6">
              {forecasts.map((forecast, idx) => {
                const score = getScoreForKeyword(forecast.keyword);
                const hasScore = score !== null;

                // Prepare radar chart data
                const radarData = hasScore ? [
                  { factor: "Volume", score: score.breakdown.searchVolumeScore, fullMark: 100 },
                  { factor: "Difficulty", score: score.breakdown.difficultyScore, fullMark: 100 },
                  { factor: "Competition", score: score.breakdown.competitionScore, fullMark: 100 },
                  { factor: "ROI", score: score.breakdown.roiScore, fullMark: 100 },
                  { factor: "Ranking", score: score.breakdown.rankingPotentialScore, fullMark: 100 },
                  { factor: "Trend", score: score.breakdown.trendScore, fullMark: 100 },
                  { factor: "GEO Strategy", score: score.breakdown.geoStrategyScore, fullMark: 100 },
                  { factor: "History", score: score.breakdown.historicalPerformanceScore, fullMark: 100 },
                ] : [];

                // Prepare weighted factors bar chart data
                const barData = hasScore ? score.weightedFactors
                  .sort((a, b) => b.contribution - a.contribution)
                  .slice(0, 6)
                  .map(f => ({
                    name: f.factor.length > 15 ? f.factor.substring(0, 15) + '...' : f.factor,
                    contribution: Math.round(f.contribution * 10) / 10,
                    score: f.score,
                  })) : [];

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-4"
                  >
                    {/* Forecast Card */}
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {forecast.keyword}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${getDifficultyColor(
                                forecast.difficulty
                              )}`}
                            >
                              <Target className="w-3 h-3" />
                              {forecast.difficulty?.toUpperCase() || "UNKNOWN"} Difficulty
                            </div>
                            {hasScore && (
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${getPriorityColor(
                                  score.priority
                                )}`}
                              >
                                <Award className="w-3 h-3" />
                                {score.priority.toUpperCase()} Priority
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-2xl font-bold ${getTrendColor(
                              forecast.trend
                            )}`}
                          >
                            {forecast.trend?.toUpperCase() || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Trend
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-blue-600 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs font-medium">Est. Traffic</span>
                          </div>
                          <div className="text-lg font-bold text-blue-900">
                            {forecast.estimatedTraffic || "N/A"}
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-purple-600 mb-1">
                            <BarChart3 className="w-3 h-3" />
                            <span className="text-xs font-medium">
                              Competition
                            </span>
                          </div>
                          <div className={`text-lg font-bold capitalize ${getCompetitionColor(forecast.competition)}`}>
                            {forecast.competition || "N/A"}
                          </div>
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg p-4 border border-primary-200 mb-4">
                        <div className="flex items-start gap-2">
                          <Zap className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-semibold text-primary-900 mb-1">
                              AI Analysis
                            </div>
                            <p className="text-sm text-gray-700">
                              {forecast.reasoning}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Advanced Scoring Diagrams */}
                    {hasScore && (
                      <Card className="p-6">
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Gauge className="w-5 h-5 text-primary-600" />
                            <h4 className="text-lg font-bold text-gray-900">
                              Advanced Keyword Scoring
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            Multi-factor analysis with weighted scoring and GEO strategy alignment
                          </p>
                        </div>

                        {/* Overall Score Gauge */}
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                          {/* Overall Score */}
                          <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-6 border border-primary-200">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-600 mb-2">
                                Overall Score
                              </div>
                              <div className={`text-5xl font-bold mb-2 ${getScoreColor(score.overallScore)}`}>
                                {score.overallScore}
                              </div>
                              <div className="text-xs text-gray-500">out of 100</div>
                              {/* Circular Progress Indicator */}
                              <div className="mt-4 relative w-24 h-24 mx-auto">
                                <svg className="transform -rotate-90 w-24 h-24">
                                  <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-gray-200"
                                  />
                                  <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - score.overallScore / 100)}`}
                                    className={getScoreColor(score.overallScore)}
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Priority & GEO Alignment */}
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="text-xs font-medium text-gray-600 mb-1">
                                Priority Level
                              </div>
                              <div className={`text-xl font-bold ${getScoreColor(score.overallScore)}`}>
                                {score.priority.toUpperCase()}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="text-xs font-medium text-gray-600 mb-1">
                                GEO Alignment
                              </div>
                              <div className="text-xl font-bold text-primary-600">
                                {score.geoStrategyAlignment}%
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                                  style={{ width: `${score.geoStrategyAlignment}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Historical Comparison */}
                          {score.historicalComparison && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="text-xs font-medium text-gray-600 mb-2">
                                Historical Trend
                              </div>
                              <div className="flex items-center gap-2">
                                {score.historicalComparison.previousScore && (
                                  <div className="text-sm text-gray-500">
                                    {score.historicalComparison.previousScore}
                                  </div>
                                )}
                                <div className="flex-1">
                                  {score.historicalComparison.trend === "improving" && (
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                  )}
                                  {score.historicalComparison.trend === "declining" && (
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                  )}
                                  {score.historicalComparison.trend === "stable" && (
                                    <Activity className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                                {score.historicalComparison.scoreChange !== undefined && (
                                  <div className={`text-sm font-semibold ${
                                    score.historicalComparison.scoreChange > 0 ? 'text-green-600' : 
                                    score.historicalComparison.scoreChange < 0 ? 'text-red-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {score.historicalComparison.scoreChange > 0 ? '+' : ''}
                                    {score.historicalComparison.scoreChange}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {score.historicalComparison.trend}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Radar Chart - Factor Breakdown */}
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-gray-900 mb-4">
                            Factor Breakdown (Radar Chart)
                          </h5>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <ResponsiveContainer width="100%" height={300}>
                              <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis
                                  dataKey="factor"
                                  tick={{ fontSize: 11, fill: '#6b7280' }}
                                />
                                <PolarRadiusAxis
                                  angle={90}
                                  domain={[0, 100]}
                                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                                />
                                <Radar
                                  name="Score"
                                  dataKey="score"
                                  stroke="#3b82f6"
                                  fill="#3b82f6"
                                  fillOpacity={0.6}
                                  strokeWidth={2}
                                />
                                <Tooltip />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Weighted Factors Bar Chart */}
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-gray-900 mb-4">
                            Top Weighted Factors (Contribution)
                          </h5>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fontSize: 11, fill: '#6b7280' }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis
                                  tick={{ fontSize: 11, fill: '#6b7280' }}
                                  label={{ value: 'Contribution', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                  formatter={(value: any) => [`${value} points`, 'Contribution']}
                                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                <Bar dataKey="contribution" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                  {barData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        entry.contribution >= 15
                                          ? '#10b981'
                                          : entry.contribution >= 10
                                          ? '#3b82f6'
                                          : entry.contribution >= 5
                                          ? '#f59e0b'
                                          : '#ef4444'
                                      }
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {score.recommendations.length > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-start gap-2 mb-2">
                              <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-semibold text-blue-900 mb-2">
                                  AI Recommendations
                                </div>
                                <ul className="space-y-1">
                                  {score.recommendations.slice(0, 4).map((rec, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                      <span className="text-blue-600 mt-1">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

