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
    const stateParam = searchParams.get('state');
    
    // Parse state to get return_to
    let returnTo = '/dashboard/google-search-console';
    if (stateParam) {
      try {
        const state = JSON.parse(decodeURIComponent(stateParam));
        returnTo = state.return_to || returnTo;
      } catch (e) {
        console.error('Failed to parse state parameter:', e);
      }
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
    const { error: dbError } = await supabase
      .from('platform_integrations')
      .upsert(
        {
          user_id: user.id,
          platform: 'google_search_console',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: 'Bearer',
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          status: 'connected',
          metadata: {
            site_urls: sites,
            selected_site: sites[0], // Default to first site
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('✅ GSC integration saved successfully');

    // Redirect back to original page with success message
    const returnUrl = new URL(returnTo, request.url);
    returnUrl.searchParams.set('gsc_connected', 'true');
    return NextResponse.redirect(returnUrl);
  } catch (error: any) {
    console.error('❌ GSC OAuth callback error:', error);
    
    // Try to parse state for return_to
    let returnTo = '/dashboard/google-search-console';
    const stateParam = request.nextUrl.searchParams.get('state');
    if (stateParam) {
      try {
        const state = JSON.parse(decodeURIComponent(stateParam));
        returnTo = state.return_to || returnTo;
      } catch (e) {
        console.error('Failed to parse state parameter in error handler:', e);
      }
    }
    
    return NextResponse.redirect(
      new URL(`${returnTo}?gsc_error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
