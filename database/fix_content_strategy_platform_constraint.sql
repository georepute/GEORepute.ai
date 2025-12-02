-- Fix content_strategy target_platform constraint to include all supported platforms
-- Run this in your Supabase SQL Editor
--
-- NOTE: 
-- - Column name: target_platform (this is the actual column in the table)
-- - Constraint name: content_strategy_target_platform_check (this is the CHECK constraint that restricts values)
-- We are modifying the CONSTRAINT, not the column itself

-- First, drop the existing constraint (this removes the restriction)
ALTER TABLE content_strategy 
DROP CONSTRAINT IF EXISTS content_strategy_target_platform_check;

-- Add a new constraint with all supported platforms
-- This CHECK constraint restricts the target_platform COLUMN to only allow these values:
ALTER TABLE content_strategy 
ADD CONSTRAINT content_strategy_target_platform_check 
CHECK (target_platform IN (
  'reddit',
  'quora', 
  'medium',
  'github',
  'facebook',
  'linkedin',
  'instagram'
));

-- Verify the constraint was created
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'content_strategy_target_platform_check';

