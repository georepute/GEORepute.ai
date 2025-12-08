# Google Search Console Site URL Format Fix

## Problem

After fixing the domain verification to use `sc-domain:` format for DNS-verified domains, the analytics sync endpoint was failing with:

```
Error: "User does not have sufficient permission for site 'https://perfection.marketing'."
```

## Root Cause

The issue occurs because Google Search Console has **two different property types**, each requiring a different site URL format when making API calls:

### 1. Domain Properties (DNS Verification)
- **Verification Methods:** DNS_TXT, DNS_CNAME
- **Verification Type:** INET_DOMAIN
- **Search Console Format:** `sc-domain:perfection.marketing`
- **Scope:** Includes ALL subdomains and protocols
  - ✅ `https://perfection.marketing`
  - ✅ `http://perfection.marketing`
  - ✅ `https://www.perfection.marketing`
  - ✅ `https://blog.perfection.marketing`

### 2. URL-Prefix Properties (Website Verification)
- **Verification Methods:** META, FILE, ANALYTICS, TAG_MANAGER
- **Verification Type:** SITE
- **Search Console Format:** `https://perfection.marketing`
- **Scope:** Only the EXACT URL and paths under it
  - ✅ `https://perfection.marketing/page`
  - ❌ `https://www.perfection.marketing` (different subdomain)
  - ❌ `http://perfection.marketing` (different protocol)

## The Mismatch

When a domain is verified using DNS_TXT:
1. ✅ Domain is verified as `sc-domain:perfection.marketing`
2. ✅ Domain is added to Search Console as `sc-domain:perfection.marketing`
3. ❌ Analytics API was called with `https://perfection.marketing` (wrong format!)
4. ❌ Google rejects: "User does not have sufficient permission"

## Solution

### Part 1: Created Utility Function

Added `getSearchConsoleSiteUrl()` helper function to `lib/integrations/google-search-console.ts`:

```typescript
/**
 * Helper to get the correct Search Console site URL format based on verification method
 * 
 * @param domainUrl - The domain URL (e.g., "perfection.marketing" or "https://perfection.marketing")
 * @param verificationMethod - The verification method used (DNS_TXT, DNS_CNAME, META, FILE, etc.)
 * @returns The correctly formatted site URL for Search Console API calls
 */
export function getSearchConsoleSiteUrl(domainUrl: string, verificationMethod: string): string {
  const cleanDomain = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // DNS_TXT and DNS_CNAME use domain properties (sc-domain:)
  if (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME') {
    return `sc-domain:${cleanDomain}`;
  }
  
  // META, FILE, ANALYTICS, TAG_MANAGER use URL-prefix properties
  return normalizeSiteUrl(domainUrl);
}
```

### Part 2: Updated Analytics Sync Endpoint

Updated `app/api/integrations/google-search-console/analytics/sync/route.ts`:

```typescript
// OLD (Wrong):
const rows = await client.queryAnalytics(domain.site_url, {
  startDate: analyticsStartDate,
  endDate: analyticsEndDate,
  dimensions,
  rowLimit,
});
// domain.site_url = "https://perfection.marketing" ❌

// NEW (Correct):
const verificationMethod = domain.verification_method || 'DNS_TXT';
const searchConsoleSiteUrl = getSearchConsoleSiteUrl(domain.domain_url, verificationMethod);
// searchConsoleSiteUrl = "sc-domain:perfection.marketing" ✅

const rows = await client.queryAnalytics(searchConsoleSiteUrl, {
  startDate: analyticsStartDate,
  endDate: analyticsEndDate,
  dimensions,
  rowLimit,
});
```

## Verification Method Matrix

| Verification Method | Verification Type | Site URL Format | Example |
|---------------------|-------------------|-----------------|---------|
| DNS_TXT | INET_DOMAIN | `sc-domain:{domain}` | `sc-domain:perfection.marketing` |
| DNS_CNAME | INET_DOMAIN | `sc-domain:{domain}` | `sc-domain:perfection.marketing` |
| META | SITE | `https://{domain}` | `https://perfection.marketing` |
| FILE | SITE | `https://{domain}` | `https://perfection.marketing` |
| ANALYTICS | SITE | `https://{domain}` | `https://perfection.marketing` |
| TAG_MANAGER | SITE | `https://{domain}` | `https://perfection.marketing` |

## Complete Flow Example

### Adding a Domain with DNS_TXT

```typescript
// 1. User enters domain
const domainUrl = "perfection.marketing";

// 2. Request verification token
const cleanDomain = "perfection.marketing";
const token = await client.getVerificationToken(cleanDomain, 'DNS_TXT');
// Returns: "google-site-verification=abc123..."

// 3. Store in database
await supabase.from('gsc_domains').insert({
  domain_url: "perfection.marketing",
  site_url: "https://perfection.marketing",
  verification_method: "DNS_TXT",
  verification_token: token,
});

// 4. User adds DNS record
// Type: TXT
// Host: @
// Value: google-site-verification=abc123...

// 5. Verify domain
const cleanDomain = "perfection.marketing";
await client.verifySite(cleanDomain, 'DNS_TXT');

// 6. Add to Search Console
await client.addSite('sc-domain:perfection.marketing');

// 7. Query analytics (CORRECT FORMAT)
const searchConsoleSiteUrl = getSearchConsoleSiteUrl(
  "perfection.marketing", 
  "DNS_TXT"
);
// Returns: "sc-domain:perfection.marketing"

const analytics = await client.queryAnalytics(searchConsoleSiteUrl, {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  dimensions: ['date'],
});
```

## Files Changed

### 1. `lib/integrations/google-search-console.ts`
- ✅ Added `getSearchConsoleSiteUrl()` helper function
- ✅ Exported function for use in API routes

### 2. `app/api/integrations/google-search-console/analytics/sync/route.ts`
- ✅ Imported `getSearchConsoleSiteUrl` helper
- ✅ Uses correct site URL format based on verification method
- ✅ Added logging to show which site URL is being used

## Testing

### Test 1: Add Domain with DNS_TXT
```bash
curl -X POST http://localhost:3000/api/integrations/google-search-console/domains \
  -H "Content-Type: application/json" \
  -d '{"domainUrl": "perfection.marketing"}'
```

Expected: Domain added with `verification_method: "DNS_TXT"`

### Test 2: Verify Domain
```bash
# After adding DNS record
curl -X POST http://localhost:3000/api/integrations/google-search-console/domains/verify \
  -H "Content-Type: application/json" \
  -d '{"domainId": "domain-id-here"}'
```

Expected: Domain verified and added as `sc-domain:perfection.marketing`

### Test 3: Sync Analytics (This was failing before)
```bash
curl -X POST http://localhost:3000/api/integrations/google-search-console/analytics/sync \
  -H "Content-Type: application/json" \
  -d '{
    "domainId": "domain-id-here",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

Expected: 
- ✅ Console log: "Querying analytics for sc-domain:perfection.marketing (verification method: DNS_TXT)"
- ✅ Success response with analytics data
- ❌ No more "insufficient permission" errors!

## Console Logs

You should now see this in your server logs:

```
Querying analytics for sc-domain:perfection.marketing (verification method: DNS_TXT)
```

Instead of the old (incorrect):
```
Querying analytics for https://perfection.marketing
```

## Benefits of Domain Properties (sc-domain:)

1. **Includes all subdomains** - No need to verify each subdomain separately
2. **Includes all protocols** - HTTP and HTTPS both included
3. **Single verification** - One DNS record verifies entire domain
4. **More comprehensive data** - Analytics include all subdomains
5. **Recommended by Google** - Domain properties are Google's recommended method

## When to Use URL-Prefix Properties

Use URL-prefix properties (META, FILE) when:
- You don't have DNS access
- You only want to track a specific subdomain
- You want to separate data by subdomain
- You're using a platform where DNS isn't available (e.g., GitHub Pages with custom domain)

## Troubleshooting

### Error: "User does not have sufficient permission"

**Cause:** Using wrong site URL format for API calls

**Solution:** 
1. Check `verification_method` in database
2. Use `getSearchConsoleSiteUrl()` helper to get correct format
3. Ensure domain was verified correctly

**Verify in Google Search Console:**
1. Go to https://search.google.com/search-console
2. Check how the property is listed:
   - Domain property: Shows as just "perfection.marketing"
   - URL-prefix: Shows as "https://perfection.marketing"

### Error: "Domain not found"

**Cause:** Site URL format doesn't match how it was added to Search Console

**Solution:**
- For DNS verification: Use `sc-domain:domain.com`
- For META verification: Use `https://domain.com`

## Future Considerations

### Other API Calls That May Need This

If you add these features in the future, use the same helper:

```typescript
// Sitemaps
const siteUrl = getSearchConsoleSiteUrl(domain.domain_url, domain.verification_method);
await client.submitSitemap(siteUrl, 'https://perfection.marketing/sitemap.xml');
await client.listSitemaps(siteUrl);

// URL inspection
// (Note: URL Inspection API only works with URL-prefix properties)
if (domain.verification_method !== 'DNS_TXT' && domain.verification_method !== 'DNS_CNAME') {
  const siteUrl = getSearchConsoleSiteUrl(domain.domain_url, domain.verification_method);
  // Use URL Inspection API
}
```

## Related Files

- `lib/integrations/google-search-console.ts` - Helper functions
- `app/api/integrations/google-search-console/analytics/sync/route.ts` - Analytics sync (fixed)
- `app/api/integrations/google-search-console/domains/route.ts` - Add domain (already correct)
- `app/api/integrations/google-search-console/domains/verify/route.ts` - Verify domain (already correct)
- `docs/SITE_VERIFICATION_FIX.md` - Original verification fix
- `docs/TESTING_SITE_VERIFICATION.md` - Testing guide

## Summary

✅ **Problem:** Analytics API calls failing due to incorrect site URL format
✅ **Root Cause:** DNS-verified domains need `sc-domain:` prefix, not `https://`
✅ **Solution:** Created `getSearchConsoleSiteUrl()` helper and updated analytics sync
✅ **Result:** Analytics sync now works correctly for all verification methods

