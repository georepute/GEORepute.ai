import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  Activity,
  Globe,
  Users,
  Hash,
  X,
  PlayCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { BrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisResults, useBrandAnalysisSessions, useTriggerBrandAnalysis } from "@/hooks/useBrandAnalysisResults";
import { FullAnalysisReport } from "./FullAnalysisReport";
import { EnhancedAnalysisResults } from "./EnhancedAnalysisResults";
import { SourcesTable } from "./SourcesTable";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CompetitorAnalysis } from "./CompetitorRanking";
import { PlatformLogo } from "./PlatformLogo";
import { CompetitorLogo } from "@/components/ui/CompetitorLogo";
import { extractDomainFromName } from "@/utils/competitorUtils";
import { VisibilityScoreExplainer } from "./VisibilityScoreExplainer";

interface BrandAnalysisProjectDetailsProps {
  project: BrandAnalysisProject;
  open: boolean;
  onClose: () => void;
}

export function BrandAnalysisProjectDetails({ project, open, onClose }: BrandAnalysisProjectDetailsProps) {
  const [showFullReport, setShowFullReport] = useState(false);
  const { data: analysisResults = [], isLoading: resultsLoading } = useBrandAnalysisResults(project.id);
  const { data: sessions = [], isLoading: sessionsLoading } = useBrandAnalysisSessions(project.id);
  const triggerAnalysis = useTriggerBrandAnalysis();

  console.log("🔍 [ProjectDetails] Detailed platform analysis:", {
    projectId: project.id,
    brandName: project.brand_name,
    activePlatforms: project.active_platforms,
    activePlatformsLength: project.active_platforms?.length,
    activePlatformsJSON: JSON.stringify(project.active_platforms),
    fullProject: JSON.stringify(project)
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRunAnalysis = () => {
    triggerAnalysis.mutate({
      projectId: project.id,
      platforms: project.active_platforms || ["chatgpt", "claude", "perplexity", "gemini", "grok"],
      keywords: project.target_keywords || [],
      competitors: project.competitors || [],
      brandName: project.brand_name
    });
  };

  // Current running session - only show if it has valid total_queries AND at least one query has been completed
  // This ensures the progress bar only appears after actual processing has started
  const runningSession = sessions.find(s => {
    if (s.status !== 'running') return false;
    if (!s.total_queries || s.total_queries <= 0) return false;
    // Only show if at least one query has been completed (actual progress exists)
    if (!s.completed_queries || s.completed_queries <= 0) return false;
    return true;
  });
  
  // Calculate progress for running session
  const sessionProgress = runningSession 
    ? (runningSession.completed_queries || 0) / (runningSession.total_queries || 1) * 100
    : 0;

  // Prepare chart data
  const mentionsByPlatform = analysisResults.reduce((acc, result) => {
    const platform = result.ai_platform;
    if (!acc[platform]) acc[platform] = 0;
    if (result.mention_found) acc[platform]++;
    return acc;
  }, {} as Record<string, number>);

  const platformChartData = Object.entries(mentionsByPlatform).map(([platform, mentions]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    mentions
  }));

  // Sentiment analysis chart data
  const sentimentData = analysisResults
    .filter(r => r.sentiment_score !== null && r.mention_found)
    .map(r => ({
      date: formatDate(r.analysis_date),
      sentiment: Math.round((r.sentiment_score || 0) * 100),
      platform: r.ai_platform
    }));

  const PLATFORM_COLORS = {
    ChatGPT: '#10B981',
    Claude: '#8B5CF6', 
    Perplexity: '#F59E0B',
    Gemini: '#3B82F6',
    Copilot: '#EF4444'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">{project.brand_name}</DialogTitle>
              <p className="text-muted-foreground">{project.industry || 'General Industry'}</p>
            </div>
            <Badge className={getStatusColor(project.status)}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Mentions</p>
                    <p className="text-2xl font-bold">{project.total_mentions || 0}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      Visibility Score
                      <VisibilityScoreExplainer 
                        score={project.visibility_score || 0}
                        promptsMentioned={project.prompts_mentioned}
                        promptsTotal={project.prompts_total}
                        responsesMentioned={project.responses_mentioned}
                        responsesTotal={project.responses_total}
                      />
                    </p>
                    <p className="text-2xl font-bold">{project.visibility_score || 0}%</p>
                    {((project.responses_total || project.prompts_total) || 0) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.responses_mentioned || 0} of {project.responses_total || project.prompts_total} responses across all platforms
                      </p>
                    )}
                  </div>
                  <Target className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Platforms</p>
                    <p className="text-2xl font-bold">{project.active_platforms?.length || 0}</p>
                  </div>
                  <Globe className="w-8 h-8 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                    <p className="text-sm font-bold">{project.analysis_frequency}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Brand Name</p>
                  <p className="font-medium">{project.brand_name}</p>
                </div>
                
                {project.website_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Website</p>
                    <p className="font-medium text-primary">{project.website_url}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p className="font-medium">{project.industry || 'Not specified'}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(project.created_at)}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Last Analysis</p>
                  <p className="font-medium">
                    {project.last_analysis_at ? formatDate(project.last_analysis_at) : 'Never'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Monitoring Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Competitors ({project.competitors?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {project.competitors?.map((competitor) => {
                      const domain = extractDomainFromName(competitor);
                      return (
                        <Badge key={competitor} variant="outline" className="text-xs flex items-center gap-1.5">
                          <CompetitorLogo 
                            name={competitor}
                            domain={domain}
                            size={14}
                            className="rounded-sm"
                          />
                        {competitor}
                      </Badge>
                      );
                    }) || <p className="text-sm text-muted-foreground">None specified</p>}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Target Keywords ({project.target_keywords?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {project.target_keywords?.map((keyword) => (
                      <Badge key={keyword} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    )) || <p className="text-sm text-muted-foreground">None specified</p>}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Active Platforms ({project.active_platforms?.length || 0})
                  </p>
                   <div className="flex flex-wrap gap-1">
                     {project.active_platforms?.map((platform) => (
                       <Badge key={platform} variant="secondary" className="text-xs flex items-center gap-1">
                         <PlatformLogo platform={platform} size={14} />
                         {(platform || '').toLowerCase() === 'grok' ? 'Grok (xAI)' : (platform || '').toLowerCase() === 'chatgpt' ? 'ChatGPT' : platform}
                       </Badge>
                     )) || <p className="text-sm text-muted-foreground">None active</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Status */}
          {runningSession && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Analysis Running
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{runningSession.session_name}</span>
                    <span>{runningSession.completed_queries || 0} / {runningSession.total_queries || 0} queries</span>
                  </div>
                  <Progress value={sessionProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Started: {runningSession.started_at ? formatDateTime(runningSession.started_at) : 'Just now'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Mentions by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                {platformChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={platformChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="mentions" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No mention data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sentimentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={sentimentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="sentiment" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No sentiment data available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Competitor Analysis */}
          <CompetitorAnalysis projectId={project.id} />

          {/* Top Sources (Aggregated) */}
          <SourcesTable 
            projectId={project.id} 
            analysisResults={analysisResults}
            brandName={project.brand_name}
            brandWebsite={project.website_url}
            brandDescription={project.industry || ""}
            competitors={project.competitors || []}
          />

          {/* Enhanced Analysis Results */}
          <EnhancedAnalysisResults projectId={project.id} viewMode="all" />

          {/* Analysis Sessions History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Analysis History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {session.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {session.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        {session.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <div>
                          <p className="text-sm font-medium">{session.session_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(session.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium capitalize">{session.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.completed_queries}/{session.total_queries} queries
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No analysis sessions yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              variant="outline"
              onClick={handleRunAnalysis}
              disabled={triggerAnalysis.isPending || !!runningSession}
            >
              {triggerAnalysis.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {runningSession ? 'Analysis Running' : 'Run Analysis'}
            </Button>
            <Button onClick={() => setShowFullReport(true)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              View Full Report
            </Button>
             
             <FullAnalysisReport 
               project={project}
             />
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}