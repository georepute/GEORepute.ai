-- Add query configuration fields to brand_analysis_projects
ALTER TABLE public.brand_analysis_projects 
ADD COLUMN IF NOT EXISTS query_generation_mode text DEFAULT 'ai-only' CHECK (query_generation_mode IN ('ai-only', 'manual', 'both')),
ADD COLUMN IF NOT EXISTS manual_queries jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS target_languages text[] DEFAULT ARRAY['en-US']::text[],
ADD COLUMN IF NOT EXISTS target_countries text[] DEFAULT ARRAY[]::text[];

-- Add comment for documentation
COMMENT ON COLUMN public.brand_analysis_projects.query_generation_mode IS 'How queries are generated: ai-only, manual, or both';
COMMENT ON COLUMN public.brand_analysis_projects.manual_queries IS 'Array of manual queries with structure: [{query: string, language: string, country?: string}]';
COMMENT ON COLUMN public.brand_analysis_projects.target_languages IS 'Array of language codes for AI query generation (e.g., en-US, es, fr)';
COMMENT ON COLUMN public.brand_analysis_projects.target_countries IS 'Array of country codes for geo-specific queries (e.g., US, CA, GB)';

