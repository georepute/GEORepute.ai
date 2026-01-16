-- Add website_url columns to automated_reports and va_reports
ALTER TABLE automated_reports ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE va_reports ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automated_reports_website_url ON automated_reports(website_url);
CREATE INDEX IF NOT EXISTS idx_va_reports_website_url ON va_reports(website_url);
CREATE INDEX IF NOT EXISTS idx_automated_reports_client_id ON automated_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_va_reports_client_id ON va_reports(client_id);

-- Add RLS policies for client portal access
-- Scans
DROP POLICY IF EXISTS "Client users can view assigned scans" ON scans;
CREATE POLICY "Client users can view assigned scans"
ON scans FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- Speed tests
DROP POLICY IF EXISTS "Client users can view assigned speed tests" ON speed_tests;
CREATE POLICY "Client users can view assigned speed tests"
ON speed_tests FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- Link health monitors
DROP POLICY IF EXISTS "Client users can view assigned link monitors" ON link_health_monitors;
CREATE POLICY "Client users can view assigned link monitors"
ON link_health_monitors FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- Geo accessibility monitors
DROP POLICY IF EXISTS "Client users can view assigned geo monitors" ON geo_accessibility_monitors;
CREATE POLICY "Client users can view assigned geo monitors"
ON geo_accessibility_monitors FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- Automated reports
DROP POLICY IF EXISTS "Client users can view assigned automated reports" ON automated_reports;
CREATE POLICY "Client users can view assigned automated reports"
ON automated_reports FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- VA reports
DROP POLICY IF EXISTS "Client users can view assigned va reports" ON va_reports;
CREATE POLICY "Client users can view assigned va reports"
ON va_reports FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- AI proposals
DROP POLICY IF EXISTS "Client users can view assigned proposals" ON ai_proposals;
CREATE POLICY "Client users can view assigned proposals"
ON ai_proposals FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);

-- Brand analysis projects
DROP POLICY IF EXISTS "Client users can view assigned brand projects" ON brand_analysis_projects;
CREATE POLICY "Client users can view assigned brand projects"
ON brand_analysis_projects FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM agency_client_users 
    WHERE email = auth.jwt()->>'email'
  )
);