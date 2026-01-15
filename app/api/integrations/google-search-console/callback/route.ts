/**
 * Google Search Console OAuth - Callback Handler
 * Handles OAuth response, exchanges code for tokens, and saves to database
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GoogleSearchConsoleService } from '@/lib/integrations/google-search-console';

/**
 * GET - OAuth callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    // Parse return_to from state parameter (passed during OAuth initiation)
    let returnTo = '/dashboard/settings';
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        returnTo = stateData.return_to || returnTo;
      } catch (e) {
        console.log('Could not parse state, using default returnTo');
      }
    }
    
    // Fallback to query parameter if state is not available (for backward compatibility)
    if (!state) {
      returnTo = searchParams.get('return_to') || returnTo;
    }

    // Handle user denial
    if (error) {
      console.log('User denied GSC authorization:', error);
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

    // Get list of verified sites
    console.log('🔍 Fetching verified sites from GSC...');
    const gscService = new GoogleSearchConsoleService({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date!,
    });

    const sites = await gscService.getVerifiedSites();
    console.log(`✅ Found ${sites.length} verified sites`);

    if (sites.length === 0) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=no_verified_sites`, request.url)
      );
    }

    // Save integration to database
    console.log('💾 Saving GSC integration to database...');
    
    // Calculate expiration time
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default to 1 hour if not provided
    
    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('platform_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'google_search_console')
      .maybeSingle();

    // Prepare integration data
    const integrationData = {
      user_id: user.id,
      platform: 'google_search_console',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      token_type: 'Bearer',
      status: 'connected',
      metadata: {
        site_urls: sites,
        selected_site: sites[0], // Default to first site
      },
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data, error: updateError } = await supabase
        .from('platform_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select()
        .single();

      if (updateError) {
        console.error('Database error:', updateError);
        throw updateError;
      }
      result = data;
    } else {
      // Create new integration
      const { data, error: insertError } = await supabase
        .from('platform_integrations')
        .insert(integrationData)
        .select()
        .single();

      if (insertError) {
        console.error('Database error:', insertError);
        throw insertError;
      }
      result = data;
    }

    console.log('✅ GSC integration saved successfully');

    // Redirect back to original page with success message
    const returnUrl = new URL(returnTo, request.url);
    returnUrl.searchParams.set('success', 'gsc_connected');
    return NextResponse.redirect(returnUrl);
  } catch (error: any) {
    console.error('❌ GSC OAuth callback error:', error);
    const returnTo = request.nextUrl.searchParams.get('return_to') || '/dashboard/settings';
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
