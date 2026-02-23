import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { setProgress, clearProgress, buildProgressKey } from '@/lib/global-visibility-matrix/progress'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface CountryData {
  country_code: string;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_ctr: number;
  gsc_avg_position: number;
}

// Extract brand name from domain
async function extractBrandName(normalizedUrl: string, pageTitle: string, metaDescription: string, textContent: string): Promise<{ brandName: string; confidence: string }> {
  console.log('\n📝 STEP 1A: Extracting Brand Name...');
  
  const prompt = `Analyze this website and extract the EXACT brand/company name.

Website URL: ${normalizedUrl}
Page Title: ${pageTitle}
Meta Description: ${metaDescription}

Page Content (first 2000 chars):
${textContent.substring(0, 2000)}

Task: Find the actual company/brand name from the content. Look for:
- Company name in headers, titles, or about sections
- Brand mentions in text
- Name in copyright notices (e.g., "© 2024 Company Name")
- Hero section text
- Logo alt text

DO NOT just use the domain name. Find the ACTUAL business name as it appears on the website.

Respond in JSON format:
{
  "brandName": "Exact Company/Brand Name as shown on website",
  "reasoning": "brief explanation of where you found it",
  "confidence": "high/medium/low"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting brand names from websites. You find the ACTUAL company name used on the site, not the domain. Always respond in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    console.log('🤖 AI Response (Brand Name):');
    console.log(JSON.stringify(result, null, 2));
    
    return {
      brandName: result.brandName || '',
      confidence: result.confidence || 'low'
    };
  } catch (error) {
    console.error('❌ Error extracting brand name:', error);
    return { brandName: '', confidence: 'low' };
  }
}

// Detect industry from domain
async function detectIndustry(normalizedUrl: string, pageTitle: string, metaDescription: string, textContent: string): Promise<{ industry: string; confidence: string }> {
  console.log('\n📝 STEP 1B: Detecting Industry...');
  
  const prompt = `Analyze this website and determine the industry/business category.

Website URL: ${normalizedUrl}
Page Title: ${pageTitle}
Meta Description: ${metaDescription}

Page Content (first 2000 chars):
${textContent.substring(0, 2000)}

Task: Determine what industry/sector this business operates in based on:
- Products or services described
- Content focus and messaging
- Business category and target audience
- Value proposition

Be specific but concise (e.g., "digital marketing", "financial technology", "healthcare", "e-commerce").

Respond in JSON format:
{
  "industry": "specific industry category",
  "reasoning": "brief explanation of why",
  "confidence": "high/medium/low"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing businesses and categorizing industries. Always respond in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    console.log('🤖 AI Response (Industry):');
    console.log(JSON.stringify(result, null, 2));
    
    return {
      industry: result.industry || 'technology',
      confidence: result.confidence || 'medium'
    };
  } catch (error) {
    console.error('❌ Error detecting industry:', error);
    return { industry: 'technology', confidence: 'low' };
  }
}

// Analyze domain to extract brand name and industry
async function analyzeDomain(domainUrl: string): Promise<{ brandName: string; industry: string }> {
  try {
    // Normalize URL - add https:// if missing
    let normalizedUrl = domainUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    console.log(`\n🔍 Analyzing domain: ${normalizedUrl}`);
    
    // Fetch homepage content
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GeoRepute.ai/1.0; +https://georepute.ai)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch domain: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract text content (simple version - remove HTML tags)
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 4000); // Limit to first 4000 chars

    // Extract title tag for additional context
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract meta description for additional context
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    console.log(`📄 Page Title: "${pageTitle}"`);
    console.log(`📄 Meta Description: "${metaDescription.substring(0, 100)}..."`);

    // SEPARATE CALL 1: Extract Brand Name
    const brandResult = await extractBrandName(normalizedUrl, pageTitle, metaDescription, textContent);
    
    // SEPARATE CALL 2: Detect Industry
    const industryResult = await detectIndustry(normalizedUrl, pageTitle, metaDescription, textContent);
    
    let brandName = brandResult.brandName;
    let industry = industryResult.industry;

    // If AI couldn't extract or returned low confidence, use domain as fallback
    if (!brandName || brandName === '' || brandResult.confidence === 'low') {
      const urlObj = new URL(normalizedUrl);
      const domainName = urlObj.hostname.replace('www.', '').split('.')[0];
      brandName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      console.log(`\n⚠️ Low confidence brand name - using domain fallback: "${brandName}"`);
    }

    console.log(`\n✅ FINAL DETECTION:`);
    console.log(`   Brand: "${brandName}" (confidence: ${brandResult.confidence})`);
    console.log(`   Industry: "${industry}" (confidence: ${industryResult.confidence})`);

    return { brandName, industry };
  } catch (error) {
    console.error('Error analyzing domain:', error);
    
    // Fallback: extract from URL
    try {
      // Normalize URL for fallback
      let fallbackUrl = domainUrl.trim();
      if (!fallbackUrl.startsWith('http://') && !fallbackUrl.startsWith('https://')) {
        fallbackUrl = 'https://' + fallbackUrl;
      }
      
      const urlObj = new URL(fallbackUrl);
      const domainName = urlObj.hostname.replace('www.', '').split('.')[0];
      const brandName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      
      console.log(`⚠️ Using fallback: Brand="${brandName}", Industry="technology"`);
      
      return {
        brandName,
        industry: 'technology',
      };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      
      // Last resort: use raw domain name
      const rawDomain = domainUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('.')[0];
      const brandName = rawDomain.charAt(0).toUpperCase() + rawDomain.slice(1);
      
      return {
        brandName: brandName || 'Unknown',
        industry: 'technology',
      };
    }
  }
}

// Calculate normalized score (0-100)
function normalizeScore(value: number, max: number, min: number = 0): number {
  if (max === min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

// Calculate organic presence score from GSC metrics
function calculateOrganicScore(
  clicks: number, 
  impressions: number, 
  ctr: number, 
  position: number,
  maxClicks: number,
  maxImpressions: number
): number {
  // Normalize each metric
  const clicksScore = normalizeScore(clicks, maxClicks);
  const impressionsScore = normalizeScore(impressions, maxImpressions);
  const ctrScore = normalizeScore(ctr, 0.3); // 30% CTR is excellent
  const positionScore = normalizeScore(50 - position, 50, -50); // Position 1 = best
  
  // Weighted combination
  return (
    clicksScore * 0.4 +
    impressionsScore * 0.3 +
    ctrScore * 0.2 +
    positionScore * 0.1
  );
}

// Calculate demand score based on impressions relative to other countries
function calculateDemandScore(impressions: number, maxImpressions: number): number {
  return normalizeScore(impressions, maxImpressions);
}

// Classify country into quadrant based on presence and demand
function classifyQuadrant(presenceScore: number, demandScore: number, medianPresence: number, medianDemand: number): string {
  if (presenceScore >= medianPresence && demandScore >= medianDemand) return 'strong';
  if (presenceScore < medianPresence && demandScore >= medianDemand) return 'emerging';
  if (presenceScore >= medianPresence && demandScore < medianDemand) return 'declining';
  return 'absent';
}

// Calculate opportunity score (higher demand + lower presence = bigger opportunity)
function calculateOpportunityScore(presenceScore: number, demandScore: number): number {
  return demandScore * (1 - presenceScore / 100);
}

// Calculate median value
function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

// POST - Calculate global visibility matrix
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { domainId, domainUrl } = body

    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 })
    }

    if (!domainUrl) {
      return NextResponse.json({ 
        error: 'domainUrl is required for AI analysis' 
      }, { status: 400 })
    }

    const progressKey = buildProgressKey(session.user.id, domainId);

    // Step 1: Analyze domain to detect brand name and industry
    setProgress(progressKey, {
      phase: 'analyzing',
      processed: 0,
      total: 0,
      message: 'Analyzing domain and detecting brand...',
    });
    console.log('\n' + '='.repeat(80));
    console.log('🌐 STEP 1: DOMAIN ANALYSIS');
    console.log('='.repeat(80));
    const { brandName, industry } = await analyzeDomain(domainUrl);
    
    if (!brandName || brandName === 'Unknown') {
      return NextResponse.json({ 
        error: 'Failed to detect brand name from domain. Please check the domain is accessible.' 
      }, { status: 400 })
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 DETECTED INFORMATION:');
    console.log(`   Brand Name: "${brandName}"`);
    console.log(`   Industry: "${industry}"`);
    console.log('='.repeat(80));

    // Use ALL TIME data - no date range filtering
    const endDate = new Date()
    const startDate = new Date('2020-01-01') // Start from beginning of time (or earliest possible)

    // Step 2: Fetch ALL GSC country data (all time)
    setProgress(progressKey, {
      phase: 'gsc_fetch',
      processed: 0,
      total: 0,
      message: 'Fetching GSC country data...',
    });
    console.log('\n' + '='.repeat(80));
    console.log('📍 STEP 2: FETCHING GSC COUNTRY DATA (ALL TIME)');
    console.log('='.repeat(80));
    console.log(`   Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (ALL TIME)`);
    
    const response = await fetch(
      `${new URL(request.url).origin}/api/integrations/google-search-console/analytics/sync?domainId=${domainId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&dataType=country`,
      {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch GSC data. Please ensure GSC is connected and synced.' 
      }, { status: 500 })
    }

    const gscData = await response.json()

    if (!gscData.success || !gscData.analytics || gscData.analytics.length === 0) {
      return NextResponse.json({ 
        error: 'No GSC country data available. Please sync your GSC data first.' 
      }, { status: 404 })
    }

    // Step 2: Aggregate GSC data by country
    const countryMap = new Map<string, CountryData>()
    
    gscData.analytics.forEach((item: any) => {
      const countryCode = item.country || 'UNKNOWN'
      if (countryCode === 'UNKNOWN') return
      
      if (countryMap.has(countryCode)) {
        const existing = countryMap.get(countryCode)!
        existing.gsc_clicks += item.clicks || 0
        existing.gsc_impressions += item.impressions || 0
        // Recalculate CTR
        existing.gsc_ctr = existing.gsc_impressions > 0 
          ? existing.gsc_clicks / existing.gsc_impressions 
          : 0
        // Average position
        existing.gsc_avg_position = (existing.gsc_avg_position + (item.position || 0)) / 2
      } else {
        countryMap.set(countryCode, {
          country_code: countryCode,
          gsc_clicks: item.clicks || 0,
          gsc_impressions: item.impressions || 0,
          gsc_ctr: item.ctr || 0,
          gsc_avg_position: item.position || 0,
        })
      }
    })

    const countries = Array.from(countryMap.values())

    if (countries.length === 0) {
      return NextResponse.json({ 
        error: 'No valid country data found' 
      }, { status: 404 })
    }

    // Step 3: Calculate max values for normalization
    console.log('\n' + '='.repeat(80));
    console.log('📊 STEP 3: PRE-CALCULATING SCORES');
    console.log('='.repeat(80));
    
    const maxClicks = Math.max(...countries.map(c => c.gsc_clicks))
    const maxImpressions = Math.max(...countries.map(c => c.gsc_impressions))

    console.log(`Max clicks: ${maxClicks}`);
    console.log(`Max impressions: ${maxImpressions}`);

    // Pre-calculate organic and demand scores for all countries
    const countriesWithPreScores = countries.map(country => {
      const organicScore = calculateOrganicScore(
        country.gsc_clicks,
        country.gsc_impressions,
        country.gsc_ctr,
        country.gsc_avg_position,
        maxClicks,
        maxImpressions
      );
      const demandScore = calculateDemandScore(country.gsc_impressions, maxImpressions);
      
      return {
        ...country,
        organic_score: Math.round(organicScore * 100) / 100,
        demand_score: Math.round(demandScore * 100) / 100,
      };
    });

    // Calculate medians for quadrant classification
    const tempPresenceScores = countriesWithPreScores.map(c => c.organic_score);
    const tempDemandScores = countriesWithPreScores.map(c => c.demand_score);
    const medianPresence = getMedian(tempPresenceScores);
    const medianDemand = getMedian(tempDemandScores);

    // Pre-calculate quadrants (will be recalculated after AI scores)
    const countriesWithQuadrants = countriesWithPreScores.map(country => {
      const quadrant = classifyQuadrant(
        country.organic_score,
        country.demand_score,
        medianPresence,
        medianDemand
      );
      const opportunityScore = calculateOpportunityScore(
        country.organic_score,
        country.demand_score
      );
      
      return {
        ...country,
        quadrant,
        opportunity_score: Math.round(opportunityScore * 100) / 100,
      };
    });

    // Build GSC data map to pass to AI endpoint for real-time updates
    const gscDataMap: { [key: string]: any } = {};
    countriesWithQuadrants.forEach(country => {
      gscDataMap[country.country_code] = {
        gsc_clicks: country.gsc_clicks,
        gsc_impressions: country.gsc_impressions,
        gsc_ctr: country.gsc_ctr,
        gsc_avg_position: country.gsc_avg_position,
        organic_score: country.organic_score,
        demand_score: country.demand_score,
        quadrant: country.quadrant,
        opportunity_score: country.opportunity_score,
      };
    });

    // Step 4: Check AI presence (always enabled)
    let aiResults: Map<string, any> = new Map();
    
    if (brandName) {
      try {
        console.log('\n' + '='.repeat(80));
        console.log('🤖 STEP 4: AI PRESENCE CHECKING');
        console.log('='.repeat(80));
        console.log(`Querying AI platforms for "${brandName}" presence across ${countries.length} countries...`);
        console.log(`Note: Database updates happen in real-time as each country completes`);
        
        // Pass GSC data and other parameters for real-time database updates
        const aiCheckResponse = await fetch(
          `${new URL(request.url).origin}/api/global-visibility-matrix/ai-country-check`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              countryCodes: countries.map(c => c.country_code),
              domainUrl, // Pass domain URL to check in sources
              domainId, // For database updates
              brandName,
              industry,
              startDate: startDate.toISOString().split('T')[0], // For database updates
              endDate: endDate.toISOString().split('T')[0], // For database updates
              gscData: gscDataMap, // Pass pre-calculated GSC data
              platforms: ['chatgpt', 'claude', 'gemini', 'perplexity', 'groq'], // All 5 LLMs
              maxCountries: 30, // Check top 30 countries
              progressKey, // For progress reporting
            })
          }
        );

        if (aiCheckResponse.ok) {
          const aiData = await aiCheckResponse.json();
          
          if (aiData.success && aiData.results) {
            aiData.results.forEach((result: any) => {
              aiResults.set(result.country_code, result);
            });
            
            console.log('\n' + '='.repeat(80));
            console.log('✅ AI PRESENCE CHECK RESULTS:');
            console.log(`   Strong presence: ${aiData.summary.strongPresence} countries`);
            console.log(`   Weak presence: ${aiData.summary.weakPresence} countries`);
            console.log(`   Absent: ${aiData.summary.absent} countries`);
            console.log('='.repeat(80));
            
            // Log weak and absent countries
            if (aiData.summary.weakPresenceCountries?.length > 0) {
              console.log(`\n⚠️ WEAK PRESENCE IN:`);
              console.log(`   ${aiData.summary.weakPresenceCountries.join(', ')}`);
            }
            if (aiData.summary.absentCountries?.length > 0) {
              console.log(`\n❌ BRAND NOT MENTIONED IN:`);
              console.log(`   ${aiData.summary.absentCountries.join(', ')}`);
            }
          }
        } else {
          console.warn('⚠️ AI check failed, continuing with organic data only');
        }
      } catch (error) {
        console.error('Error during AI check:', error);
        // Continue without AI data
      }
    }

    // Step 5: Merge AI results with pre-calculated scores
    console.log('\n' + '='.repeat(80));
    console.log('📊 STEP 5: MERGING AI RESULTS WITH ORGANIC DATA');
    console.log('='.repeat(80));
    
    const countriesWithScores = countriesWithQuadrants.map(country => {
      // Get AI score if available
      const aiResult = aiResults.get(country.country_code);
      const aiVisibilityScore = aiResult?.ai_visibility_score || 0;

      // Overall visibility = weighted avg of organic (60%) and AI (40%)
      const overallVisibilityScore = country.organic_score * 0.6 + aiVisibilityScore * 0.4;

      return {
        ...country,
        ai_visibility_score: Math.round(aiVisibilityScore * 100) / 100,
        overall_visibility_score: Math.round(overallVisibilityScore * 100) / 100,
        ai_mention_count: aiResult?.ai_mention_count || 0,
        ai_platforms_present: aiResult?.ai_platforms_present || [],
        ai_sentiment: aiResult?.ai_sentiment || 0,
        is_weak_ai: aiResult?.is_weak || false,
        is_absent_ai: aiResult?.is_absent || false,
        // New source-based fields
        ai_domain_found: aiResult?.ai_domain_found || false,
        ai_best_position: aiResult?.ai_best_position || null,
        ai_mentioned_competitors: aiResult?.ai_mentioned_competitors || [],
      }
    })

    // Step 6: Re-calculate medians with AI scores included
    console.log('\n' + '='.repeat(80));
    console.log('📊 STEP 6: RECALCULATING QUADRANTS WITH AI SCORES');
    console.log('='.repeat(80));
    
    const presenceScores = countriesWithScores.map(c => c.overall_visibility_score)
    const demandScores = countriesWithScores.map(c => c.demand_score)
    const finalMedianPresence = getMedian(presenceScores)
    const finalMedianDemand = getMedian(demandScores)

    // Step 7: Re-classify quadrants with updated scores
    const finalCountries = countriesWithScores.map(country => {
      const quadrant = classifyQuadrant(
        country.overall_visibility_score,
        country.demand_score,
        finalMedianPresence,
        finalMedianDemand
      )

      const opportunityScore = calculateOpportunityScore(
        country.overall_visibility_score,
        country.demand_score
      )

      // Ensure ai_best_position is null or valid integer
      const validBestPosition = country.ai_best_position;
      const sanitizedBestPosition = (validBestPosition !== null && 
                                      validBestPosition !== undefined && 
                                      typeof validBestPosition === 'number' && 
                                      !isNaN(validBestPosition)) 
        ? validBestPosition 
        : null;

      return {
        user_id: session.user.id,
        domain_id: domainId,
        country_code: country.country_code,
        gsc_clicks: country.gsc_clicks,
        gsc_impressions: country.gsc_impressions,
        gsc_ctr: country.gsc_ctr,
        gsc_avg_position: country.gsc_avg_position,
        organic_score: country.organic_score,
        ai_mention_count: country.ai_mention_count || 0,
        ai_visibility_score: country.ai_visibility_score,
        ai_platforms_present: country.ai_platforms_present || [],
        ai_sentiment: country.ai_sentiment || 0,
        demand_score: country.demand_score,
        overall_visibility_score: country.overall_visibility_score,
        quadrant,
        opportunity_score: Math.round(opportunityScore * 100) / 100,
        date_range_start: startDate.toISOString().split('T')[0],
        date_range_end: endDate.toISOString().split('T')[0],
        last_calculated_at: new Date().toISOString(),
        // New source-based AI fields
        ai_domain_found: country.ai_domain_found || false,
        ai_best_position: sanitizedBestPosition, // Validated integer or null
        ai_mentioned_competitors: country.ai_mentioned_competitors || [],
        ai_source_urls: [], // Could be populated from AI responses if needed
        ai_check_method: 'source_based', // Track methodology
      }
    })

    // Identify weak and absent countries for logging
    const weakAICountries = finalCountries.filter((c: any) => c.ai_mention_count > 0 && c.ai_visibility_score < 30);
    const absentAICountries = finalCountries.filter((c: any) => c.ai_mention_count === 0);

    // Step 9: Final database update (update quadrants with AI-adjusted scores)
    console.log('\n' + '='.repeat(80));
    console.log('💾 STEP 9: FINAL DATABASE UPDATE');
    console.log(`   Updating quadrants for ${finalCountries.length} countries with AI-adjusted scores...`);
    console.log('='.repeat(80));
    
    // Note: Individual countries were already saved during AI checking
    // This final update ensures quadrants are recalculated with AI scores
    const { error: upsertError } = await supabase
      .from('global_visibility_matrix')
      .upsert(finalCountries, {
        onConflict: 'user_id,domain_id,country_code,date_range_start,date_range_end',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Error upserting matrix data:', upsertError)
      console.log('⚠️ Warning: Final update failed but individual countries may have been saved during AI checking');
      // Don't fail the whole request - data was saved incrementally
    } else {
      console.log('✅ Final update complete - all quadrants adjusted for AI scores');
    }

    setProgress(progressKey, {
      phase: 'complete',
      processed: finalCountries.length,
      total: finalCountries.length,
      message: 'Calculation complete',
    });
    clearProgress(progressKey);

    console.log('\n' + '='.repeat(80));
    console.log('✅ CALCULATION COMPLETE');
    console.log(`   Brand: "${brandName}"`);
    console.log(`   Industry: "${industry}"`);
    console.log(`   Countries: ${finalCountries.length}`);
    console.log(`   Updates: Real-time (saved after each country)`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({ 
      success: true,
      message: `Successfully analyzed ${brandName} (${industry}) across ${finalCountries.length} countries`,
      countriesProcessed: finalCountries.length,
      aiCheckEnabled: true,
      detectedBrandName: brandName,
      detectedIndustry: industry,
      summary: {
        strong: finalCountries.filter(c => c.quadrant === 'strong').length,
        emerging: finalCountries.filter(c => c.quadrant === 'emerging').length,
        declining: finalCountries.filter(c => c.quadrant === 'declining').length,
        absent: finalCountries.filter(c => c.quadrant === 'absent').length,
      },
      aiPresence: {
        weakPresence: weakAICountries.map((c: any) => ({
          country: c.country_code,
          score: c.ai_visibility_score,
          mentions: c.ai_mention_count
        })),
        absentCountries: absentAICountries.map((c: any) => c.country_code),
        totalChecked: aiResults.size
      }
    })
  } catch (error: any) {
    console.error('Calculate matrix API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
