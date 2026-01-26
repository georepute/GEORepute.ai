-- Update RLS policies for keyword_plans to support organization-level access
-- This allows users in the same organization to view and manage keyword plans

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can create their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can update their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can delete their own keyword plans" ON keyword_plans;

-- Recreate RLS policies with organization-level access
-- SELECT policy - users can view plans from their organization
CREATE POLICY "Users can view organization keyword plans"
  ON keyword_plans FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- INSERT policy - authenticated users can insert plans with their organization_id
CREATE POLICY "Users can create organization keyword plans"
  ON keyword_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- UPDATE policy - users can update plans from their organization
CREATE POLICY "Users can update organization keyword plans"
  ON keyword_plans FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- DELETE policy - users can delete plans from their organization
CREATE POLICY "Users can delete organization keyword plans"
  ON keyword_plans FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_plans TO authenticated;

-- Verify the policies are active
DO $$ 
BEGIN
  RAISE NOTICE 'RLS policies for keyword_plans table have been updated with organization-level access';
END $$;

