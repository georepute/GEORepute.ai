-- Migration: 037_invoices_enhancements.sql
-- Adds richer metadata to invoices for billing history display

BEGIN;

-- Add type column to classify invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'subscription'
    CHECK (type IN ('subscription', 'report', 'module', 'other'));

-- Add a human-readable summary of line items (e.g. "Base Plan x1, AI Visibility Module x1")
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS line_items_summary TEXT;

-- Add stripe_subscription_id for easy lookup
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add number field (Stripe invoice number like "GEO-0001")
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Index for subscription lookup
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription_id
  ON invoices(stripe_subscription_id);

COMMIT;
