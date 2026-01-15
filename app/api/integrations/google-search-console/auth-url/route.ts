import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Get Google Search Console OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("return_to") || "/dashboard/google-search-console";

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/integrations/google-search-console/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/siteverification', // Required for domain verification
      'https://www.googleapis.com/auth/webmasters', // Required for adding sites to GSC
    ];
    const scope = scopes.join(' ');
    
    // Use state parameter to pass return_to
    const state = encodeURIComponent(JSON.stringify({ return_to: returnTo }));
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error("Error generating OAuth URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
