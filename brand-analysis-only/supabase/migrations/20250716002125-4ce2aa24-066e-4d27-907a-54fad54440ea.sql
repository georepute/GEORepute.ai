-- Add project_id column to existing prompt_sessions table
ALTER TABLE public.prompt_sessions 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE;