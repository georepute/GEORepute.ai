# Site Verification API Fix - Domain vs URL Identifier

## Problem

The API was throwing this error:
```
"The site https://perfection.marketing of type INET_DOMAIN is invalid."
```

## Root Cause

The Site Verification API has two distinct verification types:

1. **INET_DOMAIN** - For domain properties (requires domain name WITHOUT protocol)
   - Correct: `perfection.marketing`
   - Wrong: `https://perfection.marketing`

2. **SITE** - For URL-prefix properties (requires full URL WITH protocol)
   - Correct: `https://perfection.marketing`
   - Wrong: `perfection.marketing`

The code was calling `getVerificationToken()` (which uses `INET_DOMAIN`) but passing a URL with `https://` protocol, which caused Google's API to reject it.

## Solution

### File: `app/api/integrations/google-search-console/domains/route.ts`

**Changes:**

1. **Separate the domain identifier:**
   ```typescript
   const cleanDomain = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
   const siteUrl = normalizeSiteUrl(domainUrl); // For Search Console (with https://)
   const domainForVerification = cleanDomain; // For verification API (without protocol)
   ```

2. **Use correct identifier for domain verification:**
   ```typescript
   // OLD (Wrong):
   verificationToken = await client.getVerificationToken(siteUrl, 'DNS_TXT');
   // siteUrl = "https://perfection.marketing" ❌
   
   // NEW (Correct):
   verificationToken = await client.getVerificationToken(domainForVerification, 'DNS_TXT');
   // domainForVerification = "perfection.marketing" ✅
   ```

3. **Added DNS_CNAME fallback:**
   ```typescript
   try {
     verificationToken = await client.getVerificationToken(domainForVerification, 'DNS_TXT');
   } catch (error) {
     // Try DNS_CNAME
     verificationToken = await client.getVerificationToken(domainForVerification, 'DNS_CNAME');
     verificationMethod = 'DNS_CNAME';
   }
   ```

4. **Updated instructions for DNS_CNAME:**
   ```typescript
   if (verificationMethod === 'DNS_CNAME') {
     instructions = {
       recordType: 'CNAME',
       recordName: 'Provided by Google',
       recordValue: verificationToken,
       message: 'Add this CNAME record to your DNS settings...',
     };
   }
   ```

### File: `app/api/integrations/google-search-console/domains/verify/route.ts`

**Changes:**

1. **Use correct identifier based on verification method:**
   ```typescript
   if (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME') {
     // INET_DOMAIN: Use domain without protocol
     verificationIdentifier = domain.domain_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
     await client.verifySite(verificationIdentifier, verificationMethod);
   } else {
     // SITE: Use full URL
     verificationIdentifier = domain.site_url;
     await client.verifyUrlSite(verificationIdentifier, verificationMethod);
   }
   ```

2. **Use correct Search Console site URL format:**
   ```typescript
   // For domain properties, use sc-domain: prefix
   const searchConsoleSiteUrl = (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME')
     ? `sc-domain:${verificationIdentifier}`
     : domain.site_url;
   
   await client.addSite(searchConsoleSiteUrl);
   ```

## Verification Type Matrix

| Verification Method | Type | Identifier Format | Method to Use |
|-------------------|------|-------------------|---------------|
| DNS_TXT | INET_DOMAIN | `perfection.marketing` | `getVerificationToken()` |
| DNS_CNAME | INET_DOMAIN | `perfection.marketing` | `getVerificationToken()` |
| META | SITE | `https://perfection.marketing` | `getUrlVerificationToken()` |
| FILE | SITE | `https://perfection.marketing` | `getUrlVerificationToken()` |
| ANALYTICS | SITE | `https://perfection.marketing` | `getUrlVerificationToken()` |
| TAG_MANAGER | SITE | `https://perfection.marketing` | `getUrlVerificationToken()` |

## Verification Flow

### 1. Request Token (POST /api/integrations/google-search-console/domains)

```typescript
// Input: domainUrl = "https://perfection.marketing" or "perfection.marketing"

// Clean the domain
const cleanDomain = "perfection.marketing"

// Try DNS_TXT first (INET_DOMAIN)
const token = await client.getVerificationToken(cleanDomain, 'DNS_TXT');
// Returns: "google-site-verification=abc123..."
```

### 2. User Adds DNS Record

```
Type: TXT
Host: @ or perfection.marketing
Value: google-site-verification=abc123...
TTL: 3600
```

### 3. Verify Domain (POST /api/integrations/google-search-console/domains/verify)

```typescript
// Get clean domain from database
const cleanDomain = "perfection.marketing"

// Verify with correct identifier
await client.verifySite(cleanDomain, 'DNS_TXT');

// Add to Search Console with sc-domain: prefix
await client.addSite('sc-domain:perfection.marketing');
```

## Search Console Property Types

After verification, the domain is added to Search Console as:

| Verification Method | Search Console Format | Property Type |
|-------------------|----------------------|---------------|
| DNS_TXT | `sc-domain:perfection.marketing` | Domain Property |
| DNS_CNAME | `sc-domain:perfection.marketing` | Domain Property |
| META | `https://perfection.marketing` | URL-prefix Property |
| FILE | `https://perfection.marketing` | URL-prefix Property |

**Domain Properties** (`sc-domain:`) include all subdomains and protocols:
- `https://perfection.marketing`
- `https://www.perfection.marketing`
- `https://blog.perfection.marketing`
- `http://perfection.marketing`

**URL-prefix Properties** only include the exact URL and paths under it:
- `https://perfection.marketing/path`
- `https://perfection.marketing/another-path`
- ❌ NOT `https://www.perfection.marketing`
- ❌ NOT `http://perfection.marketing`

## Testing

Test the fix with:

```bash
# Add domain (will use DNS_TXT by default)
curl -X POST http://localhost:3000/api/integrations/google-search-console/domains \
  -H "Content-Type: application/json" \
  -d '{"domainUrl": "perfection.marketing"}'

# Expected response:
{
  "success": true,
  "verificationToken": "google-site-verification=...",
  "verificationMethod": "DNS_TXT",
  "instructions": {
    "recordType": "TXT",
    "recordName": "@",
    "recordValue": "google-site-verification=...",
    "message": "Add this TXT record to your DNS settings..."
  }
}
```

## Key Takeaways

1. **INET_DOMAIN** = domain name only (no protocol)
2. **SITE** = full URL with protocol
3. Use `getVerificationToken()` for DNS_TXT and DNS_CNAME
4. Use `getUrlVerificationToken()` for META, FILE, etc.
5. Use `verifySite()` for INET_DOMAIN verification
6. Use `verifyUrlSite()` for SITE verification
7. Domain properties use `sc-domain:` prefix in Search Console
8. URL-prefix properties use full URL in Search Console

## Related Files

- `lib/integrations/google-search-console.ts` - Client methods
- `app/api/integrations/google-search-console/domains/route.ts` - Add domain endpoint
- `app/api/integrations/google-search-console/domains/verify/route.ts` - Verify domain endpoint

