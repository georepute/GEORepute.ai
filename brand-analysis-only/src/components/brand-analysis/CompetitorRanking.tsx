import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, RefreshCw, TrendingUp, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CompetitorPromptsModal } from './CompetitorPromptsModal';
import { toast } from 'sonner';
import { useBrandAnalysisProject } from '@/hooks/useBrandAnalysisProjects';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';
import { PlatformLogo } from './PlatformLogo';

interface CompetitorAnalysisProps {
  projectId: string;
  sessionId?: string;
}

interface CompetitorWithAnalysis {
  name: string;
  totalMentions: number;
  averageRank: number;
  bestPlatform: string;
  contexts: Array<{
    context: string;
    platform: string;
    position: number | null;
    sentiment: number | null;
  }>;
}

export const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ projectId, sessionId }) => {
  const { data: analysisResults = [], isLoading } = useBrandAnalysisResults(projectId, sessionId);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const { data: project } = useBrandAnalysisProject(projectId);

  // Process competitor data from analysis results
  const competitorData = useMemo(() => {
    if (!analysisResults.length) return [];

    const competitorMap = new Map<string, CompetitorWithAnalysis>();
    const EXCLUDED_COMPETITORS = new Set<string>([
        'google','microsoft','apple','amazon','facebook','meta','youtube','bing','twitter','x','linkedin','instagram','reddit','tiktok'
    ]);

    analysisResults.forEach(result => {
        const mentionedInThisResult = new Set<string>();
        const userDefinedCompetitors: string[] = Array.isArray(project?.competitors) ? project!.competitors : [];

        // Prefer structured competitor_mentions array
        if (result.competitor_mentions && result.competitor_mentions.length > 0) {
            result.competitor_mentions.forEach(competitor => {
                const lowerCompetitor = (competitor || '').toLowerCase();
                if (lowerCompetitor && !EXCLUDED_COMPETITORS.has(lowerCompetitor)) {
                    mentionedInThisResult.add(competitor);
                }
            });
        } 
        // Fallback to raw content search if no structured mentions
        else if (result.raw_response && typeof result.raw_response === 'object' && result.raw_response.content) {
            const content = result.raw_response.content.toLowerCase();
            const allPossibleCompetitors = [...userDefinedCompetitors, 'hubspot', 'salesforce', 'pipedrive', 'zoho', 'monday', 'asana', 'trello', 'mailchimp', 'klaviyo', 'shopify', 'wix', 'squarespace', 'wordpress'];
            
            allPossibleCompetitors.forEach(competitor => {
                const lowerCompetitor = competitor.toLowerCase();
                if (!EXCLUDED_COMPETITORS.has(lowerCompetitor) && content.includes(lowerCompetitor)) {
                    mentionedInThisResult.add(competitor);
                }
            });
        }

        // Update competitor map based on unique mentions in this result
        mentionedInThisResult.forEach(competitor => {
            if (!competitorMap.has(competitor)) {
                competitorMap.set(competitor, {
                    name: competitor,
                    totalMentions: 0,
                    averageRank: 0,
                    bestPlatform: '',
                    contexts: []
                });
            }
            
            const comp = competitorMap.get(competitor)!;
            comp.totalMentions += 1;
            
            const metadata = (result as any).response_metadata;
            if (metadata && metadata.competitor_contexts && metadata.competitor_contexts[competitor]) {
                comp.contexts.push({
                    context: metadata.competitor_contexts[competitor].context || 'No context available',
                    platform: result.ai_platform,
                    position: metadata.competitor_contexts[competitor].position || null,
                    sentiment: metadata.competitor_contexts[competitor].sentiment || null
                });
            } else {
                comp.contexts.push({
                    context: result.mention_context || 'Mentioned in response',
                    platform: result.ai_platform,
                    position: null,
                    sentiment: null
                });
            }
        });
    });

    // Final calculations for each competitor
    competitorMap.forEach((competitor) => {
        const platformCounts = competitor.contexts.reduce((acc, context) => {
            acc[context.platform] = (acc[context.platform] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        competitor.bestPlatform = Object.entries(platformCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([platform]) => platform)[0] || '';
        
        const positions = competitor.contexts
            .map(c => c.position)
            .filter(p => p !== null) as number[];
        
        competitor.averageRank = positions.length > 0 
            ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length 
            : 0;
    });

    return Array.from(competitorMap.values())
        .sort((a, b) => b.totalMentions - a.totalMentions);
}, [analysisResults, project?.competitors]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-4"></div>
            <p className="text-sm text-muted-foreground">Loading competitor data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (competitorData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Competitor Data</h3>
          <p className="text-muted-foreground mb-4">
            No competitors were mentioned in the AI responses. Run more analyses to gather competitor intelligence.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Competitor Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on mentions across AI platform responses
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {competitorData.length} competitors found
              </Badge>
            </div>
          </div>

          {/* Competitors List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {competitorData.map((competitor, index) => (
              <div key={competitor.name} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    
                    {/* Competitor Info */}
                    <div className="min-w-0">
                      <h4 className="font-medium text-foreground capitalize">
                        {competitor.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{competitor.totalMentions} mentions</span>
                        {competitor.bestPlatform && (
                          <span>Best on {competitor.bestPlatform}</span>
                        )}
                        {competitor.averageRank > 0 && (
                          <span>Avg rank: #{competitor.averageRank.toFixed(1)}</span>
                        )}
                      </div>
                      
                      {/* Context Preview */}
                      {competitor.contexts.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1 max-w-md">
                          {competitor.contexts[0].context}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mentions Count & Action */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {competitor.totalMentions} mentions
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {competitor.contexts.length} contexts
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedCompetitor(competitor.name)}
                    >
                      View Prompts
                    </Button>
                  </div>
                </div>

                {/* Platform Distribution */}
                {competitor.contexts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Platforms:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(
                          competitor.contexts.reduce((acc, context) => {
                            acc[context.platform] = (acc[context.platform] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 4)
                          .map(([platform, count]) => (
                            <Badge key={platform} variant="secondary" className="text-xs flex items-center gap-1.5">
                                <PlatformLogo platform={platform} size={12} />
                                <span className="capitalize">{platform} ({count})</span>
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Stats */}
          <div className="p-4 border-t bg-gray-50/50 dark:bg-gray-800/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-primary">
                  {competitorData.reduce((sum, c) => sum + c.totalMentions, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Mentions</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {competitorData.length}
                </div>
                <div className="text-xs text-muted-foreground">Competitors Found</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {[...new Set(competitorData.flatMap(c => c.contexts.map(ctx => ctx.platform)))].length}
                </div>
                <div className="text-xs text-muted-foreground">Platforms</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Competitor Prompts Modal */}
      {selectedCompetitor && (
        <CompetitorPromptsModal
          competitorId={selectedCompetitor}
          competitorName={selectedCompetitor}
          isOpen={!!selectedCompetitor}
          onClose={() => setSelectedCompetitor(null)}
          projectId={projectId}
        />
      )}
    </>
  );
};