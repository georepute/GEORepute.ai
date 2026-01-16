# Quick Reference: Domains Table with GSC Integration

## Table Structure Comparison

### Before (Two Separate Tables):
```
domains:
├── id
├── organization_id
├── domain
├── status
├── created_by
├── created_at
└── updated_at

gsc_domains:
├── id
├── user_id
├── integration_id
├── domain_url
├── site_url
├── verification_method
├── verification_token
├── verification_status
├── permission_level
├── last_synced_at
├── created_at
└── updated_at
```

### After (Unified Table):
```
domains:
├── id
├── organization_id
├── domain
├── status
├── user_id                    ← NEW
├── gsc_integration (JSONB)    ← NEW
│   ├── integration_id
│   ├── domain_url
│   ├── site_url
│   ├── verification_method
│   ├── verification_token
│   ├── verification_status
│   ├── permission_level
│   ├── last_synced_at
│   ├── verified_at
│   └── error
├── created_by
├── created_at
└── updated_at
```

## Common vs Unique Columns

### ✅ Common Columns (in both tables):
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### 🔵 Unique to `domains` table:
| Column | Type | Description |
|--------|------|-------------|
| `organization_id` | UUID | Links to organizations table |
| `domain` | VARCHAR(255) | Domain name (e.g., example.com) |
| `status` | VARCHAR(50) | active, inactive, pending_verification, verification_failed |
| `created_by` | UUID | User who created the domain |
| `user_id` | UUID | **NEW**: User who owns/manages the domain |
| `gsc_integration` | JSONB | **NEW**: Google Search Console integration data |

### 🟡 Previously in `gsc_domains` (now in JSONB):
| Field | Type | Description |
|-------|------|-------------|
| `integration_id` | UUID | Links to platform_integrations |
| `domain_url` | TEXT | Full domain URL |
| `site_url` | TEXT | Search Console site URL format |
| `verification_method` | TEXT | DNS_TXT, DNS_CNAME, META, etc. |
| `verification_token` | TEXT | Verification token from Google |
| `verification_status` | TEXT | pending, verified, failed |
| `permission_level` | TEXT | siteOwner, siteFullUser, siteRestrictedUser |
| `last_synced_at` | TIMESTAMPTZ | Last analytics sync time |

## Code Examples

### Querying Domains with GSC Integration

```typescript
// Get all domains with GSC integration for a user
const { data: domains } = await supabase
  .from('domains')
  .select('*')
  .eq('user_id', userId)
  .not('gsc_integration', 'is', null);

// Get only verified GSC domains
const { data: verifiedDomains } = await supabase
  .from('domains')
  .select('*')
  .eq('user_id', userId)
  .filter('gsc_integration->verification_status', 'eq', 'verified');
```

### Adding GSC Integration to Domain

```typescript
const gscData = {
  integration_id: 'uuid-here',
  domain_url: 'example.com',
  site_url: 'https://example.com',
  verification_method: 'DNS_TXT',
  verification_token: 'token-here',
  verification_status: 'pending',
  permission_level: 'siteOwner',
  last_synced_at: null,
};

await supabase
  .from('domains')
  .update({
    user_id: userId,
    gsc_integration: gscData,
  })
  .eq('id', domainId);
```

### Updating Verification Status

```typescript
// Read current GSC data
const { data: domain } = await supabase
  .from('domains')
  .select('gsc_integration')
  .eq('id', domainId)
  .single();

// Update with new status
const updatedGscData = {
  ...domain.gsc_integration,
  verification_status: 'verified',
  verified_at: new Date().toISOString(),
};

await supabase
  .from('domains')
  .update({
    gsc_integration: updatedGscData,
    status: 'active',
  })
  .eq('id', domainId);
```

### Accessing GSC Data in Code

```typescript
interface Domain {
  id: string;
  domain: string;
  user_id?: string;
  gsc_integration?: {
    integration_id?: string;
    verification_status?: 'pending' | 'verified' | 'failed';
    last_synced_at?: string;
    // ... other fields
  };
}

// Check if domain has GSC integration
if (domain.gsc_integration) {
  const status = domain.gsc_integration.verification_status;
  const lastSync = domain.gsc_integration.last_synced_at;
}

// Check verification status
const isVerified = domain.gsc_integration?.verification_status === 'verified';
```

## SQL Queries

### Find all GSC-enabled domains
```sql
SELECT * FROM domains 
WHERE gsc_integration IS NOT NULL;
```

### Find verified GSC domains
```sql
SELECT * FROM domains 
WHERE gsc_integration->>'verification_status' = 'verified';
```

### Find domains needing sync (not synced in 24 hours)
```sql
SELECT * FROM domains 
WHERE gsc_integration->>'verification_status' = 'verified'
  AND (gsc_integration->>'last_synced_at')::timestamptz < NOW() - INTERVAL '24 hours';
```

### Update verification status
```sql
UPDATE domains 
SET gsc_integration = jsonb_set(
  gsc_integration, 
  '{verification_status}', 
  '"verified"'
)
WHERE id = 'domain-uuid-here';
```

## API Endpoints Updated

| Endpoint | Method | Changes |
|----------|--------|---------|
| `/api/integrations/google-search-console/domains` | GET | Now queries `domains` table |
| `/api/integrations/google-search-console/domains` | POST | Creates/updates in `domains` table |
| `/api/integrations/google-search-console/domains` | DELETE | Removes from `domains` table |
| `/api/integrations/google-search-console/domains/verify` | POST | Updates `domains.gsc_integration` |
| `/api/integrations/google-search-console/analytics/sync` | POST | Reads from `domains` table |
| `/api/integrations/google-search-console/domains/check-dns` | POST | Uses `domains.gsc_integration` |
| `/api/cron/sync-gsc` | GET | Syncs from `domains` table |

## Migration Checklist

- [x] Create migration SQL file
- [x] Add `user_id` column to domains
- [x] Add `gsc_integration` JSONB column
- [x] Create helper functions
- [x] Update TypeScript types
- [x] Update all API routes
- [x] Update UI components
- [ ] **Run migration in Supabase**
- [ ] **Test all GSC functionality**
- [ ] **Deploy to production**

---

**Quick Tip**: The `gsc_integration` JSONB field makes it easy to add new GSC-related fields without database migrations. Just update the TypeScript interface and start using the new fields!

