import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CompetitorData {
  name: string;
  mentions: number;
  sentiment: number;
  relevance: number;
  platforms: string[];
  trends: {
    mentions_trend: number;
    sentiment_trend: number;
  };
}

interface MarketPosition {
  brand: string;
  market_share: number;
  sentiment_score: number;
  mention_velocity: number;
  competitive_strength: number;
  positioning: 'leader' | 'challenger' | 'follower' | 'niche';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'analyze':
        result = await analyzeCompetitors(params, supabase);
        break;
      case 'rank':
        result = await rankCompetitors(params);
        break;
      case 'positioning':
        result = await calculateMarketPositioning(params, supabase);
        break;
      case 'share-of-voice':
        result = await calculateShareOfVoice(params);
        break;
      case 'gaps':
        result = await identifyCompetitiveGaps(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Competitor Analysis Engine error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeCompetitors(params: any, supabase: any) {
  const { brandName, competitors, analysisResults, timeframe = '30d' } = params;
  
  // Process analysis results to extract competitor data
  const competitorData: CompetitorData[] = [];
  const allBrands = [brandName, ...competitors];

  for (const brand of allBrands) {
    const brandResults = analysisResults.filter((result: any) => 
      result.content.toLowerCase().includes(brand.toLowerCase()) ||
      result.competitorMentions.includes(brand)
    );

    const mentions = brandResults.length;
    const avgSentiment = brandResults.reduce((sum: number, result: any) => sum + result.sentiment, 0) / Math.max(mentions, 1);
    const avgRelevance = brandResults.reduce((sum: number, result: any) => sum + result.relevance, 0) / Math.max(mentions, 1);
    const platforms = [...new Set(brandResults.map((result: any) => result.platform))];

    // Calculate trends (simplified - would need historical data for real trends)
    const mentionsTrend = mentions > 5 ? 0.15 : mentions > 2 ? 0.05 : -0.1;
    const sentimentTrend = avgSentiment > 0.7 ? 0.1 : avgSentiment < 0.4 ? -0.1 : 0;

    competitorData.push({
      name: brand,
      mentions,
      sentiment: avgSentiment,
      relevance: avgRelevance,
      platforms,
      trends: {
        mentions_trend: mentionsTrend,
        sentiment_trend: sentimentTrend
      }
    });
  }

  // Store analysis results
  const analysisId = crypto.randomUUID();
  await supabase.from('brand_analysis_results').insert({
    id: analysisId,
    brand_name: brandName,
    competitors: competitors,
    analysis_data: {
      competitor_data: competitorData,
      analysis_timestamp: new Date().toISOString(),
      timeframe
    }
  });

  return {
    analysis_id: analysisId,
    brand_name: brandName,
    competitor_data: competitorData,
    summary: {
      total_mentions: competitorData.reduce((sum, comp) => sum + comp.mentions, 0),
      avg_sentiment: competitorData.reduce((sum, comp) => sum + comp.sentiment, 0) / competitorData.length,
      platforms_analyzed: [...new Set(competitorData.flatMap(comp => comp.platforms))],
      analysis_date: new Date().toISOString()
    }
  };
}

async function rankCompetitors(params: any) {
  const { competitorData, rankingCriteria = 'overall' } = params;

  const rankedCompetitors = competitorData.map((competitor: CompetitorData) => {
    let score = 0;
    
    switch (rankingCriteria) {
      case 'mentions':
        score = competitor.mentions;
        break;
      case 'sentiment':
        score = competitor.sentiment;
        break;
      case 'relevance':
        score = competitor.relevance;
        break;
      case 'overall':
      default:
        // Weighted overall score
        score = (competitor.mentions * 0.3) + 
                (competitor.sentiment * 0.25) + 
                (competitor.relevance * 0.25) + 
                (competitor.platforms.length * 0.1) +
                (competitor.trends.mentions_trend * 0.05) +
                (competitor.trends.sentiment_trend * 0.05);
        break;
    }

    return {
      ...competitor,
      ranking_score: score,
      ranking_criteria: rankingCriteria
    };
  });

  // Sort by score (descending)
  rankedCompetitors.sort((a, b) => b.ranking_score - a.ranking_score);

  // Add ranking positions
  rankedCompetitors.forEach((competitor, index) => {
    competitor.rank = index + 1;
  });

  return {
    ranked_competitors: rankedCompetitors,
    ranking_criteria: rankingCriteria,
    top_performer: rankedCompetitors[0],
    ranking_date: new Date().toISOString()
  };
}

async function calculateMarketPositioning(params: any, supabase: any) {
  const { brandName, competitorData } = params;

  const totalMentions = competitorData.reduce((sum: number, comp: CompetitorData) => sum + comp.mentions, 0);
  
  const marketPositions: MarketPosition[] = competitorData.map((competitor: CompetitorData) => {
    const marketShare = totalMentions > 0 ? competitor.mentions / totalMentions : 0;
    const mentionVelocity = competitor.trends.mentions_trend;
    
    // Calculate competitive strength (0-1 scale)
    const competitiveStrength = (
      marketShare * 0.4 +
      competitor.sentiment * 0.3 +
      competitor.relevance * 0.2 +
      Math.max(0, mentionVelocity) * 0.1
    );

    // Determine positioning quadrant
    let positioning: 'leader' | 'challenger' | 'follower' | 'niche';
    if (marketShare > 0.25 && competitiveStrength > 0.7) {
      positioning = 'leader';
    } else if (marketShare > 0.15 && competitiveStrength > 0.6) {
      positioning = 'challenger';
    } else if (marketShare > 0.05) {
      positioning = 'follower';
    } else {
      positioning = 'niche';
    }

    return {
      brand: competitor.name,
      market_share: marketShare,
      sentiment_score: competitor.sentiment,
      mention_velocity: mentionVelocity,
      competitive_strength: competitiveStrength,
      positioning
    };
  });

  // Store positioning analysis
  await supabase.from('agent_analytics').insert({
    agent_name: 'competitor-positioning',
    success: true,
    response_time_ms: 0,
    tokens_used: 0,
    cost_usd: 0,
    user_id: params.userId
  });

  return {
    market_positions: marketPositions,
    market_leader: marketPositions.find(pos => pos.positioning === 'leader'),
    your_brand_position: marketPositions.find(pos => pos.brand === brandName),
    competitive_landscape: {
      leaders: marketPositions.filter(pos => pos.positioning === 'leader').length,
      challengers: marketPositions.filter(pos => pos.positioning === 'challenger').length,
      followers: marketPositions.filter(pos => pos.positioning === 'follower').length,
      niche_players: marketPositions.filter(pos => pos.positioning === 'niche').length
    },
    analysis_date: new Date().toISOString()
  };
}

async function calculateShareOfVoice(params: any) {
  const { competitorData, timeframe = '30d' } = params;

  const totalMentions = competitorData.reduce((sum: number, comp: CompetitorData) => sum + comp.mentions, 0);
  
  const shareOfVoice = competitorData.map((competitor: CompetitorData) => {
    const share = totalMentions > 0 ? (competitor.mentions / totalMentions) * 100 : 0;
    const weightedShare = share * competitor.relevance; // Weight by relevance
    
    return {
      brand: competitor.name,
      mentions: competitor.mentions,
      share_percentage: share,
      weighted_share: weightedShare,
      sentiment_weighted_share: weightedShare * competitor.sentiment,
      platforms: competitor.platforms,
      trend: competitor.trends.mentions_trend
    };
  });

  // Sort by share percentage
  shareOfVoice.sort((a, b) => b.share_percentage - a.share_percentage);

  return {
    share_of_voice: shareOfVoice,
    total_mentions: totalMentions,
    market_concentration: {
      top_3_share: shareOfVoice.slice(0, 3).reduce((sum, brand) => sum + brand.share_percentage, 0),
      herfindahl_index: shareOfVoice.reduce((sum, brand) => sum + Math.pow(brand.share_percentage / 100, 2), 0)
    },
    timeframe,
    analysis_date: new Date().toISOString()
  };
}

async function identifyCompetitiveGaps(params: any) {
  const { brandName, competitorData, analysisResults } = params;

  const yourBrand = competitorData.find((comp: CompetitorData) => comp.name === brandName);
  const competitors = competitorData.filter((comp: CompetitorData) => comp.name !== brandName);

  if (!yourBrand) {
    throw new Error('Brand not found in competitor data');
  }

  const gaps = [];

  // Analyze sentiment gaps
  const avgCompetitorSentiment = competitors.reduce((sum, comp) => sum + comp.sentiment, 0) / competitors.length;
  if (yourBrand.sentiment < avgCompetitorSentiment - 0.1) {
    gaps.push({
      type: 'sentiment',
      severity: 'high',
      description: `Your brand sentiment (${(yourBrand.sentiment * 100).toFixed(1)}%) is below competitor average (${(avgCompetitorSentiment * 100).toFixed(1)}%)`,
      recommendation: 'Focus on improving customer satisfaction and addressing negative feedback'
    });
  }

  // Analyze mention volume gaps
  const avgCompetitorMentions = competitors.reduce((sum, comp) => sum + comp.mentions, 0) / competitors.length;
  if (yourBrand.mentions < avgCompetitorMentions * 0.7) {
    gaps.push({
      type: 'visibility',
      severity: 'medium',
      description: `Your brand has ${yourBrand.mentions} mentions vs competitor average of ${avgCompetitorMentions.toFixed(1)}`,
      recommendation: 'Increase content marketing and thought leadership efforts'
    });
  }

  // Analyze platform presence gaps
  const allPlatforms = [...new Set(competitors.flatMap(comp => comp.platforms))];
  const missingPlatforms = allPlatforms.filter(platform => !yourBrand.platforms.includes(platform));
  if (missingPlatforms.length > 0) {
    gaps.push({
      type: 'platform_coverage',
      severity: 'low',
      description: `Your brand is not present on: ${missingPlatforms.join(', ')}`,
      recommendation: `Consider expanding presence to ${missingPlatforms.join(', ')} platforms`
    });
  }

  // Analyze trending gaps
  const competitorTrends = competitors.map(comp => comp.trends.mentions_trend);
  const avgCompetitorTrend = competitorTrends.reduce((sum, trend) => sum + trend, 0) / competitorTrends.length;
  if (yourBrand.trends.mentions_trend < avgCompetitorTrend - 0.05) {
    gaps.push({
      type: 'momentum',
      severity: 'high',
      description: 'Your brand momentum is lagging behind competitors',
      recommendation: 'Implement aggressive growth marketing and PR campaigns'
    });
  }

  return {
    brand_name: brandName,
    competitive_gaps: gaps,
    gap_summary: {
      total_gaps: gaps.length,
      high_severity: gaps.filter(gap => gap.severity === 'high').length,
      medium_severity: gaps.filter(gap => gap.severity === 'medium').length,
      low_severity: gaps.filter(gap => gap.severity === 'low').length
    },
    priority_actions: gaps
      .filter(gap => gap.severity === 'high')
      .map(gap => gap.recommendation),
    analysis_date: new Date().toISOString()
  };
}