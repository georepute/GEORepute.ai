import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Users, Target, ArrowUp, ArrowDown, Minus, Check, X } from 'lucide-react';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';

interface CompetitorMetrics {
  name: string;
  mention_count: number;
  mention_rate: number;
  avg_sentiment: number;
  platforms_mentioned: string[];
  co_mentioned_with_brand: number;
  competitive_strength: 'high' | 'medium' | 'low';
  direct_comparisons: number;
  comparison_results: {
    brand_better: number;
    competitor_better: number;
    neutral: number;
  };
  key_contexts: string[];
  feature_comparisons: Record<string, string>;
}

interface CompetitiveMatrixProps {
  projectId: string;
}

export const CompetitiveMatrix: React.FC<CompetitiveMatrixProps> = ({ projectId }) => {
  const { data: analysisResults = [], isLoading } = useBrandAnalysisResults(projectId);

  // Calculate competitive metrics from real data
  const competitiveMetrics = useMemo(() => {
    if (!analysisResults.length) return { brandMetrics: null, competitorMetrics: [] };

    // Get all competitor mentions from analysis results
    const allCompetitorMentions = analysisResults.reduce((acc, result) => {
      // Check for competitors in the competitor_mentions array
      if (result.competitor_mentions && result.competitor_mentions.length > 0) {
        result.competitor_mentions.forEach(competitor => {
          if (!acc[competitor]) {
            acc[competitor] = {
              mentions: [],
              platforms: new Set(),
              coMentionedWithBrand: 0,
              directComparisons: 0,
              comparisonResults: {
                brand_better: 0,
                competitor_better: 0,
                neutral: 0
              },
              contexts: [],
              featureComparisons: {}
            };
          }
          acc[competitor].mentions.push(result);
          acc[competitor].platforms.add(result.ai_platform);
          
          // Check if mentioned together with our brand
          if (result.mention_found) {
            acc[competitor].coMentionedWithBrand++;
          }
          
          // Extract competitor context if available
          const metadata = result.raw_response?.response_metadata;
          if (metadata?.competitor_contexts && metadata.competitor_contexts[competitor]) {
            const competitorContext = metadata.competitor_contexts[competitor];
            
            // Add context
            if (competitorContext.context) {
              acc[competitor].contexts.push(competitorContext.context);
            }
            
            // Track direct comparisons
            if (competitorContext.direct_comparison) {
              acc[competitor].directComparisons++;
              
              // Track comparison results
              if (competitorContext.comparison_result === 'brand_better') {
                acc[competitor].comparisonResults.brand_better++;
              } else if (competitorContext.comparison_result === 'competitor_better') {
                acc[competitor].comparisonResults.competitor_better++;
              } else {
                acc[competitor].comparisonResults.neutral++;
              }
            }
            
            // Extract feature comparisons from context
            const featureKeywords = ['pricing', 'support', 'features', 'interface', 'performance', 'security', 'integration'];
            featureKeywords.forEach(feature => {
              if (competitorContext.context.toLowerCase().includes(feature)) {
                // Simple heuristic for feature comparison
                const context = competitorContext.context.toLowerCase();
                if (context.includes(`better ${feature}`) && context.indexOf(competitor.toLowerCase()) < context.indexOf('better')) {
                  acc[competitor].featureComparisons[feature] = 'better';
                } else if (context.includes(`worse ${feature}`) && context.indexOf(competitor.toLowerCase()) < context.indexOf('worse')) {
                  acc[competitor].featureComparisons[feature] = 'worse';
                } else if (context.includes(`similar ${feature}`)) {
                  acc[competitor].featureComparisons[feature] = 'similar';
                } else {
                  acc[competitor].featureComparisons[feature] = 'unknown';
                }
              }
            });
          }
        });
      }
      
      // Also check response_metadata for competitor_contexts
      const metadata = result.raw_response?.response_metadata;
      if (metadata?.competitor_contexts) {
        Object.keys(metadata.competitor_contexts).forEach(competitor => {
          if (!acc[competitor]) {
            acc[competitor] = {
              mentions: [],
              platforms: new Set(),
              coMentionedWithBrand: 0,
              directComparisons: 0,
              comparisonResults: {
                brand_better: 0,
                competitor_better: 0,
                neutral: 0
              },
              contexts: [],
              featureComparisons: {}
            };
          }
          
          const competitorContext = metadata.competitor_contexts[competitor];
          acc[competitor].mentions.push(result);
          acc[competitor].platforms.add(result.ai_platform);
          
          if (competitorContext.mentioned_with_brand) {
            acc[competitor].coMentionedWithBrand++;
          }
          
          if (competitorContext.context) {
            acc[competitor].contexts.push(competitorContext.context);
          }
          
          if (competitorContext.direct_comparison) {
            acc[competitor].directComparisons++;
            
            if (competitorContext.comparison_result === 'brand_better') {
              acc[competitor].comparisonResults.brand_better++;
            } else if (competitorContext.comparison_result === 'competitor_better') {
              acc[competitor].comparisonResults.competitor_better++;
            } else {
              acc[competitor].comparisonResults.neutral++;
            }
          }
        });
      }
      
      return acc;
    }, {} as Record<string, { 
      mentions: any[], 
      platforms: Set<string>, 
      coMentionedWithBrand: number,
      directComparisons: number,
      comparisonResults: {
        brand_better: number,
        competitor_better: number,
        neutral: number
      },
      contexts: string[],
      featureComparisons: Record<string, string>
    }>);

    // Extract feature mentions for the brand
    const brandFeatureMentions = analysisResults
      .filter(r => r.mention_found)
      .reduce((acc, result) => {
        const metadata = result.raw_response?.response_metadata;
        if (metadata?.feature_mentions && Array.isArray(metadata.feature_mentions)) {
          metadata.feature_mentions.forEach(mention => {
            acc.push(mention);
          });
        }
        return acc;
      }, [] as string[]);

    // Calculate brand's own metrics
    const brandMentions = analysisResults.filter(r => r.mention_found);
    const brandMetrics = {
      name: 'Your Brand',
      mention_count: brandMentions.length,
      mention_rate: analysisResults.length > 0 ? brandMentions.length / analysisResults.length : 0,
      avg_sentiment: brandMentions.length > 0 
        ? brandMentions.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / brandMentions.length
        : 0,
      platforms_mentioned: [...new Set(brandMentions.map(r => r.ai_platform))],
      co_mentioned_with_brand: 0, // N/A for own brand
      competitive_strength: 'high' as const,
      feature_mentions: brandFeatureMentions.slice(0, 5)
    };

    // Calculate competitor metrics
    const competitorMetrics: CompetitorMetrics[] = Object.entries(allCompetitorMentions)
      .map(([name, data]) => {
        const mentionRate = analysisResults.length > 0 ? data.mentions.length / analysisResults.length : 0;
        const avgSentiment = data.mentions.length > 0
          ? data.mentions.reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / data.mentions.length
          : 0;

        // Determine competitive strength based on mention rate, co-mentions, and direct comparisons
        let competitiveStrength: 'high' | 'medium' | 'low' = 'low';
        if (mentionRate > 0.3 || data.coMentionedWithBrand > 2 || data.directComparisons > 1) {
          competitiveStrength = 'high';
        } else if (mentionRate > 0.1 || data.coMentionedWithBrand > 0) {
          competitiveStrength = 'medium';
        }

        return {
          name,
          mention_count: data.mentions.length,
          mention_rate: mentionRate,
          avg_sentiment: avgSentiment,
          platforms_mentioned: Array.from(data.platforms),
          co_mentioned_with_brand: data.coMentionedWithBrand,
          competitive_strength: competitiveStrength,
          direct_comparisons: data.directComparisons,
          comparison_results: data.comparisonResults,
          key_contexts: [...new Set(data.contexts)].slice(0, 3),
          feature_comparisons: data.featureComparisons
        };
      })
      .sort((a, b) => {
        // Sort by competitive strength first, then by mention count
        if (a.competitive_strength !== b.competitive_strength) {
          return a.competitive_strength === 'high' ? -1 : b.competitive_strength === 'high' ? 1 : 
                 a.competitive_strength === 'medium' ? -1 : 1;
        }
        return b.mention_count - a.mention_count;
      });

    return { brandMetrics, competitorMetrics };
  }, [analysisResults]);

  const getCompetitiveStrengthColor = (strength: string) => {
    switch (strength) {
      case 'high':
        return 'hsl(var(--destructive))';
      case 'medium':
        return 'hsl(var(--warning))';
      default:
        return 'hsl(var(--success))';
    }
  };

  const getCompetitiveStrengthVariant = (strength: string) => {
    switch (strength) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'hsl(var(--success))';
    if (sentiment < -0.3) return 'hsl(var(--destructive))';
    return 'hsl(var(--warning))';
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Competitive Visibility Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading competitive data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!competitiveMetrics.brandMetrics || competitiveMetrics.competitorMetrics.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Competitive Visibility Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Competitive Data Available</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Add competitors in your project settings and run an analysis to see competitive insights.
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
            <Target className="w-4 h-4" />
            Competitive Visibility Matrix
            </CardTitle>
          <Badge variant="outline" className="text-xs">
            {competitiveMetrics.competitorMetrics.length} competitors
          </Badge>
          </div>
        </CardHeader>
        <CardContent>
        {/* Brand vs Competitors Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          {/* Brand Card */}
          <Card className="lg:col-span-2 bg-primary/5 border-primary/20">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Your Brand</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mentions</span>
                  <span className="font-semibold">{competitiveMetrics.brandMetrics.mention_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility Rate</span>
                  <span className="font-semibold">{Math.round(competitiveMetrics.brandMetrics.mention_rate * 100)}%</span>
                        </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Sentiment</span>
                  <span className={`font-semibold ${getSentimentColor(competitiveMetrics.brandMetrics.avg_sentiment)}`}>
                    {competitiveMetrics.brandMetrics.avg_sentiment > 0 ? '+' : ''}
                    {(competitiveMetrics.brandMetrics.avg_sentiment * 100).toFixed(0)}%
                        </span>
                      </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Platforms</span>
                  <span className="font-semibold">{competitiveMetrics.brandMetrics.platforms_mentioned.length}</span>
                </div>
          </div>
        </CardContent>
      </Card>

          {/* Competitive Strength */}
          <Card className="lg:col-span-3">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Competitive Strength</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
            <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Strong Competitors</span>
                    <span className="font-semibold">
                      {competitiveMetrics.competitorMetrics.filter(c => c.competitive_strength === 'high').length}
                    </span>
              </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Direct Comparisons</span>
                    <span className="font-semibold">
                      {competitiveMetrics.competitorMetrics.reduce((sum, c) => sum + (c.direct_comparisons || 0), 0)}
                    </span>
            </div>
            <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Co-mentions</span>
                    <span className="font-semibold">
                      {competitiveMetrics.competitorMetrics.reduce((sum, c) => sum + (c.co_mentioned_with_brand || 0), 0)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - (competitiveMetrics.brandMetrics.mention_count / 
                          (competitiveMetrics.brandMetrics.mention_count + 
                            competitiveMetrics.competitorMetrics.reduce((sum, c) => sum + c.mention_count, 0))))}`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-lg font-bold">
                        {Math.round(competitiveMetrics.brandMetrics.mention_count / 
                          (competitiveMetrics.brandMetrics.mention_count + 
                            competitiveMetrics.competitorMetrics.reduce((sum, c) => sum + c.mention_count, 0)) * 100)}%
                      </span>
                      <span className="text-xs text-muted-foreground">Share</span>
                    </div>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Competitor Cards */}
        <h3 className="text-sm font-medium mb-3">Competitor Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitiveMetrics.competitorMetrics.map((competitor) => (
            <Card key={competitor.name} className={`overflow-hidden border-l-4 ${getCompetitiveStrengthColor(competitor.competitive_strength)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium truncate">{competitor.name}</h3>
                  <Badge variant={getCompetitiveStrengthVariant(competitor.competitive_strength)}>
                    {competitor.competitive_strength.charAt(0).toUpperCase() + competitor.competitive_strength.slice(1)}
                  </Badge>
                </div>
                
          <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mentions</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm">{competitor.mention_count}</span>
                      {competitor.mention_count > competitiveMetrics.brandMetrics.mention_count ? (
                        <ArrowUp className="h-3 w-3 text-destructive" />
                      ) : competitor.mention_count < competitiveMetrics.brandMetrics.mention_count ? (
                        <ArrowDown className="h-3 w-3 text-success" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Visibility Rate</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm">{Math.round(competitor.mention_rate * 100)}%</span>
                      {competitor.mention_rate > competitiveMetrics.brandMetrics.mention_rate ? (
                        <ArrowUp className="h-3 w-3 text-destructive" />
                      ) : competitor.mention_rate < competitiveMetrics.brandMetrics.mention_rate ? (
                        <ArrowDown className="h-3 w-3 text-success" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sentiment</span>
                    <div className="flex items-center gap-1">
                      <span className={`font-medium text-sm ${getSentimentColor(competitor.avg_sentiment)}`}>
                        {competitor.avg_sentiment > 0 ? '+' : ''}
                        {(competitor.avg_sentiment * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  {competitor.direct_comparisons > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Direct Comparisons</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{competitor.direct_comparisons}</span>
                        <div className="flex items-center gap-1">
                          {competitor.comparison_results.brand_better > 0 && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              <Check className="h-2 w-2 mr-0.5" /> {competitor.comparison_results.brand_better}
                            </Badge>
                          )}
                          {competitor.comparison_results.competitor_better > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              <X className="h-2 w-2 mr-0.5" /> {competitor.comparison_results.competitor_better}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {competitor.co_mentioned_with_brand > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Co-mentioned</span>
                      <span className="font-medium text-sm">{competitor.co_mentioned_with_brand}x</span>
                    </div>
                  )}
                </div>
                
                {competitor.key_contexts && competitor.key_contexts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Key Context:</p>
                    <p className="text-xs italic">{truncateText(competitor.key_contexts[0], 100)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </CardContent>
      </Card>
  );
};