-- Update competitor_ranking_data table to support direct competitor names
-- This allows storing ranking data without requiring foreign key references

-- Add optional columns for direct storage
ALTER TABLE public.competitor_ranking_data 
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS competitor_name TEXT,
ADD COLUMN IF NOT EXISTS platform_mentions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ranking_position INTEGER,
ADD COLUMN IF NOT EXISTS prompt_test_results JSONB DEFAULT '[]'::jsonb;

-- Make competitor_id optional since we might not always have it
ALTER TABLE public.competitor_ranking_data 
ALTER COLUMN competitor_id DROP NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_competitor_ranking_session ON public.competitor_ranking_data(session_id);
CREATE INDEX IF NOT EXISTS idx_competitor_ranking_name ON public.competitor_ranking_data(competitor_name);

-- Add RLS policy for session-based access
DROP POLICY IF EXISTS "Users can view competitor ranking data" ON public.competitor_ranking_data;
CREATE POLICY "Users can view competitor ranking data"
ON public.competitor_ranking_data
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.brand_analysis_projects 
    WHERE user_id = auth.uid()
  )
);

-- Allow system to insert ranking data
DROP POLICY IF EXISTS "System can insert ranking data" ON public.competitor_ranking_data;
CREATE POLICY "System can insert ranking data"
ON public.competitor_ranking_data
FOR INSERT
WITH CHECK (true);