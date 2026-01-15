import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Get Google Search Console OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("return_to") || "/dashboard/settings";

    // Check for required environment variables
    // Use NEXT_PUBLIC_GOOGLE_CLIENT_ID for client-side access, but also check server-side vars
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!googleClientId) {
      console.error("❌ Missing GOOGLE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return NextResponse.json(
        { 
          error: "Google OAuth not configured",
          details: "Missing GOOGLE_CLIENT_ID. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID to your environment variables."
        },
        { status: 500 }
      );
    }

    if (!googleClientSecret) {
      console.error("❌ Missing GOOGLE_CLIENT_SECRET");
      return NextResponse.json(
        { 
          error: "Google OAuth not configured",
          details: "Missing GOOGLE_CLIENT_SECRET. Please add GOOGLE_CLIENT_SECRET to your environment variables."
        },
        { status: 500 }
      );
    }

    // Use provided redirect URI or construct from site URL
    // IMPORTANT: Redirect URI must match EXACTLY what's configured in Google Cloud Console
    // Do NOT include query parameters in the redirect URI
    const baseRedirectUri = googleRedirectUri 
      ? googleRedirectUri
      : `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/integrations/google-search-console/callback`;
    
    // Remove any trailing slashes or query parameters from redirect URI
    const cleanRedirectUri = baseRedirectUri.split('?')[0].replace(/\/$/, '');
    
    const scope = "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters";
    
    // Pass return_to as state parameter (Google will return it in the callback)
    const state = encodeURIComponent(JSON.stringify({ return_to: returnTo }));
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;

    console.log("🔗 Generated GSC OAuth URL:", {
      redirectUri: cleanRedirectUri,
      returnTo: returnTo
    });

    console.log("✅ Generated GSC OAuth URL successfully");
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error("❌ Error generating OAuth URL:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to generate OAuth URL",
        details: "Please check your environment variables and try again."
      },
      { status: 500 }
    );
  }
}
