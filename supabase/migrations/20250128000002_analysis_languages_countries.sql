ALTER TABLE brand_analysis_projects
  ADD COLUMN IF NOT EXISTS analysis_languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis_countries TEXT[] DEFAULT '{}';
