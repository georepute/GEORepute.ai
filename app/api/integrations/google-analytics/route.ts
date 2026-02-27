/**
 * Google Analytics 4 Integration API
 * GET - Check integration status
 * DELETE - Disconnect (remove integration)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('platform_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'google_analytics');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Google Analytics 4 disconnected successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GA4 disconnect error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'google_analytics')
      .single();

    if (!integration) {
      return NextResponse.json({
        connected: false,
        propertyName: null,
        propertyCount: 0,
      });
    }

    const isConnected = integration.status === 'connected' || integration.status === 'active';
    const selected = integration.metadata?.selected_property;
    const properties = integration.metadata?.properties || [];

    return NextResponse.json({
      connected: isConnected,
      propertyName: selected?.displayName ?? selected?.name ?? null,
      propertyCount: properties.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GA4 status check error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
