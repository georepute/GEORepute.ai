-- Migration: Track which missed prompts have had content created/published
-- Prevents duplicate content generation for the same missed opportunity

-- Drop table if it was created with the old schema
DROP TABLE IF EXISTS missed_prompt_actions;

CREATE TABLE missed_prompt_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'content_created' CHECK (status IN ('content_created', 'published', 'dismissed')),
  published_url TEXT,
  content_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, prompt_text)
);

CREATE INDEX IF NOT EXISTS idx_missed_prompt_actions_project
  ON missed_prompt_actions(project_id);

CREATE INDEX IF NOT EXISTS idx_missed_prompt_actions_user
  ON missed_prompt_actions(user_id);

-- RLS
ALTER TABLE missed_prompt_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missed prompt actions"
  ON missed_prompt_actions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own missed prompt actions"
  ON missed_prompt_actions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own missed prompt actions"
  ON missed_prompt_actions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own missed prompt actions"
  ON missed_prompt_actions FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to missed prompt actions"
  ON missed_prompt_actions FOR ALL
  USING (auth.role() = 'service_role');
