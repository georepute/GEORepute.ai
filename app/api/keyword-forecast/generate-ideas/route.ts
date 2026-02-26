import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    const {
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_TEST_ACCOUNT_ID, // Optional: Test account customer ID
    } = process.env;

    if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || !GOOGLE_ADS_REFRESH_TOKEN || !GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_CUSTOMER_ID) {
      console.warn('Missing Google Ads credentials. Returning mock data.');
      return NextResponse.json(
        { 
          success: true,
          ideas: generateMockKeywordIdeas(url),
          message: 'Using mock data. Configure Google Ads API for real results.'
        },
        { status: 200 }
      );
    }

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

      console.log(`Using ${isTestAccount ? 'TEST' : 'PRODUCTION'} account: ${customerId}`);

      // Call Google Ads API REST endpoint for generating keyword ideas
      // Using the official endpoint from https://developers.google.com/google-ads/api/rest/reference/rest/v23/customers/generateKeywordIdeas
      const response = await fetch(
        `https://googleads.googleapis.com/v23/customers/${customerId}:generateKeywordIdeas`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
            'login-customer-id': customerId,
          },
          body: JSON.stringify({
            urlSeed: {
              url: url,
            },
            geoTargetConstants: ['geoTargetConstants/2840'], // United States
            language: 'languageConstants/1000', // English
            keywordPlanNetwork: 'GOOGLE_SEARCH',
            includeAdultKeywords: false,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Ads API Error Response:', errorText);
        console.error('Request URL:', `https://googleads.googleapis.com/v23/customers/${customerId}:generateKeywordIdeas`);
        console.error('Customer ID:', customerId);
        console.error('Status:', response.status, response.statusText);
        
        // Check if this is a test token permission error
        try {
          const errorData = JSON.parse(errorText);
          const authError = errorData?.error?.details?.[0]?.errors?.[0]?.errorCode?.authorizationError;
          
          if (authError === 'DEVELOPER_TOKEN_NOT_APPROVED') {
            console.warn('\n========================================');
            console.warn('TEST DEVELOPER TOKEN DETECTED');
            console.warn('========================================');
            console.warn('Your developer token only works with TEST accounts.');
            console.warn('\nTo create a test account:');
            console.warn('1. Go to: https://ads.google.com');
            console.warn('2. Click "Tools & Settings" → "Setup" → "Manager accounts"');
            console.warn('3. Click "Test account" → Create a test account');
            console.warn('4. Copy the test account Customer ID');
            console.warn('5. Add to .env.local: GOOGLE_ADS_TEST_ACCOUNT_ID=your-test-customer-id');
            console.warn('\nFor production access:');
            console.warn('Apply for Basic access at: https://ads.google.com/aw/apicenter');
            console.warn('========================================\n');
            
            // Return enhanced mock data for local testing
            return NextResponse.json({
              success: true,
              ideas: generateEnhancedMockKeywords(url),
              message: '⚠️ Test token detected. Create a test account or use enhanced mock data for local testing.',
              testMode: true,
              instructions: {
                createTestAccount: 'https://ads.google.com → Tools & Settings → Manager accounts → Test account',
                applyForProduction: 'https://ads.google.com/aw/apicenter'
              }
            });
          }
        } catch (parseError) {
          // If we can't parse the error, continue with the generic error
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Process and format the results
      const results = data.results || [];
      const ideas = results.map((result: any) => ({
        text: result.text || '',
        avgMonthlySearches: parseInt(result.keywordIdeaMetrics?.avgMonthlySearches) || 0,
        competition: result.keywordIdeaMetrics?.competition || 'UNSPECIFIED',
        lowTopOfPageBid: result.keywordIdeaMetrics?.lowTopOfPageBidMicros 
          ? parseFloat(result.keywordIdeaMetrics.lowTopOfPageBidMicros) / 1000000 
          : 0,
        highTopOfPageBid: result.keywordIdeaMetrics?.highTopOfPageBidMicros 
          ? parseFloat(result.keywordIdeaMetrics.highTopOfPageBidMicros) / 1000000 
          : 0,
      }));

      if (ideas.length === 0) {
        console.warn('No keywords returned. Using mock data.');
        return NextResponse.json({
          success: true,
          ideas: generateMockKeywordIdeas(url),
          message: 'No keywords found from API. Using mock data.',
        });
      }

      return NextResponse.json({
        success: true,
        ideas,
        message: `Generated ${ideas.length} keyword ideas`,
      });

    } catch (apiError: any) {
      console.error('Google Ads API Error:', apiError);
      
      // Return enhanced mock data as fallback for local testing
      return NextResponse.json(
        { 
          success: true,
          ideas: generateEnhancedMockKeywords(url),
          message: `Using enhanced mock data for local testing. ${apiError.message.includes('DEVELOPER_TOKEN_NOT_APPROVED') ? 'Set up a test account to use real API.' : 'API temporarily unavailable.'}`,
          testMode: true,
          error: apiError.message
        },
        { status: 200 }
      );
    }

  } catch (error: any) {
    console.error('Error generating keyword ideas:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate keyword ideas' },
      { status: 500 }
    );
  }
}

// Helper function to generate mock keyword ideas for development/fallback
function generateMockKeywordIdeas(url: string): any[] {
  const domain = new URL(url).hostname.replace('www.', '');
  const baseTerm = domain.split('.')[0];

  const keywords = [
    { text: `${baseTerm} services`, avgMonthlySearches: 12000, competition: 'HIGH', lowTopOfPageBid: 2.5, highTopOfPageBid: 8.5 },
    { text: `best ${baseTerm}`, avgMonthlySearches: 8500, competition: 'MEDIUM', lowTopOfPageBid: 1.8, highTopOfPageBid: 6.2 },
    { text: `${baseTerm} online`, avgMonthlySearches: 15000, competition: 'HIGH', lowTopOfPageBid: 3.2, highTopOfPageBid: 9.8 },
    { text: `${baseTerm} near me`, avgMonthlySearches: 22000, competition: 'HIGH', lowTopOfPageBid: 4.5, highTopOfPageBid: 12.0 },
    { text: `affordable ${baseTerm}`, avgMonthlySearches: 5600, competition: 'MEDIUM', lowTopOfPageBid: 1.5, highTopOfPageBid: 4.8 },
    { text: `${baseTerm} reviews`, avgMonthlySearches: 9800, competition: 'LOW', lowTopOfPageBid: 0.8, highTopOfPageBid: 2.5 },
    { text: `top ${baseTerm} companies`, avgMonthlySearches: 4200, competition: 'MEDIUM', lowTopOfPageBid: 2.0, highTopOfPageBid: 5.5 },
    { text: `${baseTerm} pricing`, avgMonthlySearches: 7300, competition: 'MEDIUM', lowTopOfPageBid: 1.2, highTopOfPageBid: 4.0 },
    { text: `${baseTerm} solutions`, avgMonthlySearches: 6700, competition: 'HIGH', lowTopOfPageBid: 2.8, highTopOfPageBid: 7.5 },
    { text: `professional ${baseTerm}`, avgMonthlySearches: 5100, competition: 'LOW', lowTopOfPageBid: 1.0, highTopOfPageBid: 3.2 },
    { text: `${baseTerm} comparison`, avgMonthlySearches: 3900, competition: 'LOW', lowTopOfPageBid: 0.9, highTopOfPageBid: 2.8 },
    { text: `${baseTerm} guide`, avgMonthlySearches: 8200, competition: 'MEDIUM', lowTopOfPageBid: 1.5, highTopOfPageBid: 4.5 },
    { text: `${baseTerm} tips`, avgMonthlySearches: 6500, competition: 'LOW', lowTopOfPageBid: 0.7, highTopOfPageBid: 2.2 },
    { text: `${baseTerm} experts`, avgMonthlySearches: 4800, competition: 'MEDIUM', lowTopOfPageBid: 2.2, highTopOfPageBid: 6.0 },
    { text: `${baseTerm} consulting`, avgMonthlySearches: 3600, competition: 'HIGH', lowTopOfPageBid: 3.5, highTopOfPageBid: 10.5 },
  ];

  return keywords;
}

// Enhanced mock data with more realistic variations for local testing
function generateEnhancedMockKeywords(url: string): any[] {
  const domain = new URL(url).hostname.replace('www.', '');
  const baseTerm = domain.split('.')[0];
  
  // More realistic keyword patterns with varied metrics
  const templates = [
    // High volume, high competition (commercial intent)
    { suffix: ' services', searches: [18000, 25000], comp: 'HIGH', bid: [3.5, 12.0] },
    { suffix: ' near me', searches: [28000, 45000], comp: 'HIGH', bid: [4.0, 15.0] },
    { suffix: ' online', searches: [22000, 35000], comp: 'HIGH', bid: [3.8, 11.5] },
    { suffix: ' cost', searches: [15000, 22000], comp: 'HIGH', bid: [2.8, 9.5] },
    
    // Medium volume, medium competition (research intent)
    { prefix: 'best ', searches: [12000, 18000], comp: 'MEDIUM', bid: [2.2, 7.5] },
    { prefix: 'top ', suffix: ' companies', searches: [8500, 14000], comp: 'MEDIUM', bid: [2.5, 8.0] },
    { suffix: ' pricing', searches: [10000, 16000], comp: 'MEDIUM', bid: [1.8, 6.5] },
    { suffix: ' packages', searches: [7500, 12000], comp: 'MEDIUM', bid: [2.0, 7.0] },
    { suffix: ' solutions', searches: [9000, 15000], comp: 'MEDIUM', bid: [2.6, 8.5] },
    { suffix: ' provider', searches: [6800, 11000], comp: 'MEDIUM', bid: [2.3, 7.8] },
    
    // Lower volume, lower competition (informational intent)
    { suffix: ' reviews', searches: [11000, 17000], comp: 'LOW', bid: [1.0, 3.5] },
    { suffix: ' guide', searches: [9500, 14000], comp: 'LOW', bid: [1.2, 4.2] },
    { suffix: ' tips', searches: [7200, 12500], comp: 'LOW', bid: [0.8, 3.0] },
    { suffix: ' comparison', searches: [5500, 9000], comp: 'LOW', bid: [1.1, 3.8] },
    { prefix: 'how to choose ', searches: [4200, 7500], comp: 'LOW', bid: [0.6, 2.5] },
    { prefix: 'what is ', searches: [8900, 13500], comp: 'LOW', bid: [0.5, 2.2] },
    
    // Long-tail keywords
    { prefix: 'affordable ', searches: [5800, 9500], comp: 'MEDIUM', bid: [1.8, 5.5] },
    { prefix: 'professional ', searches: [6200, 10000], comp: 'LOW', bid: [1.5, 4.8] },
    { prefix: 'local ', suffix: ' services', searches: [8500, 14000], comp: 'MEDIUM', bid: [2.8, 8.2] },
    { suffix: ' for small business', searches: [4500, 7800], comp: 'MEDIUM', bid: [2.1, 6.8] },
  ];
  
  const keywords = templates.map(template => {
    const text = `${template.prefix || ''}${baseTerm}${template.suffix || ''}`;
    const avgSearches = Math.floor(template.searches[0] + Math.random() * (template.searches[1] - template.searches[0]));
    const lowBid = template.bid[0] + Math.random() * 0.5;
    const highBid = template.bid[1] - Math.random() * 0.8;
    
    return {
      text,
      avgMonthlySearches: avgSearches,
      competition: template.comp,
      lowTopOfPageBid: parseFloat(lowBid.toFixed(2)),
      highTopOfPageBid: parseFloat(highBid.toFixed(2)),
    };
  });
  
  return keywords;
}
