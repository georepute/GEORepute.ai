"use client";
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Card, CardDescription } from '@/components/Card';
import { AlertTriangle, MessageSquare, Search, Loader2, Copy, Download, Flag, Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';
import { MarkdownFormatter } from './MarkdownFormatter';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface CompetitorPromptsModalProps {
  competitorId: string;
  competitorName: string;
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Add projectId prop
}

interface PromptResult {
  platform: string;
  prompt: string;
  response: string;
  mention_position?: number;
  sentiment_score?: number;
  created_at: string;
  context?: string; // Added context field
}

export function CompetitorPromptsModal({ competitorId, competitorName, isOpen, onClose, projectId }: CompetitorPromptsModalProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [promptResults, setPromptResults] = useState<PromptResult[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const { data: analysisResults = [] } = useBrandAnalysisResults(projectId || competitorId);

  useEffect(() => {
    if (isOpen) {
      loadPromptResults();
    }
  }, [isOpen, competitorId, analysisResults]);

  const loadPromptResults = async () => {
    try {
      setLoading(true);
      console.log("Loading prompt results for competitor:", competitorName);
      console.log("Available analysis results:", analysisResults.length);

      // Filter analysis results to find those mentioning the competitor
      const competitorResults = analysisResults.filter(result => {
        // Check in competitor_mentions array
        if (result.competitor_mentions && result.competitor_mentions.includes(competitorName)) {
          return true;
        }
        
        // Check in raw response content
        if (result.raw_response && typeof result.raw_response === 'object' && result.raw_response.content) {
          const content = result.raw_response.content;
          if (typeof content === 'string' && content.toLowerCase().includes(competitorName.toLowerCase())) {
            return true;
          }
        }
        
        // Check in response_metadata
        const metadata = (result as any).response_metadata;
        if (metadata) {
          // Check in competitor_contexts
          if (metadata.competitor_contexts && metadata.competitor_contexts[competitorName]) {
            return true;
          }
          
          // Check in competitors_found array
          if (metadata.competitors_found && Array.isArray(metadata.competitors_found) && 
              metadata.competitors_found.includes(competitorName)) {
            return true;
          }
        }
        
        return false;
      });

      console.log("Found competitor results:", competitorResults.length);

      if (competitorResults.length === 0) {
        setPromptResults([]);
        setPlatforms([]);
        setLoading(false);
        return;
      }

      // Transform to prompt results format
      const results: PromptResult[] = competitorResults.map(result => {
        // Try to get context from response_metadata if available
        const metadata = (result as any).response_metadata;
        let context = null;
        let position = null;
        
        // Get context from metadata if available
        if (metadata && metadata.competitor_contexts && metadata.competitor_contexts[competitorName]) {
          context = metadata.competitor_contexts[competitorName].context;
          position = metadata.competitor_contexts[competitorName].position;
        }
        
        // If no context found but we have raw response, extract it
        if (!context && result.raw_response && result.raw_response.content) {
          const content = result.raw_response.content;
          if (typeof content === 'string') {
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const competitorSentence = sentences.find(s => 
              s.toLowerCase().includes(competitorName.toLowerCase())
            );
            
            if (competitorSentence) {
              context = competitorSentence.trim();
              position = sentences.findIndex(s => s.toLowerCase().includes(competitorName.toLowerCase())) + 1;
            }
          }
        }
        
        return {
          platform: result.ai_platform,
          prompt: result.query_text || '',
          response: result.raw_response?.content || result.mention_context || '',
          mention_position: position || result.mention_position,
          sentiment_score: result.sentiment_score,
          created_at: result.analysis_date,
          context: context
        };
      });

      const uniquePlatforms = [...new Set(results.map(r => r.platform).filter(Boolean))];
      
      console.log("Processed prompt results:", results);
      setPromptResults(results);
      setPlatforms(uniquePlatforms);
    } catch (error) {
      console.error('Error loading prompt results:', error);
      toast.error('Failed to load competitor mentions');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = activeTab === 'all' 
    ? promptResults 
    : promptResults.filter(r => r.platform === activeTab);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentBadge = (score?: number) => {
    if (score === undefined || score === null) return null;
    
    if (score > 0.3) {
      return <Badge variant="success">Positive</Badge>;
    } else if (score < -0.3) {
      return <Badge variant="destructive">Negative</Badge>;
    } else {
      return <Badge variant="outline">Neutral</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {competitorName} Mentions
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : promptResults.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Mentions Found</h3>
            <p className="text-muted-foreground">
              No data available for competitor mentions.
            </p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList className="overflow-x-auto">
                  <TabsTrigger value="all">All Platforms</TabsTrigger>
                  {platforms.map(platform => (
                    <TabsTrigger key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              <TabsContent value={activeTab} className="space-y-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Showing {filteredResults.length} mention{filteredResults.length !== 1 ? 's' : ''} 
                  {activeTab !== 'all' ? ` on ${activeTab}` : ''}
                </div>
                
                {filteredResults.map((result, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 py-2 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {result.platform}
                          </Badge>
                          {result.mention_position && (
                            <Badge variant="outline" className="text-xs">
                              Position: {result.mention_position}
                            </Badge>
                          )}
                          {getSentimentBadge(result.sentiment_score)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(result.created_at)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Prompt</div>
                        <div className="text-sm bg-muted/20 p-2 rounded-md">
                          <MarkdownFormatter content={result.prompt} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Response</div>
                        <div className="text-sm bg-muted/10 p-2 rounded-md max-h-[200px] overflow-y-auto">
                          <MarkdownFormatter 
                            content={result.response} 
                            highlightTerms={[{
                              term: competitorName,
                              className: "bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded font-medium"
                            }]}
                          />
                        </div>
                      </div>

                      {result.context && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Key Mention</div>
                          <div className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md border border-yellow-200 dark:border-yellow-900/30">
                            <MarkdownFormatter 
                              content={result.context}
                              highlightTerms={[{
                                term: competitorName,
                                className: "font-medium text-primary"
                              }]}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}