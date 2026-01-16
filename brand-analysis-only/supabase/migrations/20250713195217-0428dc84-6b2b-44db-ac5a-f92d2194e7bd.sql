-- Add missing brand_analysis feature toggle
INSERT INTO public.feature_toggles (
  feature_key,
  feature_name,
  description,
  is_enabled,
  minimum_plan,
  feature_config
) VALUES (
  'brand_analysis',
  'Brand Analysis',
  'Access to brand analysis and monitoring tools',
  true,
  'free',
  '{}'::jsonb
);