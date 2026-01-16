-- Add client_id column to all work-related tables for agency client portal integration

-- Speed Tests
ALTER TABLE speed_tests ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_speed_tests_client_id ON speed_tests(client_id);
CREATE INDEX idx_speed_tests_user_client ON speed_tests(user_id, client_id);

-- Link Health Monitors
ALTER TABLE link_health_monitors ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_link_health_monitors_client_id ON link_health_monitors(client_id);
CREATE INDEX idx_link_health_monitors_user_client ON link_health_monitors(user_id, client_id);

-- Broken Links
ALTER TABLE broken_links ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_broken_links_client_id ON broken_links(client_id);

-- Geo Accessibility Monitors
ALTER TABLE geo_accessibility_monitors ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_geo_accessibility_monitors_client_id ON geo_accessibility_monitors(client_id);
CREATE INDEX idx_geo_accessibility_monitors_user_client ON geo_accessibility_monitors(user_id, client_id);

-- Accessibility Check Results
ALTER TABLE accessibility_check_results ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_accessibility_check_results_client_id ON accessibility_check_results(client_id);

-- Brand Analysis Projects
ALTER TABLE brand_analysis_projects ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_brand_analysis_projects_client_id ON brand_analysis_projects(client_id);
CREATE INDEX idx_brand_analysis_projects_user_client ON brand_analysis_projects(user_id, client_id);

-- Schema Entities
ALTER TABLE schema_entities ADD COLUMN client_id UUID REFERENCES agency_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_schema_entities_client_id ON schema_entities(client_id);
CREATE INDEX idx_schema_entities_user_client ON schema_entities(user_id, client_id);

-- Add RLS policies for client_id access
ALTER TABLE speed_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_health_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE broken_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_accessibility_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_analysis_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_entities ENABLE ROW LEVEL SECURITY;

-- Policies for speed_tests
DROP POLICY IF EXISTS "Users can view their own speed tests" ON speed_tests;
CREATE POLICY "Users can view their own speed tests" ON speed_tests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own speed tests" ON speed_tests;
CREATE POLICY "Users can insert their own speed tests" ON speed_tests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own speed tests" ON speed_tests;
CREATE POLICY "Users can update their own speed tests" ON speed_tests FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own speed tests" ON speed_tests;
CREATE POLICY "Users can delete their own speed tests" ON speed_tests FOR DELETE USING (auth.uid() = user_id);

-- Policies for link_health_monitors
DROP POLICY IF EXISTS "Users can view their own link health monitors" ON link_health_monitors;
CREATE POLICY "Users can view their own link health monitors" ON link_health_monitors FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own link health monitors" ON link_health_monitors;
CREATE POLICY "Users can insert their own link health monitors" ON link_health_monitors FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own link health monitors" ON link_health_monitors;
CREATE POLICY "Users can update their own link health monitors" ON link_health_monitors FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own link health monitors" ON link_health_monitors;
CREATE POLICY "Users can delete their own link health monitors" ON link_health_monitors FOR DELETE USING (auth.uid() = user_id);

-- Policies for broken_links
DROP POLICY IF EXISTS "Users can view their own broken links" ON broken_links;
CREATE POLICY "Users can view their own broken links" ON broken_links FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own broken links" ON broken_links;
CREATE POLICY "Users can insert their own broken links" ON broken_links FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own broken links" ON broken_links;
CREATE POLICY "Users can update their own broken links" ON broken_links FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own broken links" ON broken_links;
CREATE POLICY "Users can delete their own broken links" ON broken_links FOR DELETE USING (auth.uid() = user_id);

-- Policies for geo_accessibility_monitors
DROP POLICY IF EXISTS "Users can view their own geo monitors" ON geo_accessibility_monitors;
CREATE POLICY "Users can view their own geo monitors" ON geo_accessibility_monitors FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own geo monitors" ON geo_accessibility_monitors;
CREATE POLICY "Users can insert their own geo monitors" ON geo_accessibility_monitors FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own geo monitors" ON geo_accessibility_monitors;
CREATE POLICY "Users can update their own geo monitors" ON geo_accessibility_monitors FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own geo monitors" ON geo_accessibility_monitors;
CREATE POLICY "Users can delete their own geo monitors" ON geo_accessibility_monitors FOR DELETE USING (auth.uid() = user_id);

-- Policies for accessibility_check_results
DROP POLICY IF EXISTS "Users can view their own accessibility checks" ON accessibility_check_results;
CREATE POLICY "Users can view their own accessibility checks" ON accessibility_check_results FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own accessibility checks" ON accessibility_check_results;
CREATE POLICY "Users can insert their own accessibility checks" ON accessibility_check_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for brand_analysis_projects
DROP POLICY IF EXISTS "Users can view their own brand projects" ON brand_analysis_projects;
CREATE POLICY "Users can view their own brand projects" ON brand_analysis_projects FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own brand projects" ON brand_analysis_projects;
CREATE POLICY "Users can insert their own brand projects" ON brand_analysis_projects FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brand projects" ON brand_analysis_projects;
CREATE POLICY "Users can update their own brand projects" ON brand_analysis_projects FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brand projects" ON brand_analysis_projects;
CREATE POLICY "Users can delete their own brand projects" ON brand_analysis_projects FOR DELETE USING (auth.uid() = user_id);

-- Policies for schema_entities
DROP POLICY IF EXISTS "Users can view their own schema entities" ON schema_entities;
CREATE POLICY "Users can view their own schema entities" ON schema_entities FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own schema entities" ON schema_entities;
CREATE POLICY "Users can insert their own schema entities" ON schema_entities FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own schema entities" ON schema_entities;
CREATE POLICY "Users can update their own schema entities" ON schema_entities FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own schema entities" ON schema_entities;
CREATE POLICY "Users can delete their own schema entities" ON schema_entities FOR DELETE USING (auth.uid() = user_id);