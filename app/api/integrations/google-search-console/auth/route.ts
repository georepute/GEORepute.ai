import { NextRequest, NextResponse } from 'next/server';
import { GoogleSearchConsoleClient } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/google-search-console/auth
 * Initiates OAuth flow by returning authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('Missing Google OAuth configuration');
      return NextResponse.json(
        { error: 'Google Search Console integration not configured' },
        { status: 500 }
      );
    }

    // Create GSC client
    const client = new GoogleSearchConsoleClient({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Generate auth URL with state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString('base64');

    const authUrl = client.getAuthUrl(state);

    return NextResponse.json({ 
      success: true,
      authUrl,
    });
  } catch (error: any) {
    console.error('GSC auth initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}

