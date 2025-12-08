# Site Verification API - Quick Reference

## API Endpoints

### 1. Get Verification Token

**Endpoint:**
```
POST https://www.googleapis.com/siteVerification/v1/token
```

**Request Body (Domain - DNS_TXT):**
```json
{
  "site": {
    "type": "INET_DOMAIN",
    "identifier": "example.com"
  },
  "verificationMethod": "DNS_TXT"
}
```

**Request Body (Domain - DNS_CNAME):**
```json
{
  "site": {
    "type": "INET_DOMAIN",
    "identifier": "example.com"
  },
  "verificationMethod": "DNS_CNAME"
}
```

**Request Body (URL - META tag):**
```json
{
  "site": {
    "type": "SITE",
    "identifier": "https://example.com"
  },
  "verificationMethod": "META"
}
```

**Response:**
```json
{
  "method": "DNS_TXT",
  "token": "google-site-verification=1234567890abcdef"
}
```

### 2. Verify Domain/Site

**Endpoint:**
```
POST https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT
```

**Request Body (Domain):**
```json
{
  "site": {
    "type": "INET_DOMAIN",
    "identifier": "example.com"
  }
}
```

**Request Body (URL):**
```json
{
  "site": {
    "type": "SITE",
    "identifier": "https://example.com"
  }
}
```

**Response:**
```json
{
  "id": "dns://example.com/",
  "site": {
    "type": "INET_DOMAIN",
    "identifier": "example.com"
  },
  "owners": [
    "user@example.com"
  ]
}
```

## TypeScript Usage

### Method 1: Domain Verification (DNS_TXT)

```typescript
import { GoogleSearchConsoleClient } from '@/lib/integrations/google-search-console';

const client = new GoogleSearchConsoleClient(config);
client.setCredentials(tokens);

// Get token
const token = await client.getVerificationToken('example.com', 'DNS_TXT');
// Returns: "google-site-verification=1234567890abcdef"

// Verify (after DNS record is added)
const result = await client.verifySite('example.com', 'DNS_TXT');
```

### Method 2: Domain Verification (DNS_CNAME)

```typescript
// Get token
const token = await client.getVerificationToken('example.com', 'DNS_CNAME');

// Verify (after CNAME record is added)
const result = await client.verifySite('example.com', 'DNS_CNAME');
```

### Method 3: URL Verification (META)

```typescript
// Get META tag
const metaTag = await client.getUrlVerificationToken('https://example.com', 'META');
// Returns: '<meta name="google-site-verification" content="..." />'

// Verify (after meta tag is added)
const result = await client.verifyUrlSite('https://example.com', 'META');
```

### Method 4: URL Verification (FILE)

```typescript
// Get file details
const fileInfo = await client.getUrlVerificationToken('https://example.com', 'FILE');

// Verify (after file is uploaded)
const result = await client.verifyUrlSite('https://example.com', 'FILE');
```

## Site Types

| Type | Description | Use Case |
|------|-------------|----------|
| `INET_DOMAIN` | Domain verification | Verifies entire domain (e.g., `example.com`) |
| `SITE` | URL-prefix verification | Verifies specific URL (e.g., `https://example.com`) |

## Verification Methods

| Method | Site Type | Description |
|--------|-----------|-------------|
| `DNS_TXT` | `INET_DOMAIN` or `SITE` | TXT record in DNS |
| `DNS_CNAME` | `INET_DOMAIN` | CNAME record in DNS |
| `META` | `SITE` | HTML meta tag |
| `FILE` | `SITE` | HTML file upload |
| `ANALYTICS` | `SITE` | Google Analytics tracking code |
| `TAG_MANAGER` | `SITE` | Google Tag Manager |

## DNS Record Examples

### TXT Record Format
```
Host: @ (or example.com)
Type: TXT
Value: google-site-verification=1234567890abcdef
TTL: 3600
```

### CNAME Record Format
```
Host: [subdomain provided by Google]
Type: CNAME
Value: [value provided by Google]
TTL: 3600
```

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check domain format and verification method |
| 403 | Forbidden | Missing OAuth scopes or permissions |
| 404 | Not Found | DNS record not found or not propagated |
| 409 | Conflict | Domain already verified by another user |

## OAuth Scopes Required

```typescript
const scopes = [
  'https://www.googleapis.com/auth/siteverification',
  'https://www.googleapis.com/auth/siteverification.verify_only',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/webmasters.readonly',
];
```

## Complete Workflow

```typescript
// 1. Initialize client
const client = new GoogleSearchConsoleClient({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
});

// 2. Set credentials
client.setCredentials({
  access_token: 'user_access_token',
  refresh_token: 'user_refresh_token',
});

// 3. Get verification token
const token = await client.getVerificationToken('example.com', 'DNS_TXT');

// 4. User adds DNS record
console.log('Add TXT record:', token);

// 5. Wait for DNS propagation (use online tools to check)
// dig TXT example.com
// nslookup -type=TXT example.com

// 6. Verify domain
const result = await client.verifySite('example.com', 'DNS_TXT');

// 7. Add to Search Console
await client.addSite('sc-domain:example.com');

// 8. Start using Search Console API
const sites = await client.listSites();
const analytics = await client.queryAnalytics('sc-domain:example.com', {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  dimensions: ['query', 'page'],
});
```

## Testing DNS Propagation

```bash
# Check TXT record (Linux/Mac)
dig TXT example.com

# Check TXT record (Windows)
nslookup -type=TXT example.com

# Online tools
# - https://www.whatsmydns.net/
# - https://dnschecker.org/
# - https://toolbox.googleapps.com/apps/dig/
```

## Common Issues

### Issue: "DNS record not found"
**Solution:** Wait for DNS propagation (5 minutes to 48 hours). Verify record exists using `dig` or `nslookup`.

### Issue: "Domain already verified"
**Solution:** Domain is verified by another Google account. Remove verification or use a different account.

### Issue: "Missing permissions"
**Solution:** Ensure OAuth scopes include `siteverification` and `webmasters`.

### Issue: "Token expired"
**Solution:** Refresh access token using refresh token before making API calls.

## API Rate Limits

- **Queries per day:** 10,000 (per project)
- **Queries per 100 seconds:** 1,000
- **Queries per user per 100 seconds:** 100

Handle rate limits with exponential backoff:

```typescript
async function verifyWithRetry(domain: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.verifySite(domain, 'DNS_TXT');
    } catch (error: any) {
      if (error.code === 429) {
        // Rate limited
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}
```

## Additional Resources

- [Official API Documentation](https://developers.google.com/site-verification/v1/getting_started)
- [OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Search Console API](https://developers.google.com/webmaster-tools)
- [DNS Record Help](https://support.google.com/webmasters/answer/9008080)

