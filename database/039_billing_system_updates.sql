-- =====================================================
-- Migration: 039_billing_system_updates.sql
-- Description: Applies all incremental changes made to the
--              billing system after the initial 036 migration.
--
-- Covers:
--   • Invoices table enhancements (type, line_items_summary,
--     stripe_subscription_id, invoice_number columns)
--   • Rename subscription_plans.prompt_limit → domain_limit
--   • Update plan feature descriptions to reflect domains
--
-- Run this if you already ran 036_billing_system.sql.
-- Safe to re-run (all operations are idempotent).
-- =====================================================

BEGIN;

-- ─────────────────────────────────────────────────────
-- 1. Invoices table — additional metadata columns
-- ─────────────────────────────────────────────────────

-- Classify each invoice (subscription renewal, report purchase, module charge)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'subscription'
    CHECK (type IN ('subscription', 'report', 'module', 'other'));

-- Human-readable summary built from Stripe line items
-- e.g. "Base Plan · AI Visibility Module"
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS line_items_summary TEXT;

-- Link invoice back to its Stripe subscription for easy joins
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Stripe sequential invoice number (e.g. "GEO-0001")
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Index the subscription_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription_id
  ON invoices(stripe_subscription_id);

-- ─────────────────────────────────────────────────────
-- 2. subscription_plans — rename prompt_limit → domain_limit
--
-- Each plan "prompt" slot represents one domain in the
-- Domain Management tab. Renaming makes this explicit.
-- ─────────────────────────────────────────────────────

DO $$
BEGIN
  -- Only rename if the old column still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans'
      AND column_name = 'prompt_limit'
  ) THEN
    ALTER TABLE subscription_plans
      RENAME COLUMN prompt_limit TO domain_limit;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 3. Update plan feature descriptions
--    "Prompt Monitoring" → "Domain Monitoring (up to N domains)"
-- ─────────────────────────────────────────────────────

UPDATE subscription_plans SET
  features = '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 10 domains)","View Purchased Reports","Partial Intelligence Signals"]'
WHERE name = 'base';

UPDATE subscription_plans SET
  features = '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 20 domains)","View Purchased Reports","Partial Intelligence Signals","Priority Support"]'
WHERE name = 'professional';

UPDATE subscription_plans SET
  features = '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 50 domains)","View Purchased Reports","Partial Intelligence Signals","Priority Support","Dedicated Account Manager"]'
WHERE name = 'enterprise';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '039_billing_system_updates applied successfully.';
  RAISE NOTICE 'Invoices: added type, line_items_summary, stripe_subscription_id, invoice_number columns.';
  RAISE NOTICE 'subscription_plans: renamed prompt_limit to domain_limit, updated feature strings.';
END $$;
