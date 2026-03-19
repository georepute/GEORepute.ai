-- 042: Add receipt_url column to invoices table
-- Stores the Stripe charge receipt URL separately from the hosted invoice page URL.
-- Used for one-time report purchases where the receipt is the relevant proof-of-payment document.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;
