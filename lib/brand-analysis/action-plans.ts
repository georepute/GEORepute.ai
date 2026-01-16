import { BrandAnalysisContext } from "@/hooks/useBrandAnalysisContext";

export interface PlatformActionPlan {
  platform: string;
  quickWins: string[];
  checklist: Array<{
    label: string;
    hint?: string;
  }>;
  recommendedSchema: string[];
  freddiePrompt: string;
  priorityLevel: 'high' | 'medium' | 'low';
}

export interface ActionPlanContext {
  brandName: string;
  industry?: string;
  competitors: string[];
  totalMentions: number;
  totalQueries: number;
  visibilityScore: number;
  sentimentScore: number;
}

export const generatePlatformActionPlan = (
  platformMetrics: any,
  context: ActionPlanContext
): PlatformActionPlan => {
  const platform = platformMetrics.platform;
  const mentionRate = platformMetrics.mentionRate || 0;
  const avgSentiment = platformMetrics.avgSentiment || 0;
  const avgPosition = platformMetrics.avgPosition || 0;
  const opportunityScore = platformMetrics.opportunityScore || 0;
  const totalQueries = platformMetrics.totalQueries || 0;
  const topCompetitors = platformMetrics.topCompetitors || [];

  const quickWins: string[] = [];
  const checklist: Array<{ label: string; hint?: string }> = [];
  const recommendedSchema: string[] = [];

  // Generate quick wins based on metrics
  if (mentionRate < 0.3) {
    quickWins.push(`Add llms.txt with ${context.brandName} policies and core information`);
    quickWins.push(`Create FAQ section answering key questions about ${context.brandName}`);
    recommendedSchema.push('Organization', 'FAQ');
  }

  if (mentionRate < 0.5 && totalQueries > 5) {
    quickWins.push(`Publish detailed "About ${context.brandName}" page with rich metadata`);
    recommendedSchema.push('Organization', 'Website');
  }

  if (avgSentiment < 0) {
    quickWins.push(`Address negative sentiment with clarification content`);
    quickWins.push(`Create comparison page highlighting ${context.brandName} advantages`);
  }

  if (avgPosition > 3 && mentionRate > 0.2) {
    quickWins.push(`Optimize content for higher positioning on ${platform}`);
    quickWins.push(`Add structured data to improve content clarity`);
    recommendedSchema.push('Article', 'BlogPosting');
  }

  if (topCompetitors.length > 0) {
    const mainCompetitor = topCompetitors[0]?.name;
    quickWins.push(`Create "${context.brandName} vs ${mainCompetitor}" comparison content`);
    quickWins.push(`Add disambiguating content to differentiate from competitors`);
  }

  // Generate checklist items
  checklist.push({
    label: 'Verify llms.txt exists and is comprehensive',
    hint: 'Include company policies, key personnel, and core offerings'
  });

  checklist.push({
    label: 'Audit existing content for platform-specific optimization',
    hint: `Check if content answers questions commonly asked on ${platform}`
  });

  if (mentionRate < 0.4) {
    checklist.push({
      label: 'Create sourceable assets page',
      hint: 'Pricing, features, testimonials that AI can cite'
    });
  }

  if (avgSentiment < 0.1) {
    checklist.push({
      label: 'Test brand vs competitors prompts',
      hint: 'Identify negative sentiment triggers and address them'
    });
  }

  checklist.push({
    label: 'Add structured data markup',
    hint: 'Organization, Product, or Article schema depending on content type'
  });

  checklist.push({
    label: 'Monitor and iterate based on results',
    hint: 'Track improvements over the next 2-4 weeks'
  });

  // Generate Freddie prompt
  const competitorContext = topCompetitors.length > 0 
    ? `\nCompetitors frequently mentioned: ${topCompetitors.map(c => c.name).join(', ')}`
    : '';

  const freddiePrompt = `Help me improve ${context.brandName}'s visibility on ${platform}.

Current Performance:
- Total queries analyzed: ${totalQueries}
- Mention rate: ${Math.round(mentionRate * 100)}%
- Average position when mentioned: ${avgPosition > 0 ? avgPosition.toFixed(1) : 'N/A'}
- Sentiment score: ${avgSentiment > 0 ? '+' : ''}${Math.round(avgSentiment * 100)}%
- Opportunity score: ${opportunityScore.toFixed(1)}${competitorContext}

Goals:
1. ${mentionRate < 0.3 ? 'Increase visibility and mention rate' : 'Maintain and improve positioning'}
2. ${avgSentiment < 0 ? 'Improve sentiment and brand perception' : 'Maintain positive sentiment'}
3. ${topCompetitors.length > 0 ? `Outrank key competitors: ${topCompetitors.slice(0,2).map(c => c.name).join(', ')}` : 'Strengthen competitive position'}

Please provide a prioritized 14-day action plan with:
- Specific content pieces to create
- Schema markup recommendations  
- Platform-specific optimization tactics
- Measurement strategy`;

  const priorityLevel: 'high' | 'medium' | 'low' = 
    opportunityScore > 5 ? 'high' :
    opportunityScore > 2 ? 'medium' : 'low';

  return {
    platform,
    quickWins: quickWins.slice(0, 4), // Limit to top 4 wins
    checklist,
    recommendedSchema: [...new Set(recommendedSchema)], // Remove duplicates
    freddiePrompt,
    priorityLevel
  };
};

export const generateMatrixQuickWins = (context: BrandAnalysisContext): string[] => {
  const quickWins: string[] = [];

  if (context.totalMentions < context.totalQueries * 0.3) {
    quickWins.push('Create comprehensive llms.txt file with brand policies');
    quickWins.push('Add Organization schema to main website');
  }

  if (context.sentimentScore < 0.1) {
    quickWins.push('Address negative sentiment with clarification content');
  }

  if (context.lowPerformingPlatforms.length > 0) {
    const platform = context.lowPerformingPlatforms[0];
    quickWins.push(`Focus optimization efforts on ${platform} (highest opportunity)`);
  }

  if (context.competitorMentions.length > 0) {
    const topCompetitor = context.competitorMentions[0].competitor;
    quickWins.push(`Create comparison content vs ${topCompetitor}`);
  }

  return quickWins.slice(0, 4);
};