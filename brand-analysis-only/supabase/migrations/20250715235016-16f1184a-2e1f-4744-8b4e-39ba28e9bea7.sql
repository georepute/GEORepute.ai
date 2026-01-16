-- Create a default project for the current user so brand analysis can work
-- Get current user ID first (this will be set automatically by RLS in the real app)
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
  '00000000-0000-0000-0000-000000000000', -- This will be replaced by actual user ID via RLS
  'Yalmeh',
  'https://www.yalmeh.com',
  'healthcare',
  ARRAY['Oz naturals'],
  ARRAY['eye cream', 'skincare'],
  'weekly',
  'active',
  ARRAY['chatgpt', 'claude', 'perplexity', 'gemini']
) RETURNING id, brand_name;