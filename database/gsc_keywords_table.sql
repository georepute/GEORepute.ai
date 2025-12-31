-- Google Search Console Keywords Table
-- Stores keyword data fetched from Google Search Console for brand analysis projects

CREATE TABLE IF NOT EXISTS gsc_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position FLOAT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  ctr FLOAT NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate keywords per project per date
  UNIQUE(project_id, keyword, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_project_id ON gsc_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_date ON gsc_keywords(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_impressions ON gsc_keywords(impressions DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_clicks ON gsc_keywords(clicks DESC);

-- Enable Row Level Security
ALTER TABLE gsc_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own GSC keywords"
  ON gsc_keywords FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM brand_analysis_projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert GSC keywords"
  ON gsc_keywords FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update GSC keywords"
  ON gsc_keywords FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own GSC keywords"
  ON gsc_keywords FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM brand_analysis_projects
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE gsc_keywords IS 'Google Search Console keyword data for brand analysis projects';
COMMENT ON COLUMN gsc_keywords.keyword IS 'Search query text from GSC';
COMMENT ON COLUMN gsc_keywords.position IS 'Average position in Google search results (1-100)';
COMMENT ON COLUMN gsc_keywords.clicks IS 'Number of clicks from this keyword';
COMMENT ON COLUMN gsc_keywords.impressions IS 'Number of times site appeared in search results';
COMMENT ON COLUMN gsc_keywords.ctr IS 'Click-through rate (clicks/impressions)';
COMMENT ON COLUMN gsc_keywords.date IS 'Date of the data snapshot';

