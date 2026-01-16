-- Create the prompt_sessions table that the brand analysis processor expects
CREATE TABLE IF NOT EXISTS public.prompt_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  results_summary jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own prompt sessions" 
ON public.prompt_sessions 
FOR SELECT 
USING (project_id IN (
  SELECT id FROM public.brand_analysis_projects 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create prompt sessions for their projects" 
ON public.prompt_sessions 
FOR INSERT 
WITH CHECK (project_id IN (
  SELECT id FROM public.brand_analysis_projects 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own prompt sessions" 
ON public.prompt_sessions 
FOR UPDATE 
USING (project_id IN (
  SELECT id FROM public.brand_analysis_projects 
  WHERE user_id = auth.uid()
));

-- Create update trigger
CREATE TRIGGER update_prompt_sessions_updated_at
BEFORE UPDATE ON public.prompt_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();