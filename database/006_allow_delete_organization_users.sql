-- =====================================================
-- UPDATE: Allow deletion of organization_users records
-- This allows admins to delete members instead of just marking inactive
-- =====================================================

-- Check if DELETE policy exists, if not create it
DO $$ 
BEGIN
  -- Drop existing delete policy if it exists
  DROP POLICY IF EXISTS "Authenticated users can delete" ON organization_users;
  DROP POLICY IF EXISTS "Admins can delete organization members" ON organization_users;
  
  -- Create policy that allows deletion for organization members
  -- This is safe because we validate admin status in application layer
  CREATE POLICY "Organization members can delete" ON organization_users
    FOR DELETE 
    USING (
      -- Allow if user is deleting their own membership
      user_id = auth.uid()
      OR
      -- Allow if user is admin of the organization
      EXISTS (
        SELECT 1 
        FROM organization_users ou
        JOIN roles r ON r.id = ou.role_id
        WHERE ou.user_id = auth.uid()
          AND ou.organization_id = organization_users.organization_id
          AND r.name = 'Admin'
          AND ou.status = 'active'
      )
    );
  
  RAISE NOTICE 'DELETE policy created for organization_users';
END $$;

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'organization_users'
  AND cmd = 'DELETE'
ORDER BY policyname;

RAISE NOTICE 'RLS policy updated! Members can now be deleted from organization_users.';

