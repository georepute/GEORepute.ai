-- =====================================================
-- FIX: Simplify RLS policies for invitation_tokens
-- This ensures organization members can view pending invites
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their invitations" ON invitation_tokens;

-- Create simpler policy that allows organization members to view invitations
-- This avoids recursion by checking organization_users directly
CREATE POLICY "Organization members can view invitations" ON invitation_tokens
  FOR SELECT 
  USING (
    -- Allow if user is a member of the organization
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
    OR
    -- Allow if invitation is sent to user's email
    email = (
      SELECT email 
      FROM "user" 
      WHERE user_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'invitation_tokens'
  AND cmd = 'SELECT'
ORDER BY policyname;

RAISE NOTICE 'RLS policy updated! Organization members can now view pending invitations.';

