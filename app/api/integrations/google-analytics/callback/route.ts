/**
 * Google Analytics 4 OAuth - Callback Handler
 * Handles OAuth response, exchanges code for tokens, and saves to database
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
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
    const returnTo = searchParams.get('return_to') || '/dashboard/settings';

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

    // Initialize OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
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

    // Get list of GA4 properties
    console.log('🔍 Fetching GA4 properties...');
    const ga4Service = new GoogleAnalyticsService({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date!,
    });

    const properties = await ga4Service.getProperties();
    console.log(`✅ Found ${properties.length} GA4 properties`);

    if (properties.length === 0) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=no_properties`, request.url)
      );
    }

    // Save integration to database
    console.log('💾 Saving GA4 integration to database...');
    const { error: dbError } = await supabase
      .from('platform_integrations')
      .upsert({
        user_id: user.id,
        platform: 'google_analytics',
        enabled: true,
        status: 'connected',
        metadata: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date,
          properties: properties,
          selected_property: properties[0], // Default to first property
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('✅ GA4 integration saved successfully');

    // Redirect back to original page with success message
    const returnUrl = new URL(returnTo, request.url);
    returnUrl.searchParams.set('success', 'ga4_connected');
    return NextResponse.redirect(returnUrl);
  } catch (error: any) {
    console.error('❌ GA4 OAuth callback error:', error);
    const returnTo = request.nextUrl.searchParams.get('return_to') || '/dashboard/settings';
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
