/**
 * Google Business Profile Integration API
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
    const supabase = createServerSupabaseClient();
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
        locationWebsite: null,
        locationCount: 0,
        locations: [],
      });
    }

    const isConnected = integration.status === 'connected' || integration.status === 'active';
    const selected = integration.metadata?.selected_location;
    const locations = integration.metadata?.locations || [];

    return NextResponse.json({
      connected: isConnected,
      locationName: selected?.locationName ?? selected?.title ?? selected?.storeName ?? null,
      locationWebsite: selected?.website ?? selected?.websiteUri ?? null,
      locationCount: locations.length,
      locations: locations.map((loc: any) => ({
        locationName: loc.locationName ?? loc.title ?? loc.storeName,
        website: loc.website ?? loc.websiteUri,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GBP status check error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
