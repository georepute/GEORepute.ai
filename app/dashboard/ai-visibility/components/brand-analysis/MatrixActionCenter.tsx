"use client";
import React, { useMemo } from 'react';
import Card } from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Target, 
  MessageSquare, 
  FileText, 
  Copy, 
  ArrowRight, 
  Zap, 
  TrendingUp,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { FreddieAvatar } from "../dashboard/askfreddie/FreddieAvatar";
import { useBrandAnalysisContext } from '@/hooks/useBrandAnalysisContext';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';
import { useBrandAnalysisProject } from '@/hooks/useBrandAnalysisProjects';
import { generatePlatformActionPlan, generateMatrixQuickWins, ActionPlanContext } from '@/lib/brand-analysis/action-plans';
import { useToast } from '@/components/ui/use-toast';
import { PlatformLogo } from './PlatformLogo';

interface MatrixActionCenterProps {
  projectId: string;
  sessionId?: string;
}

export const MatrixActionCenter: React.FC<MatrixActionCenterProps> = ({ 
  projectId, 
  sessionId 
}) => {
  const { toast } = useToast();
  const brandAnalysisContext = useBrandAnalysisContext(projectId);
  const { data: analysisResults = [] } = useBrandAnalysisResults(projectId, sessionId);
  const { data: project } = useBrandAnalysisProject(projectId);

  // Calculate platform metrics (similar to PlatformPerformanceMatrix)
  const platformMetrics = useMemo(() => {
    if (!analysisResults.length) return [];

    const activePlatforms = project?.active_platforms && Array.isArray(project.active_platforms) 
      ? project.active_platforms 
      : [];

    const platforms = [...new Set(analysisResults.map(r => r.ai_platform))]
      .filter(platform => {
        if (activePlatforms.length > 0) {
          return activePlatforms.includes(platform);
        }
        return true;
      });

    return platforms.map(platform => {
      const platformResults = analysisResults.filter(r => r.ai_platform === platform);
      const mentionCount = platformResults.filter(r => r.mention_found).length;
      const mentionRate = platformResults.length > 0 ? mentionCount / platformResults.length : 0;
      
      const positions = platformResults
        .filter(r => r.mention_found && r.mention_position)
        .map(r => r.mention_position || 0);
      const avgPosition = positions.length > 0 
        ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length 
        : 0;
      
      const sentiments = platformResults
        .filter(r => r.mention_found && r.sentiment_score !== null && r.sentiment_score !== undefined)
        .map(r => r.sentiment_score || 0);
      const avgSentiment = sentiments.length > 0 
        ? sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiments.length 
        : 0;
      
      const opportunityScore = platformResults.length > 0 
        ? Math.round((1 - mentionRate) * platformResults.length * 10) / 10
        : 0;
      
      const competitorMentions = platformResults.reduce((acc, r) => {
        if (r.competitor_mentions && r.competitor_mentions.length > 0) {
          r.competitor_mentions.forEach(competitor => {
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
        opportunityScore,
        topCompetitors: Object.entries(competitorMentions)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))
      };
    }).sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [analysisResults, project?.active_platforms]);

  // Generate action plans for high-opportunity platforms
  const actionPlans = useMemo(() => {
    if (!brandAnalysisContext || !platformMetrics.length) return [];

    const context: ActionPlanContext = {
      brandName: project?.brand_name || 'Your Brand',
      industry: project?.industry,
      competitors: brandAnalysisContext.competitorMentions.map(c => c.competitor),
      totalMentions: brandAnalysisContext.totalMentions,
      totalQueries: brandAnalysisContext.totalQueries,
      visibilityScore: brandAnalysisContext.visibilityScore,
      sentimentScore: brandAnalysisContext.sentimentScore
    };

    return platformMetrics
      .filter(metric => metric.opportunityScore > 1.5) // Only show platforms with decent opportunity
      .slice(0, 3) // Limit to top 3
      .map(metric => generatePlatformActionPlan(metric, context));
  }, [platformMetrics, brandAnalysisContext, project]);

  const matrixQuickWins = useMemo(() => {
    if (!brandAnalysisContext) return [];
    return generateMatrixQuickWins(brandAnalysisContext);
  }, [brandAnalysisContext]);

  const highestOpportunityPlatform = platformMetrics.length > 0 ? platformMetrics[0] : null;

  const handleScrollToHighestImpact = () => {
    // Scroll to the highest opportunity platform card
    const platformCards = document.querySelectorAll('[data-platform-card]');
    if (platformCards.length > 0 && highestOpportunityPlatform) {
      const targetCard = Array.from(platformCards).find(card => 
        card.textContent?.toLowerCase().includes(highestOpportunityPlatform.platform.toLowerCase())
      );
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleAskFreddieWithContext = (specificPrompt?: string) => {
    if (!brandAnalysisContext) return;

    const contextData = {
      projectId,
      brandName: project?.brand_name || 'Your Brand',
      brandAnalysisContext,
      platformMetrics,
      suggestedPrompt: specificPrompt || `Help me create an action plan to improve my brand's AI visibility across all platforms. Here's my current performance data:

Total Mentions: ${brandAnalysisContext.totalMentions}
Total Queries: ${brandAnalysisContext.totalQueries}  
Visibility Score: ${brandAnalysisContext.visibilityScore}%
Sentiment Score: ${brandAnalysisContext.sentimentScore}%

Low performing platforms: ${brandAnalysisContext.lowPerformingPlatforms.join(', ')}
Top opportunities: ${brandAnalysisContext.topOpportunities.join(', ')}

Please create a prioritized action plan with specific tactics for each platform.`,
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

  const handleCopyActionPlan = (plan: any) => {
    const planText = `${plan.platform.toUpperCase()} ACTION PLAN

QUICK WINS:
${plan.quickWins.map((win: string, i: number) => `${i + 1}. ${win}`).join('\n')}

CHECKLIST:
${plan.checklist.map((item: any, i: number) => `☐ ${item.label}${item.hint ? ' (' + item.hint + ')' : ''}`).join('\n')}

RECOMMENDED SCHEMA:
${plan.recommendedSchema.join(', ')}
    `.trim();

    navigator.clipboard.writeText(planText);
    toast({
      title: "Action plan copied!",
      description: `${plan.platform} action plan copied to clipboard`,
    });
  };

  if (!brandAnalysisContext || !platformMetrics.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Quick Wins Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Matrix Action Center
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Actionable insights based on your platform performance analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Wins */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Quick Wins
              </h3>
              <ul className="space-y-2">
                {matrixQuickWins.map((win, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div>
              <h3 className="font-medium mb-3">Take Action</h3>
              <div className="space-y-2">
                {highestOpportunityPlatform && (
                  <Button
                    onClick={handleScrollToHighestImpact}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Focus on {highestOpportunityPlatform.platform} (Highest Impact)
                  </Button>
                )}
                
                <Button
                  onClick={() => handleAskFreddieWithContext()}
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <FreddieAvatar size="sm" className="flex-shrink-0" />
                    <span className="font-medium">Ask Freddie</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </div>
                </Button>

                <Button
                  onClick={handleOpenSchemaGenerator}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Open Schema Generator
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform-Specific Playbooks */}
      {actionPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Platform Playbooks
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed action plans for your highest-opportunity platforms
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {actionPlans.map((plan, index) => (
                <AccordionItem key={plan.platform} value={plan.platform}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <PlatformLogo platform={plan.platform} size={20} />
                      <span className="capitalize font-medium">{plan.platform}</span>
                      <Badge variant={
                        plan.priorityLevel === 'high' ? 'destructive' : 
                        plan.priorityLevel === 'medium' ? 'default' : 'secondary'
                      }>
                        {plan.priorityLevel} priority
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Quick Wins */}
                      <div>
                        <h4 className="font-medium text-sm mb-2">Quick Wins</h4>
                        <ul className="space-y-1">
                          {plan.quickWins.map((win, winIndex) => (
                            <li key={winIndex} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="w-3 h-3 text-green-500 flex-shrink-0 mt-1" />
                              <span>{win}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommended Schema */}
                      {plan.recommendedSchema.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Recommended Schema Types</h4>
                          <div className="flex flex-wrap gap-1">
                            {plan.recommendedSchema.map(schema => (
                              <Badge key={schema} variant="outline" className="text-xs">
                                {schema}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          onClick={() => handleAskFreddieWithContext(plan.freddiePrompt)}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <div className="flex items-center gap-1">
                            <FreddieAvatar size="sm" className="flex-shrink-0" />
                            <span className="font-medium">Ask Freddie</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </div>
                        </Button>
                        
                        <Button
                          onClick={() => handleCopyActionPlan(plan)}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Plan
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};