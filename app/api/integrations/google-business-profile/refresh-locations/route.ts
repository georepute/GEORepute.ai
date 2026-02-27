/**
 * POST - Fetch locations from Google and update stored integration.
 * Use when connected but "No locations loaded" (e.g. after 429).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { GoogleBusinessProfileService } from '@/lib/integrations/google-business-profile';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: integration, error: fetchError } = await supabase
      .from('platform_integrations')
      .select('id, access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('platform', 'google_business_profile')
      .eq('status', 'connected')
      .single();

    if (fetchError || !integration?.access_token) {
      return NextResponse.json(
        { error: 'Google Business Profile not connected or missing tokens' },
        { status: 400 }
      );
    }

    const expiresAt = integration.expires_at
      ? new Date(integration.expires_at).getTime()
      : 0;

    const gbpService = new GoogleBusinessProfileService({
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token || '',
      expiresAt,
    });

    const locations = await gbpService.getLocations();

    const metadata = {
      locations,
      selected_location: locations[0] ?? null,
    };

    const { error: updateError } = await supabase
      .from('platform_integrations')
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (updateError) {
      console.error('GBP refresh-locations update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save locations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      locations: locations.map((loc: any) => ({
        locationName: loc.locationName ?? loc.title ?? loc.storeName,
        website: loc.website ?? loc.websiteUri,
        address: loc.address,
      })),
    });
  } catch (error: any) {
    const msg = error?.message || String(error);
    const is429 = error?.code === 429 || error?.response?.status === 429;
    console.error('GBP refresh-locations error:', error);
    return NextResponse.json(
      {
        error: is429
          ? 'Google is limiting requests. Wait a minute and try again.'
          : msg,
      },
      { status: is429 ? 429 : 500 }
    );
  }
}
