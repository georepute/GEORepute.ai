import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/google-search-console/status
 * Check GSC connection status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get GSC integration
    const { data: integration, error } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'google_search_console')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!integration) {
      return NextResponse.json({
        connected: false,
        integration: null,
      });
    }

    // Check if token is expired
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    const now = new Date();
    const isExpired = expiresAt && expiresAt < now;

    return NextResponse.json({
      connected: true,
      integration: {
        id: integration.id,
        status: integration.status,
        connected_at: integration.metadata?.connected_at,
        expires_at: integration.expires_at,
        is_expired: isExpired,
      },
    });
  } catch (error: any) {
    console.error('GSC status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check connection status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/google-search-console/status
 * Disconnect GSC integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete integration (will cascade delete domains and analytics)
    const { error } = await supabase
      .from('platform_integrations')
      .delete()
      .eq('user_id', session.user.id)
      .eq('platform', 'google_search_console');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Google Search Console disconnected successfully',
    });
  } catch (error: any) {
    console.error('GSC disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

