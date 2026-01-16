import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ThumbsUp, ThumbsDown, BarChart3, Check, AlertCircle, Target, MessageSquare, FileText, Copy, ExternalLink, Zap } from 'lucide-react';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';
import { useBrandAnalysisProject } from '@/hooks/useBrandAnalysisProjects';
import { PlatformLogo } from './PlatformLogo';
import { FreddieAvatar } from "@/components/dashboard/askfreddie/FreddieAvatar";
import { generatePlatformActionPlan, ActionPlanContext } from '@/lib/brand-analysis/action-plans';
import { useToast } from '@/components/ui/use-toast';

interface PlatformMetrics {
  platform: string;
  visibility_percentage: number;
  mention_rate: number;
  avg_position: number;
  sentiment_score: number;
  trend: 'up' | 'down' | 'stable';
  optimization_suggestion: string;
  total_queries?: number;
  mentions_found?: number;
  opportunity_score?: number;
}

interface PlatformPerformanceMatrixProps {
  projectId: string;
  sessionId?: string;
}

export const PlatformPerformanceMatrix: React.FC<PlatformPerformanceMatrixProps> = ({ projectId, sessionId }) => {
  const { data: analysisResults = [], isLoading } = useBrandAnalysisResults(projectId, sessionId);
  const { data: project } = useBrandAnalysisProject(projectId);

  // Calculate platform performance metrics
  const platformMetrics = useMemo(() => {
    if (!analysisResults.length) return [];

    // Get the platforms that were actually used in this analysis
    const activePlatforms = project?.active_platforms && Array.isArray(project.active_platforms) 
      ? project.active_platforms 
      : [];

    // Get unique platforms, filtered by active platforms
    const platforms = [...new Set(analysisResults.map(r => r.ai_platform))]
      .filter(platform => {
        // If we have active platforms defined, only include those
        if (activePlatforms.length > 0) {
          return activePlatforms.includes(platform);
        }
        // Otherwise include all platforms found in results
        return true;
      });

    // Calculate metrics for each platform
    return platforms.map(platform => {
      const platformResults = analysisResults.filter(r => r.ai_platform === platform);
      const mentionCount = platformResults.filter(r => r.mention_found).length;
      const mentionRate = platformResults.length > 0 ? mentionCount / platformResults.length : 0;
      
      // Calculate average position
      const positions = platformResults
        .filter(r => r.mention_found && r.mention_position)
        .map(r => r.mention_position || 0);
      const avgPosition = positions.length > 0 
        ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length 
        : null;
      
      // Calculate average sentiment
      const sentiments = platformResults
        .filter(r => r.mention_found && r.sentiment_score !== null && r.sentiment_score !== undefined)
        .map(r => r.sentiment_score || 0);
      const avgSentiment = sentiments.length > 0 
        ? sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length 
        : null;
      
      // Calculate opportunity score (higher score = more opportunity)
      // Based on: high query volume but low mention rate = high opportunity
      const opportunityScore = platformResults.length > 0 
        ? Math.round((1 - mentionRate) * platformResults.length * 10) / 10
        : 0;
      
      // Get unique queries that mentioned the brand
      const brandQueries = platformResults
        .filter(r => r.mention_found)
        .map(r => r.query_text);
      
      // Calculate competitor mentions
      const competitorMentions = platformResults.reduce((acc, r) => {
        if (r.competitor_mentions && r.competitor_mentions.length > 0) {
          r.competitor_mentions.forEach(competitor => {
            // Filter out generic entities
            const excludedCompetitors = ['google','microsoft','apple','amazon','facebook','meta','youtube','bing','twitter','x','linkedin','instagram','reddit','tiktok'];
            if (!excludedCompetitors.includes(competitor.toLowerCase())) {
              acc[competitor] = (acc[competitor] || 0) + 1;
            }
          });
        }
        return acc;
      }, {} as Record<string, number>);
      
      return {
        platform,
        totalQueries: platformResults.length,
        mentionCount,
        mentionRate,
        avgPosition,
        avgSentiment,
        brandQueries,
        competitorMentions,
        opportunityScore,
        topCompetitors: Object.entries(competitorMentions)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))
      };
    }).sort((a, b) => b.mentionRate - a.mentionRate);
  }, [analysisResults, project?.active_platforms]);

  // Find the platform with the highest opportunity score
  const topOpportunity = platformMetrics.length > 0 
    ? platformMetrics.reduce((max, current) => 
        current.opportunityScore > max.opportunityScore ? current : max
      )
    : null;

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: number | null) => {
    if (sentiment === null) return 'text-muted-foreground';
    if (sentiment > 0.2) return 'text-success';
    if (sentiment < -0.2) return 'text-destructive';
    return 'text-amber-500';
  };

  // Get sentiment icon
  const getSentimentIcon = (sentiment: number | null) => {
    if (sentiment === null) return null;
    if (sentiment > 0.2) return <ThumbsUp className="h-4 w-4" />;
    if (sentiment < -0.2) return <ThumbsDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Platform Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading platform performance data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResults.length || platformMetrics.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Platform Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Platform Data Available</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Run a brand visibility analysis to see how your brand performs across different AI platforms.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Platform Performance & Opportunities
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {platformMetrics.length} platforms analyzed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Opportunity Highlight */}
        {topOpportunity && topOpportunity.opportunityScore > 2 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">Biggest Opportunity</h3>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium capitalize">{topOpportunity.platform}</span> has the highest opportunity score ({topOpportunity.opportunityScore.toFixed(1)}) 
              with {topOpportunity.totalQueries} queries but only {formatPercentage(topOpportunity.mentionRate)} mention rate. 
              Focus your content optimization efforts here for maximum impact.
            </p>
          </div>
        )}

        {/* Platform Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {platformMetrics.map(metric => (
            <Card key={metric.platform} className="overflow-hidden" data-platform-card>
              <CardHeader className={`p-4 pb-2 bg-gradient-to-r ${
                metric.mentionRate > 0.7 ? 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900' : 
                metric.mentionRate > 0.4 ? 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900' : 
                'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900'
              }`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize flex items-center gap-2">
                    <PlatformLogo platform={metric.platform} size={16} />
                    {metric.platform}
                  </CardTitle>
                  <Badge variant={metric.mentionRate > 0.5 ? "default" : "secondary"} className="text-xs">
                    {formatPercentage(metric.mentionRate)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mentions</span>
                    <span className="font-medium text-sm">{metric.mentionCount} of {metric.totalQueries}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Opportunity Score</span>
                    <span className={`font-medium text-sm ${
                      metric.opportunityScore > 5 ? 'text-red-600' : 
                      metric.opportunityScore > 2 ? 'text-amber-600' : 
                      'text-green-600'
                    }`}>
                      {metric.opportunityScore.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Position</span>
                    <span className="font-medium text-sm">
                      {metric.avgPosition !== null ? metric.avgPosition.toFixed(1) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sentiment</span>
                    <div className={`flex items-center gap-1 ${getSentimentColor(metric.avgSentiment)}`}>
                      {getSentimentIcon(metric.avgSentiment)}
                      <span className="font-medium text-sm">
                        {metric.avgSentiment !== null ? 
                          `${metric.avgSentiment > 0 ? '+' : ''}${(metric.avgSentiment * 100).toFixed(0)}%` : 
                          'N/A'}
                      </span>
                    </div>
                  </div>

                  {metric.topCompetitors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground block mb-1">Top Competitors Present</span>
                      <div className="flex flex-wrap gap-1">
                        {metric.topCompetitors.map(competitor => (
                          <Badge key={competitor.name} variant="outline" className="text-xs capitalize">
                            {competitor.name} ({competitor.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Section */}
                  <PlatformActions 
                    platform={metric.platform}
                    metrics={metric}
                    projectId={projectId}
                    project={project}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Business-Focused Recommendations */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">Where to Focus Your Efforts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Immediate Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="text-xs space-y-2">
                  {platformMetrics.filter(m => m.opportunityScore > 2).slice(0, 3).map(metric => (
                    <li key={metric.platform} className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium capitalize">{metric.platform}</span>: 
                        {metric.totalQueries} queries with only {formatPercentage(metric.mentionRate)} mentions. 
                        Create content targeting this platform's audience.
                      </span>
                    </li>
                  ))}
                  
                  {platformMetrics.filter(m => m.opportunityScore > 2).length === 0 && (
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Great job! Your visibility is strong across all platforms. Focus on maintaining quality and monitoring competitors.</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Platform Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="text-xs space-y-2">
                  {(() => {
                    const recommendations = [];
                    
                    // Double down recommendation (relaxed threshold from 0.2 to 0.15)
                    if (platformMetrics.length > 1 && platformMetrics[0].mentionRate > platformMetrics[platformMetrics.length-1].mentionRate + 0.15) {
                      recommendations.push(
                        <li key="double-down" className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          <span>
                            Double down on <span className="font-medium capitalize">{platformMetrics[0].platform}</span> 
                            where you have {formatPercentage(platformMetrics[0].mentionRate)} visibility.
                          </span>
                        </li>
                      );
                    }
                    
                    // Low visibility platforms (relaxed threshold from 0.4 to 0.5)
                    const lowVisibilityPlatforms = platformMetrics.filter(m => m.mentionRate < 0.5);
                    if (lowVisibilityPlatforms.length > 0) {
                      recommendations.push(
                        <li key="low-visibility" className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>
                            Expand visibility on <span className="font-medium capitalize">
                              {lowVisibilityPlatforms.map(m => m.platform).join(', ')}
                            </span> where you have room for growth.
                          </span>
                        </li>
                      );
                    }
                    
                    // Negative sentiment
                    const negativeSentimentPlatforms = platformMetrics.filter(m => m.avgSentiment !== null && m.avgSentiment < 0);
                    if (negativeSentimentPlatforms.length > 0) {
                      recommendations.push(
                        <li key="negative-sentiment" className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          <span>
                            Address negative sentiment on <span className="font-medium capitalize">
                              {negativeSentimentPlatforms.map(m => m.platform).join(', ')}
                            </span> to improve brand perception.
                          </span>
                        </li>
                      );
                    }
                    
                    // High opportunity platforms
                    const highOpportunityPlatforms = platformMetrics.filter(m => m.opportunityScore > 3);
                    if (highOpportunityPlatforms.length > 0 && recommendations.length < 2) {
                      recommendations.push(
                        <li key="high-opportunity" className="flex items-start gap-2">
                          <Target className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>
                            Focus content optimization on <span className="font-medium capitalize">
                              {highOpportunityPlatforms[0].platform}
                            </span> for maximum impact potential.
                          </span>
                        </li>
                      );
                    }
                    
                    // Strong performance platforms
                    const strongPlatforms = platformMetrics.filter(m => m.mentionRate > 0.7);
                    if (strongPlatforms.length > 0 && recommendations.length < 2) {
                      recommendations.push(
                        <li key="maintain-strength" className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          <span>
                            Maintain strong performance on <span className="font-medium capitalize">
                              {strongPlatforms[0].platform}
                            </span> and apply similar strategies to other platforms.
                          </span>
                        </li>
                      );
                    }
                    
                    // Fallback recommendations if none of the above apply
                    if (recommendations.length === 0) {
                      if (platformMetrics.length > 0) {
                        const topPlatform = platformMetrics[0];
                        recommendations.push(
                          <li key="balanced-approach" className="flex items-start gap-2">
                            <BarChart3 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>
                              Your brand has balanced performance across platforms. Consider optimizing content 
                              for <span className="font-medium capitalize">{topPlatform.platform}</span> to further 
                              strengthen your leading position.
                            </span>
                          </li>
                        );
                        
                        if (platformMetrics.length > 1) {
                          const weakestPlatform = platformMetrics[platformMetrics.length - 1];
                          recommendations.push(
                            <li key="improve-weakest" className="flex items-start gap-2">
                              <Target className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span>
                                Develop targeted content strategy for <span className="font-medium capitalize">
                                  {weakestPlatform.platform}
                                </span> to improve overall brand visibility.
                              </span>
                            </li>
                          );
                        }
                      }
                    }
                    
                    return recommendations.slice(0, 3); // Ensure max 3 recommendations
                  })()}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Platform Actions Component
interface PlatformActionsProps {
  platform: string;
  metrics: any;
  projectId: string;
  project: any;
}

const PlatformActions: React.FC<PlatformActionsProps> = ({ 
  platform, 
  metrics, 
  projectId, 
  project 
}) => {
  const { toast } = useToast();

  // Generate action plan for this specific platform
  const actionPlan = useMemo(() => {
    const context: ActionPlanContext = {
      brandName: project?.brand_name || 'Your Brand',
      industry: project?.industry,
      competitors: metrics.topCompetitors?.map((c: any) => c.name) || [],
      totalMentions: metrics.mentionCount || 0,
      totalQueries: metrics.totalQueries || 0,
      visibilityScore: Math.round(metrics.mentionRate * 100),
      sentimentScore: Math.round((metrics.avgSentiment || 0) * 100)
    };

    return generatePlatformActionPlan(metrics, context);
  }, [metrics, project]);

  const handleAskFreddieWithContext = () => {
    const contextData = {
      projectId,
      platform,
      brandName: project?.brand_name || 'Your Brand',
      platformMetrics: metrics,
      suggestedPrompt: actionPlan.freddiePrompt,
      timestamp: new Date().toISOString()
    };

    // Store context in localStorage
    localStorage.setItem('brandAnalysisContext', JSON.stringify(contextData));
    
    // Open Ask Freddie in new tab
    window.open('/dashboard/ask-freddie', '_blank', 'noopener,noreferrer');
  };

  const handleOpenSchemaGenerator = () => {
    window.open('/schemas', '_blank', 'noopener,noreferrer');
  };

  const handleCopySteps = () => {
    const stepsText = `${platform.toUpperCase()} QUICK WINS:

${actionPlan.quickWins.map((win, i) => `${i + 1}. ${win}`).join('\n')}

CHECKLIST:
${actionPlan.checklist.map((item, i) => `☐ ${item.label}${item.hint ? ' (' + item.hint + ')' : ''}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(stepsText);
    toast({
      title: "Steps copied!",
      description: `${platform} action steps copied to clipboard`,
    });
  };

  // Only show actions if there's decent opportunity or issues to address
  if (metrics.opportunityScore < 1 && metrics.mentionRate > 0.7 && metrics.avgSentiment > 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1 mb-2">
        <Zap className="w-3 h-3 text-amber-500" />
        <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
      </div>
      
      {/* Quick Wins Preview */}
      <div className="mb-3">
        <ul className="space-y-1">
          {actionPlan.quickWins.slice(0, 2).map((win, index) => (
            <li key={index} className="flex items-start gap-1 text-xs">
              <Target className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{win}</span>
            </li>
          ))}
          {actionPlan.quickWins.length > 2 && (
            <li className="text-xs text-muted-foreground pl-4">
              +{actionPlan.quickWins.length - 2} more...
            </li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-1">
        <Button
          onClick={handleOpenSchemaGenerator}
          size="sm"
          variant="outline"
          className="h-7 text-xs"
        >
          <FileText className="w-3 h-3 mr-1" />
          Schema
          <ExternalLink className="w-2 h-2 ml-1" />
        </Button>
        
        <Button
          onClick={handleCopySteps}
          size="sm"
          variant="outline"
          className="h-7 text-xs"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy Steps
        </Button>
        
        <Button
          onClick={handleAskFreddieWithContext}
          size="sm"
          className="h-7 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <div className="flex items-center gap-1">
            <FreddieAvatar size="sm" className="flex-shrink-0" />
            <span className="font-medium">Ask Freddie</span>
            <ExternalLink className="w-2 h-2 ml-1" />
          </div>
        </Button>
      </div>
    </div>
  );
};