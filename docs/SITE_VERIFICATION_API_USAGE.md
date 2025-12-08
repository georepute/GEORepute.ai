# Site Verification API Usage Guide

This guide demonstrates how to use the Site Verification API methods in the Google Search Console integration.

## Overview

The Site Verification API allows you to programmatically verify domain ownership using DNS records. This is essential for adding domains to Google Search Console.

## API Methods

### 1. Domain Verification (INET_DOMAIN)

For verifying domains using DNS records (recommended for Search Console domain properties).

#### Get Verification Token

```typescript
// Get a DNS_TXT verification token for a domain
const token = await client.getVerificationToken('example.com', 'DNS_TXT');
console.log('Add this TXT record to your DNS:', token);

// Or get a DNS_CNAME verification token
const cnameToken = await client.getVerificationToken('example.com', 'DNS_CNAME');
console.log('Add this CNAME record to your DNS:', cnameToken);
```

**API Call Details:**
- **Endpoint:** `POST https://www.googleapis.com/siteVerification/v1/token`
- **Request Body:**
  ```json
  {
    "site": {
      "type": "INET_DOMAIN",
      "identifier": "example.com"
    },
    "verificationMethod": "DNS_TXT"
  }
  ```
- **Response:** Returns a `token` string that must be added to DNS records

#### Verify Domain After DNS Setup

```typescript
// After adding the DNS record, verify the domain
const result = await client.verifySite('example.com', 'DNS_TXT');
console.log('Domain verified:', result);
```

**API Call Details:**
- **Endpoint:** `POST https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT`
- **Request Body:**
  ```json
  {
    "site": {
      "type": "INET_DOMAIN",
      "identifier": "example.com"
    }
  }
  ```
- **Response:** Returns verification details on success

### 2. URL-Prefix Verification (SITE)

For verifying specific URL properties (alternative to domain verification).

#### Get URL Verification Token

```typescript
// Get a META tag verification token
const metaTag = await client.getUrlVerificationToken('https://example.com', 'META');
console.log('Add this meta tag to your homepage:', metaTag);

// Other methods: FILE, ANALYTICS, TAG_MANAGER, DNS_TXT
const fileToken = await client.getUrlVerificationToken('https://example.com', 'FILE');
console.log('Upload this file to your site root:', fileToken);
```

#### Verify URL Site

```typescript
// After adding the meta tag or file, verify the site
const result = await client.verifyUrlSite('https://example.com', 'META');
console.log('URL site verified:', result);
```

## Complete Workflow Example

### Domain Verification Flow (Recommended)

```typescript
import { GoogleSearchConsoleClient } from '@/lib/integrations/google-search-console';

async function verifyDomain(domain: string) {
  // Initialize the client
  const client = new GoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  });

  // Set user credentials
  client.setCredentials({
    access_token: userTokens.access_token,
    refresh_token: userTokens.refresh_token,
  });

  try {
    // Step 1: Get verification token
    console.log('Step 1: Getting verification token...');
    const token = await client.getVerificationToken(domain, 'DNS_TXT');
    console.log(`Token: ${token}`);
    
    // Display instructions to user
    console.log('\nInstructions:');
    console.log('1. Log in to your DNS provider');
    console.log('2. Add a TXT record with the following value:');
    console.log(`   Name: @ or ${domain}`);
    console.log(`   Type: TXT`);
    console.log(`   Value: ${token}`);
    console.log('3. Wait for DNS propagation (can take up to 48 hours, usually faster)');
    console.log('4. Run the verification step');
    
    // Step 2: Wait for user to add DNS record
    // In a real application, you'd save this token and verify later
    console.log('\n(Waiting for DNS record to be added...)');
    
    // Step 3: Verify the domain
    console.log('\nStep 2: Verifying domain...');
    const result = await client.verifySite(domain, 'DNS_TXT');
    console.log('Success! Domain verified:', result);
    
    // Step 4: Add to Search Console (optional)
    console.log('\nStep 3: Adding to Search Console...');
    await client.addSite(`sc-domain:${domain}`);
    console.log('Domain added to Search Console');
    
  } catch (error: any) {
    console.error('Verification failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Usage
verifyDomain('example.com');
```

### URL-Prefix Verification Flow

```typescript
async function verifyUrlSite(siteUrl: string) {
  const client = new GoogleSearchConsoleClient(config);
  client.setCredentials(tokens);

  try {
    // Step 1: Get META tag token
    const metaTag = await client.getUrlVerificationToken(siteUrl, 'META');
    console.log('Add this meta tag to your site\'s <head> section:');
    console.log(metaTag);
    
    // Wait for user to add the meta tag
    // ...
    
    // Step 2: Verify the site
    const result = await client.verifyUrlSite(siteUrl, 'META');
    console.log('Site verified:', result);
    
    // Step 3: Add to Search Console
    await client.addSite(siteUrl);
    console.log('Site added to Search Console');
    
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

// Usage
verifyUrlSite('https://example.com');
```

## Verification Methods

### DNS_TXT (Recommended for domains)
- **Type:** `INET_DOMAIN`
- **Pros:** Works for entire domain, no website required
- **Cons:** Requires DNS access, propagation delay
- **Use case:** Domain properties in Search Console (`sc-domain:example.com`)

### DNS_CNAME (Alternative DNS method)
- **Type:** `INET_DOMAIN`
- **Pros:** Alternative to TXT records
- **Cons:** Requires DNS access, propagation delay
- **Use case:** When TXT records are not available

### META (HTML meta tag)
- **Type:** `SITE` (URL-prefix)
- **Pros:** Quick to implement, no DNS changes
- **Cons:** Only verifies specific URL, requires website access
- **Use case:** URL-prefix properties (`https://example.com`)

### FILE (HTML file upload)
- **Type:** `SITE` (URL-prefix)
- **Pros:** No code changes required
- **Cons:** Requires file upload access
- **Use case:** When you can't modify HTML

### ANALYTICS (Google Analytics)
- **Type:** `SITE` (URL-prefix)
- **Pros:** No changes needed if GA already installed
- **Cons:** Requires existing GA setup
- **Use case:** Sites with Google Analytics

### TAG_MANAGER (Google Tag Manager)
- **Type:** `SITE` (URL-prefix)
- **Pros:** No changes needed if GTM already installed
- **Cons:** Requires existing GTM setup
- **Use case:** Sites with Google Tag Manager

## Error Handling

Common errors and solutions:

### Token Request Failed
```typescript
try {
  const token = await client.getVerificationToken(domain, 'DNS_TXT');
} catch (error: any) {
  if (error.code === 403) {
    console.error('Missing siteverification scope in OAuth token');
  } else if (error.code === 400) {
    console.error('Invalid domain format');
  }
}
```

### Verification Failed
```typescript
try {
  const result = await client.verifySite(domain, 'DNS_TXT');
} catch (error: any) {
  if (error.code === 404) {
    console.error('DNS record not found. Wait for propagation or check the record.');
  } else if (error.code === 400) {
    console.error('Invalid verification token or format');
  }
}
```

## OAuth Scopes Required

Make sure your OAuth consent includes these scopes:
- `https://www.googleapis.com/auth/siteverification` (read/write)
- `https://www.googleapis.com/auth/siteverification.verify_only` (verify only)
- `https://www.googleapis.com/auth/webmasters` (Search Console access)

These scopes are already included in the `getAuthUrl()` method.

## DNS Record Examples

### TXT Record
```
Host: @ (or example.com)
Type: TXT
Value: google-site-verification=abcdef123456...
TTL: 3600
```

### CNAME Record
```
Host: abcdef123456.example.com
Type: CNAME
Value: ab-cde-f12.dv.googlehosted.com
TTL: 3600
```

## Testing DNS Propagation

Before calling `verifySite()`, verify the DNS record is live:

```bash
# Check TXT record
nslookup -type=TXT example.com

# Or using dig
dig TXT example.com

# Check CNAME record
nslookup -type=CNAME subdomain.example.com
```

## Best Practices

1. **Use DNS_TXT for domains:** Best for Search Console domain properties
2. **Save tokens:** Store verification tokens in your database for future reference
3. **Handle async verification:** DNS propagation takes time, implement a retry mechanism
4. **Check existing verification:** Call `listSites()` to see if domain is already verified
5. **Error handling:** Implement proper error handling and user feedback
6. **Refresh tokens:** Ensure access tokens are refreshed before they expire

## Integration with Search Console

After verification, add the domain to Search Console:

```typescript
// For domain properties (after DNS verification)
await client.addSite(`sc-domain:${domain}`);

// For URL-prefix properties
await client.addSite(`https://example.com`);

// List all sites
const sites = await client.listSites();
console.log('Verified sites:', sites);
```

## API Reference Links

- [Site Verification API Documentation](https://developers.google.com/site-verification/v1/getting_started)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#siteverification)
- [Google Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index)

