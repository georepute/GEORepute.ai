-- Fix gsc_analytics unique constraint to include search_appearance
-- 
-- Problem: idx_gsc_analytics_unique did not include search_appearance.
-- For data_type='search_appearance', multiple rows (one per appearance type)
-- had the same unique key, causing "duplicate key value violates unique constraint".
--
-- Solution: Add COALESCE(search_appearance, '') to the unique index.

DROP INDEX IF EXISTS idx_gsc_analytics_unique;

CREATE UNIQUE INDEX idx_gsc_analytics_unique 
  ON gsc_analytics(
    domain_id, 
    date, 
    data_type, 
    COALESCE(query, ''), 
    COALESCE(page, ''), 
    COALESCE(country, ''), 
    COALESCE(device, ''), 
    COALESCE(search_appearance, '')
  );
