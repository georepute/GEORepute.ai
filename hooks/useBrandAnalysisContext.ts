import { useMemo } from 'react';
import { useBrandAnalysisProject } from './useBrandAnalysisProjects';
import { useBrandAnalysisResults, useBrandAnalysisSessions } from './useBrandAnalysisResults';
// Note: visibilityScoreCalculator may need to be created or imported from brand-analysis-only
// For now, using placeholder functions
function calculateVisibilityScore(factors: any): number {
  // Placeholder - implement based on brand-analysis-only logic
  return 0;
}
function getBrandMaturity(score: number): string {
  // Placeholder
  return 'emerging';
}

export interface BrandAnalysisContext {
  projectId: string;
  brandName: string;
  industry?: string;
  website?: string;
  competitors: string[];
  targetKeywords: string[];
  activePlatforms: string[];
  
  // Analysis Results
  totalMentions: number;
  totalQueries: number;
  visibilityScore: number;
  sentimentScore: number;
  
  // Platform Performance
  platformPerformance: Array<{
    platform: string;
    mentions: number;
    queries: number;
    rate: number;
  }>;
  
  // Competitive Intelligence
  competitorMentions: Array<{
    competitor: string;
    mentions: number;
    contexts: string[];
  }>;
  
  // Recent Sessions
  lastAnalysisDate?: string;
  recentSessions: Array<{
    date: string;
    status: string;
    queriesCompleted: number;
    totalQueries: number;
  }>;
  
  // Key Insights
  topMentionContexts: string[];
  lowPerformingPlatforms: string[];
  topOpportunities: string[];
}

export const useBrandAnalysisContext = (projectId: string): BrandAnalysisContext | null => {
  const { data: project } = useBrandAnalysisProject(projectId);
  const { data: analysisResults = [] } = useBrandAnalysisResults(projectId);
  const { data: sessions = [] } = useBrandAnalysisSessions(projectId);

  const context = useMemo((): BrandAnalysisContext | null => {
    if (!project) return null;

    // Calculate metrics from real data
    const brandMentions = analysisResults.filter(r => r.mention_found);
    const totalMentions = brandMentions.length;
    const totalQueries = analysisResults.length;
    
    // Platform performance analysis (moved up for visibility score calculation)
    const platformStats = analysisResults.reduce((acc, result) => {
      const platform = result.ai_platform;
      if (!acc[platform]) {
        acc[platform] = { mentions: 0, queries: 0, positions: [], sentiments: [] };
      }
      acc[platform].queries++;
      if (result.mention_found) {
        acc[platform].mentions++;
        // Extract position and sentiment data if available
        if (result.mention_position) acc[platform].positions.push(result.mention_position);
        if (result.sentiment_score !== null) acc[platform].sentiments.push(result.sentiment_score);
      }
      return acc;
    }, {} as Record<string, { mentions: number; queries: number; positions: number[]; sentiments: number[] }>);

    // Prepare data for advanced visibility score calculation
    const visibilityFactors: VisibilityScoreFactors = {
      brandMentions: totalMentions,
      totalQueries,
      industry: project.industry || 'Technology',
      brandMaturity: getBrandMaturity(totalQueries),
      platformData: Object.entries(platformStats).map(([platform, stats]) => ({
        platform,
        mentions: stats.mentions,
        queries: stats.queries,
        position: stats.positions.length > 0 ? stats.positions.reduce((sum, pos) => sum + pos, 0) / stats.positions.length : undefined,
        sentiment: stats.sentiments.length > 0 ? stats.sentiments.reduce((sum, sent) => sum + sent, 0) / stats.sentiments.length : undefined,
        contextRelevance: 0.7 // Default value, could be enhanced with actual context analysis
      }))
    };

    // Calculate advanced visibility score
    const visibilityResult = calculateVisibilityScore(visibilityFactors);
    const visibilityScore = visibilityResult.overallScore;
    
    // Calculate sentiment
    const sentimentValues = analysisResults
      .filter(r => r.sentiment_score !== null && r.sentiment_score !== undefined)
      .map(r => r.sentiment_score || 0);
    const sentimentScore = sentimentValues.length > 0 
      ? Math.round((sentimentValues.reduce((sum, score) => sum + score, 0) / sentimentValues.length) * 100)
      : 0;

    // Create platform performance array from the existing platformStats
    const platformPerformance = Object.entries(platformStats).map(([platform, stats]) => ({
      platform,
      mentions: stats.mentions,
      queries: stats.queries,
      rate: stats.queries > 0 ? Math.round((stats.mentions / stats.queries) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);

    // Competitive intelligence
    const competitorMap = new Map<string, { mentions: number; contexts: string[] }>();
    analysisResults.forEach(result => {
      if (result.competitor_mentions && result.competitor_mentions.length > 0) {
        result.competitor_mentions.forEach(competitor => {
          const existing = competitorMap.get(competitor) || { mentions: 0, contexts: [] };
          existing.mentions++;
          if (result.mention_context && !existing.contexts.includes(result.mention_context)) {
            existing.contexts.push(result.mention_context);
          }
          competitorMap.set(competitor, existing);
        });
      }
    });

    const competitorMentions = Array.from(competitorMap.entries())
      .map(([competitor, data]) => ({
        competitor,
        mentions: data.mentions,
        contexts: data.contexts.slice(0, 3) // Top 3 contexts
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5); // Top 5 competitors

    // Recent sessions analysis
    const recentSessions = sessions.slice(0, 5).map(session => ({
      date: session.created_at,
      status: session.status || 'unknown',
      queriesCompleted: session.completed_queries || 0,
      totalQueries: session.total_queries || 0
    }));

    // Key insights
    const topMentionContexts = brandMentions
      .filter(m => m.mention_context)
      .map(m => m.mention_context!)
      .slice(0, 5);

    const lowPerformingPlatforms = platformPerformance
      .filter(p => p.rate < 20 && p.queries > 0)
      .map(p => p.platform);

    // Generate opportunities based on data
    const topOpportunities: string[] = [];
    if (visibilityScore < 30) {
      topOpportunities.push("Improve overall brand visibility across AI platforms");
    }
    if (competitorMentions.length > 0) {
      topOpportunities.push(`Learn from ${competitorMentions[0].competitor}'s positioning strategy`);
    }
    if (lowPerformingPlatforms.length > 0) {
      topOpportunities.push(`Focus optimization efforts on ${lowPerformingPlatforms.join(', ')}`);
    }
    if (sentimentScore > 0 && sentimentScore < 60) {
      topOpportunities.push("Improve brand sentiment in AI responses");
    }
    if (project.target_keywords && project.target_keywords.length > 0) {
      topOpportunities.push("Optimize content for target keywords to increase mentions");
    }

    return {
      projectId: project.id,
      brandName: project.brand_name,
      industry: project.industry,
      website: project.website_url,
      competitors: project.competitors || [],
      targetKeywords: project.target_keywords || [],
      activePlatforms: project.active_platforms || [],
      
      totalMentions,
      totalQueries,
      visibilityScore,
      sentimentScore,
      
      platformPerformance,
      competitorMentions,
      
      lastAnalysisDate: project.last_analysis_at,
      recentSessions,
      
      topMentionContexts,
      lowPerformingPlatforms,
      topOpportunities
    };
  }, [project, analysisResults, sessions]);

  return context;
};