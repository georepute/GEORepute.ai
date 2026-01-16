-- Create competitor discovery tables
CREATE TABLE public.competitor_discovery_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  discovery_criteria JSONB DEFAULT '{}',
  total_competitors_found INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.discovered_competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discovery_session_id UUID NOT NULL REFERENCES public.competitor_discovery_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  website_url TEXT,
  industry TEXT,
  location TEXT,
  business_type TEXT,
  discovery_source TEXT, -- 'ai_discovery', 'manual', etc.
  confidence_score NUMERIC DEFAULT 0.5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.competitor_ranking_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES public.discovered_competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.brand_analysis_projects(id) ON DELETE CASCADE,
  ai_platform TEXT NOT NULL, -- 'chatgpt', 'claude', 'perplexity', etc.
  total_mentions INTEGER DEFAULT 0,
  mention_rank INTEGER,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  prompts_tested_count INTEGER DEFAULT 0,
  mention_contexts JSONB DEFAULT '[]',
  ranking_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_ranking_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for competitor_discovery_sessions
CREATE POLICY "Users can view their own discovery sessions" 
ON public.competitor_discovery_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = competitor_discovery_sessions.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create discovery sessions for their projects" 
ON public.competitor_discovery_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = competitor_discovery_sessions.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own discovery sessions" 
ON public.competitor_discovery_sessions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = competitor_discovery_sessions.project_id AND user_id = auth.uid()
));

-- RLS policies for discovered_competitors  
CREATE POLICY "Users can view their own discovered competitors" 
ON public.discovered_competitors 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = discovered_competitors.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create discovered competitors for their projects" 
ON public.discovered_competitors 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = discovered_competitors.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own discovered competitors" 
ON public.discovered_competitors 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = discovered_competitors.project_id AND user_id = auth.uid()
));

-- RLS policies for competitor_ranking_data
CREATE POLICY "Users can view their own competitor ranking data" 
ON public.competitor_ranking_data 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = competitor_ranking_data.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create competitor ranking data for their projects" 
ON public.competitor_ranking_data 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = competitor_ranking_data.project_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own competitor ranking data" 
ON public.competitor_ranking_data 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.brand_analysis_projects 
  WHERE id = competitor_ranking_data.project_id AND user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_competitor_discovery_sessions_project_id ON public.competitor_discovery_sessions(project_id);
CREATE INDEX idx_discovered_competitors_discovery_session_id ON public.discovered_competitors(discovery_session_id);
CREATE INDEX idx_discovered_competitors_project_id ON public.discovered_competitors(project_id);
CREATE INDEX idx_competitor_ranking_data_competitor_id ON public.competitor_ranking_data(competitor_id);
CREATE INDEX idx_competitor_ranking_data_project_id ON public.competitor_ranking_data(project_id);
CREATE INDEX idx_competitor_ranking_data_ai_platform ON public.competitor_ranking_data(ai_platform);

-- Add triggers for updated_at
CREATE TRIGGER update_competitor_discovery_sessions_updated_at
  BEFORE UPDATE ON public.competitor_discovery_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discovered_competitors_updated_at
  BEFORE UPDATE ON public.discovered_competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitor_ranking_data_updated_at
  BEFORE UPDATE ON public.competitor_ranking_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();