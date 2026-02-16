import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkAIVisibility } from '@/lib/ai/geoCore'

interface CountryAIResult {
  country_code: string;
  country_name: string;
  ai_visibility_score: number;
  ai_mention_count: number;
  ai_platforms_present: string[];
  ai_sentiment: number;
  brand_position: number | null;
  mentioned_brands: string[];
  is_weak: boolean;
  is_absent: boolean;
  // New source-based fields
  ai_domain_found: boolean;
  ai_best_position: number | null;
  ai_mentioned_competitors: string[];
}

// Map country codes to full names
const getCountryName = (code: string): string => {
  const countryMapping: { [key: string]: string } = {
    'USA': 'United States', 'GBR': 'United Kingdom', 'CAN': 'Canada', 'AUS': 'Australia',
    'DEU': 'Germany', 'FRA': 'France', 'ITA': 'Italy', 'ESP': 'Spain', 'NLD': 'Netherlands',
    'BEL': 'Belgium', 'CHE': 'Switzerland', 'AUT': 'Austria', 'SWE': 'Sweden', 'NOR': 'Norway',
    'DNK': 'Denmark', 'FIN': 'Finland', 'POL': 'Poland', 'CZE': 'Czech Republic', 'HUN': 'Hungary',
    'ROU': 'Romania', 'BGR': 'Bulgaria', 'GRC': 'Greece', 'PRT': 'Portugal', 'IRL': 'Ireland',
    'JPN': 'Japan', 'CHN': 'China', 'IND': 'India', 'KOR': 'South Korea', 'SGP': 'Singapore',
    'HKG': 'Hong Kong', 'TWN': 'Taiwan', 'THA': 'Thailand', 'MYS': 'Malaysia', 'IDN': 'Indonesia',
    'PHL': 'Philippines', 'VNM': 'Vietnam', 'NZL': 'New Zealand', 'MEX': 'Mexico', 'BRA': 'Brazil',
    'ARG': 'Argentina', 'CHL': 'Chile', 'COL': 'Colombia', 'PER': 'Peru', 'ZAF': 'South Africa',
    'EGY': 'Egypt', 'NGA': 'Nigeria', 'KEN': 'Kenya', 'MAR': 'Morocco', 'ARE': 'UAE',
    'SAU': 'Saudi Arabia', 'ISR': 'Israel', 'TUR': 'Turkey', 'RUS': 'Russia', 'UKR': 'Ukraine',
    'PAK': 'Pakistan', 'BGD': 'Bangladesh', 'LKA': 'Sri Lanka', 'NPL': 'Nepal',
  };
  return countryMapping[code] || code;
};

// Convert sentiment string to numeric score
const sentimentToScore = (sentiment: string): number => {
  switch (sentiment) {
    case 'positive': return 1;
    case 'neutral': return 0;
    case 'negative': return -1;
    case 'not_mentioned': return 0;
    default: return 0;
  }
};

// Check if domain URL appears in AI sources
function checkDomainInSources(
  aiResult: any, 
  domainUrl: string, 
  brandName: string
): { found: boolean; position: number | null; score: number } {
  
  // Extract domain from URL (e.g., "example.com" from "https://example.com/page")
  const extractDomain = (url: string): string => {
    try {
      let cleanUrl = url;
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      const urlObj = new URL(cleanUrl);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
  };

  const ourDomain = extractDomain(domainUrl).toLowerCase();
  
  // Check if brand name or domain appears in mentioned brands
  const mentionedBrands = aiResult.mentionedBrands || [];
  
  // Look for domain or brand name in the list
  let position = null;
  let found = false;
  
  for (let i = 0; i < mentionedBrands.length; i++) {
    const brand = mentionedBrands[i].toLowerCase();
    
    // Check if our domain or brand name appears
    if (brand.includes(ourDomain) || 
        brand.includes(brandName.toLowerCase()) ||
        ourDomain.includes(brand.replace(/\s+/g, ''))) {
      found = true;
      position = i + 1; // 1-indexed position
      break;
    }
  }
  
  // If found via brand position from AI - ensure it's a valid integer
  if (!found && aiResult.yourBrandPosition) {
    const brandPos = aiResult.yourBrandPosition;
    // Validate it's a number and not a string
    if (typeof brandPos === 'number' && !isNaN(brandPos) && brandPos > 0) {
      found = true;
      position = brandPos;
    } else if (typeof brandPos === 'string') {
      // Try to parse string to number
      const parsed = parseInt(brandPos, 10);
      if (!isNaN(parsed) && parsed > 0) {
        found = true;
        position = parsed;
      }
      // If it's "not mentioned" or similar string, ignore it
    }
  }
  
  // Calculate score based on position
  let score = 0;
  if (found && position) {
    // Base score for being mentioned
    score = 50;
    
    // Position bonus
    if (position === 1) score += 30;
    else if (position === 2) score += 20;
    else if (position === 3) score += 10;
    else if (position <= 5) score += 5;
    
    // Sentiment bonus
    if (aiResult.sentiment === 'positive') score += 20;
    
    // Cap at 100
    score = Math.min(100, score);
  }
  
  return { found, position, score };
}

// POST - Check AI presence for countries
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
    const { 
      countryCodes, 
      domainUrl,
      domainId,
      brandName, 
      industry = 'technology',
      startDate,
      endDate,
      gscData = {},
      platforms = ['chatgpt', 'claude', 'gemini', 'perplexity', 'groq'],
      maxCountries = 20
    } = body

    if (!countryCodes || !Array.isArray(countryCodes) || countryCodes.length === 0) {
      return NextResponse.json({ 
        error: 'countryCodes array is required' 
      }, { status: 400 })
    }

    if (!domainUrl) {
      return NextResponse.json({ 
        error: 'domainUrl is required' 
      }, { status: 400 })
    }

    if (!brandName) {
      return NextResponse.json({ 
        error: 'brandName is required for result matching' 
      }, { status: 400 })
    }

    // Limit the number of countries to check (cost control)
    const countriesToCheck = countryCodes.slice(0, maxCountries);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 AI PRESENCE CHECK STARTED`);
    console.log(`   Domain URL: "${domainUrl}"`);
    console.log(`   Brand: "${brandName}"`);
    console.log(`   Industry: "${industry}"`);
    console.log(`   Countries: ${countriesToCheck.length}`);
    console.log(`   Platforms: ${platforms.join(', ')} (${platforms.length} LLMs)`);
    console.log(`   Method: Unbiased search - check if domain appears in sources`);
    console.log(`${'='.repeat(80)}\n`);

    const results: CountryAIResult[] = [];
    const weakPresenceCountries: string[] = [];
    const absentCountries: string[] = [];

    // Process each country
    for (const countryCode of countriesToCheck) {
      const countryName = getCountryName(countryCode);
      
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📍 COUNTRY: ${countryName} (${countryCode})`);
      console.log(`${'─'.repeat(80)}`);

      // Generate country-specific search query (NOT mentioning our brand)
      const searchQuery = `Search for the best ${industry} companies in ${countryName}. Provide a list with sources and URLs.`;

      let totalVisibilityScore = 0;
      let mentionCount = 0;
      let totalSentiment = 0;
      let platformsPresent: string[] = [];
      let bestPosition: number | null = null;
      let allMentionedBrands: Set<string> = new Set();

      // PARALLEL: Check all 5 platforms simultaneously for this country
      console.log(`\n    🚀 Querying all 5 platforms in parallel...`);
      
      const platformChecks = platforms.map(async (platform: string) => {
        try {
          console.log(`    🔍 Launching ${platform.toUpperCase()} check...`);
          
          // Search for best companies in industry/country WITHOUT mentioning our brand
          const result = await checkAIVisibility({
            query: searchQuery,
            platform: platform,
            brandName: brandName // Still pass for potential matching, but not used in query
          });

          // Now check if our domain URL appears in the sources/results
          const domainAppears = checkDomainInSources(result, domainUrl, brandName);

          console.log(`\n    🤖 AI SEARCH RESPONSE (${platform}):`);
          console.log(JSON.stringify({
            platform: result.platform,
            mentionedBrands: result.mentionedBrands,
            brandPosition: result.yourBrandPosition,
            domainInSources: domainAppears.found,
            sourcePosition: domainAppears.position,
            visibilityScore: domainAppears.score,
            sentiment: result.sentiment,
          }, null, 2));

          return {
            platform,
            result,
            domainAppears,
          };
        } catch (error) {
          console.error(`    ❌ Error checking ${platform} for ${countryName}:`, error);
          return {
            platform,
            result: null,
            domainAppears: { found: false, position: null, score: 0 },
          };
        }
      });

      // Wait for all 5 platforms to complete
      const platformResults = await Promise.all(platformChecks);

      // Aggregate results from all platforms
      platformResults.forEach(({ platform, result, domainAppears }: any) => {
        if (!result) return; // Skip failed checks

        if (domainAppears.found && domainAppears.position !== null) {
          mentionCount++;
          platformsPresent.push(platform);
          const foundPosition = domainAppears.position;
          console.log(`       ✅ ${platform}: Domain found at position ${foundPosition}`);
          
          if (bestPosition === null || foundPosition < bestPosition) {
            bestPosition = foundPosition;
          }
          
          totalVisibilityScore += domainAppears.score;
        } else {
          console.log(`       ❌ ${platform}: Domain NOT found`);
          totalVisibilityScore += 0;
        }
        
        totalSentiment += sentimentToScore(result.sentiment);
        result.mentionedBrands.forEach((brand: string) => allMentionedBrands.add(brand));
      });

      // Calculate average scores
      const avgVisibilityScore = platforms.length > 0 
        ? totalVisibilityScore / platforms.length 
        : 0;
      const avgSentiment = platforms.length > 0 
        ? totalSentiment / platforms.length 
        : 0;

      // Determine if weak or absent
      const isAbsent = mentionCount === 0;
      const isWeak = !isAbsent && avgVisibilityScore < 30;

      if (isAbsent) {
        absentCountries.push(countryName);
      } else if (isWeak) {
        weakPresenceCountries.push(countryName);
      }

      // Validate bestPosition is integer or null (critical for database)
      const validatedBestPosition = (bestPosition !== null && 
                                      typeof bestPosition === 'number' && 
                                      !isNaN(bestPosition) && 
                                      bestPosition > 0) 
        ? bestPosition 
        : null;
      
      // Log if we had to sanitize the value
      if (bestPosition !== null && validatedBestPosition === null) {
        console.log(`       ⚠️ Warning: Invalid bestPosition value (${bestPosition}) sanitized to null`);
      }

      const countryResult: CountryAIResult = {
        country_code: countryCode,
        country_name: countryName,
        ai_visibility_score: Math.round(avgVisibilityScore * 100) / 100,
        ai_mention_count: mentionCount,
        ai_platforms_present: platformsPresent,
        ai_sentiment: Math.round(avgSentiment * 100) / 100,
        brand_position: validatedBestPosition,
        mentioned_brands: Array.from(allMentionedBrands),
        is_weak: isWeak,
        is_absent: isAbsent,
        // New source-based fields
        ai_domain_found: mentionCount > 0, // Domain was found if mentioned on any platform
        ai_best_position: validatedBestPosition, // Validated integer or null
        ai_mentioned_competitors: Array.from(allMentionedBrands).filter(b => 
          b.toLowerCase() !== brandName.toLowerCase() && 
          !b.toLowerCase().includes(domainUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase())
        ), // Competitors excluding our brand
      };

      results.push(countryResult);

      // Get competitor list (excluding our brand)
      const competitors = Array.from(allMentionedBrands).filter((b: string) => 
        b.toLowerCase() !== brandName.toLowerCase() && 
        !b.toLowerCase().includes(domainUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase())
      );

      console.log(`\n    📊 COUNTRY SUMMARY (${countryName}):`);
      console.log(`       Domain Found in AI Sources: ${mentionCount > 0 ? '✅ YES' : '❌ NO'}`);
      console.log(`       Avg Visibility Score: ${avgVisibilityScore.toFixed(1)}/100`);
      console.log(`       Platforms Where Found: ${mentionCount}/${platforms.length} (${platformsPresent.join(', ') || 'none'})`);
      console.log(`       Best Position: ${validatedBestPosition || 'Not found'}`);
      console.log(`       Status: ${isAbsent ? '❌ ABSENT' : isWeak ? '⚠️ WEAK' : '✅ PRESENT'}`);
      console.log(`       Top Competitors in AI Results: ${competitors.slice(0, 5).join(', ') || 'none'}`);
      
      // ✨ IMMEDIATELY update database after processing this country
      if (domainId) {
        try {
          // Get GSC data for this country if provided
          const countryGscData = gscData[countryCode] || {};
          
          // Calculate overall visibility score (60% organic + 40% AI)
          const organicScore = countryGscData.organic_score || 0;
          const overallScore = organicScore * 0.6 + avgVisibilityScore * 0.4;
          
          // Use provided dates or defaults (all-time)
          const dbStartDate = startDate || '2020-01-01';
          const dbEndDate = endDate || new Date().toISOString().split('T')[0];
          
          // Ensure bestPosition is null or a valid integer
          const validBestPosition = (bestPosition !== null && typeof bestPosition === 'number' && !isNaN(bestPosition)) 
            ? bestPosition 
            : null;

          const updateData = {
            user_id: session.user.id,
            domain_id: domainId,
            country_code: countryCode,
            // GSC data
            gsc_clicks: countryGscData.gsc_clicks || 0,
            gsc_impressions: countryGscData.gsc_impressions || 0,
            gsc_ctr: countryGscData.gsc_ctr || 0,
            gsc_avg_position: countryGscData.gsc_avg_position || 0,
            organic_score: countryGscData.organic_score || 0,
            // AI data
            ai_mention_count: mentionCount,
            ai_visibility_score: Math.round(avgVisibilityScore * 100) / 100,
            ai_platforms_present: platformsPresent,
            ai_sentiment: Math.round(avgSentiment * 100) / 100,
            ai_domain_found: mentionCount > 0,
            ai_best_position: validBestPosition, // Validated integer or null
            ai_mentioned_competitors: competitors,
            ai_source_urls: [],
            ai_check_method: 'source_based',
            // Composite scores
            demand_score: countryGscData.demand_score || 0,
            overall_visibility_score: Math.round(overallScore * 100) / 100,
            quadrant: countryGscData.quadrant || 'absent',
            opportunity_score: countryGscData.opportunity_score || 0,
            // Dates (all time)
            date_range_start: dbStartDate,
            date_range_end: dbEndDate,
            last_calculated_at: new Date().toISOString(),
          };

          const { error: upsertError } = await supabase
            .from('global_visibility_matrix')
            .upsert(updateData, {
              onConflict: 'user_id,domain_id,country_code,date_range_start,date_range_end',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`       ⚠️ Database save failed:`, upsertError.message);
          } else {
            console.log(`       💾 ✅ Saved to database (real-time update)`);
          }
        } catch (dbError) {
          console.error(`       ⚠️ Database error:`, dbError);
          // Continue with other countries
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 AI PRESENCE CHECK COMPLETE`);
    console.log(`   Total Countries Checked: ${results.length}`);
    console.log(`${'='.repeat(80)}\n`);

    // Sort by visibility score
    results.sort((a, b) => b.ai_visibility_score - a.ai_visibility_score);

    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`  ✅ Strong presence: ${results.filter(r => !r.is_weak && !r.is_absent).length} countries`);
    console.log(`  ⚠️ Weak presence: ${weakPresenceCountries.length} countries`);
    if (weakPresenceCountries.length > 0) {
      console.log(`     ${weakPresenceCountries.join(', ')}`);
    }
    console.log(`  ❌ Absent: ${absentCountries.length} countries`);
    if (absentCountries.length > 0) {
      console.log(`     ${absentCountries.join(', ')}`);
    }

    return NextResponse.json({ 
      success: true,
      results,
      summary: {
        totalChecked: results.length,
        strongPresence: results.filter(r => !r.is_weak && !r.is_absent).length,
        weakPresence: weakPresenceCountries.length,
        absent: absentCountries.length,
        weakPresenceCountries,
        absentCountries,
        topPerformers: results.slice(0, 5).map(r => ({
          country: r.country_name,
          score: r.ai_visibility_score,
          platforms: r.ai_platforms_present.length
        })),
        bottomPerformers: results.slice(-5).map(r => ({
          country: r.country_name,
          score: r.ai_visibility_score,
          platforms: r.ai_platforms_present.length
        }))
      }
    })
  } catch (error: any) {
    console.error('AI country check error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
