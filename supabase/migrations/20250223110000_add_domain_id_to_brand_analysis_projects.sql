-- Add domain_id to brand_analysis_projects to link projects with domains table
-- Used for Market Share of Attention and other domain-scoped reports

ALTER TABLE brand_analysis_projects
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brand_analysis_projects_domain_id
  ON brand_analysis_projects(domain_id);

COMMENT ON COLUMN brand_analysis_projects.domain_id IS 'Links to domains table for GSC and report matching. Set when user selects a domain in AI Visibility.';
