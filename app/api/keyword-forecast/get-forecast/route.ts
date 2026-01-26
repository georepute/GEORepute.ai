import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user using the proper auth helper
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the keyword plan (RLS policy will ensure user can access organization plans)
    const { data: plan, error: planError } = await supabase
      .from('keyword_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found or you do not have access to it' },
        { status: 404 }
      );
    }

    // Check for Google Ads API credentials
    const {
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_TEST_ACCOUNT_ID,
    } = process.env;

    let forecasts = [];
    let message = 'Using mock data for development';
    let isRealData = false;

    // Check if we have the necessary credentials
    if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID) {
      console.warn('Missing Google Ads credentials. Returning mock data.');
      forecasts = generateMockForecasts(plan.keywords);
      message = 'Google Ads API not configured. Using mock data.';
    } else {
      // Try to get real forecast data from Google Ads API
      try {
        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          GOOGLE_ADS_CLIENT_ID,
          GOOGLE_ADS_CLIENT_SECRET,
          'urn:ietf:wg:oauth:2.0:oob'
        );

        oauth2Client.setCredentials({
          refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
        });

        // Get access token
        const { token } = await oauth2Client.getAccessToken();

        if (!token) {
          throw new Error('Failed to get access token');
        }

        // Use test account ID if provided, otherwise use regular customer ID
        const customerId = (GOOGLE_ADS_TEST_ACCOUNT_ID || GOOGLE_ADS_CUSTOMER_ID).replace(/-/g, '');
        const isTestAccount = !!GOOGLE_ADS_TEST_ACCOUNT_ID;

        console.log(`Using ${isTestAccount ? 'TEST' : 'PRODUCTION'} account for forecasts: ${customerId}`);

        // Get real-time forecast data using Google Ads API
        forecasts = await getKeywordForecasts(
          token,
          GOOGLE_ADS_DEVELOPER_TOKEN,
          customerId,
          plan.keywords
        );

        if (forecasts.length > 0) {
          isRealData = true;
          message = `Generated forecast for ${forecasts.length} keywords`;
        } else {
          console.warn('No forecasts returned. Using mock data.');
          forecasts = generateMockForecasts(plan.keywords);
        }

      } catch (apiError: any) {
        console.error('Google Ads API Error:', apiError);
        
        // Check if this is a test token permission error
        if (apiError.message?.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
          console.warn('Test developer token detected. Using enhanced mock data.');
          message = '⚠️ Test token detected. Create a test account or use enhanced mock data for local testing.';
        } else {
          message = `Using mock data. API error: ${apiError.message}`;
        }
        
        forecasts = generateMockForecasts(plan.keywords);
      }
    }

    // Save the forecast data to the database
    try {
      const { error: updateError } = await supabase
        .from('keyword_plans')
        .update({ 
          forecast: forecasts,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (updateError) {
        console.error('Error saving forecast to database:', updateError);
        // Don't fail the request, just log the error
      } else {
        console.log(`Forecast saved to database for plan ${planId}`);
      }
    } catch (saveError) {
      console.error('Error updating plan with forecast:', saveError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      forecasts,
      message,
      isRealData,
    });

  } catch (error: any) {
    console.error('Error getting forecast:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get forecast' },
      { status: 500 }
    );
  }
}

// Function to get keyword forecasts from Google Ads API
// Note: GenerateKeywordForecastMetrics may not be available in REST API
// Using generateKeywordIdeas with historical metrics as forecasts instead
async function getKeywordForecasts(
  accessToken: string,
  developerToken: string,
  customerId: string,
  keywords: string[]
): Promise<any[]> {
  try {
    console.log('Generating forecasts for keywords using keyword ideas API...');
    
    const forecasts: any[] = [];
    
    // Get metrics for each keyword using generateKeywordIdeas
    // This gives us historical data which we can use as forecast basis
    for (const keyword of keywords) {
      try {
        const response = await fetch(
          `https://googleads.googleapis.com/v19/customers/${customerId}:generateKeywordIdeas`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': developerToken,
              'Content-Type': 'application/json',
              'login-customer-id': customerId,
            },
            body: JSON.stringify({
              keywordSeed: {
                keywords: [keyword]
              },
              geoTargetConstants: ['geoTargetConstants/2840'], // United States
              language: 'languageConstants/1000', // English
              keywordPlanNetwork: 'GOOGLE_SEARCH',
              includeAdultKeywords: false,
            }),
          }
        );

        if (!response.ok) {
          console.warn(`Failed to get metrics for keyword "${keyword}": ${response.status}`);
          continue;
        }

        const data = await response.json();
        const results = data.results || [];
        
        // Find exact match for our keyword
        const result = results.find((r: any) => 
          r.text?.toLowerCase() === keyword.toLowerCase()
        ) || results[0];

        if (!result) {
          console.warn(`No results for keyword "${keyword}"`);
          continue;
        }

        const metrics = result.keywordIdeaMetrics || {};
        
        // Calculate forecast metrics based on historical data
        const avgMonthlySearches = parseInt(metrics.avgMonthlySearches) || 0;
        const lowBidMicros = parseFloat(metrics.lowTopOfPageBidMicros) || 1000000; // $1 default
        const highBidMicros = parseFloat(metrics.highTopOfPageBidMicros) || 2000000; // $2 default
        
        // Estimate forecast metrics (monthly basis converted to 30-day forecast)
        const estimatedImpressions = Math.round(avgMonthlySearches * 0.8); // 80% impression share
        const estimatedCtr = metrics.competition === 'HIGH' ? 0.05 : 
                            metrics.competition === 'MEDIUM' ? 0.035 : 0.025;
        const estimatedClicks = Math.round(estimatedImpressions * estimatedCtr);
        const avgCpc = (lowBidMicros + highBidMicros) / 2 / 1000000;
        const cost = estimatedClicks * avgCpc;

        forecasts.push({
          keyword: keyword,
          impressions: estimatedImpressions,
          clicks: estimatedClicks,
          ctr: estimatedCtr,
          avgCpc: parseFloat(avgCpc.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
        });
        
        console.log(`Got forecast for "${keyword}": ${estimatedClicks} clicks, $${cost.toFixed(2)} cost`);
        
      } catch (keywordError) {
        console.warn(`Error processing keyword "${keyword}":`, keywordError);
      }
    }

    return forecasts;

  } catch (error: any) {
    console.error('Error in getKeywordForecasts:', error);
    throw error;
  }
}

// Helper function to generate mock forecast data for development
function generateMockForecasts(keywords: string[]): any[] {
  return keywords.map(keyword => {
    const baseImpressions = Math.floor(Math.random() * 50000) + 10000;
    const clicks = Math.floor(baseImpressions * (Math.random() * 0.05 + 0.01)); // 1-6% CTR
    const ctr = clicks / baseImpressions;
    const avgCpc = Math.random() * 4 + 0.5; // $0.50 - $4.50
    const cost = clicks * avgCpc;

    return {
      keyword,
      impressions: baseImpressions,
      clicks,
      ctr,
      avgCpc,
      cost,
    };
  });
}

/* 
 * TO IMPLEMENT REAL GOOGLE ADS FORECAST API:
 * 
 * 1. Ensure the keyword plan was created successfully with Google Ads API
 * 2. Use the KeywordPlanService.generateForecast method
 * 3. Process the response to extract forecast metrics:
 *    - Impressions: Expected ad impressions
 *    - Clicks: Expected clicks
 *    - CTR: Click-through rate
 *    - Average CPC: Cost per click
 *    - Cost: Total estimated cost
 * 
 * The forecast provides predictive metrics based on:
 * - Historical search data
 * - Competition levels
 * - Bid estimates
 * - Seasonal trends
 * 
 * These metrics help you make informed decisions about which keywords
 * to target in your campaigns and what budget to allocate.
 */

