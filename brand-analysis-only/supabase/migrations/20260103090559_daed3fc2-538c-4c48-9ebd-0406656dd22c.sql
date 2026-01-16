-- Create source_outreach_campaigns table for tracking outreach to brand analysis sources
CREATE TABLE public.source_outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  source_id UUID REFERENCES brand_analysis_sources(id) ON DELETE SET NULL,
  
  -- Source Info
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  source_title TEXT,
  
  -- Contact Intelligence
  contact_email TEXT,
  contact_name TEXT,
  contact_role TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  
  -- Source Analysis
  source_analysis JSONB DEFAULT '{}'::jsonb,
  competitors_mentioned TEXT[] DEFAULT '{}',
  citing_prompts TEXT[] DEFAULT '{}',
  
  -- Outreach Details
  outreach_type TEXT CHECK (outreach_type IN ('guest_post', 'mention_request', 'link_request', 'correction', 'partnership', 'review_request', 'directory_inclusion')),
  outreach_status TEXT DEFAULT 'not_started' CHECK (outreach_status IN ('not_started', 'researched', 'draft_ready', 'sent', 'opened', 'replied', 'success', 'declined', 'follow_up')),
  
  -- Email Content
  email_subject TEXT,
  email_body TEXT,
  
  -- Tracking
  researched_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_source_outreach_campaigns_user_id ON public.source_outreach_campaigns(user_id);
CREATE INDEX idx_source_outreach_campaigns_project_id ON public.source_outreach_campaigns(project_id);
CREATE INDEX idx_source_outreach_campaigns_source_id ON public.source_outreach_campaigns(source_id);
CREATE INDEX idx_source_outreach_campaigns_status ON public.source_outreach_campaigns(outreach_status);
CREATE INDEX idx_source_outreach_campaigns_domain ON public.source_outreach_campaigns(source_domain);

-- Enable Row Level Security
ALTER TABLE public.source_outreach_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own outreach campaigns
CREATE POLICY "Users can view their own outreach campaigns"
ON public.source_outreach_campaigns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own outreach campaigns"
ON public.source_outreach_campaigns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outreach campaigns"
ON public.source_outreach_campaigns
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outreach campaigns"
ON public.source_outreach_campaigns
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at
CREATE OR REPLACE FUNCTION public.update_source_outreach_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_source_outreach_campaigns_updated_at
BEFORE UPDATE ON public.source_outreach_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_source_outreach_campaigns_updated_at();