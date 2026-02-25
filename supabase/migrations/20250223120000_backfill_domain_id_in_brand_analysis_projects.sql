-- Backfill brand_analysis_projects.domain_id by matching website_url with domains.domain
-- Strips https:// and http:// from website_url before matching

UPDATE brand_analysis_projects p
SET domain_id = d.id
FROM domains d
WHERE p.domain_id IS NULL
  AND p.website_url IS NOT NULL
  AND p.website_url != ''
  AND LOWER(TRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(p.website_url, '^https?://', '', 'i'),
    '/.*$', ''
  ))) = LOWER(TRIM(d.domain));
