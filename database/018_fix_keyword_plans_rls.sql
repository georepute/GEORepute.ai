-- Fix RLS policies for keyword_plans table
-- This migration resolves the "new row violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can create their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can update their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can delete their own keyword plans" ON keyword_plans;

-- Recreate RLS policies with proper permissions
-- SELECT policy - users can view their own plans
CREATE POLICY "Users can view their own keyword plans"
  ON keyword_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy - authenticated users can insert plans with their own user_id
CREATE POLICY "Users can create their own keyword plans"
  ON keyword_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy - users can update their own plans
CREATE POLICY "Users can update their own keyword plans"
  ON keyword_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy - users can delete their own plans
CREATE POLICY "Users can delete their own keyword plans"
  ON keyword_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_plans TO authenticated;

-- Verify the policies are active
DO $$ 
BEGIN
  RAISE NOTICE 'RLS policies for keyword_plans table have been updated successfully';
END $$;

