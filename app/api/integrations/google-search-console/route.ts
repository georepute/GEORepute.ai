/**
 * Google Search Console Integration API
 * GET - Check integration status
 * POST - Update site selection
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Get GSC integration status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has connected GSC
    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'google_search_console')
      .single();

    if (!integration) {
      return NextResponse.json({
        connected: false,
        sites: [],
        selectedSite: null,
      });
    }

    // Check if integration is actually connected (status should be 'connected')
    const isConnected = integration.status === 'connected' || integration.status === 'active';

    return NextResponse.json({
      connected: isConnected,
      sites: integration.metadata?.site_urls || [],
      selectedSite: integration.metadata?.selected_site || null,
    });
  } catch (error: any) {
    console.error('GSC status check error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Update GSC site selection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { selectedSite } = await request.json();

    // Get existing integration
    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'google_search_console')
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: 'GSC not connected' },
        { status: 400 }
      );
    }

    // Update selected site
    const { error } = await supabase
      .from('platform_integrations')
      .update({
        metadata: {
          ...integration.metadata,
          selected_site: selectedSite,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', 'google_search_console');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('GSC site selection error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

