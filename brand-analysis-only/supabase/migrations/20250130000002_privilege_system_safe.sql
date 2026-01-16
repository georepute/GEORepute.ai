-- Safe Privilege-Based Access Control System Migration
-- This migration safely handles existing policies and tables

-- First, let's add a permissions column to the existing team_roles table
ALTER TABLE public.team_roles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Update existing roles with appropriate permissions
-- Account Owner role
UPDATE public.team_roles 
SET permissions = jsonb_build_object(
  'dashboard_access', jsonb_build_object(
    'ask_freddie_access', true,
    'academy_access', true,
    'scan_access', true,
    'brand_analysis_access', true,
    'schema_access', true,
    'snippet_access', true,
    'ai_visibility_access', true,
    'bot_shield_access', true,
    'answer_discovery_access', true,
    'website_speed_access', true,
    'ai_agents_access', true,
    'website_management_access', true,
    'analytics_access', true,
    'business_intelligence_access', true,
    'integrations_access', true
  ),
  'team_management', jsonb_build_object(
    'can_view_team_members', true,
    'can_invite_team_members', true,
    'can_edit_team_members', true,
    'can_remove_team_members', true,
    'can_change_privileges', true,
    'billing_access', true,
    'profile_access', true,
    'help_access', true
  ),
  'admin_access', jsonb_build_object(
    'can_access_admin_panel', false,
    'can_manage_all_users', false,
    'can_manage_system_settings', false
  ),
  'organization', jsonb_build_object(
    'can_view_organization_data', true,
    'can_edit_organization_data', true,
    'can_delete_organization_data', true,
    'can_edit_organization_settings', true,
    'can_manage_billing', true
  )
)
WHERE role_name = 'account_owner';

-- Admin role (system-wide admin)
INSERT INTO public.team_roles (role_name, display_name, description, permissions, is_active)
VALUES (
  'admin',
  'Administrator',
  'System administrator with full access to all features',
  jsonb_build_object(
    'dashboard_access', jsonb_build_object(
      'ask_freddie_access', true,
      'academy_access', true,
      'scan_access', true,
      'brand_analysis_access', true,
      'schema_access', true,
      'snippet_access', true,
      'ai_visibility_access', true,
      'bot_shield_access', true,
      'answer_discovery_access', true,
      'website_speed_access', true,
      'ai_agents_access', true,
      'website_management_access', true,
      'analytics_access', true,
      'business_intelligence_access', true,
      'integrations_access', true
    ),
    'team_management', jsonb_build_object(
      'can_view_team_members', true,
      'can_invite_team_members', true,
      'can_edit_team_members', true,
      'can_remove_team_members', true,
      'can_change_privileges', true,
      'billing_access', true,
      'profile_access', true,
      'help_access', true
    ),
    'admin_access', jsonb_build_object(
      'can_access_admin_panel', true,
      'can_manage_all_users', true,
      'can_manage_system_settings', true
    ),
    'organization', jsonb_build_object(
      'can_view_organization_data', true,
      'can_edit_organization_data', true,
      'can_delete_organization_data', true,
      'can_edit_organization_settings', true,
      'can_manage_billing', true
    )
  ),
  true
) ON CONFLICT (role_name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- Custom role for flexible privilege assignment
INSERT INTO public.team_roles (role_name, display_name, description, permissions, is_active)
VALUES (
  'custom',
  'Custom Access',
  'Custom access level with specific privileges',
  jsonb_build_object(
    'dashboard_access', jsonb_build_object(
      'ask_freddie_access', false,
      'academy_access', false,
      'scan_access', false,
      'brand_analysis_access', false,
      'schema_access', false,
      'snippet_access', false,
      'ai_visibility_access', false,
      'bot_shield_access', false,
      'answer_discovery_access', false,
      'website_speed_access', false,
      'ai_agents_access', false,
      'website_management_access', false,
      'analytics_access', false,
      'business_intelligence_access', false,
      'integrations_access', false
    ),
    'team_management', jsonb_build_object(
      'can_view_team_members', false,
      'can_invite_team_members', false,
      'can_edit_team_members', false,
      'can_remove_team_members', false,
      'can_change_privileges', false,
      'billing_access', false,
      'profile_access', true,
      'help_access', true
    ),
    'admin_access', jsonb_build_object(
      'can_access_admin_panel', false,
      'can_manage_all_users', false,
      'can_manage_system_settings', false
    ),
    'organization', jsonb_build_object(
      'can_view_organization_data', true,
      'can_edit_organization_data', false,
      'can_delete_organization_data', false,
      'can_edit_organization_settings', false,
      'can_manage_billing', false
    )
  ),
  true
) ON CONFLICT (role_name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- Update existing team member and viewer roles with basic permissions
UPDATE public.team_roles 
SET permissions = jsonb_build_object(
  'dashboard_access', jsonb_build_object(
    'ask_freddie_access', true,
    'academy_access', true,
    'scan_access', true,
    'brand_analysis_access', true,
    'schema_access', true,
    'snippet_access', true,
    'ai_visibility_access', true,
    'bot_shield_access', false,
    'answer_discovery_access', true,
    'website_speed_access', true,
    'ai_agents_access', false,
    'website_management_access', true,
    'analytics_access', false,
    'business_intelligence_access', false,
    'integrations_access', false
  ),
  'team_management', jsonb_build_object(
    'can_view_team_members', true,
    'can_invite_team_members', false,
    'can_edit_team_members', false,
    'can_remove_team_members', false,
    'can_change_privileges', false,
    'billing_access', false,
    'profile_access', true,
    'help_access', true
  ),
  'admin_access', jsonb_build_object(
    'can_access_admin_panel', false,
    'can_manage_all_users', false,
    'can_manage_system_settings', false
  ),
  'organization', jsonb_build_object(
    'can_view_organization_data', true,
    'can_edit_organization_data', false,
    'can_delete_organization_data', false,
    'can_edit_organization_settings', false,
    'can_manage_billing', false
  )
)
WHERE role_name IN ('team_member', 'member');

-- Update viewer role with minimal permissions
UPDATE public.team_roles 
SET permissions = jsonb_build_object(
  'dashboard_access', jsonb_build_object(
    'ask_freddie_access', true,
    'academy_access', true,
    'scan_access', false,
    'brand_analysis_access', false,
    'schema_access', false,
    'snippet_access', false,
    'ai_visibility_access', false,
    'bot_shield_access', false,
    'answer_discovery_access', false,
    'website_speed_access', false,
    'ai_agents_access', false,
    'website_management_access', false,
    'analytics_access', false,
    'business_intelligence_access', false,
    'integrations_access', false
  ),
  'team_management', jsonb_build_object(
    'can_view_team_members', false,
    'can_invite_team_members', false,
    'can_edit_team_members', false,
    'can_remove_team_members', false,
    'can_change_privileges', false,
    'billing_access', false,
    'profile_access', true,
    'help_access', true
  ),
  'admin_access', jsonb_build_object(
    'can_access_admin_panel', false,
    'can_manage_all_users', false,
    'can_manage_system_settings', false
  ),
  'organization', jsonb_build_object(
    'can_view_organization_data', false,
    'can_edit_organization_data', false,
    'can_delete_organization_data', false,
    'can_edit_organization_settings', false,
    'can_manage_billing', false
  )
)
WHERE role_name = 'viewer';

-- Create a table for custom privilege assignments per user
CREATE TABLE IF NOT EXISTS public.user_custom_privileges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  privileges JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(user_id, team_member_id)
);

-- Add RLS policies for user_custom_privileges
ALTER TABLE public.user_custom_privileges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own custom privileges" ON public.user_custom_privileges;
DROP POLICY IF EXISTS "Team admins can manage custom privileges" ON public.user_custom_privileges;

-- Policy: Users can view their own custom privileges
CREATE POLICY "Users can view own custom privileges" ON public.user_custom_privileges
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Team admins can manage custom privileges for their organization members
CREATE POLICY "Team admins can manage custom privileges" ON public.user_custom_privileges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.team_roles tr ON tm.team_role_id = tr.id
      WHERE tm.member_id = auth.uid()
      AND tm.status = 'active'
      AND (
        tr.role_name = 'account_owner'
        OR (tr.permissions->'team_management'->>'can_change_privileges')::boolean = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.is_admin = true
    )
  );

-- Update the get_user_organization_role function to handle admin role properly
CREATE OR REPLACE FUNCTION public.get_user_organization_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  role_name TEXT;
  is_admin_user BOOLEAN;
BEGIN
  -- Check if user is admin (system-wide role)
  SELECT is_admin INTO is_admin_user
  FROM public.admin_users
  WHERE admin_users.user_id = $1
  LIMIT 1;
  
  IF is_admin_user = true THEN
    RETURN 'admin';
  END IF;
  
  -- Check team member role
  SELECT tr.role_name INTO role_name
  FROM public.team_members tm
  JOIN public.team_roles tr ON tm.team_role_id = tr.id
  WHERE tm.member_id = $1 AND tm.status = 'active'
  LIMIT 1;
  
  -- Default to viewer if no role found
  RETURN COALESCE(role_name, 'viewer');
END;
$$;

-- Create function to get user's effective privileges (combines role + custom privileges)
CREATE OR REPLACE FUNCTION public.get_user_effective_privileges(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
  role_permissions JSONB;
  custom_privileges JSONB;
  effective_privileges JSONB;
BEGIN
  -- Get user's role
  user_role := public.get_user_organization_role(user_id);
  
  -- Get base role permissions
  SELECT permissions INTO role_permissions
  FROM public.team_roles
  WHERE role_name = user_role
  LIMIT 1;
  
  -- Get custom privileges if they exist
  SELECT privileges INTO custom_privileges
  FROM public.user_custom_privileges ucp
  JOIN public.team_members tm ON ucp.team_member_id = tm.id
  WHERE ucp.user_id = $1 AND tm.status = 'active'
  LIMIT 1;
  
  -- If no role permissions found, return empty
  IF role_permissions IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- If no custom privileges, return role permissions
  IF custom_privileges IS NULL THEN
    RETURN role_permissions;
  END IF;
  
  -- Merge role permissions with custom privileges (custom overrides role)
  effective_privileges := role_permissions;
  
  -- Override dashboard access if custom privileges specify them
  IF custom_privileges ? 'dashboard_access' THEN
    effective_privileges := jsonb_set(
      effective_privileges, 
      '{dashboard_access}', 
      custom_privileges->'dashboard_access'
    );
  END IF;
  
  -- Override team management if custom privileges specify them
  IF custom_privileges ? 'team_management' THEN
    effective_privileges := jsonb_set(
      effective_privileges, 
      '{team_management}', 
      custom_privileges->'team_management'
    );
  END IF;
  
  RETURN effective_privileges;
END;
$$;

-- Update the user_has_permission function to use effective privileges
CREATE OR REPLACE FUNCTION public.user_has_privilege(user_id UUID, privilege_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  effective_privileges JSONB;
  privilege_value TEXT;
  path_parts TEXT[];
BEGIN
  -- Get user's effective privileges
  effective_privileges := public.get_user_effective_privileges(user_id);
  
  -- Split the privilege path (e.g., 'dashboard_access.ai_visibility_access')
  path_parts := string_to_array(privilege_path, '.');
  
  -- Navigate through the JSON structure
  IF array_length(path_parts, 1) = 2 THEN
    privilege_value := (effective_privileges -> path_parts[1] ->> path_parts[2]);
  ELSIF array_length(path_parts, 1) = 1 THEN
    privilege_value := (effective_privileges ->> path_parts[1]);
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Convert to boolean
  RETURN COALESCE(privilege_value::boolean, false);
END;
$$;
