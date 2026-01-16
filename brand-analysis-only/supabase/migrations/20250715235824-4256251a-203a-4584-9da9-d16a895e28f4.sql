-- Create the project for the actual authenticated user  
-- Delete the demo project first
DELETE FROM public.brand_analysis_projects WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Now create for the real user
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
  '02122bc0-283b-4ea8-bbd0-2ed844a95a9b', -- Real user ID from auth logs
  'Yalmeh',
  'https://www.yalmeh.com',
  'healthcare',
  ARRAY['Oz naturals'],
  ARRAY['eye cream', 'skincare'],
  'weekly',
  'active',
  ARRAY['chatgpt', 'claude', 'perplexity', 'gemini']
) RETURNING id, brand_name, user_id;