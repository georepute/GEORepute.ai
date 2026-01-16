-- Create competitor_ranking_data table
CREATE TABLE IF NOT EXISTS public.competitor_ranking_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  platform_mentions integer DEFAULT 0,
  ranking_position integer DEFAULT 0,
  mention_contexts jsonb DEFAULT '[]'::jsonb,
  prompt_test_results jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_ranking_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own competitor ranking data" 
ON public.competitor_ranking_data 
FOR SELECT 
USING (project_id IN (
  SELECT id FROM public.brand_analysis_projects 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage competitor ranking data" 
ON public.competitor_ranking_data 
FOR ALL 
USING (true);