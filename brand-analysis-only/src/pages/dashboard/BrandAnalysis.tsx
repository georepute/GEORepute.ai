import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Settings,
  AlertCircle
} from "lucide-react";
import { BrandAnalysisProjectCard } from "@/components/brand-analysis/BrandAnalysisProjectCard";
import { BrandAnalysisWizard } from "@/components/brand-analysis/BrandAnalysisWizard";
import { useBrandAnalysisProjects } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisStats } from "@/hooks/useBrandAnalysisResults";
import { VideoBanner } from "@/components/dashboard/VideoBanner";
import { PlatformLogo } from "@/components/brand-analysis/PlatformLogo";

export default function BrandAnalysis() {
  const [showWizard, setShowWizard] = useState(false);
  const { data: projects = [], isLoading } = useBrandAnalysisProjects();
  const { data: stats } = useBrandAnalysisStats(projects.map(p => p.id));

  const totalMentions = stats?.totalMentions || 0;
  const activePlatforms = new Set(projects.flatMap(p => p.active_platforms || [])).size;
  const avgVisibility = projects.length > 0 
    ? projects.reduce((acc, p) => acc + (p.visibility_score || 0), 0) / projects.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="w-full max-w-full overflow-hidden space-y-4 sm:space-y-6">
        {/* Video Banner */}
        <VideoBanner pageIdentifier="brand-analysis" />
        
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Brand Visibility</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Track your brand mentions across AI platforms and monitor competitive intelligence
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-center text-xs sm:text-sm">
              <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
              Beta Feature
            </Badge>
            <Button 
              onClick={() => setShowWizard(true)}
              className="bg-primary hover:bg-primary/90 text-sm"
              size="sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Project Analysis</span>
              <span className="sm:hidden">New Project</span>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Mentions</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{totalMentions}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">AI Platforms</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{activePlatforms}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Visibility</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{avgVisibility.toFixed(1)}%</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{stats?.avgSentiment || 0}%</p>
                    {stats?.recentTrend && (
                      <span className={`text-xs px-1 sm:px-2 py-1 rounded ${
                        stats.recentTrend >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {stats.recentTrend >= 0 ? '+' : ''}{stats.recentTrend}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {projects.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Brand Visibility Projects Yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start tracking your brand mentions across AI platforms like ChatGPT, Claude, 
                Perplexity, and Google AI with competitive intelligence insights.
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={() => setShowWizard(true)}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Project
                </Button>
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    <span>5-minute setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Automated monitoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Competitive analysis</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Projects Grid */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Your Analysis Projects</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Bulk Actions
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {projects.map((project) => (
                <BrandAnalysisProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}

        {/* Info Banner */}
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  How Brand Visibility Works
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our Brand Visibility tool systematically queries major AI platforms with strategic prompts 
                  related to your industry and brand. It tracks mention frequency, context, sentiment, 
                  and competitive positioning to give you actionable insights for improving your AI visibility.
                </p>
                <div className="flex flex-wrap gap-3 mt-4 text-sm">
                  <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                    <PlatformLogo platform="chatgpt" size={16} />
                    <span>ChatGPT</span>
                  </div>
                  <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full">
                    <PlatformLogo platform="claude" size={16} />
                    <span>Claude</span>
                  </div>
                  <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full">
                    <PlatformLogo platform="perplexity" size={16} />
                    <span>Perplexity</span>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-full">
                    <PlatformLogo platform="google ai" size={16} />
                    <span>Google AI</span>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-full">
                    <PlatformLogo platform="gemini" size={16} />
                    <span>Gemini</span>
                  </div>
                  <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full">
                    <PlatformLogo platform="grok" size={16} />
                    <span>Grok</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wizard Modal */}
        {showWizard && (
          <BrandAnalysisWizard onClose={() => setShowWizard(false)} />
        )}
      </div>
    </DashboardLayout>
  );
}