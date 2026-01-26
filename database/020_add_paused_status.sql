-- =====================================================
-- ADD 'paused' STATUS TO BRAND_ANALYSIS_SESSIONS
-- Allows pausing and resuming analysis
-- =====================================================

-- Drop the existing check constraint
ALTER TABLE brand_analysis_sessions 
DROP CONSTRAINT IF EXISTS brand_analysis_sessions_status_check;

-- Add new check constraint with 'paused' status included
ALTER TABLE brand_analysis_sessions 
ADD CONSTRAINT brand_analysis_sessions_status_check 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused'));

-- Verification
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'brand_analysis_sessions'::regclass 
AND conname = 'brand_analysis_sessions_status_check';
