import { NextRequest, NextResponse } from 'next/server';
import { GoogleSearchConsoleClient } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/google-search-console/callback
 * Handles OAuth callback and stores tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      const errorDescription = searchParams.get('error_description') || error;
      
      // Provide user-friendly error messages
      let userMessage = error;
      if (error === 'access_denied') {
        userMessage = 'Access denied. If you are a developer, make sure your email is added as a Test User in Google Cloud Console OAuth consent screen.';
      }
      
      return NextResponse.redirect(
        new URL(`/dashboard/google-search-console?gsc_error=${encodeURIComponent(userMessage)}`, request.url)
      );
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/google-search-console?gsc_error=no_code', request.url)
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(
        new URL('/login?redirect=/dashboard/google-search-console', request.url)
      );
    }

    // Verify state parameter (CSRF protection)
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.userId !== session.user.id) {
          console.error('State user ID mismatch');
          return NextResponse.redirect(
            new URL('/dashboard/google-search-console?gsc_error=invalid_state', request.url)
          );
        }
      } catch (e) {
        console.error('Invalid state parameter:', e);
      }
    }

    // Exchange code for tokens
    const client = new GoogleSearchConsoleClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    });

    const tokens = await client.getTokens(code);

    // Calculate expiration date
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    // Store tokens in Supabase
    const { error: dbError } = await supabase
      .from('platform_integrations')
      .upsert({
        user_id: session.user.id,
        platform: 'google_search_console',
        platform_user_id: null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || 'Bearer',
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope || '',
        status: 'connected',
        metadata: {
          connected_at: new Date().toISOString(),
        },
      }, {
        onConflict: 'user_id,platform',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/dashboard/google-search-console?gsc_error=db_error', request.url)
      );
    }

    // Redirect to google-search-console page with success message
    return NextResponse.redirect(
      new URL('/dashboard/google-search-console?gsc_connected=true', request.url)
    );
  } catch (error: any) {
    console.error('GSC callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/google-search-console?gsc_error=${encodeURIComponent('callback_failed')}`, request.url)
    );
  }
}

