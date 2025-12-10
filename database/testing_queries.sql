-- =====================================================
-- Quick Testing Queries
-- Use these to verify your organizations setup
-- =====================================================

-- 1. VIEW ALL ROLES
SELECT * FROM roles ORDER BY name;

-- 2. VIEW ALL ORGANIZATIONS
SELECT 
  o.*,
  COUNT(ou.id) as member_count
FROM organizations o
LEFT JOIN organization_users ou ON ou.organization_id = o.id
GROUP BY o.id
ORDER BY o.created_at DESC;

-- 3. VIEW ALL ORGANIZATION MEMBERS WITH THEIR ROLES
SELECT 
  u.email,
  u.full_name,
  o.name as organization_name,
  r.name as role_name,
  ou.status,
  ou.joined_at
FROM organization_users ou
JOIN "user" u ON u.user_id = ou.user_id
JOIN organizations o ON o.id = ou.organization_id
JOIN roles r ON r.id = ou.role_id
ORDER BY o.name, r.name;

-- 4. FIND ORGANIZATION ADMINS
SELECT 
  u.email,
  u.full_name,
  o.name as organization_name,
  ou.status
FROM organization_users ou
JOIN "user" u ON u.user_id = ou.user_id
JOIN organizations o ON o.id = ou.organization_id
JOIN roles r ON r.id = ou.role_id
WHERE r.name = 'Admin'
  AND ou.status = 'active'
ORDER BY o.name;

-- 5. CHECK A SPECIFIC USER'S ORGANIZATIONS
-- Replace 'user-email@example.com' with actual email
SELECT 
  o.name as organization_name,
  r.name as role_name,
  ou.status,
  ou.joined_at,
  o.description
FROM organization_users ou
JOIN "user" u ON u.user_id = ou.user_id
JOIN organizations o ON o.id = ou.organization_id
JOIN roles r ON r.id = ou.role_id
WHERE u.email = 'user-email@example.com'
ORDER BY ou.joined_at DESC;

-- 6. TEST HELPER FUNCTION: Check if user is admin
-- Replace UUIDs with actual values
SELECT is_organization_admin(
  'user-uuid-here'::uuid,
  'org-uuid-here'::uuid
);

-- 7. TEST HELPER FUNCTION: Get user's role in organization
-- Replace UUIDs with actual values
SELECT * FROM get_user_organization_role(
  'user-uuid-here'::uuid,
  'org-uuid-here'::uuid
);

-- 8. VIEW USERS WITH THEIR PRIMARY ORGANIZATION
SELECT 
  u.email,
  u.full_name,
  u.role as user_type,
  o.name as primary_organization
FROM "user" u
LEFT JOIN organizations o ON o.id = u.organization_id
ORDER BY u.created_at DESC;

-- 9. COUNT USERS BY ROLE IN EACH ORGANIZATION
SELECT 
  o.name as organization_name,
  r.name as role_name,
  COUNT(ou.id) as user_count
FROM organizations o
LEFT JOIN organization_users ou ON ou.organization_id = o.id
LEFT JOIN roles r ON r.id = ou.role_id
WHERE ou.status = 'active' OR ou.status IS NULL
GROUP BY o.id, o.name, r.name
ORDER BY o.name, r.name;

-- 10. FIND RECENTLY CREATED ORGANIZATIONS (Last 7 days)
SELECT 
  o.*,
  COUNT(ou.id) as member_count
FROM organizations o
LEFT JOIN organization_users ou ON ou.organization_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id
ORDER BY o.created_at DESC;

-- =====================================================
-- Maintenance Queries
-- =====================================================

-- CLEANUP: Remove inactive organization memberships older than 30 days
-- CAUTION: Use with care in production
/*
DELETE FROM organization_users 
WHERE status = 'inactive' 
  AND updated_at < NOW() - INTERVAL '30 days';
*/

-- UPDATE: Change user's role in organization
-- Replace values as needed
/*
UPDATE organization_users
SET role_id = (SELECT id FROM roles WHERE name = 'Manager')
WHERE user_id = 'user-uuid-here'::uuid
  AND organization_id = 'org-uuid-here'::uuid;
*/

-- DEACTIVATE: Remove user from organization (soft delete)
/*
UPDATE organization_users
SET status = 'inactive'
WHERE user_id = 'user-uuid-here'::uuid
  AND organization_id = 'org-uuid-here'::uuid;
*/

-- =====================================================
-- Performance Monitoring
-- =====================================================

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('organizations', 'organization_users', 'roles')
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename IN ('organizations', 'organization_users', 'roles')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

