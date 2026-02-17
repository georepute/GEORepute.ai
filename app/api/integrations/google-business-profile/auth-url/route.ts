import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Get Google Business Profile OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("return_to") || "/dashboard/settings";

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json(
        { error: "Google OAuth not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID to .env.local." },
        { status: 500 }
      );
    }

    // Redirect URI must match EXACTLY what's in Google Cloud Console (no query params)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/integrations/google-business-profile/callback`;
    const scope = "https://www.googleapis.com/auth/business.manage";
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
