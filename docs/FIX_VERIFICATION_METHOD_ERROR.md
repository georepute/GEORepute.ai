# Fix: Invalid Verification Type Error

## Problem

If you see an error like this in your domain verification:

```
failed
Error: Invalid value at 'verification_type' (type.googleapis.com/security.irdb.api.VerificationType), "HTML_TAG"
```

This error occurs because the verification method stored in the database doesn't match the values expected by the Google Site Verification API.

## Root Cause

The code was using `HTML_TAG` as a verification method name, but Google's Site Verification API expects `META` for HTML meta tag verification.

## Solution

### 1. Run the Database Migration

Execute the migration script to fix existing domains and update the constraint:

```sql
-- Run this in your Supabase SQL Editor
database/011_fix_verification_methods.sql
```

This will:
- Update any domains with `HTML_TAG` → `META`
- Update any domains with `HTML_FILE` → `FILE`
- Update the database constraint to only allow valid values

### 2. Correct Verification Method Values

The Google Site Verification API accepts these verification methods:

| Database Value | Description |
|---------------|-------------|
| `DNS_TXT` | DNS TXT record verification |
| `META` | HTML meta tag verification |
| `FILE` | HTML file upload verification |
| `ANALYTICS` | Google Analytics verification |
| `TAG_MANAGER` | Google Tag Manager verification |

### 3. Files Updated

The following files have been updated to use the correct values:

- ✅ `app/api/integrations/google-search-console/domains/route.ts` - API route for adding domains
- ✅ `database/010_02_gsc_domains.sql` - Database schema
- ✅ `database/010_google_search_console_integration.sql` - Full schema file
- ✅ `types/index.ts` - TypeScript type definitions
- ✅ `database/011_fix_verification_methods.sql` - Migration script

### 4. Verify the Fix

After running the migration:

1. Reload your Google Search Console page
2. Any domains that were showing the error should now display correctly
3. For domains still in "pending" or "failed" status, click "Show Token" to see verification details
4. Click "Verify" again after ensuring your DNS/meta tag is in place

## Prevention

The code has been updated to use only the official Google API verification method names throughout the entire codebase, preventing this issue from occurring in the future.

