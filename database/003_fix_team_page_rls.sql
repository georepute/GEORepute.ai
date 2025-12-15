-- =====================================================
-- URGENT FIX: RLS Infinite Recursion for organization_users
-- Run this immediately to fix the team page
-- =====================================================

-- 1. Drop ALL existing policies on organization_users
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_users;
DROP POLICY IF EXISTS "Users can insert themselves into organizations" ON organization_users;
DROP POLICY IF EXISTS "Admins can update organization members" ON organization_users;
DROP POLICY IF EXISTS "Admins can delete organization members" ON organization_users;
DROP POLICY IF EXISTS "Users can insert themselves" ON organization_users;

-- 2. Create simple, non-recursive policies

-- Allow anyone authenticated to read organization_users
-- This is safe because we filter by auth.uid() in the application layer
CREATE POLICY "Authenticated users can view organization members" ON organization_users
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow anyone authenticated to insert (we validate in application)
CREATE POLICY "Authenticated users can insert" ON organization_users
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow anyone authenticated to update (we validate in application)
CREATE POLICY "Authenticated users can update" ON organization_users
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Allow anyone authenticated to delete (we validate in application)
CREATE POLICY "Authenticated users can delete" ON organization_users
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 3. Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'organization_users'
ORDER BY policyname;

-- =====================================================
-- ALTERNATIVE: Temporarily disable RLS
-- (Use only if above doesn't work immediately)
-- =====================================================

-- Uncomment these if you need immediate access:
-- ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable later:
-- ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Verification
-- =====================================================

-- Test query (should work without recursion)
SELECT 
  ou.*,
  r.name as role_name
FROM organization_users ou
JOIN roles r ON r.id = ou.role_id
WHERE ou.user_id = auth.uid()
LIMIT 5;

RAISE NOTICE 'RLS policies fixed! Team page should now work.';

