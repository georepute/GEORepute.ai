import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendInvitationEmail } from '@/lib/email';
import crypto from 'crypto';

/**
 * POST /api/organizations/invite/resend
 * Resends an invitation email (for expired or pending invitations)
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
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
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
        role:roles(name, id)
      `)
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if user is admin of the organization
    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .select(`
        *,
        role:roles(name)
      `)
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .eq('status', 'active')
      .single();

    if (orgUserError || !orgUser || orgUser.role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Only organization admins can resend invitations' },
        { status: 403 }
      );
    }

    // Generate new secure token
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Update invitation with new token and reset status to pending
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin
      .from('invitation_tokens')
      .update({
        token: newToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError || !updatedInvitation) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invitation', details: updateError?.message },
        { status: 500 }
      );
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabaseAdmin
      .from('user')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Someone';

    // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const invitationLink = `${baseUrl}/invite/accept?token=${newToken}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail(
      invitation.email,
      inviterName,
      invitation.organization.name,
      invitationLink,
      invitation.role.name
    );

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      // Still return success but log the email error
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        expires_at: updatedInvitation.expires_at,
        email_sent: emailResult.success,
      },
      message: emailResult.success 
        ? 'Invitation resent successfully' 
        : 'Invitation updated but email failed to send',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error resending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

