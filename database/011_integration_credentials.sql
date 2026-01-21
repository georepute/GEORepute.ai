-- Create integration_credentials table
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID,
  platform TEXT NOT NULL,
  client_id TEXT,
  client_secret TEXT,
  account_id TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'connected',
  settings JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_integration_platforms table
CREATE TABLE IF NOT EXISTS admin_integration_platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT UNIQUE NOT NULL,
  is_live BOOLEAN DEFAULT true,
  is_oauth BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert platforms
INSERT INTO admin_integration_platforms (platform, is_live, is_oauth) 
VALUES 
  ('WordPress', true, false),
  ('ShopifyFullyManaged', true, false)
ON CONFLICT (platform) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_credentials_user_id ON integration_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_created_by_user_id ON integration_credentials(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_platform ON integration_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_status ON integration_credentials(status);

-- Enable RLS
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_integration_platforms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_credentials
CREATE POLICY "Users can view their own integrations"
  ON integration_credentials FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = created_by_user_id);

CREATE POLICY "Users can create their own integrations"
  ON integration_credentials FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their own integrations"
  ON integration_credentials FOR UPDATE
  USING (auth.uid() = created_by_user_id);

CREATE POLICY "Users can delete their own integrations"
  ON integration_credentials FOR DELETE
  USING (auth.uid() = created_by_user_id);

-- RLS Policies for admin_integration_platforms
CREATE POLICY "Anyone can view live platforms"
  ON admin_integration_platforms FOR SELECT
  USING (is_live = true);
