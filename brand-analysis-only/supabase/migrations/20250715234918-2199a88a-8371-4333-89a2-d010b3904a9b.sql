-- Check what projects exist and their details
SELECT id, brand_name, website_url, created_at 
FROM brand_analysis_projects 
ORDER BY created_at DESC 
LIMIT 5;