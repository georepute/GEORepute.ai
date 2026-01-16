-- Backfill existing records from brand_analysis_projects where project_id exists
UPDATE public.saved_blog_queries sq
SET 
  brand_name = bap.brand_name,
  brand_website = bap.website_url,
  brand_industry = bap.industry
FROM public.brand_analysis_projects bap
WHERE sq.project_id = bap.id
  AND sq.brand_name IS NULL;