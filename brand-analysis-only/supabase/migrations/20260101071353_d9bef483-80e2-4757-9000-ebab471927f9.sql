-- Create saved_blog_queries table for storing queries to convert to blog posts
CREATE TABLE public.saved_blog_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.brand_analysis_projects(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  ai_platform TEXT NOT NULL,
  competitor_mentions TEXT[] DEFAULT '{}',
  ai_response_excerpt TEXT,
  sources JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'dismissed')),
  converted_blog_id UUID REFERENCES public.agent_blog_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster user queries
CREATE INDEX idx_saved_blog_queries_user_id ON public.saved_blog_queries(user_id);
CREATE INDEX idx_saved_blog_queries_status ON public.saved_blog_queries(status);
CREATE INDEX idx_saved_blog_queries_project_id ON public.saved_blog_queries(project_id);

-- Enable RLS
ALTER TABLE public.saved_blog_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own saved queries
CREATE POLICY "Users can view their own saved queries"
  ON public.saved_blog_queries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved queries"
  ON public.saved_blog_queries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved queries"
  ON public.saved_blog_queries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved queries"
  ON public.saved_blog_queries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_blog_queries_updated_at
  BEFORE UPDATE ON public.saved_blog_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();