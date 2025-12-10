/**
 * Organization Management Utilities
 * Helper functions for working with organizations, roles, and permissions
 */

import { supabase } from '@/lib/supabase/client';
import type { Organization, Role, OrganizationUser } from '@/types';

/**
 * Creates a new organization and assigns the current user as admin
 */
export async function createOrganization(data: {
  name: string;
  description?: string;
  website?: string;
}) {
  try {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create organization');
    }

    return {
      success: true,
      organization: result.organization,
      role: result.role,
    };
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Gets all organizations for the current user
 */
export async function getUserOrganizations() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        *,
        organization:organizations(*),
        role:roles(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) throw error;

    return {
      success: true,
      organizations: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return {
      success: false,
      error: error.message,
      organizations: [],
    };
  }
}

/**
 * Gets organization members with their roles
 */
export async function getOrganizationMembers(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('organization_users')
      .select(`
        id,
        user_id,
        status,
        joined_at,
        role:roles(id, name, description)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      members: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching organization members:', error);
    return {
      success: false,
      error: error.message,
      members: [],
    };
  }
}

/**
 * Checks if the current user is an admin of the organization
 */
export async function isOrganizationAdmin(organizationId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('is_organization_admin', {
        p_user_id: user.id,
        p_organization_id: organizationId,
      });

    if (error) throw error;

    return data === true;
  } catch (error: any) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Gets the user's role in a specific organization
 */
export async function getUserOrganizationRole(organizationId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('get_user_organization_role', {
        p_user_id: user.id,
        p_organization_id: organizationId,
      });

    if (error) throw error;

    return {
      success: true,
      role: data?.[0] || null,
    };
  } catch (error: any) {
    console.error('Error fetching user role:', error);
    return {
      success: false,
      error: error.message,
      role: null,
    };
  }
}

/**
 * Gets all available roles
 */
export async function getAllRoles() {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) throw error;

    return {
      success: true,
      roles: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return {
      success: false,
      error: error.message,
      roles: [],
    };
  }
}

/**
 * Updates organization details (admin only)
 */
export async function updateOrganization(
  organizationId: string,
  updates: Partial<Organization>
) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      organization: data,
    };
  } catch (error: any) {
    console.error('Error updating organization:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Invites a user to an organization (admin only)
 * Note: This is a placeholder - you'll need to implement email invitations
 */
export async function inviteUserToOrganization(
  organizationId: string,
  userId: string,
  roleId: string
) {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role_id: roleId,
        invited_by: currentUser.id,
        invited_at: new Date().toISOString(),
        status: 'invited',
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send invitation email

    return {
      success: true,
      invitation: data,
    };
  } catch (error: any) {
    console.error('Error inviting user:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Removes a user from an organization (admin only)
 * Deletes the record from organization_users table
 */
export async function removeUserFromOrganization(
  organizationId: string,
  userId: string
) {
  try {
    const { error } = await supabase
      .from('organization_users')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error removing user:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Updates a user's role in an organization (admin only)
 */
export async function updateUserRole(
  organizationId: string,
  userId: string,
  newRoleId: string
) {
  try {
    const { data, error } = await supabase
      .from('organization_users')
      .update({ role_id: newRoleId })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      membership: data,
    };
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Checks if user has a specific permission in an organization
 */
export async function hasPermission(
  organizationId: string,
  permission: string
): Promise<boolean> {
  try {
    const roleData = await getUserOrganizationRole(organizationId);
    
    if (!roleData.success || !roleData.role) {
      return false;
    }

    const permissions = roleData.role.permissions;

    // Check for "all" permission (Admin)
    if (permissions.all === true) {
      return true;
    }

    // Parse permission path (e.g., "content.create" -> permissions.content.create)
    const parts = permission.split('.');
    let current = permissions;

    for (const part of parts) {
      if (current[part] === undefined) {
        return false;
      }
      current = current[part];
    }

    return current === true;
  } catch (error: any) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Helper function to get user's primary organization
 */
export async function getPrimaryOrganization() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userError) throw userError;

    if (!userData.organization_id) {
      return {
        success: true,
        organization: null,
      };
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single();

    if (orgError) throw orgError;

    return {
      success: true,
      organization: orgData,
    };
  } catch (error: any) {
    console.error('Error fetching primary organization:', error);
    return {
      success: false,
      error: error.message,
      organization: null,
    };
  }
}

