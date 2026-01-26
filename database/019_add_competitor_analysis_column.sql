-- =====================================================
-- ADD COMPETITOR ANALYSIS COLUMN TO BRAND_ANALYSIS_SESSIONS
-- Stores advanced competitor analysis results
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_analysis_sessions' 
        AND column_name = 'competitor_analysis'
    ) THEN
        ALTER TABLE brand_analysis_sessions 
        ADD COLUMN competitor_analysis JSONB DEFAULT NULL;
        
        COMMENT ON COLUMN brand_analysis_sessions.competitor_analysis IS 
            'Stores advanced competitor analysis: rankings, market positions, share of voice, competitive gaps';
    END IF;
END $$;

-- Verification
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'brand_analysis_sessions'
AND column_name = 'competitor_analysis';
