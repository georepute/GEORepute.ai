/**
 * Google Ads API - OAuth2 Refresh Token Generator
 * 
 * This script helps you generate a refresh token for Google Ads API access.
 * 
 * Prerequisites:
 * 1. Create a Google Cloud project
 * 2. Enable Google Ads API
 * 3. Create OAuth 2.0 credentials (Web application)
 * 4. Add 'urn:ietf:wg:oauth:2.0:oob' as an authorized redirect URI
 * 
 * Usage:
 * 1. Update CLIENT_ID and CLIENT_SECRET below with your credentials
 * 2. Run: node scripts/generate-google-ads-token.js
 * 3. Follow the instructions to authorize the app
 * 4. Copy the refresh token to your .env.local file
 */

const https = require('https');
const readline = require('readline');
const querystring = require('querystring');

// ============================================
// CONFIGURATION - Update these values
// ============================================
const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost:8080/auth/callback';
const SCOPE = 'https://www.googleapis.com/auth/adwords';

// ============================================
// OAuth2 Flow
// ============================================

function generateAuthUrl() {
  const params = querystring.stringify({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function exchangeCodeForTokens(authCode) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      code: authCode,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const tokens = JSON.parse(data);
          if (tokens.error) {
            reject(new Error(tokens.error_description || tokens.error));
          } else {
            resolve(tokens);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Google Ads API - OAuth2 Refresh Token Generator');
  console.log('='.repeat(60));
  console.log();

  // Validate configuration
  if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
    console.error('❌ Error: Please update CLIENT_ID and CLIENT_SECRET in this script.');
    console.error('   Get these from: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }

  // Generate authorization URL
  const authUrl = generateAuthUrl();
  
  console.log('Step 1: Authorize this application');
  console.log('-'.repeat(60));
  console.log('Visit this URL in your browser:');
  console.log();
  console.log(authUrl);
  console.log();
  console.log('-'.repeat(60));
  console.log();
  console.log('Step 2: After authorizing:');
  console.log('- Google will redirect to localhost (page may not load - that\'s OK!)');
  console.log('- Copy the FULL URL from your browser address bar');
  console.log('- The URL will look like: http://localhost:8080/?code=4/xxxxx...');
  console.log('- Extract just the CODE part (after "code=")');
  console.log();

  // Get authorization code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Step 3: Enter the authorization code (or paste the full URL): ', async (input) => {
    // Extract code from URL if full URL was pasted
    let code = input.trim();
    if (code.includes('code=')) {
      const match = code.match(/code=([^&]+)/);
      if (match) {
        code = match[1];
      }
    }
    console.log();
    console.log('Exchanging authorization code for tokens...');
    
    try {
      const tokens = await exchangeCodeForTokens(code);
      
      console.log();
      console.log('✅ Success! Your tokens:');
      console.log('='.repeat(60));
      console.log();
      console.log('REFRESH TOKEN (save this to .env.local):');
      console.log(tokens.refresh_token);
      console.log();
      console.log('ACCESS TOKEN (temporary, expires in 1 hour):');
      console.log(tokens.access_token);
      console.log();
      console.log('='.repeat(60));
      console.log();
      console.log('Add this to your .env.local file:');
      console.log();
      console.log(`GOOGLE_ADS_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_ADS_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token');
      console.log('GOOGLE_ADS_CUSTOMER_ID=your_customer_id');
      console.log();
      console.log('Note: Get your Developer Token from:');
      console.log('https://ads.google.com/ → Tools → API Center');
      console.log();
      
    } catch (err) {
      console.error();
      console.error('❌ Error:', err.message);
      console.error();
      console.error('Common issues:');
      console.error('- Invalid authorization code (try again)');
      console.error('- Incorrect CLIENT_ID or CLIENT_SECRET');
      console.error('- Authorization code expired (generate a new one)');
      console.error();
    } finally {
      rl.close();
    }
  });
}

// Run the script
main().catch(console.error);

