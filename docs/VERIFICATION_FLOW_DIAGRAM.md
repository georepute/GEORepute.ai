# Site Verification Flow Diagram

## Complete Domain Verification Flow (DNS_TXT)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SITE VERIFICATION WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   User       │
│   Wants to   │
│   Verify     │
│   Domain     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 1: Request Verification Token                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Your App                                                                │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ const token = await client.getVerificationToken(        │            │
│  │   'example.com',                                        │            │
│  │   'DNS_TXT'                                             │            │
│  │ );                                                      │            │
│  └─────────────────────────────────────────────────────────┘            │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ POST https://www.googleapis.com/                        │            │
│  │      siteVerification/v1/token                          │            │
│  │                                                         │            │
│  │ {                                                       │            │
│  │   "site": {                                             │            │
│  │     "type": "INET_DOMAIN",                              │            │
│  │     "identifier": "example.com"                         │            │
│  │   },                                                    │            │
│  │   "verificationMethod": "DNS_TXT"                       │            │
│  │ }                                                       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Response:                                               │            │
│  │ {                                                       │            │
│  │   "token": "google-site-verification=abcd1234..."      │            │
│  │ }                                                       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 2: Display Instructions to User                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────┐             │
│  │  Add this TXT record to your DNS:                      │             │
│  │                                                        │             │
│  │  Host: @ or example.com                               │             │
│  │  Type: TXT                                            │             │
│  │  Value: google-site-verification=abcd1234...          │             │
│  │  TTL: 3600                                            │             │
│  │                                                        │             │
│  │  [Copy Token] [Instructions] [Verify Later]          │             │
│  └────────────────────────────────────────────────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 3: User Adds DNS Record                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User logs into DNS provider (GoDaddy, Cloudflare, etc.)               │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ DNS Management Panel                             │                  │
│  ├──────────────────────────────────────────────────┤                  │
│  │ Type   │ Name  │ Value                           │                  │
│  ├──────────────────────────────────────────────────┤                  │
│  │ TXT    │ @     │ google-site-verification=...    │  ← Add this     │
│  └──────────────────────────────────────────────────┘                  │
│                                                                          │
│  DNS Propagation: 5 minutes - 48 hours (typically < 1 hour)            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 4: Check DNS Propagation (Optional)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Command Line:                                                          │
│  ┌────────────────────────────────────────────────────────┐             │
│  │ $ dig TXT example.com                                  │             │
│  │ $ nslookup -type=TXT example.com                       │             │
│  └────────────────────────────────────────────────────────┘             │
│                                                                          │
│  Online Tools:                                                          │
│  • https://www.whatsmydns.net/                                          │
│  • https://dnschecker.org/                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 5: Verify Domain                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Your App                                                                │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ const result = await client.verifySite(                │            │
│  │   'example.com',                                        │            │
│  │   'DNS_TXT'                                             │            │
│  │ );                                                      │            │
│  └─────────────────────────────────────────────────────────┘            │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ POST https://www.googleapis.com/siteVerification/       │            │
│  │      v1/webResource?verificationMethod=DNS_TXT          │            │
│  │                                                         │            │
│  │ {                                                       │            │
│  │   "site": {                                             │            │
│  │     "type": "INET_DOMAIN",                              │            │
│  │     "identifier": "example.com"                         │            │
│  │   }                                                     │            │
│  │ }                                                       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                          │                                               │
│                          ▼                                               │
│         ┌────────────────┴────────────────┐                             │
│         │  Google checks DNS for token    │                             │
│         └────────────────┬────────────────┘                             │
│                          │                                               │
│         ┌────────────────┴────────────────┐                             │
│         │                                 │                             │
│    ✅ Found                          ❌ Not Found                        │
│         │                                 │                             │
│         ▼                                 ▼                             │
│  ┌──────────────┐                  ┌──────────────┐                    │
│  │  Success!    │                  │  Error 404   │                    │
│  │              │                  │  Retry later │                    │
│  │  Domain      │                  └──────────────┘                    │
│  │  Verified    │                                                       │
│  └──────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Step 6: Add to Search Console                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ await client.addSite('sc-domain:example.com');         │            │
│  └─────────────────────────────────────────────────────────┘            │
│                          │                                               │
│                          ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Domain property added to Search Console!               │            │
│  │                                                         │            │
│  │ You can now:                                            │            │
│  │ • Query analytics data                                  │            │
│  │ • Submit sitemaps                                       │            │
│  │ • Request indexing                                      │            │
│  │ • View search performance                               │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Success!   │
│   Domain is  │
│   verified   │
│   and ready  │
└──────────────┘


═══════════════════════════════════════════════════════════════════════════

## Alternative Verification Methods

┌─────────────────────────────────────────────────────────────────────────┐
│                    DNS_CNAME Verification                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Similar to DNS_TXT but uses CNAME record instead:                     │
│                                                                          │
│  1. getVerificationToken('example.com', 'DNS_CNAME')                   │
│  2. Add CNAME record to DNS                                            │
│  3. verifySite('example.com', 'DNS_CNAME')                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    META Tag Verification (URL)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  For URL-prefix properties:                                             │
│                                                                          │
│  1. getUrlVerificationToken('https://example.com', 'META')             │
│  2. Add <meta> tag to website <head>                                   │
│  3. verifyUrlSite('https://example.com', 'META')                       │
│                                                                          │
│  ┌────────────────────────────────────────────────────┐                │
│  │ <head>                                             │                │
│  │   <meta name="google-site-verification"            │                │
│  │         content="abcd1234..." />                   │                │
│  │ </head>                                            │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    FILE Upload Verification (URL)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. getUrlVerificationToken('https://example.com', 'FILE')             │
│  2. Upload HTML file to site root                                      │
│  3. verifyUrlSite('https://example.com', 'FILE')                       │
│                                                                          │
│  File location: https://example.com/google123abc.html                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

## Error Handling Flow

┌─────────────────────────────────────────────────────────────────────────┐
│                      Error Scenarios                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │ verifySite()    │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  ┌────────────────────────────────┐                                    │
│  │   Try verification              │                                    │
│  └────────┬───────────────────────┘                                    │
│           │                                                              │
│  ┌────────┴────────┬───────────┬──────────┬─────────┐                 │
│  │                 │           │          │         │                  │
│  ▼                 ▼           ▼          ▼         ▼                  │
│ Success         404 Error   403 Error  409 Error  500 Error           │
│  │                 │           │          │         │                  │
│  ▼                 ▼           ▼          ▼         ▼                  │
│ ✅ Done      DNS not found  Missing   Already   Server                 │
│                  │         scopes    verified   error                  │
│                  ▼           │          │         │                    │
│           Wait & retry   Re-auth   Different  Retry                    │
│           DNS propagation          account    later                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

## Implementation Architecture

┌─────────────────────────────────────────────────────────────────────────┐
│                     Your Application                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Frontend (React/Next.js)                                               │
│  ┌────────────────────────────────────────────────────┐                │
│  │  • Verification UI                                  │                │
│  │  • DNS instructions display                         │                │
│  │  • Status polling                                   │                │
│  │  • Success/error messages                           │                │
│  └──────────────────┬─────────────────────────────────┘                │
│                     │                                                    │
│                     ▼ API Calls                                         │
│  Backend (API Routes)                                                   │
│  ┌────────────────────────────────────────────────────┐                │
│  │  POST /api/domain/verify/start                      │                │
│  │  ├─ Get token                                       │                │
│  │  ├─ Save to database                                │                │
│  │  └─ Return instructions                             │                │
│  │                                                     │                │
│  │  POST /api/domain/verify/check                      │                │
│  │  ├─ Verify site                                     │                │
│  │  ├─ Update database                                 │                │
│  │  └─ Add to Search Console                           │                │
│  └──────────────────┬─────────────────────────────────┘                │
│                     │                                                    │
│                     ▼ Uses                                              │
│  GoogleSearchConsoleClient                                              │
│  ┌────────────────────────────────────────────────────┐                │
│  │  • getVerificationToken()                          │                │
│  │  • verifySite()                                    │                │
│  │  • addSite()                                       │                │
│  │  • Token refresh                                   │                │
│  └──────────────────┬─────────────────────────────────┘                │
│                     │                                                    │
│                     ▼ googleapis                                        │
│  Google APIs                                                            │
│  ┌────────────────────────────────────────────────────┐                │
│  │  • Site Verification API                           │                │
│  │  • Search Console API                              │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

## Database Schema Suggestion

┌─────────────────────────────────────────────────────────────────────────┐
│                     Domain Verifications Table                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  domains_verification                                                    │
│  ┌───────────────┬──────────────┬──────────────────────┐               │
│  │ id            │ uuid         │ PRIMARY KEY          │               │
│  │ user_id       │ uuid         │ FOREIGN KEY          │               │
│  │ domain        │ varchar(255) │ NOT NULL             │               │
│  │ method        │ varchar(20)  │ DNS_TXT/DNS_CNAME    │               │
│  │ token         │ text         │ Verification token   │               │
│  │ status        │ varchar(20)  │ pending/verified     │               │
│  │ verified_at   │ timestamp    │                      │               │
│  │ created_at    │ timestamp    │ DEFAULT NOW()        │               │
│  │ updated_at    │ timestamp    │                      │               │
│  └───────────────┴──────────────┴──────────────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

1. **Two-Step Process:**
   - Request token → User adds DNS record → Verify

2. **DNS Propagation:**
   - Can take time, implement retry logic
   - Check DNS before calling verify

3. **Error Handling:**
   - 404 = DNS not found (wait and retry)
   - 403 = Missing scopes (re-authenticate)
   - 409 = Already verified by another user

4. **Best Practices:**
   - Save tokens in database
   - Implement status polling
   - Show clear instructions
   - Handle retries gracefully

5. **Implementation:**
   - Use `getVerificationToken()` for step 1
   - Use `verifySite()` for step 2
   - Use `addSite()` to add to Search Console

