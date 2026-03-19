-- 041: Add unique constraint on report_monitoring_subscriptions(report_purchase_id)
-- Prevents duplicate monitoring records when both webhook and verify-session fire.
--
-- First, deduplicate any existing duplicates by keeping only the newest record per purchase.
DELETE FROM report_monitoring_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (report_purchase_id) id
  FROM report_monitoring_subscriptions
  ORDER BY report_purchase_id, created_at DESC
);

-- Now add the unique constraint so future upserts are atomic.
ALTER TABLE report_monitoring_subscriptions
  ADD CONSTRAINT uq_monitoring_report_purchase UNIQUE (report_purchase_id);
