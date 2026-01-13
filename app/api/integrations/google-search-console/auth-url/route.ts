import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Get Google Search Console OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("return_to") || "/dashboard/settings";

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/integrations/google-search-console/callback?return_to=${encodeURIComponent(returnTo)}`;
    const scope = "https://www.googleapis.com/auth/webmasters.readonly";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error("Error generating OAuth URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
