import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface CompetitorAnalysisResult {
  competitor_data: CompetitorData[];
  rankings: any;
  market_positions: MarketPosition[];
  share_of_voice: any[];
  competitive_gaps: any[];
  summary: any;
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
      case 'full-analysis':
        // Run complete competitor analysis pipeline
        result = await runFullCompetitorAnalysis(params, supabase);
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

/**
 * Run full competitor analysis pipeline
 * This is called after brand-analysis completes
 */
async function runFullCompetitorAnalysis(params: any, supabase: any): Promise<CompetitorAnalysisResult> {
  const { sessionId, projectId, brandName, competitors } = params;

  console.log(`🔍 Starting full competitor analysis for session: ${sessionId}`);

  // Fetch all responses from the session
  const { data: responses, error: fetchError } = await supabase
    .from('ai_platform_responses')
    .select('*')
    .eq('session_id', sessionId);

  if (fetchError) {
    throw new Error(`Failed to fetch responses: ${fetchError.message}`);
  }

  if (!responses || responses.length === 0) {
    throw new Error('No responses found for this session');
  }

  console.log(`📊 Analyzing ${responses.length} responses for competitors`);

  // Step 1: Extract competitor data from responses
  const competitorData = extractCompetitorData(brandName, competitors || [], responses);
  console.log(`✅ Extracted data for ${competitorData.length} brands`);

  // Step 2: Rank competitors
  const rankings = rankCompetitors({ competitorData, rankingCriteria: 'overall' });
  console.log(`✅ Ranked ${rankings.ranked_competitors.length} competitors`);

  // Step 3: Calculate market positioning
  const marketPositions = calculateMarketPositioningSync(brandName, competitorData);
  console.log(`✅ Calculated market positions`);

  // Step 4: Calculate share of voice
  const shareOfVoice = calculateShareOfVoiceSync(competitorData);
  console.log(`✅ Calculated share of voice`);

  // Step 5: Identify competitive gaps
  const competitiveGaps = identifyCompetitiveGapsSync(brandName, competitorData);
  console.log(`✅ Identified ${competitiveGaps.competitive_gaps.length} competitive gaps`);

  // Store analysis results and mark session as COMPLETED
  const { error: storeError } = await supabase
    .from('brand_analysis_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      competitor_analysis: {
        competitor_data: competitorData,
        rankings: rankings.ranked_competitors,
        market_positions: marketPositions,
        share_of_voice: shareOfVoice,
        competitive_gaps: competitiveGaps,
        analysis_date: new Date().toISOString()
      }
    })
    .eq('id', sessionId);

  if (storeError) {
    console.error('Failed to store competitor analysis:', storeError);
  } else {
    console.log(`✅ Stored competitor analysis and marked session as COMPLETED: ${sessionId}`);
  }
  
  // Update project last analysis timestamp
  await supabase.from('brand_analysis_projects').update({
    last_analysis_at: new Date().toISOString()
  }).eq('id', projectId);

  return {
    competitor_data: competitorData,
    rankings: rankings,
    market_positions: marketPositions,
    share_of_voice: shareOfVoice,
    competitive_gaps: competitiveGaps.competitive_gaps,
    summary: {
      total_brands_analyzed: competitorData.length,
      market_leader: marketPositions.find(p => p.positioning === 'leader')?.brand || null,
      your_position: marketPositions.find(p => p.brand === brandName),
      top_competitor: rankings.ranked_competitors.find((c: any) => c.name !== brandName),
      high_priority_gaps: competitiveGaps.competitive_gaps.filter((g: any) => g.severity === 'high').length,
      analysis_date: new Date().toISOString()
    }
  };
}

/**
 * Helper function to parse competitor name from various formats
 * Handles: plain strings, JSON strings, or objects with name/domain
 */
function parseCompetitorName(value: any): { name: string; domain?: string } {
  if (!value) return { name: 'Unknown' };
  
  if (typeof value === 'string') {
    // Check if it's a JSON string
    if (value.startsWith('{') && value.includes('"name"')) {
      try {
        const parsed = JSON.parse(value);
        return { name: parsed.name || value, domain: parsed.domain };
      } catch {
        return { name: value };
      }
    }
    return { name: value };
  }
  
  if (typeof value === 'object' && value.name) {
    return { name: value.name, domain: value.domain };
  }
  
  return { name: String(value) };
}

/** Build search variations for a name (lowercase, no spaces, no punctuation, significant words) */
function buildNameVariations(name: string): string[] {
  if (!name || !name.trim()) return [];
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(Boolean);
  const variations = [
    lower,
    lower.replace(/\s+/g, ''),
    lower.replace(/[^\w\s]/g, '').trim(),
  ].filter(Boolean);
  if (words.length === 1) {
    if (words[0].length > 2) variations.push(words[0]);
  } else {
    for (const word of words) {
      if (word.length >= 4) variations.push(word);
    }
  }
  return [...new Set(variations)].filter((v) => v.length > 2);
}

/** Returns true if text contains a real mention of the name (word boundaries for short names) */
function textMentionsName(text: string, name: string): boolean {
  if (!text || typeof text !== 'string' || !name || !name.trim()) return false;
  const lowerText = text.toLowerCase();
  const variations = buildNameVariations(name);
  return variations.some((variation) => {
    if (variation.length <= 4) {
      const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text);
    }
    return lowerText.includes(variation);
  });
}

/**
 * Extract competitor data from AI platform responses.
 * Uses both response_metadata (brand_mentioned, competitors_found) and direct scanning of
 * response text so competitor share of voice and rankings reflect real AI response content.
 */
function extractCompetitorData(brandName: string, competitors: any[], responses: any[]): CompetitorData[] {
  const parsedCompetitors = competitors.map((c) => parseCompetitorName(c).name);
  const allBrands = [brandName, ...parsedCompetitors];
  const competitorData: CompetitorData[] = [];

  for (const brand of allBrands) {
    let mentions = 0;
    let totalSentiment = 0;
    let sentimentCount = 0;
    const platforms = new Set<string>();

    for (const row of responses) {
      const metadata = row.response_metadata;
      const responseText = row.response || '';

      const isBrand = brand.toLowerCase() === brandName.toLowerCase();

      // Prefer metadata when present; otherwise derive from actual response text
      let isMentioned: boolean;
      if (isBrand) {
        isMentioned = metadata?.brand_mentioned === true || textMentionsName(responseText, brand);
      } else {
        const inMetadata = metadata?.competitors_found?.some((c: any) => {
          const compName = typeof c === 'string' ? c : c?.name;
          return compName != null && String(compName).toLowerCase() === brand.toLowerCase();
        });
        isMentioned = inMetadata || textMentionsName(responseText, brand);
      }

      if (isMentioned) {
        mentions++;
        platforms.add(row.platform || 'unknown');

        if (isBrand && metadata?.sentiment_score != null && !Number.isNaN(metadata.sentiment_score)) {
          totalSentiment += metadata.sentiment_score;
          sentimentCount++;
        } else if (!isBrand && metadata?.competitor_contexts?.[brand]?.sentiment) {
          const sentimentMap: Record<string, number> = { positive: 0.8, negative: 0.2, mixed: 0.5, neutral: 0.5 };
          totalSentiment += sentimentMap[metadata.competitor_contexts[brand].sentiment] ?? 0.5;
          sentimentCount++;
        }
      }
    }

    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0.5;
    const totalResponses = responses.length;
    const relevance = totalResponses > 0 ? mentions / totalResponses : 0;

    const mentionsTrend = mentions > 10 ? 0.15 : mentions > 5 ? 0.05 : mentions > 0 ? 0 : -0.1;
    const sentimentTrend = avgSentiment > 0.7 ? 0.1 : avgSentiment < 0.4 ? -0.1 : 0;

    competitorData.push({
      name: brand,
      mentions,
      sentiment: avgSentiment,
      relevance,
      platforms: Array.from(platforms),
      trends: { mentions_trend: mentionsTrend, sentiment_trend: sentimentTrend },
    });
  }

  return competitorData;
}

async function analyzeCompetitors(params: any, supabase: any) {
  const { brandName, competitors, analysisResults, timeframe = '30d' } = params;
  
  const competitorData: CompetitorData[] = [];
  const allBrands = [brandName, ...competitors];

  for (const brand of allBrands) {
    const brandResults = analysisResults.filter((result: any) => 
      result.content?.toLowerCase().includes(brand.toLowerCase()) ||
      result.competitorMentions?.includes(brand)
    );

    const mentions = brandResults.length;
    const avgSentiment = brandResults.reduce((sum: number, result: any) => sum + (result.sentiment || 0.5), 0) / Math.max(mentions, 1);
    const avgRelevance = brandResults.reduce((sum: number, result: any) => sum + (result.relevance || 0.5), 0) / Math.max(mentions, 1);
    const platforms = [...new Set(brandResults.map((result: any) => result.platform))];

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

  return {
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

function rankCompetitors(params: any) {
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
        // Weighted overall score - normalize mentions to 0-1 scale
        const maxMentions = Math.max(...competitorData.map((c: CompetitorData) => c.mentions), 1);
        const normalizedMentions = competitor.mentions / maxMentions;
        
        score = (normalizedMentions * 0.35) + 
                (competitor.sentiment * 0.25) + 
                (competitor.relevance * 0.20) + 
                (Math.min(competitor.platforms.length / 5, 1) * 0.10) +
                (Math.max(0, competitor.trends.mentions_trend) * 0.05) +
                (Math.max(0, competitor.trends.sentiment_trend) * 0.05);
        break;
    }

    return {
      ...competitor,
      ranking_score: Math.round(score * 100) / 100,
      ranking_criteria: rankingCriteria
    };
  });

  // Sort by score (descending), then by mentions, then by name for stable order
  rankedCompetitors.sort((a: any, b: any) => {
    if (b.ranking_score !== a.ranking_score) return b.ranking_score - a.ranking_score;
    if (b.mentions !== a.mentions) return b.mentions - a.mentions;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Add ranking positions
  rankedCompetitors.forEach((competitor: any, index: number) => {
    competitor.rank = index + 1;
  });

  return {
    ranked_competitors: rankedCompetitors,
    ranking_criteria: rankingCriteria,
    top_performer: rankedCompetitors[0],
    ranking_date: new Date().toISOString()
  };
}

function calculateMarketPositioningSync(brandName: string, competitorData: CompetitorData[]): MarketPosition[] {
  const totalMentions = competitorData.reduce((sum, comp) => sum + comp.mentions, 0);
  
  return competitorData.map((competitor) => {
    const marketShare = totalMentions > 0 ? competitor.mentions / totalMentions : 0;
    const mentionVelocity = competitor.trends.mentions_trend;
    
    const competitiveStrength = (
      marketShare * 0.4 +
      competitor.sentiment * 0.3 +
      competitor.relevance * 0.2 +
      Math.max(0, mentionVelocity) * 0.1
    );

    let positioning: 'leader' | 'challenger' | 'follower' | 'niche';
    if (marketShare > 0.25 && competitiveStrength > 0.5) {
      positioning = 'leader';
    } else if (marketShare > 0.15 && competitiveStrength > 0.4) {
      positioning = 'challenger';
    } else if (marketShare > 0.05) {
      positioning = 'follower';
    } else {
      positioning = 'niche';
    }

    return {
      brand: competitor.name,
      market_share: Math.round(marketShare * 100) / 100,
      sentiment_score: Math.round(competitor.sentiment * 100) / 100,
      mention_velocity: mentionVelocity,
      competitive_strength: Math.round(competitiveStrength * 100) / 100,
      positioning
    };
  });
}

async function calculateMarketPositioning(params: any, supabase: any) {
  const { brandName, competitorData } = params;
  const marketPositions = calculateMarketPositioningSync(brandName, competitorData);

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

function calculateShareOfVoiceSync(competitorData: CompetitorData[]) {
  const totalMentions = competitorData.reduce((sum, comp) => sum + comp.mentions, 0);
  
  const shareOfVoice = competitorData.map((competitor) => {
    const share = totalMentions > 0 ? (competitor.mentions / totalMentions) * 100 : 0;
    const weightedShare = share * competitor.relevance;
    
    return {
      brand: competitor.name,
      mentions: competitor.mentions,
      share_percentage: Math.round(share * 10) / 10,
      weighted_share: Math.round(weightedShare * 10) / 10,
      sentiment_weighted_share: Math.round(weightedShare * competitor.sentiment * 10) / 10,
      platforms: competitor.platforms,
      trend: competitor.trends.mentions_trend
    };
  });

  shareOfVoice.sort((a, b) => b.share_percentage - a.share_percentage);

  return shareOfVoice;
}

async function calculateShareOfVoice(params: any) {
  const { competitorData, timeframe = '30d' } = params;
  const shareOfVoice = calculateShareOfVoiceSync(competitorData);
  const totalMentions = competitorData.reduce((sum: number, comp: CompetitorData) => sum + comp.mentions, 0);

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

function identifyCompetitiveGapsSync(brandName: string, competitorData: CompetitorData[]) {
  const yourBrand = competitorData.find(comp => comp.name === brandName);
  const competitors = competitorData.filter(comp => comp.name !== brandName);

  if (!yourBrand) {
    return { competitive_gaps: [], gap_summary: { total_gaps: 0 } };
  }

  const gaps = [];

  // Analyze sentiment gaps
  if (competitors.length > 0) {
    const avgCompetitorSentiment = competitors.reduce((sum, comp) => sum + comp.sentiment, 0) / competitors.length;
    if (yourBrand.sentiment < avgCompetitorSentiment - 0.1) {
      gaps.push({
        type: 'sentiment',
        severity: 'high',
        your_value: Math.round(yourBrand.sentiment * 100),
        competitor_avg: Math.round(avgCompetitorSentiment * 100),
        description: `Your brand sentiment (${Math.round(yourBrand.sentiment * 100)}%) is below competitor average (${Math.round(avgCompetitorSentiment * 100)}%)`,
        recommendation: 'Focus on improving customer satisfaction and addressing negative feedback'
      });
    }

    // Analyze mention volume gaps
    const avgCompetitorMentions = competitors.reduce((sum, comp) => sum + comp.mentions, 0) / competitors.length;
    if (yourBrand.mentions < avgCompetitorMentions * 0.7) {
      gaps.push({
        type: 'visibility',
        severity: 'medium',
        your_value: yourBrand.mentions,
        competitor_avg: Math.round(avgCompetitorMentions),
        description: `Your brand has ${yourBrand.mentions} mentions vs competitor average of ${Math.round(avgCompetitorMentions)}`,
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
        your_value: yourBrand.platforms.length,
        competitor_avg: allPlatforms.length,
        missing_platforms: missingPlatforms,
        description: `Your brand is not visible on: ${missingPlatforms.join(', ')}`,
        recommendation: `Consider expanding presence to ${missingPlatforms.join(', ')} platforms`
      });
    }

    // Analyze trending gaps
    const avgCompetitorTrend = competitors.reduce((sum, comp) => sum + comp.trends.mentions_trend, 0) / competitors.length;
    if (yourBrand.trends.mentions_trend < avgCompetitorTrend - 0.05) {
      gaps.push({
        type: 'momentum',
        severity: 'high',
        your_value: yourBrand.trends.mentions_trend,
        competitor_avg: avgCompetitorTrend,
        description: 'Your brand momentum is lagging behind competitors',
        recommendation: 'Implement aggressive growth marketing and PR campaigns'
      });
    }
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

async function identifyCompetitiveGaps(params: any) {
  const { brandName, competitorData } = params;
  return identifyCompetitiveGapsSync(brandName, competitorData);
}
