-- Create brand analysis projects table
CREATE TABLE public.brand_analysis_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  competitors TEXT[],
  target_keywords TEXT[],
  analysis_frequency TEXT DEFAULT 'weekly',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_analysis_at TIMESTAMP WITH TIME ZONE
);

-- Create brand mention analysis table
CREATE TABLE public.brand_mention_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  ai_platform TEXT NOT NULL,
  query_text TEXT NOT NULL,
  mention_found BOOLEAN DEFAULT false,
  mention_context TEXT,
  mention_position INTEGER,
  competitor_mentions TEXT[],
  sentiment_score NUMERIC,
  relevance_score NUMERIC,
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_response JSONB
);

-- Create brand analysis prompts table
CREATE TABLE public.brand_analysis_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  prompt_category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  ai_platform TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand analysis sessions table
CREATE TABLE public.brand_analysis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  session_name TEXT,
  total_queries INTEGER DEFAULT 0,
  completed_queries INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  results_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brand_analysis_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_mention_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_analysis_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_analysis_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brand_analysis_projects
CREATE POLICY "Users can view their own brand analysis projects" 
ON public.brand_analysis_projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brand analysis projects" 
ON public.brand_analysis_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand analysis projects" 
ON public.brand_analysis_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand analysis projects" 
ON public.brand_analysis_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for brand_mention_analysis
CREATE POLICY "Users can view their own brand mention analysis" 
ON public.brand_mention_analysis 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create brand mention analysis for their projects" 
ON public.brand_mention_analysis 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own brand mention analysis" 
ON public.brand_mention_analysis 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their own brand mention analysis" 
ON public.brand_mention_analysis 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_mention_analysis.project_id AND user_id = auth.uid()
));

-- Create RLS policies for brand_analysis_prompts
CREATE POLICY "Users can view their own brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create brand analysis prompts for their projects" 
ON public.brand_analysis_prompts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their own brand analysis prompts" 
ON public.brand_analysis_prompts 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_prompts.project_id AND user_id = auth.uid()
));

-- Create RLS policies for brand_analysis_sessions
CREATE POLICY "Users can view their own brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create brand analysis sessions for their projects" 
ON public.brand_analysis_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their own brand analysis sessions" 
ON public.brand_analysis_sessions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = brand_analysis_sessions.project_id AND user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_brand_analysis_projects_user_id ON public.brand_analysis_projects(user_id);
CREATE INDEX idx_brand_mention_analysis_project_id ON public.brand_mention_analysis(project_id);
CREATE INDEX idx_brand_mention_analysis_ai_platform ON public.brand_mention_analysis(ai_platform);
CREATE INDEX idx_brand_analysis_prompts_project_id ON public.brand_analysis_prompts(project_id);
CREATE INDEX idx_brand_analysis_sessions_project_id ON public.brand_analysis_sessions(project_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_brand_analysis_projects_updated_at
  BEFORE UPDATE ON public.brand_analysis_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_analysis_prompts_updated_at
  BEFORE UPDATE ON public.brand_analysis_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();