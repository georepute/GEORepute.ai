"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Star,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Download,
  ExternalLink,
} from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import toast from "react-hot-toast";

interface Review {
  id: string;
  platform: "Google" | "Yelp" | "Facebook" | "TripAdvisor";
  author: string;
  rating: number;
  text: string;
  date: string;
  sentiment: "positive" | "negative" | "neutral";
  responded: boolean;
  flagged: boolean;
}

interface Screenshot {
  id: string;
  platform: string;
  url: string;
  capturedAt: Date;
  thumbnail: string;
}

export default function ReputationPage() {
  const [activeTab, setActiveTab] = useState<"reviews" | "mentions" | "screenshots">("reviews");
  const [scanningReviews, setScanningReviews] = useState(false);

  const [overallStats] = useState({
    avgRating: 4.6,
    totalReviews: 284,
    positiveChange: 8,
    responseRate: 92,
    sentimentScore: 87,
  });

  const [reviews, setReviews] = useState<Review[]>([
    {
      id: "1",
      platform: "Google",
      author: "Sarah Johnson",
      rating: 5,
      text: "Excellent service! They really helped improve our local visibility. Highly recommend to any small business owner.",
      date: "2 days ago",
      sentiment: "positive",
      responded: true,
      flagged: false,
    },
    {
      id: "2",
      platform: "Yelp",
      author: "Mike Chen",
      rating: 2,
      text: "Response time was slower than expected. Results were okay but not great.",
      date: "5 days ago",
      sentiment: "negative",
      responded: false,
      flagged: true,
    },
    {
      id: "3",
      platform: "Facebook",
      author: "Jennifer Adams",
      rating: 4,
      text: "Good overall experience. The team was professional and knowledgeable about SEO strategies.",
      date: "1 week ago",
      sentiment: "positive",
      responded: true,
      flagged: false,
    },
  ]);

  const [screenshots] = useState<Screenshot[]>([
    {
      id: "1",
      platform: "Google Search",
      url: "https://google.com/search?q=local+seo+services",
      capturedAt: new Date(),
      thumbnail: "/placeholder-screenshot.jpg",
    },
    {
      id: "2",
      platform: "Google Maps",
      url: "https://maps.google.com",
      capturedAt: new Date(),
      thumbnail: "/placeholder-screenshot.jpg",
    },
  ]);

  const scanNewReviews = async () => {
    setScanningReviews(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Scan complete! 3 new reviews found");
    } catch (error) {
      toast.error("Scan failed");
    } finally {
      setScanningReviews(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 border-green-300";
      case "negative":
        return "bg-red-100 text-red-800 border-red-300";
      case "neutral":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    switch (platform) {
      case "Google":
        return <span className={`${iconClass} text-blue-600`}>🔵</span>;
      case "Yelp":
        return <span className={`${iconClass} text-red-600`}>🔴</span>;
      case "Facebook":
        return <span className={`${iconClass} text-blue-700`}>📘</span>;
      case "TripAdvisor":
        return <span className={`${iconClass} text-green-600`}>🦉</span>;
      default:
        return <span className={iconClass}>⭐</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Reputation Monitor
              </h1>
              <p className="text-gray-600 mt-1">
                Reviews, mentions, and automated screenshots
              </p>
            </div>
          </div>

          <Button
            onClick={scanNewReviews}
            disabled={scanningReviews}
            variant="primary"
            size="sm"
          >
            {scanningReviews ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Scanning...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Scan Now
              </>
            )}
          </Button>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Auto-monitoring</span>: Tracks
              reviews across Google, Yelp, Facebook, and TripAdvisor. Captures
              screenshots of your rankings and listings for proof/reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                overallStats.positiveChange >= 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {overallStats.positiveChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(overallStats.positiveChange)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {overallStats.avgRating}
          </div>
          <div className="text-sm text-gray-600">Avg. Rating</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {overallStats.totalReviews}
          </div>
          <div className="text-sm text-gray-600">Total Reviews</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {overallStats.responseRate}%
          </div>
          <div className="text-sm text-gray-600">Response Rate</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-secondary-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {overallStats.sentimentScore}
          </div>
          <div className="text-sm text-gray-600">Sentiment Score</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {reviews.filter((r) => r.flagged).length}
          </div>
          <div className="text-sm text-gray-600">Flagged</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("reviews")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "reviews"
              ? "border-b-2 border-amber-500 text-amber-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Reviews
        </button>
        <button
          onClick={() => setActiveTab("mentions")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "mentions"
              ? "border-b-2 border-amber-500 text-amber-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mentions
        </button>
        <button
          onClick={() => setActiveTab("screenshots")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "screenshots"
              ? "border-b-2 border-amber-500 text-amber-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Screenshots
        </button>
      </div>

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className={`p-6 ${
                  review.flagged ? "border-2 border-red-300 bg-red-50" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(review.platform)}
                    <div>
                      <div className="font-semibold text-gray-900">
                        {review.author}
                      </div>
                      <div className="text-sm text-gray-500">{review.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-2 py-1 rounded-full border text-xs font-semibold ${getSentimentColor(
                        review.sentiment
                      )}`}
                    >
                      {review.sentiment}
                    </div>
                    {review.flagged && (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-gray-700">
                    {review.rating}/5
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-gray-700 mb-4">{review.text}</p>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {review.responded ? "View Response" : "Respond"}
                  </Button>
                  {review.flagged && (
                    <Button variant="outline" size="sm">
                      Resolve
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mentions Tab */}
      {activeTab === "mentions" && (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Brand mentions tracking</p>
          <p className="text-sm text-gray-500">
            Monitors Reddit, Quora, forums, and social media for brand mentions
          </p>
        </div>
      )}

      {/* Screenshots Tab */}
      {activeTab === "screenshots" && (
        <div className="space-y-4">
          {screenshots.map((screenshot, idx) => (
            <motion.div
              key={screenshot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">
                      {screenshot.platform}
                    </div>
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <ExternalLink className="w-3 h-3" />
                      {screenshot.url}
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Captured: {screenshot.capturedAt.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

