-- =====================================================
-- FIX: RLS Policy for User Table - Allow Organization Members to View Each Other
-- This allows users in the same organization to see each other's profile data
-- =====================================================

-- 1. Check if RLS is enabled on user table
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'RLS enabled on user table';
END $$;

-- 2. Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can view their own profile" ON "user";
DROP POLICY IF EXISTS "Users can view profiles" ON "user";
DROP POLICY IF EXISTS "Organization members can view each other" ON "user";
DROP POLICY IF EXISTS "Public read access" ON "user";

-- 3. Create policy: Organization members can view each other's basic profile data
-- This allows users to see name and email of other members in their organization
CREATE POLICY "Organization members can view each other" ON "user"
  FOR SELECT 
  USING (
    -- User can always view their own profile
    user_id = auth.uid()
    OR
    -- User can view profiles of members in their organization
    EXISTS (
      SELECT 1 
      FROM organization_users ou1
      JOIN organization_users ou2 ON ou1.organization_id = ou2.organization_id
      WHERE ou1.user_id = "user".user_id
        AND ou2.user_id = auth.uid()
        AND ou1.status = 'active'
        AND ou2.status = 'active'
    )
  );

-- 4. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON "user";
CREATE POLICY "Users can update their own profile" ON "user"
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Allow users to insert their own profile (for signup)
DROP POLICY IF EXISTS "Users can insert their own profile" ON "user";
CREATE POLICY "Users can insert their own profile" ON "user"
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- 6. Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user'
ORDER BY policyname;

-- =====================================================
-- Test Query (should work after applying policy)
-- =====================================================

-- This query should return all members of your organization with their profiles
/*
SELECT 
  u.user_id,
  u.email,
  u.full_name,
  ou.organization_id,
  ou.status,
  r.name as role_name
FROM "user" u
JOIN organization_users ou ON ou.user_id = u.user_id
JOIN roles r ON r.id = ou.role_id
WHERE ou.organization_id IN (
  SELECT organization_id 
  FROM organization_users 
  WHERE user_id = auth.uid()
    AND status = 'active'
)
AND ou.status = 'active';
*/

-- =====================================================
-- Alternative: Simpler policy (if above causes issues)
-- =====================================================

-- If the EXISTS query is slow, use this simpler version:
/*
DROP POLICY IF EXISTS "Organization members can view each other" ON "user";

CREATE POLICY "Organization members can view each other" ON "user"
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT ou1.user_id 
      FROM organization_users ou1
      WHERE ou1.organization_id IN (
        SELECT ou2.organization_id 
        FROM organization_users ou2
        WHERE ou2.user_id = auth.uid()
          AND ou2.status = 'active'
      )
      AND ou1.status = 'active'
    )
  );
*/

-- =====================================================
-- Grant permissions (if needed)
-- =====================================================

-- Ensure authenticated users have SELECT permission
GRANT SELECT ON "user" TO authenticated;
GRANT UPDATE ON "user" TO authenticated;
GRANT INSERT ON "user" TO authenticated;

RAISE NOTICE 'RLS policies updated! Organization members can now view each other.';
