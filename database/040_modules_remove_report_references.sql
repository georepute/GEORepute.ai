-- Migration: 040_modules_remove_report_references.sql
-- Intelligence reports are purchased independently ($99 one-time + $50/month monitoring).
-- Remove any wording that implies reports are included with a module subscription.

BEGIN;

-- analytics_competitor: rename "BI Reports" → "BI Analytics Reports" to clearly
-- distinguish from independently-purchased Intelligence Reports.
UPDATE modules SET
  features = '["Advanced Analytics Dashboard","Competitor Research","Keyword Forecast","BI Analytics Reports","GSC Analytics"]'
WHERE name = 'analytics_competitor';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '040_modules_remove_report_references applied. Intelligence reports remain independently purchased.';
END $$;
