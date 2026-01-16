-- Add visibility score and total mentions columns to brand_analysis_projects
ALTER TABLE public.brand_analysis_projects 
ADD COLUMN IF NOT EXISTS visibility_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mentions integer DEFAULT 0;