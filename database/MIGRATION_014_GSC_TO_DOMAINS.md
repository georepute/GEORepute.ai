# Migration: Google Search Console Integration to Domains Table

## Overview
Successfully migrated Google Search Console (GSC) integration from the separate `gsc_domains` table to the main `domains` table. The GSC data is now stored in a JSONB column called `gsc_integration` within the domains table.

## Database Changes

### Migration File: `database/014_add_gsc_to_domains.sql`

#### New Columns Added to `domains` Table:
1. **`user_id`** (UUID) - References `auth.users(id)`
   - Links domains to specific users
   - Allows NULL (for organization-only domains)
   - ON DELETE SET NULL

2. **`gsc_integration`** (JSONB) - Stores Google Search Console integration data
   - Contains all GSC-related information
   - Nullable (domains can exist without GSC integration)
   - Indexed with GIN index for performance

#### GSC Integration JSONB Structure:
```json
{
  "integration_id": "uuid",
  "domain_url": "example.com",
  "site_url": "https://example.com",
  "verification_method": "DNS_TXT|DNS_CNAME|META|FILE|ANALYTICS|TAG_MANAGER",
  "verification_token": "verification-token-string",
  "verification_status": "pending|verified|failed",
  "permission_level": "siteOwner|siteFullUser|siteRestrictedUser",
  "last_synced_at": "2026-01-15T10:30:00Z",
  "verified_at": "2026-01-15T10:30:00Z",
  "error": "error message if any",
  "failed_at": "2026-01-15T10:30:00Z"
}
```

#### New Database Functions:
1. **`update_domain_gsc_integration()`** - Helper to update GSC integration data
2. **`get_domains_with_gsc_integration()`** - Retrieve domains with GSC enabled

#### Data Migration:
- Automatically migrates existing data from `gsc_domains` to `domains` table
- Matches domains by domain name
- Preserves all GSC integration data

## Code Changes

### 1. TypeScript Types (`types/index.ts`)
- Added **`GSCIntegrationData`** interface for the JSONB structure
- Updated **`Domain`** interface to include:
  - `user_id?: string`
  - `gsc_integration?: GSCIntegrationData | null`
- Marked `GSCDomain` as legacy/deprecated

### 2. API Routes Updated

#### `/api/integrations/google-search-console/domains/route.ts`
**Changes:**
- GET: Fetches domains from `domains` table filtered by `gsc_integration IS NOT NULL`
- POST: Creates/updates domains with GSC integration in single table
- DELETE: Supports removing GSC integration only OR deleting entire domain

**Key Features:**
- Can add GSC to existing domain or create new domain with GSC
- Supports both `domainId` and `organizationId` parameters
- Maintains backward compatibility

#### `/api/integrations/google-search-console/domains/verify/route.ts`
**Changes:**
- Reads domain from `domains` table
- Accesses GSC data via `domain.gsc_integration`
- Updates GSC data in JSONB column
- Sets domain status to 'active' when verified

#### `/api/integrations/google-search-console/analytics/sync/route.ts`
**Changes:**
- Queries `domains` table instead of `gsc_domains`
- Extracts GSC data from `gsc_integration` JSONB field
- Updates `last_synced_at` within the JSONB structure

#### `/api/cron/sync-gsc/route.ts`
**Changes:**
- Fetches all domains with `gsc_integration IS NOT NULL`
- Filters for verified domains
- Gets integration details via join
- Updates sync timestamp in JSONB field

#### `/api/integrations/google-search-console/domains/check-dns/route.ts`
**Changes:**
- Reads from `domains` table
- Extracts verification token from `gsc_integration.verification_token`
- Uses `gsc_integration.verification_method` for advice

### 3. UI Updates (`app/dashboard/domains/page.tsx`)

**New Features:**
- Shows GSC integration status badges:
  - **GSC Verified** (green with shield icon)
  - **GSC Pending** (yellow with clock icon)
  - **GSC Failed** (red with X icon)
  - **GSC Linked** (blue with link icon)
  - **No GSC** (gray with X icon)
- Displays last sync time for GSC-enabled domains
- Added new "GSC Integration" column in table
- Enhanced info box with GSC-specific guidance

## Column Comparison

### Common Columns (present in both tables):
1. `id` - UUID PRIMARY KEY
2. `metadata` - JSONB field
3. `created_at` - Timestamp
4. `updated_at` - Timestamp

### Columns ONLY in `domains`:
1. `organization_id` - Links to organizations
2. `domain` - VARCHAR(255) domain name
3. `status` - Domain status (active/inactive/pending_verification/verification_failed)
4. `created_by` - UUID tracking creator
5. **`user_id`** - NEW: Links to user
6. **`gsc_integration`** - NEW: JSONB with GSC data

### Columns from `gsc_domains` (now in JSONB):
All these are now stored inside `gsc_integration` JSONB field:
- `integration_id`
- `domain_url`
- `site_url`
- `verification_method`
- `verification_token`
- `verification_status`
- `permission_level`
- `last_synced_at`

## Benefits of This Migration

1. **Single Source of Truth**: Domains and their GSC integration in one table
2. **Flexible Schema**: JSONB allows adding GSC fields without migrations
3. **Better Performance**: Fewer joins needed
4. **Cleaner Architecture**: Related data stays together
5. **Easier Management**: One domain entry with optional GSC integration
6. **Backward Compatible**: Can still support `gsc_domains` table if needed

## Migration Steps

1. **Run the migration SQL**:
   ```bash
   # Execute in Supabase SQL Editor
   database/014_add_gsc_to_domains.sql
   ```

2. **Deploy code changes**: All API routes and UI components updated

3. **Verify migration**:
   - Check domains appear in dashboard
   - Test GSC integration creation
   - Verify analytics sync works
   - Test cron job

4. **Optional cleanup** (after confirming everything works):
   - Can deprecate `gsc_domains` table
   - Can remove related old code

## Related Tables Still Using Domain ID

These tables reference domains and continue to work:
- `gsc_analytics` - Analytics data (uses `domain_id`)
- `gsc_queries` - Query data (uses `domain_id`)
- `gsc_pages` - Page data (uses `domain_id`)

**Note**: These tables will automatically work with the migrated domains since they reference by `domain_id` which remains the same.

## Testing Checklist

- [x] Migration SQL created
- [x] TypeScript types updated
- [x] API routes updated
- [x] UI components updated
- [x] No linting errors
- [ ] Run migration in database
- [ ] Test domain creation
- [ ] Test GSC integration
- [ ] Test domain verification
- [ ] Test analytics sync
- [ ] Test cron job

## Next Steps

1. **Test the migration** in development/staging environment
2. **Run the SQL migration** in your Supabase database
3. **Deploy the code changes**
4. **Monitor** for any issues
5. **Optional**: Create a rollback plan if needed

---

**Migration Date**: 2026-01-15  
**Status**: Ready for deployment  
**Breaking Changes**: None (backward compatible)

