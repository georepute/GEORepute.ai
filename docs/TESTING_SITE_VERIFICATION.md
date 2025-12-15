# Testing the Site Verification Fix

## Quick Test

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Google Search Console page:**
   ```
   http://localhost:3000/dashboard/google-search-console
   ```

3. **Add a domain:**
   - Enter: `perfection.marketing` (without https://)
   - Or: `https://perfection.marketing` (with https://) - code will clean it
   - Click "Add Domain"

4. **Expected Result:**
   - ✅ Success message
   - ✅ Modal opens with DNS TXT record instructions
   - ✅ Shows: `google-site-verification=...` token

5. **Add the DNS record to your domain:**
   ```
   Type: TXT
   Host: @ or perfection.marketing
   Value: google-site-verification=abc123...
   TTL: 3600
   ```

6. **Wait for DNS propagation (5-60 minutes typically)**

7. **Verify the DNS record:**
   ```bash
   # Windows
   nslookup -type=TXT perfection.marketing
   
   # Mac/Linux
   dig TXT perfection.marketing
   ```

8. **Click "Verify Domain" button in the app**

9. **Expected Result:**
   - ✅ "Domain verified successfully!"
   - ✅ Domain status changes to "Verified"
   - ✅ Domain added to Google Search Console as `sc-domain:perfection.marketing`

## API Testing with cURL

### Test 1: Add Domain (Request Token)

```bash
# Test with domain only
curl -X POST http://localhost:3000/api/integrations/google-search-console/domains \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"domainUrl": "perfection.marketing"}'

# Test with full URL (should still work)
curl -X POST http://localhost:3000/api/integrations/google-search-console/domains \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"domainUrl": "https://perfection.marketing"}'
```

**Expected Response:**
```json
{
  "success": true,
  "domain": {
    "id": "...",
    "domain_url": "perfection.marketing",
    "site_url": "https://perfection.marketing",
    "verification_method": "DNS_TXT",
    "verification_token": "google-site-verification=abc123...",
    "verification_status": "pending"
  },
  "verificationToken": "google-site-verification=abc123...",
  "verificationMethod": "DNS_TXT",
  "instructions": {
    "recordType": "TXT",
    "recordName": "@",
    "recordValue": "google-site-verification=abc123...",
    "message": "Add this TXT record to your DNS settings..."
  }
}
```

### Test 2: Verify Domain (After DNS Added)

```bash
curl -X POST http://localhost:3000/api/integrations/google-search-console/domains/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"domainId": "your-domain-id"}'
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Domain verified successfully!",
  "domain": {
    "id": "...",
    "verification_status": "verified",
    "metadata": {
      "verified_at": "2024-01-01T00:00:00Z",
      "verification_identifier": "perfection.marketing"
    }
  }
}
```

**Expected Error Response (DNS not found):**
```json
{
  "error": "Domain verification failed. Please ensure the TXT record is correctly added to your DNS settings...",
  "details": "The domain was not found."
}
```

## Verification Methods Comparison

### DNS_TXT (Recommended)

**Pros:**
- ✅ Verifies entire domain including all subdomains
- ✅ No website/code changes needed
- ✅ Works for domains without websites
- ✅ Most reliable method

**Cons:**
- ⏱️ Requires DNS access
- ⏱️ DNS propagation delay (5-60 minutes)

**API Calls:**
```typescript
// Request token
const token = await client.getVerificationToken('perfection.marketing', 'DNS_TXT');

// Verify
await client.verifySite('perfection.marketing', 'DNS_TXT');

// Add to Search Console
await client.addSite('sc-domain:perfection.marketing');
```

**Result:**
- Domain property: `sc-domain:perfection.marketing`
- Includes: all protocols, all subdomains

### DNS_CNAME (Alternative)

**Similar to DNS_TXT but uses CNAME record instead**

```typescript
const token = await client.getVerificationToken('perfection.marketing', 'DNS_CNAME');
await client.verifySite('perfection.marketing', 'DNS_CNAME');
await client.addSite('sc-domain:perfection.marketing');
```

### META Tag (For websites only)

**Pros:**
- ✅ No DNS changes needed
- ✅ Instant (no propagation delay)

**Cons:**
- ❌ Only verifies specific URL
- ❌ Requires website and code access
- ❌ Must keep meta tag on site

**API Calls:**
```typescript
// Request token (note: uses getUrlVerificationToken for SITE type)
const metaTag = await client.getUrlVerificationToken('https://perfection.marketing', 'META');

// Verify (note: uses verifyUrlSite for SITE type)
await client.verifyUrlSite('https://perfection.marketing', 'META');

// Add to Search Console (URL-prefix property)
await client.addSite('https://perfection.marketing');
```

**Result:**
- URL-prefix property: `https://perfection.marketing`
- Only includes: exact URL and paths under it

## Troubleshooting

### Error: "The site https://... of type INET_DOMAIN is invalid"

**Cause:** Passing URL with protocol to domain verification method

**Fix:** ✅ Already fixed in the code! It now strips the protocol automatically.

### Error: "DNS record not found"

**Causes:**
- DNS record not added yet
- DNS not propagated yet (wait 5-60 minutes)
- Wrong DNS record value
- Wrong DNS record type (TXT vs CNAME)

**Solutions:**
1. Verify DNS record is added:
   ```bash
   nslookup -type=TXT perfection.marketing
   ```
2. Wait longer for propagation
3. Check DNS provider settings
4. Use online DNS checker: https://www.whatsmydns.net/

### Error: "Domain already verified by another user"

**Cause:** Domain is already verified in another Google account

**Solutions:**
1. Remove verification from other account
2. Use a different Google account
3. Contact domain owner

### Error: "Missing permissions"

**Cause:** OAuth token doesn't have siteverification scope

**Solution:** Re-authenticate user with correct scopes

## Success Checklist

- ✅ Domain added without errors
- ✅ Verification token received
- ✅ DNS record added to domain
- ✅ DNS record visible in DNS lookup
- ✅ Domain verification succeeds
- ✅ Domain appears in Google Search Console
- ✅ Can query analytics data for domain

## Next Steps After Verification

Once domain is verified, you can:

1. **Query Search Console data:**
   ```typescript
   const analytics = await client.queryAnalytics('sc-domain:perfection.marketing', {
     startDate: '2024-01-01',
     endDate: '2024-01-31',
     dimensions: ['query', 'page'],
   });
   ```

2. **Submit sitemaps:**
   ```typescript
   await client.submitSitemap('sc-domain:perfection.marketing', 'https://perfection.marketing/sitemap.xml');
   ```

3. **List all sites:**
   ```typescript
   const sites = await client.listSites();
   ```

4. **Request indexing:**
   (Use Google Indexing API - separate integration)

## Common Test Domains

For testing, use domains you own:
- `yourdomain.com`
- `test.yourdomain.com`
- `staging.yourdomain.com`

**DO NOT** test with domains you don't own!

## Automated Testing

Create integration tests:

```typescript
describe('Domain Verification', () => {
  it('should request verification token with clean domain', async () => {
    const response = await fetch('/api/integrations/google-search-console/domains', {
      method: 'POST',
      body: JSON.stringify({ domainUrl: 'test.example.com' }),
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.verificationMethod).toBe('DNS_TXT');
    expect(data.verificationToken).toContain('google-site-verification=');
  });

  it('should strip protocol from domain URL', async () => {
    const response = await fetch('/api/integrations/google-search-console/domains', {
      method: 'POST',
      body: JSON.stringify({ domainUrl: 'https://test.example.com' }),
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    // Should work even with https:// prefix
  });
});
```

## Monitoring

Monitor these metrics:
- Success rate of token requests
- Success rate of verifications
- Average DNS propagation time
- Error types and frequencies

## Support Resources

- [Google Site Verification API Docs](https://developers.google.com/site-verification)
- [Google Search Console API Docs](https://developers.google.com/webmaster-tools)
- [DNS Propagation Checker](https://www.whatsmydns.net/)
- Project docs: `docs/SITE_VERIFICATION_FIX.md`

