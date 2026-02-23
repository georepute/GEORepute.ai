/**
 * Google Business Profile OAuth - Callback Handler
 * Handles OAuth response, exchanges code for tokens, and saves to database
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GoogleBusinessProfileService } from '@/lib/integrations/google-business-profile';

/**
 * GET - OAuth callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    let returnTo = '/dashboard/settings';
    try {
      const stateRaw = searchParams.get('state');
      if (stateRaw) {
        const state = JSON.parse(decodeURIComponent(stateRaw));
        if (state?.return_to) returnTo = state.return_to;
      }
    } catch (_) {}
    if (!searchParams.get('state') && searchParams.get('return_to')) returnTo = searchParams.get('return_to')!;

    // Handle user denial
    if (error) {
      console.log('User denied GBP authorization:', error);
      return NextResponse.redirect(
        new URL(`${returnTo}?error=access_denied`, request.url)
      );
    }

    // Check for authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=missing_code`, request.url)
      );
    }

    // Must match the redirect_uri used in the auth URL (no query params)
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/integrations/google-business-profile/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access tokens');
    }

    console.log('✅ Tokens obtained successfully');

    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=unauthorized`, request.url)
      );
    }

    // Save integration to database first, then try to fetch locations.
    // This avoids losing the connection if the locations API is rate-limited.
    console.log('💾 Saving GBP integration to database...');
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    const integrationData = {
      user_id: user.id,
      platform: 'google_business_profile',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      token_type: 'Bearer',
      status: 'connected',
      metadata: {
        locations: [] as any[],
        selected_location: null,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existingIntegration } = await supabase
      .from('platform_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'google_business_profile')
      .maybeSingle();

    if (existingIntegration) {
      const { error: updateError } = await supabase
        .from('platform_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id);

      if (updateError) {
        console.error('Database error:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('platform_integrations')
        .insert({ ...integrationData, created_at: new Date().toISOString() });

      if (insertError) {
        console.error('GBP database error:', insertError);
        if (insertError.code === '23514') {
          return NextResponse.redirect(
            new URL(`${returnTo}?error=platform_not_allowed`, request.url)
          );
        }
        throw insertError;
      }
    }

    console.log('✅ GBP integration saved successfully');

    // Try to fetch locations now (non-blocking -- if it fails, user can click "Load my business" later)
    const integrationId = existingIntegration?.id;
    try {
      console.log('🔍 Fetching GBP locations...');
      const gbpService = new GoogleBusinessProfileService({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date!,
      });
      const locations = await gbpService.getLocations();
      console.log(`✅ Found ${locations.length} GBP locations`);

      if (locations.length > 0 && integrationId) {
        await supabase
          .from('platform_integrations')
          .update({
            metadata: { locations, selected_location: locations[0] },
            updated_at: new Date().toISOString(),
          })
          .eq('id', integrationId);
      }
    } catch (locError: any) {
      console.warn('⚠️ GBP locations API failed (quota/rate limit). User can click "Load my business" later.', locError?.message);
    }

    // Redirect back to original page with success message
    const returnUrl = new URL(returnTo, request.url);
    returnUrl.searchParams.set('success', 'gbp_connected');
    return NextResponse.redirect(returnUrl);
  } catch (error: any) {
    console.error('❌ GBP OAuth callback error:', error);
    let returnTo = '/dashboard/settings';
    try {
      const stateRaw = request.nextUrl.searchParams.get('state');
      if (stateRaw) {
        const state = JSON.parse(decodeURIComponent(stateRaw));
        if (state?.return_to) returnTo = state.return_to;
      }
    } catch (_) {}
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
