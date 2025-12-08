/**
 * Site Verification API Example
 * 
 * This file demonstrates how to use the Site Verification API
 * to verify domain ownership for Google Search Console.
 */

import { GoogleSearchConsoleClient, GSCTokens } from '../lib/integrations/google-search-console';

// Example: Domain Verification with DNS_TXT
async function exampleDomainVerificationTXT() {
  // Initialize client
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  // Set user credentials (from database or OAuth flow)
  const tokens: GSCTokens = {
    access_token: 'user_access_token',
    refresh_token: 'user_refresh_token',
  };
  client.setCredentials(tokens);

  const domain = 'example.com';

  try {
    // Step 1: Get verification token
    console.log('Getting verification token...');
    const token = await client.getVerificationToken(domain, 'DNS_TXT');
    
    console.log('\n=== DNS Setup Instructions ===');
    console.log('Add this TXT record to your DNS:');
    console.log(`  Host: @ or ${domain}`);
    console.log(`  Type: TXT`);
    console.log(`  Value: ${token}`);
    console.log('=============================\n');

    // In a real app, save the token and wait for user to add DNS record
    // Then they would trigger the verification step later

    // Step 2: Verify domain (after DNS record is added)
    console.log('Verifying domain...');
    const result = await client.verifySite(domain, 'DNS_TXT');
    console.log('✓ Domain verified successfully!');
    console.log('Result:', result);

    // Step 3: Add to Search Console as domain property
    console.log('\nAdding to Search Console...');
    await client.addSite(`sc-domain:${domain}`);
    console.log('✓ Domain added to Search Console');

    // Step 4: List all verified sites
    const sites = await client.listSites();
    console.log('\nAll verified sites:', sites);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Example: Domain Verification with DNS_CNAME
async function exampleDomainVerificationCNAME() {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  const tokens: GSCTokens = {
    access_token: 'user_access_token',
    refresh_token: 'user_refresh_token',
  };
  client.setCredentials(tokens);

  const domain = 'example.com';

  try {
    // Get CNAME verification token
    const token = await client.getVerificationToken(domain, 'DNS_CNAME');
    
    console.log('\n=== DNS Setup Instructions ===');
    console.log('Add this CNAME record to your DNS:');
    console.log(`  Value: ${token}`);
    console.log('=============================\n');

    // Wait for DNS propagation, then verify
    const result = await client.verifySite(domain, 'DNS_CNAME');
    console.log('✓ Domain verified with CNAME!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Example: URL-Prefix Verification with META tag
async function exampleUrlVerificationMeta() {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  const tokens: GSCTokens = {
    access_token: 'user_access_token',
    refresh_token: 'user_refresh_token',
  };
  client.setCredentials(tokens);

  const siteUrl = 'https://example.com';

  try {
    // Step 1: Get META tag
    console.log('Getting META tag...');
    const metaTag = await client.getUrlVerificationToken(siteUrl, 'META');
    
    console.log('\n=== Website Setup Instructions ===');
    console.log('Add this meta tag to your site\'s <head> section:');
    console.log(metaTag);
    console.log('=====================================\n');

    // Step 2: Verify site (after meta tag is added)
    console.log('Verifying site...');
    const result = await client.verifyUrlSite(siteUrl, 'META');
    console.log('✓ Site verified successfully!');

    // Step 3: Add to Search Console as URL-prefix property
    await client.addSite(siteUrl);
    console.log('✓ Site added to Search Console');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Example: URL-Prefix Verification with FILE upload
async function exampleUrlVerificationFile() {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  const tokens: GSCTokens = {
    access_token: 'user_access_token',
    refresh_token: 'user_refresh_token',
  };
  client.setCredentials(tokens);

  const siteUrl = 'https://example.com';

  try {
    // Get verification file details
    const fileInfo = await client.getUrlVerificationToken(siteUrl, 'FILE');
    
    console.log('\n=== File Upload Instructions ===');
    console.log('Upload a file with this info to your site root:');
    console.log(fileInfo);
    console.log('=================================\n');

    // Verify after file is uploaded
    const result = await client.verifyUrlSite(siteUrl, 'FILE');
    console.log('✓ Site verified with file upload!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Complete workflow with error handling and retry
async function completeVerificationWorkflow(domain: string, userTokens: GSCTokens) {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  client.setCredentials(userTokens);

  // Step 1: Check if already verified
  try {
    const sites = await client.listSites();
    const domainProperty = `sc-domain:${domain}`;
    const isVerified = sites.some((site: any) => site.siteUrl === domainProperty);
    
    if (isVerified) {
      console.log('✓ Domain is already verified!');
      return { success: true, alreadyVerified: true };
    }
  } catch (error) {
    console.log('Unable to check existing sites, continuing...');
  }

  // Step 2: Request verification token
  let token: string;
  try {
    console.log('Requesting verification token...');
    token = await client.getVerificationToken(domain, 'DNS_TXT');
    console.log('Token received:', token);
  } catch (error: any) {
    console.error('Failed to get verification token:', error.message);
    return { success: false, error: 'Failed to get token', details: error };
  }

  // Step 3: Return token to user for DNS setup
  console.log('\n⚠️  ACTION REQUIRED:');
  console.log('Add this TXT record to your DNS:');
  console.log(`  Host: ${domain}`);
  console.log(`  Type: TXT`);
  console.log(`  Value: ${token}`);
  console.log('\nDNS propagation can take up to 48 hours (usually much faster)');
  console.log('Run the verification after DNS is updated.\n');

  // In a real app, you would:
  // 1. Save the token in database
  // 2. Return instructions to user
  // 3. User adds DNS record
  // 4. User triggers verification in a separate API call

  return {
    success: true,
    token,
    instructions: {
      type: 'DNS_TXT',
      host: domain,
      value: token,
    },
  };
}

// Example: Verify after DNS record is added
async function verifyAfterDNSSetup(domain: string, userTokens: GSCTokens) {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  client.setCredentials(userTokens);

  // Retry logic for verification (DNS might not be propagated yet)
  const maxRetries = 3;
  let retryCount = 0;
  let lastError: any;

  while (retryCount < maxRetries) {
    try {
      console.log(`Verification attempt ${retryCount + 1}/${maxRetries}...`);
      
      const result = await client.verifySite(domain, 'DNS_TXT');
      console.log('✓ Domain verified successfully!');
      
      // Add to Search Console
      try {
        await client.addSite(`sc-domain:${domain}`);
        console.log('✓ Domain added to Search Console');
      } catch (addError: any) {
        // Site might already be added
        console.log('Note: Could not add to Search Console (might already exist)');
      }

      return { success: true, result };

    } catch (error: any) {
      lastError = error;
      retryCount++;

      if (error.code === 404) {
        console.log('DNS record not found. Waiting for propagation...');
        if (retryCount < maxRetries) {
          // Wait 30 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      } else {
        // Other errors, don't retry
        console.error('Verification failed:', error.message);
        break;
      }
    }
  }

  return {
    success: false,
    error: 'Verification failed after retries',
    details: lastError,
    suggestion: 'Please check your DNS record and try again later',
  };
}

// Example: Token refresh handling
async function verifyWithTokenRefresh(domain: string, userTokens: GSCTokens) {
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  // Check if token needs refresh
  if (userTokens.expiry_date && userTokens.expiry_date < Date.now()) {
    console.log('Token expired, refreshing...');
    try {
      const newTokens = await client.refreshAccessToken(userTokens.refresh_token!);
      console.log('Token refreshed successfully');
      // Save new tokens to database
      // updateUserTokens(userId, newTokens);
      client.setCredentials(newTokens);
    } catch (error) {
      console.error('Failed to refresh token. User needs to re-authenticate.');
      throw error;
    }
  } else {
    client.setCredentials(userTokens);
  }

  // Proceed with verification
  const token = await client.getVerificationToken(domain, 'DNS_TXT');
  return token;
}

// Export examples
export {
  exampleDomainVerificationTXT,
  exampleDomainVerificationCNAME,
  exampleUrlVerificationMeta,
  exampleUrlVerificationFile,
  completeVerificationWorkflow,
  verifyAfterDNSSetup,
  verifyWithTokenRefresh,
};

// Run example (uncomment to test)
// exampleDomainVerificationTXT().catch(console.error);

