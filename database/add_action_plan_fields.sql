-- Add new fields to action_plan table for enhanced plan structure
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE action_plan
ADD COLUMN IF NOT EXISTS seo_geo_classification TEXT CHECK (seo_geo_classification IN ('SEO', 'GEO')),
ADD COLUMN IF NOT EXISTS target_keyword_phrase TEXT,
ADD COLUMN IF NOT EXISTS expected_timeline_months INTEGER,
ADD COLUMN IF NOT EXISTS safety_buffer_months INTEGER,
ADD COLUMN IF NOT EXISTS first_page_estimate_months INTEGER,
ADD COLUMN IF NOT EXISTS context_explanation TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_action_plan_seo_geo_classification ON action_plan(seo_geo_classification);
CREATE INDEX IF NOT EXISTS idx_action_plan_target_keyword_phrase ON action_plan(target_keyword_phrase);

-- Add comments for documentation
COMMENT ON COLUMN action_plan.seo_geo_classification IS 'Classification: SEO or GEO';
COMMENT ON COLUMN action_plan.target_keyword_phrase IS 'Primary keyword or phrase being targeted';
COMMENT ON COLUMN action_plan.expected_timeline_months IS 'Expected timeline in months (typically 3-4)';
COMMENT ON COLUMN action_plan.safety_buffer_months IS 'Safety buffer in months (up to 2)';
COMMENT ON COLUMN action_plan.first_page_estimate_months IS 'If SEO, when content expected to reach first page (with buffer). NULL for GEO.';
COMMENT ON COLUMN action_plan.context_explanation IS 'Detailed explanation of what is planned and why';
