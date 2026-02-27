import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * POST /api/organizations/invite
 * Sends an invitation email to a user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { email, organizationId, roleId } = body;

    // Validate required fields
    if (!email || !organizationId || !roleId) {
      return NextResponse.json(
        { error: 'Email, organization ID, and role ID are required' },
        { status: 400 }
      );
    }

    // Use service role for admin operations
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

    // Check if user is admin of the organization
    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .select(`
        *,
        role:roles(name)
      `)
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (orgUserError || !orgUser || orgUser.role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Only organization admins can send invitations' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get role details
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if user already exists and is already a member
    const { data: existingUser } = await supabaseAdmin
      .from('user')
      .select('user_id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const { data: existingMember } = await supabaseAdmin
        .from('organization_users')
        .select('id')
        .eq('user_id', existingUser.user_id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        );
      }
    }

    // Generate secure invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Get inviter's name
    const { data: inviterProfile } = await supabaseAdmin
      .from('user')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Someone';

    // Create invitation token record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitation_tokens')
      .insert({
        organization_id: organizationId,
        email: email,
        role_id: roleId,
        invited_by: user.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation token:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation', details: inviteError.message },
        { status: 500 }
      );
    }

    // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const invitationLink = `${baseUrl}/invite/accept?token=${token}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail(
      email,
      inviterName,
      organization.name,
      invitationLink,
      role.name
    );

    if (!emailResult.success) {
      // Mark invitation as failed (optional: you could delete it)
      console.error('Failed to send email:', emailResult.error);
      // Still return success but log the email error
      // The invitation token is still valid, user can request resend
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expires_at: invitation.expires_at,
        email_sent: emailResult.success,
      },
      message: emailResult.success 
        ? 'Invitation sent successfully' 
        : 'Invitation created but email failed to send',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error sending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/invite?token=xxx
 * Validates an invitation token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

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

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitation_tokens')
      .select(`
        *,
        organization:organizations(name, id),
        role:roles(name, id, description)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabaseAdmin
        .from('invitation_tokens')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        organization: invitation.organization,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    });

  } catch (error: any) {
    console.error('Unexpected error validating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

