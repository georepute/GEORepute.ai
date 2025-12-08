import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * POST /api/organizations
 * Creates a new organization and assigns the current user as admin
 */
export async function POST(request: NextRequest) {
  try {
    // Use regular client for auth
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get organization data from request
    const body = await request.json();
    const { name, description, website } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Create service role client to bypass RLS for administrative operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Create organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        website: website?.trim() || null,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization', details: orgError.message },
        { status: 500 }
      );
    }

    // 2. Get Admin role ID
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'Admin')
      .single();

    if (roleError || !adminRole) {
      console.error('Error fetching admin role:', roleError);
      // Rollback: delete the organization
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Failed to fetch admin role' },
        { status: 500 }
      );
    }

    // 3. Create organization_user record (assign user as admin)
    // Using service role bypasses RLS policies and prevents infinite recursion
    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .insert({
        user_id: user.id,
        organization_id: organization.id,
        role_id: adminRole.id,
        status: 'active',
      })
      .select()
      .single();

    if (orgUserError) {
      console.error('Error creating organization user:', orgUserError);
      // Rollback: delete the organization
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Failed to assign user to organization', details: orgUserError.message },
        { status: 500 }
      );
    }

    // 4. Update user's primary organization_id
    const { error: userUpdateError } = await supabaseAdmin
      .from('user')
      .update({ organization_id: organization.id })
      .eq('user_id', user.id);

    if (userUpdateError) {
      console.error('Error updating user organization:', userUpdateError);
      // Don't rollback, this is not critical
    }

    // Return success with created organization and membership
    return NextResponse.json({
      success: true,
      organization,
      role: 'Admin',
      message: 'Organization created successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error creating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations
 * Gets all organizations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all organizations for this user
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select(`
        *,
        organization:organizations(*),
        role:roles(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (orgUsersError) {
      console.error('Error fetching organizations:', orgUsersError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: orgUsersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organizations: orgUsers,
    });

  } catch (error: any) {
    console.error('Unexpected error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

