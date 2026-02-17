/**
 * Google Business Profile Integration API
 * GET - Check integration status
 * DELETE - Disconnect (remove integration)
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('platform_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'google_business_profile');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Google Business Profile disconnected successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GBP disconnect error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'google_business_profile')
      .single();

    if (!integration) {
      return NextResponse.json({
        connected: false,
        locationName: null,
        locationCount: 0,
      });
    }

    const isConnected = integration.status === 'connected' || integration.status === 'active';
    const selected = integration.metadata?.selected_location;
    const locations = integration.metadata?.locations || [];

    return NextResponse.json({
      connected: isConnected,
      locationName: selected?.title ?? selected?.storeName ?? null,
      locationCount: locations.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GBP status check error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
