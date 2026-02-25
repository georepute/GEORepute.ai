-- Rename top3_count to top10_count (Organic Proxy Share now uses top-10 ranking queries)
ALTER TABLE market_share_reports RENAME COLUMN top3_count TO top10_count;
COMMENT ON COLUMN market_share_reports.top10_count IS 'Number of GSC queries ranking in top 10 positions';
