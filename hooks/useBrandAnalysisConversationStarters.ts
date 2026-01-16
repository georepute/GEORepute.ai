import { useMemo } from 'react';
import { useBrandAnalysisResults } from './useBrandAnalysisResults';
import { useBrandAnalysisProject } from './useBrandAnalysisProjects';

export interface BrandAnalysisConversationStarter {
  id: string;
  category: 'insights' | 'competitive' | 'optimization' | 'strategy';
  title: string;
  question: string;
  priority: number;
  conditions?: {
    requiresMentions?: boolean;
    minMentions?: number;
    requiresCompetitors?: boolean;
    requiresSentiment?: boolean;
  };
}

export const useBrandAnalysisConversationStarters = (projectId: string) => {
  const { data: project } = useBrandAnalysisProject(projectId);
  const { data: analysisResults = [] } = useBrandAnalysisResults(projectId);

  const starters = useMemo((): BrandAnalysisConversationStarter[] => {
    if (!project || !analysisResults) return [];

    const brandMentions = analysisResults.filter(r => r.mention_found).length;
    const totalResponses = analysisResults.length;
    const visibilityRate = totalResponses > 0 ? (brandMentions / totalResponses) * 100 : 0;
    const hasCompetitors = analysisResults.some(r => r.competitor_mentions && r.competitor_mentions.length > 0);
    const avgSentiment = analysisResults
      .filter(r => r.sentiment_score !== null && r.sentiment_score !== undefined)
      .reduce((sum, r) => sum + (r.sentiment_score || 0), 0) / Math.max(1, analysisResults.filter(r => r.sentiment_score !== null).length);

    const baseStarters: BrandAnalysisConversationStarter[] = [
      // High Priority - Always Available
      {
        id: 'brand-overview',
        category: 'insights',
        title: '🎯 Brand Visibility Overview',
        question: `Give me a comprehensive overview of ${project.brand_name}'s performance across AI platforms`,
        priority: 10
      },
      {
        id: 'visibility-score',
        category: 'insights', 
        title: '📊 Visibility Performance',
        question: `Analyze ${project.brand_name}'s visibility score of ${Math.round(visibilityRate)}% - what does this mean and how can we improve it?`,
        priority: 9
      },
      {
        id: 'improvement-strategy',
        category: 'optimization',
        title: '🚀 Improvement Strategy',
        question: `Based on our brand visibility data, what are the top 3 strategies to improve ${project.brand_name}'s AI visibility?`,
        priority: 8
      },

      // Conditional Starters Based on Data
      ...(brandMentions > 0 ? [{
        id: 'mention-analysis',
        category: 'insights' as const,
        title: '🔍 Mention Deep Dive',
        question: `Analyze the ${brandMentions} brand mentions we found - what patterns do you see in how AI platforms discuss ${project.brand_name}?`,
        priority: 7,
        conditions: { requiresMentions: true, minMentions: 1 }
      }] : []),

      ...(hasCompetitors ? [{
        id: 'competitive-analysis',
        category: 'competitive' as const,
        title: '⚔️ Competitive Landscape',
        question: `How does ${project.brand_name} compare to competitors in AI platform mentions? What can we learn from their positioning?`,
        priority: 6,
        conditions: { requiresCompetitors: true }
      }] : []),

      ...(avgSentiment > 0 ? [{
        id: 'sentiment-insights',
        category: 'insights' as const,
        title: '💭 Sentiment Analysis',
        question: `Our sentiment score is ${Math.round(avgSentiment * 100)}% - what does this tell us about how AI platforms perceive ${project.brand_name}?`,
        priority: 5,
        conditions: { requiresSentiment: true }
      }] : []),

      // Industry and Platform Specific
      {
        id: 'platform-optimization',
        category: 'optimization',
        title: '🎯 Platform Optimization',
        question: `Which AI platforms should ${project.brand_name} focus on for maximum impact in the ${project.industry || 'our'} industry?`,
        priority: 4
      },
      {
        id: 'content-strategy',
        category: 'strategy',
        title: '📝 Content Strategy',
        question: `What type of content should ${project.brand_name} create to improve mentions and positioning in AI responses?`,
        priority: 3
      },

      // Low Priority - General Questions
      {
        id: 'industry-trends',
        category: 'strategy',
        title: '📈 Industry Trends',
        question: `What are the current AI visibility trends in the ${project.industry || 'industry'} that ${project.brand_name} should be aware of?`,
        priority: 2
      },
      {
        id: 'next-steps',
        category: 'strategy',
        title: '📋 Action Plan',
        question: `Create a 30-day action plan for ${project.brand_name} to improve AI visibility based on our analysis`,
        priority: 1
      }
    ];

    // Filter and sort by priority
    return baseStarters
      .filter(starter => {
        if (!starter.conditions) return true;
        
        const { requiresMentions, minMentions, requiresCompetitors, requiresSentiment } = starter.conditions;
        
        if (requiresMentions && brandMentions === 0) return false;
        if (minMentions && brandMentions < minMentions) return false;
        if (requiresCompetitors && !hasCompetitors) return false;
        if (requiresSentiment && avgSentiment === 0) return false;
        
        return true;
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6); // Show max 6 starters
  }, [project, analysisResults]);

  return { starters };
};