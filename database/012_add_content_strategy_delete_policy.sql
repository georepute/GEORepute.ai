-- =====================================================
-- FIX: Add DELETE RLS Policy for content_strategy table
-- This allows users to delete their own content
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE content_strategy ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own content" ON content_strategy;

-- Create policy: Users can delete their own content
CREATE POLICY "Users can delete their own content"
  ON content_strategy
  FOR DELETE
  USING (user_id = auth.uid());

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'content_strategy'
  AND cmd = 'DELETE'
ORDER BY policyname;

-- Also ensure published_content has DELETE policy
ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their own published content" ON published_content;

CREATE POLICY "Users can delete their own published content"
  ON published_content
  FOR DELETE
  USING (user_id = auth.uid());

-- Verify published_content policy
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'published_content'
  AND cmd = 'DELETE'
ORDER BY policyname;
