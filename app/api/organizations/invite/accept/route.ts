import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/organizations/invite/accept
 * Accepts an invitation and adds user to organization
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to accept the invitation.' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitation_tokens')
      .select(`
        *,
        organization:organizations(name, id),
        role:roles(id, name)
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
      await supabaseAdmin
        .from('invitation_tokens')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Verify user email matches invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation was sent to ${invitation.email}. Please log in with that email address.` },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .eq('status', 'active')
      .single();

    if (existingMember) {
      // Mark invitation as accepted anyway
      await supabaseAdmin
        .from('invitation_tokens')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this organization',
      });
    }

    // Add user to organization
    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .insert({
        user_id: user.id,
        organization_id: invitation.organization_id,
        role_id: invitation.role_id,
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (orgUserError) {
      console.error('Error adding user to organization:', orgUserError);
      return NextResponse.json(
        { error: 'Failed to add user to organization', details: orgUserError.message },
        { status: 500 }
      );
    }

    // Update user's primary organization if they don't have one
    const { data: userProfile } = await supabaseAdmin
      .from('user')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userProfile && !userProfile.organization_id) {
      await supabaseAdmin
        .from('user')
        .update({ organization_id: invitation.organization_id })
        .eq('user_id', user.id);
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('invitation_tokens')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Get user's name for welcome email
    const { data: userData } = await supabaseAdmin
      .from('user')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const userName = userData?.full_name || user.email || 'there';

    // Send welcome email (non-blocking)
    sendWelcomeEmail(
      user.email!,
      userName,
      invitation.organization.name
    ).catch(err => {
      console.error('Failed to send welcome email:', err);
      // Don't fail the request if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      organization: invitation.organization,
      role: invitation.role,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

