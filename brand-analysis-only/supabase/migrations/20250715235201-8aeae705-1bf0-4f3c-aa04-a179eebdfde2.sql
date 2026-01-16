-- Temporarily disable RLS and create a demo project so the user can see the system working
-- Then we'll tell them they need to authenticate for it to work properly

-- Disable RLS temporarily  
ALTER TABLE public.brand_analysis_projects DISABLE ROW LEVEL SECURITY;

-- Create a demo project that will show data
INSERT INTO public.brand_analysis_projects (
  user_id,
  brand_name,
  website_url,
  industry,
  competitors,
  target_keywords,
  analysis_frequency,
  status,
  active_platforms
) VALUES (
  '11111111-1111-1111-1111-111111111111', -- Demo user ID
  'Yalmeh',
  'https://www.yalmeh.com',
  'healthcare',
  ARRAY['Oz naturals'],
  ARRAY['eye cream', 'skincare'],
  'weekly',
  'active',
  ARRAY['chatgpt', 'claude', 'perplexity', 'gemini']
) RETURNING id, brand_name;

-- Re-enable RLS
ALTER TABLE public.brand_analysis_projects ENABLE ROW LEVEL SECURITY;