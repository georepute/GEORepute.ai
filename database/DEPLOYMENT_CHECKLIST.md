# GSC Migration Deployment Checklist

## Pre-Deployment Checklist

### Database Preparation
- [ ] Backup your database before running migrations
- [ ] Verify you have admin access to Supabase SQL Editor
- [ ] Check if there are any orphaned records in analytics tables
- [ ] Review current `gsc_domains` data (will be migrated)

### Code Review
- [ ] All files have been accepted in your IDE
- [ ] No linting errors present
- [ ] TypeScript types compile correctly
- [ ] Review the changes in version control

---

## Deployment Steps

### Step 1: Database Migration (Supabase SQL Editor)

#### 1.1 Add GSC Integration to Domains
```bash
File: database/014_add_gsc_to_domains.sql
```
Run this first. It will:
- Add `user_id` column to domains
- Add `gsc_integration` JSONB column
- Create indexes
- Migrate data from gsc_domains to domains
- Create helper functions

**Expected Output**: "Migration completed successfully!"

#### 1.2 Update Foreign Key Constraints
```bash
File: database/015_update_gsc_foreign_keys.sql
```
Run this second. It will:
- Drop old foreign keys referencing gsc_domains
- Add new foreign keys referencing domains
- Update constraints for: gsc_analytics, gsc_queries, gsc_pages, gsc_keywords

**Expected Output**: Migration completed with record counts

---

### Step 2: Deploy Application Code

All code has been updated. Deploy your application:

```bash
# Using your deployment method (e.g., Vercel, Railway, etc.)
git add .
git commit -m "Migrate GSC to unified domains table"
git push origin main
```

---

### Step 3: Post-Deployment Verification

#### 3.1 Check Domains Page
- [ ] Navigate to `/dashboard/domains`
- [ ] Verify domains are listed
- [ ] Check GSC integration badges appear
- [ ] Verify last sync times show correctly

#### 3.2 Check Google Search Console Page
- [ ] Navigate to `/dashboard/google-search-console`
- [ ] Verify domains with GSC integration appear
- [ ] Check verification status displays correctly
- [ ] Try adding a new domain (optional)

#### 3.3 Check GSC Analytics Page
- [ ] Navigate to `/dashboard/gsc-analytics`
- [ ] Select a domain with GSC integration
- [ ] Verify analytics data loads
- [ ] Check charts and metrics display correctly

#### 3.4 Test API Endpoints
```bash
# Get domains (should return domains with gsc_integration)
GET /api/integrations/google-search-console/domains

# Get analytics summary
GET /api/integrations/google-search-console/analytics/summary?domainId=<id>

# Get queries
GET /api/integrations/google-search-console/analytics/queries?domainId=<id>

# Get pages
GET /api/integrations/google-search-console/analytics/pages?domainId=<id>
```

#### 3.5 Test Functionality
- [ ] Can add new GSC domain to existing domain entry
- [ ] Domain verification works
- [ ] DNS checking works
- [ ] Debug verification works
- [ ] Manual analytics sync works
- [ ] Cron job runs successfully (check logs)

---

## Verification Queries

Run these in Supabase SQL Editor to verify migration:

### Check domains with GSC integration
```sql
SELECT 
  id, 
  domain, 
  user_id,
  gsc_integration->>'verification_status' as status,
  gsc_integration->>'last_synced_at' as last_sync
FROM domains 
WHERE gsc_integration IS NOT NULL;
```

### Check foreign key constraints
```sql
SELECT
  tc.table_name, 
  tc.constraint_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('gsc_analytics', 'gsc_queries', 'gsc_pages', 'gsc_keywords')
  AND tc.constraint_name LIKE '%domain_id%';
```

### Count analytics records by domain
```sql
SELECT 
  d.domain,
  COUNT(a.id) as analytics_count,
  COUNT(q.id) as queries_count,
  COUNT(p.id) as pages_count
FROM domains d
LEFT JOIN gsc_analytics a ON a.domain_id = d.id
LEFT JOIN gsc_queries q ON q.domain_id = d.id
LEFT JOIN gsc_pages p ON p.domain_id = d.id
WHERE d.gsc_integration IS NOT NULL
GROUP BY d.domain;
```

---

## Rollback Plan (If Needed)

If you encounter issues:

### Option 1: Quick Rollback (within 1 hour)
1. Revert code deployment to previous version
2. Run rollback SQL:
```sql
-- Restore old foreign keys (if needed)
ALTER TABLE gsc_analytics DROP CONSTRAINT gsc_analytics_domain_id_fkey;
ALTER TABLE gsc_analytics ADD CONSTRAINT gsc_analytics_domain_id_fkey 
  FOREIGN KEY (domain_id) REFERENCES gsc_domains(id) ON DELETE CASCADE;

-- Repeat for other tables
```

### Option 2: Keep Both Systems (temporary)
- Keep `gsc_domains` table as-is
- New domains use `domains.gsc_integration`
- Old data continues to work
- Gradually migrate over time

---

## Monitoring After Deployment

### Week 1: Active Monitoring
- [ ] Check application logs for errors
- [ ] Monitor API response times
- [ ] Verify cron jobs run successfully
- [ ] Check user reports/feedback

### Week 2: Validation
- [ ] Confirm all GSC features work correctly
- [ ] Verify data accuracy
- [ ] Check performance metrics
- [ ] No reported issues

### After 2 Weeks: Cleanup (Optional)
If everything works perfectly:
- [ ] Archive `gsc_domains` table
- [ ] Remove any legacy code comments
- [ ] Update internal documentation

---

## Common Issues & Solutions

### Issue: Foreign key constraint violation
**Cause**: Orphaned records in analytics tables
**Solution**: Run cleanup queries before migration
```sql
-- Find orphaned records
SELECT domain_id FROM gsc_analytics 
WHERE domain_id NOT IN (SELECT id FROM domains);

-- Delete if safe to do so
DELETE FROM gsc_analytics 
WHERE domain_id NOT IN (SELECT id FROM domains);
```

### Issue: Domains not showing GSC integration
**Cause**: Data not migrated from gsc_domains
**Solution**: Re-run migration section of 014_add_gsc_to_domains.sql

### Issue: Analytics not loading
**Cause**: Foreign key constraints not updated
**Solution**: Verify foreign keys with query above, re-run 015 migration

---

## Success Criteria

✅ All domains visible in dashboard  
✅ GSC integration status shows correctly  
✅ Analytics data loads and displays  
✅ Can add new GSC integrations  
✅ Verification process works  
✅ Cron jobs run successfully  
✅ No errors in application logs  
✅ Performance is acceptable  

---

## Support

If you encounter issues:
1. Check application logs
2. Review Supabase logs
3. Run verification queries above
4. Review the COMPLETE_GSC_MIGRATION_SUMMARY.md document
5. Check API endpoint responses for error details

---

**Migration prepared by**: AI Assistant  
**Date**: 2026-01-15  
**Estimated deployment time**: 15-30 minutes  
**Estimated testing time**: 30-60 minutes  
**Risk level**: Low (backward compatible, no data loss)

