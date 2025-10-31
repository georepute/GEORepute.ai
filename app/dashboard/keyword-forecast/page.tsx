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
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";

export default function KeywordForecastPage() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      console.error("Forecast error:", error);
      toast.error("Forecast generation failed");
    } finally {
      setLoading(false);
    }
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
            <div className="space-y-4">
              {forecasts.map((forecast, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {forecast.keyword}
                        </h3>
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${getDifficultyColor(
                            forecast.difficulty
                          )}`}
                        >
                          <Target className="w-3 h-3" />
                          {forecast.difficulty?.toUpperCase() || "UNKNOWN"} Difficulty
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

                    {/* Difficulty & Trend Info */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Difficulty:</span>
                        <span
                          className={`font-semibold capitalize`}
                        >
                          {forecast.difficulty || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Trend:</span>
                        <span className={`font-semibold capitalize ${getTrendColor(forecast.trend)}`}>
                          {forecast.trend || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg p-4 border border-primary-200">
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

