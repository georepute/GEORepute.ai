"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Eye,
  Zap,
  Link2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import toast from "react-hot-toast";

interface AdCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
}

export default function AdSyncPage() {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [stats] = useState({
    totalSpend: 4250,
    totalClicks: 1842,
    totalImpressions: 45230,
    totalConversions: 127,
    avgCTR: 4.07,
    avgCPC: 2.31,
    avgROAS: 3.8,
  });

  const [campaigns] = useState<AdCampaign[]>([
    {
      id: "1",
      name: "Local SEO Services - San Francisco",
      status: "active",
      impressions: 15420,
      clicks: 687,
      spend: 1589,
      conversions: 45,
      ctr: 4.46,
      cpc: 2.31,
      roas: 4.2,
    },
    {
      id: "2",
      name: "Reputation Management - Bay Area",
      status: "active",
      impressions: 12350,
      clicks: 521,
      spend: 1203,
      conversions: 38,
      ctr: 4.22,
      cpc: 2.31,
      roas: 3.9,
    },
    {
      id: "3",
      name: "Google My Business Optimization",
      status: "paused",
      impressions: 8720,
      clicks: 312,
      spend: 721,
      conversions: 22,
      ctr: 3.58,
      cpc: 2.31,
      roas: 3.1,
    },
    {
      id: "4",
      name: "AI Visibility Tracking Tools",
      status: "active",
      impressions: 8740,
      clicks: 322,
      spend: 737,
      conversions: 22,
      ctr: 3.68,
      cpc: 2.29,
      roas: 3.5,
    },
  ]);

  const connectGoogleAds = async () => {
    setSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setConnected(true);
      toast.success("Google Ads connected successfully!");
    } catch (error) {
      toast.error("Connection failed");
    } finally {
      setSyncing(false);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Data synced successfully!");
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-primary-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AdSync</h1>
              <p className="text-gray-600 mt-1">
                Google Ads integration and performance tracking
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {!connected ? (
              <Button
                onClick={connectGoogleAds}
                disabled={syncing}
                variant="primary"
              >
                {syncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Connect Google Ads
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={syncData} disabled={syncing} variant="outline">
                {syncing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Connection Status Banner */}
        {connected ? (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Connected</span>: Google Ads
                account synced. Data updates every 24 hours automatically.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Last sync: {new Date().toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Not Connected</span>: Link your
                Google Ads account to track campaign performance, sync keywords,
                and optimize ad spend based on organic rankings.
              </p>
            </div>
          </div>
        )}
      </div>

      {!connected ? (
        // Connection CTA
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Link2 className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Connect Google Ads
            </h2>
            <p className="text-gray-600 mb-6">
              Integrate your Google Ads account to view campaign performance,
              track conversions, and optimize ad spend based on your organic
              rankings.
            </p>
            <Button
              onClick={connectGoogleAds}
              disabled={syncing}
              variant="primary"
              size="lg"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect Now
                </>
              )}
            </Button>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                What you'll get:
              </h3>
              <div className="space-y-3 text-left text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Real-time campaign performance metrics</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Keyword overlap analysis (paid vs organic)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Ad spend optimization recommendations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Conversion tracking and attribution</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // Dashboard View
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                ${stats.totalSpend.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Spend</div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MousePointerClick className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalClicks.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Clicks</div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {(stats.totalImpressions / 1000).toFixed(1)}k
              </div>
              <div className="text-sm text-gray-600">Impressions</div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-secondary-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.totalConversions}
              </div>
              <div className="text-sm text-gray-600">Conversions</div>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Performance Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-primary-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-900 mb-1">
                  {stats.avgCTR}%
                </div>
                <div className="text-sm text-gray-600">Avg. CTR</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-secondary-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-900 mb-1">
                  ${stats.avgCPC}
                </div>
                <div className="text-sm text-gray-600">Avg. CPC</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-accent-50 rounded-lg border border-purple-200">
                <div className="text-3xl font-bold text-purple-900 mb-1">
                  {stats.avgROAS}x
                </div>
                <div className="text-sm text-gray-600">Avg. ROAS</div>
              </div>
            </div>
          </Card>

          {/* Campaigns List */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Active Campaigns
            </h2>
            <div className="space-y-4">
              {campaigns.map((campaign, idx) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {campaign.name}
                        </h3>
                        <div
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                            campaign.status
                          )}`}
                        >
                          {campaign.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${campaign.spend.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Spend</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 mb-1">Impressions</div>
                      <div className="font-bold text-gray-900">
                        {campaign.impressions.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Clicks</div>
                      <div className="font-bold text-gray-900">
                        {campaign.clicks.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">CTR</div>
                      <div className="font-bold text-gray-900">
                        {campaign.ctr}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">CPC</div>
                      <div className="font-bold text-gray-900">
                        ${campaign.cpc}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">Conversions</div>
                      <div className="font-bold text-gray-900">
                        {campaign.conversions}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 mb-1">ROAS</div>
                      <div className="font-bold text-green-900">
                        {campaign.roas}x
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

