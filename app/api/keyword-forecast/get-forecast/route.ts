import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { getKeywordCpcFromGoogleAds } from '@/lib/google-ads/keyword-ideas';

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

    let forecasts: any[] = [];
    let message = 'No forecast data available';
    let isRealData = false;

    // Check if we have the necessary credentials
    if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID) {
      console.warn('Missing Google Ads credentials. Returning empty forecasts (no mock data).');
      message = 'Connect Google Ads API in Settings to get CPC data.';
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

        // Get real-time forecast data using Google Ads API (shared lib)
        const cpcResults = await getKeywordCpcFromGoogleAds(
          token,
          GOOGLE_ADS_DEVELOPER_TOKEN,
          customerId,
          plan.keywords || []
        );
        forecasts = cpcResults.map((r) => ({
          keyword: r.keyword,
          impressions: r.impressions || 0,
          clicks: r.clicks || 0,
          ctr: r.ctr || 0,
          avgCpc: r.avgCpc,
          cost: r.cost || 0,
        }));

        if (forecasts.length > 0) {
          isRealData = true;
          message = `Generated forecast for ${forecasts.length} keywords`;
        } else {
          console.warn('No forecasts returned from Google Ads API.');
          message = 'No keyword ideas returned. Try different keywords.';
        }

      } catch (apiError: any) {
        console.error('Google Ads API Error:', apiError);
        message = apiError.message?.includes('DEVELOPER_TOKEN_NOT_APPROVED')
          ? 'Google Ads test token needs approval. Connect production credentials for CPC data.'
          : `Google Ads API error. Connect credentials in Settings for CPC data.`;
      }
    }

    // Save only real forecast data to the database (never save mock/dummy data)
    try {
      if (isRealData && forecasts.length > 0) {
        const { error: updateError } = await supabase
          .from('keyword_plans')
          .update({ 
            forecast: forecasts,
            updated_at: new Date().toISOString()
          })
          .eq('id', planId);

        if (updateError) {
          console.error('Error saving forecast to database:', updateError);
        } else {
          console.log(`Forecast saved to database for plan ${planId}`);
        }
      }
      // When no real data: do not overwrite DB - leave existing forecast as-is
    } catch (saveError) {
      console.error('Error updating plan with forecast:', saveError);
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

