import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { BrandAnalysisProjectCard } from "@/components/brand-analysis/BrandAnalysisProjectCard";
import { useBrandAnalysisProjects } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisStats } from "@/hooks/useBrandAnalysisResults";
import { PlatformLogo } from "@/components/brand-analysis/PlatformLogo";

export default function BrandAnalysisTabContent() {
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
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link to="/dashboard/brand-analysis/create">
            <Plus className="w-4 h-4 mr-2" />
            New Analysis
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-l-4 border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Mentions</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-foreground">{totalMentions}</p>
                  <p className="text-xs text-muted-foreground">across all brands</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Search className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">AI Platforms</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-foreground">{activePlatforms}</p>
                  <p className="text-xs text-muted-foreground">active platforms</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-secondary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Avg Visibility</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-foreground">{avgVisibility}%</p>
                  <p className="text-xs text-muted-foreground">mention rate</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-foreground">{stats?.avgSentiment || 0}%</p>
                  {stats?.recentTrend && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      stats.recentTrend >= 0 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {stats.recentTrend >= 0 ? '+' : ''}{stats.recentTrend}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {projects.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-12 border border-dashed">
          <CardContent className="px-6 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Start Tracking Your Brand Across AI Platforms
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Discover how your brand appears in AI responses from ChatGPT, Claude, 
              Perplexity, and Google AI. Get competitive intelligence and actionable insights.
            </p>
            <div className="space-y-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link to="/dashboard/brand-analysis/create">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Project
                </Link>
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
                <div className="flex flex-col items-center p-4 bg-muted/20 rounded-lg">
                  <PlayCircle className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-medium">5-minute setup</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-muted/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-accent mb-2" />
                  <span className="text-sm font-medium">Automated tracking</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-muted/20 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-secondary mb-2" />
                  <span className="text-sm font-medium">Competitive analysis</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Projects Grid */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Your Brand Projects
              <Badge variant="outline" className="ml-2">{projects.length}</Badge>
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
      <Card className="bg-gradient-to-r from-secondary/5 to-primary/5 border-secondary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2 text-lg">
                How Brand Visibility Works
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Our Brand Visibility tool systematically queries major AI platforms with strategic prompts 
                related to your industry and brand. It tracks mention frequency, context, sentiment, 
                and competitive positioning to give you actionable insights for improving your AI visibility.
              </p>
              <div className="flex flex-wrap gap-3 mt-4 text-sm">
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                  <PlatformLogo platform="chatgpt" size={16} />
                  <span className="font-medium">ChatGPT</span>
                </div>
                <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full">
                  <PlatformLogo platform="claude" size={16} />
                  <span className="font-medium">Claude</span>
                </div>
                <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full">
                  <PlatformLogo platform="perplexity" size={16} />
                  <span className="font-medium">Perplexity</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-full">
                  <PlatformLogo platform="google ai" size={16} />
                  <span className="font-medium">Google AI</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-full">
                  <PlatformLogo platform="gemini" size={16} />
                  <span className="font-medium">Gemini</span>
                </div>
                <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full">
                  <PlatformLogo platform="grok" size={16} />
                  <span className="font-medium">Grok</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}