/**
 * Google Analytics 4 OAuth - Callback Handler
 * Handles OAuth response, exchanges code for tokens, and saves to database
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GoogleAnalyticsService } from '@/lib/integrations/google-analytics';

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
      console.log('User denied GA4 authorization:', error);
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
    const redirectUri = `${baseUrl}/api/integrations/google-analytics/callback`;

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
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=unauthorized`, request.url)
      );
    }

    // Get list of GA4 properties (may fail if Analytics Admin API is disabled in Google Cloud)
    let properties: any[] = [];
    let apiDisabled = false;
    const ga4Service = new GoogleAnalyticsService({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date!,
    });

    try {
      console.log('🔍 Fetching GA4 properties...');
      properties = await ga4Service.getProperties();
      console.log(`✅ Found ${properties.length} GA4 properties`);
    } catch (propsError: any) {
      const msg = propsError?.message || String(propsError);
      const is403 = propsError?.code === 403 || propsError?.response?.status === 403;
      const isApiDisabled = is403 || /disabled|has not been used/i.test(msg);
      if (isApiDisabled) {
        console.warn('⚠️ Analytics Admin API disabled or not enabled in project; saving connection anyway.');
        apiDisabled = true;
        properties = [];
      } else {
        throw propsError;
      }
    }

    if (properties.length === 0 && !apiDisabled) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=no_properties`, request.url)
      );
    }

    // Save integration to database (same structure as GSC: tokens in columns, rest in metadata)
    console.log('💾 Saving GA4 integration to database...');
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    const integrationData = {
      user_id: user.id,
      platform: 'google_analytics',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      token_type: 'Bearer',
      status: 'connected',
      metadata: {
        properties,
        selected_property: properties[0] ?? null,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: existingIntegration } = await supabase
      .from('platform_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'google_analytics')
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
        console.error('GA4 database error:', insertError);
        // 23514 = check constraint violation (e.g. platform not in allowed list)
        if (insertError.code === '23514') {
          return NextResponse.redirect(
            new URL(`${returnTo}?error=platform_not_allowed`, request.url)
          );
        }
        throw insertError;
      }
    }

    console.log('✅ GA4 integration saved successfully');

    const returnUrl = new URL(returnTo, request.url);
    returnUrl.searchParams.set('success', 'ga4_connected');
    return NextResponse.redirect(returnUrl);
  } catch (error: any) {
    console.error('❌ GA4 OAuth callback error:', error);
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
