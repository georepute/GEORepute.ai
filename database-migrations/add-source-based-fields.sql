-- ============================================
-- Add Source-Based AI Checking Fields
-- ============================================
-- Run this migration if you already created the global_visibility_matrix table
-- and want to add the new source-based AI checking fields.
--
-- If you haven't created the table yet, just run global-visibility-matrix.sql instead.
-- ============================================

-- Add new columns for source-based AI checking
ALTER TABLE global_visibility_matrix
ADD COLUMN IF NOT EXISTS ai_domain_found BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_best_position INTEGER,
ADD COLUMN IF NOT EXISTS ai_mentioned_competitors TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_source_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_check_method VARCHAR(50) DEFAULT 'source_based';

-- Add comments to document the fields
COMMENT ON COLUMN global_visibility_matrix.ai_domain_found IS 
  'Boolean: Was the domain URL found in AI search results?';

COMMENT ON COLUMN global_visibility_matrix.ai_best_position IS 
  'Integer: Best ranking position across all AI platforms (1 = top position)';

COMMENT ON COLUMN global_visibility_matrix.ai_mentioned_competitors IS 
  'Array: Competitor domains/brands that AI recommended in this country';

COMMENT ON COLUMN global_visibility_matrix.ai_source_urls IS 
  'Array: Source URLs that AI platforms cited (for future use)';

COMMENT ON COLUMN global_visibility_matrix.ai_check_method IS 
  'String: Detection methodology used (e.g., source_based, direct_query)';

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_gvm_ai_domain_found 
  ON global_visibility_matrix(ai_domain_found);

CREATE INDEX IF NOT EXISTS idx_gvm_ai_best_position 
  ON global_visibility_matrix(ai_best_position);

-- Update existing records to set default method
UPDATE global_visibility_matrix
SET ai_check_method = 'legacy'
WHERE ai_check_method IS NULL;

-- ============================================
-- Migration Complete
-- ============================================
-- New fields added:
--   ✅ ai_domain_found - Track if domain appears in AI sources
--   ✅ ai_best_position - Best ranking across platforms
--   ✅ ai_mentioned_competitors - Competitor analysis
--   ✅ ai_source_urls - Source citation tracking
--   ✅ ai_check_method - Methodology versioning
--
-- Next: Run a new calculation to populate these fields!
-- ============================================

-- Verification Query
-- Run this to verify the migration worked:
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'global_visibility_matrix'
  AND column_name IN (
    'ai_domain_found',
    'ai_best_position',
    'ai_mentioned_competitors',
    'ai_source_urls',
    'ai_check_method'
  )
ORDER BY column_name;
