"use client";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { 
  Plus, 
  TrendingUp, 
  Search, 
  Calendar, 
  BarChart3,
  Target,
  Eye,
  PlayCircle,
  AlertCircle
} from "lucide-react";
import { BrandAnalysisProjectCard } from "./BrandAnalysisProjectCard";
import { useBrandAnalysisProjects } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisStats } from "@/hooks/useBrandAnalysisResults";
import { PlatformLogo } from "./PlatformLogo";

export default function BrandAnalysisTabContent() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useBrandAnalysisProjects();
  const { data: stats, isLoading: statsLoading } = useBrandAnalysisStats(projects.map(p => p.id));
  const [avgVisibility, setAvgVisibility] = useState(0);

  // Calculate total mentions from projects and stats
  const totalMentions = stats?.totalMentions || 
    projects.reduce((acc, p) => acc + (p.total_mentions || 0), 0);
  
  // Calculate active platforms from projects
  const activePlatformsSet = new Set();
  projects.forEach(p => {
    if (p.active_platforms && Array.isArray(p.active_platforms)) {
      p.active_platforms.forEach(platform => activePlatformsSet.add(platform));
    }
  });
  const activePlatforms = activePlatformsSet.size;
  
  // Use stats hook's latest-session mention rate for avg visibility
  useEffect(() => {
    if (typeof stats?.avgVisibility === 'number') {
      setAvgVisibility(stats.avgVisibility);
    }
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => router.push('/dashboard/ai-visibility?action=create')}
          variant="primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-l-4 border-primary-500">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600">Total Mentions</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{totalMentions}</p>
                  <p className="text-xs text-gray-500">across all brands</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-l-4 border-accent-500">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600">AI Platforms</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{activePlatforms}</p>
                  <p className="text-xs text-gray-500">active platforms</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-accent-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-l-4 border-secondary-500">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Visibility</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{avgVisibility}%</p>
                  <p className="text-xs text-gray-500">mention rate</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-secondary-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-l-4 border-red-500">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Sentiment</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{stats?.avgSentiment || 0}%</p>
                  {stats?.recentTrend && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      stats.recentTrend >= 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {stats.recentTrend >= 0 ? '+' : ''}{stats.recentTrend}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      {projects.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-12 border-2 border-dashed border-gray-300">
          <div className="px-6 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Start Tracking Your Brand Across AI Platforms
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Discover how your brand appears in AI responses from ChatGPT, Claude, 
              Perplexity, and Google AI. Get competitive intelligence and actionable insights.
            </p>
            <div className="space-y-4">
              <Button 
                onClick={() => router.push('/dashboard/ai-visibility?action=create')}
                size="lg" 
                variant="primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Project
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <PlayCircle className="w-6 h-6 text-primary-600 mb-2" />
                  <span className="text-sm font-medium">5-minute setup</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-accent-600 mb-2" />
                  <span className="text-sm font-medium">Automated tracking</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-secondary-600 mb-2" />
                  <span className="text-sm font-medium">Competitive analysis</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* Projects Grid */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              Your Brand Projects
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{projects.length}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <BrandAnalysisProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-secondary-50 to-primary-50 border-secondary-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                How Brand Visibility Works
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Our Brand Visibility tool systematically queries major AI platforms with strategic prompts 
                related to your industry and brand. It tracks mention frequency, context, sentiment, 
                and competitive positioning to give you actionable insights for improving your AI visibility.
              </p>
              <div className="flex flex-wrap gap-3 mt-4 text-sm">
                <div className="flex items-center gap-2 bg-primary-100 px-3 py-1 rounded-full">
                  <PlatformLogo platform="chatgpt" size={16} />
                  <span className="font-medium">ChatGPT</span>
                </div>
                <div className="flex items-center gap-2 bg-accent-100 px-3 py-1 rounded-full">
                  <PlatformLogo platform="claude" size={16} />
                  <span className="font-medium">Claude</span>
                </div>
                <div className="flex items-center gap-2 bg-accent-100 px-3 py-1 rounded-full">
                  <PlatformLogo platform="perplexity" size={16} />
                  <span className="font-medium">Perplexity</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary-100 px-3 py-1 rounded-full">
                  <PlatformLogo platform="google ai" size={16} />
                  <span className="font-medium">Google AI</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary-100 px-3 py-1 rounded-full">
                  <PlatformLogo platform="gemini" size={16} />
                  <span className="font-medium">Gemini</span>
                </div>
                <div className="flex items-center gap-2 bg-accent-100 px-3 py-1 rounded-full">
                  <PlatformLogo platform="grok" size={16} />
                  <span className="font-medium">Grok</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}