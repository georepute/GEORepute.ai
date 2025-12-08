-- =====================================================
-- Fix Verification Methods Migration
-- Updates verification_method values to match Google API
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Update any domains using HTML_TAG to META (the correct Google API value)
UPDATE gsc_domains
SET verification_method = 'META',
    updated_at = NOW()
WHERE verification_method = 'HTML_TAG';

-- Update any domains using HTML_FILE to FILE (the correct Google API value)
UPDATE gsc_domains
SET verification_method = 'FILE',
    updated_at = NOW()
WHERE verification_method = 'HTML_FILE';

-- Drop the old constraint
ALTER TABLE gsc_domains DROP CONSTRAINT IF EXISTS gsc_domains_verification_method_check;

-- Add the new constraint with correct values
ALTER TABLE gsc_domains ADD CONSTRAINT gsc_domains_verification_method_check 
  CHECK (verification_method IN ('DNS_TXT', 'FILE', 'META', 'ANALYTICS', 'TAG_MANAGER'));

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM gsc_domains WHERE verification_method IN ('META', 'FILE');
  RAISE NOTICE 'Updated % domains to use correct verification method values', updated_count;
END $$;

