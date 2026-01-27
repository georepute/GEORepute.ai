import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { exchangeWordPressCode, verifyWordPressConnection, getWordPressSites } from "@/lib/integrations/wordpress";

/**
 * WordPress.com OAuth Callback
 * Handles the OAuth redirect from WordPress.com after user authorization
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

    // Handle error from WordPress.com
    if (error) {
      console.error("WordPress.com OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing OAuth parameters:", { code: !!code, state: !!state });
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("Missing authorization parameters")}`
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // User not logged in - redirect to login with return URL
      return NextResponse.redirect(
        `${baseUrl}/login?returnUrl=${encodeURIComponent("/dashboard/settings?tab=integrations")}`
      );
    }

    // Verify state matches what we stored (CSRF protection)
    const { data: pendingIntegration, error: fetchError } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress")
      .maybeSingle();

    console.log("Fetched pending integration:", {
      found: !!pendingIntegration,
      hasMetadata: !!pendingIntegration?.metadata,
      storedState: pendingIntegration?.metadata?.oauth_state?.substring(0, 20),
      receivedState: state?.substring(0, 20),
      fetchError: fetchError?.message,
    });

    if (!pendingIntegration) {
      console.error("No pending integration found for user:", session.user.id);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("No pending connection found. Please try again.")}`
      );
    }

    if (pendingIntegration.metadata?.oauth_state !== state) {
      console.error("State mismatch:", {
        stored: pendingIntegration?.metadata?.oauth_state,
        received: state,
      });
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("Invalid state parameter. Please try again.")}`
      );
    }

    // Get WordPress.com credentials
    const clientId = process.env.WORDPRESS_CLIENT_ID;
    const clientSecret = process.env.WORDPRESS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("WordPress.com credentials not configured");
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("WordPress.com app not configured")}`
      );
    }

    // Get redirect URI
    const redirectUri = `${baseUrl}/api/auth/wordpress/callback`;

    // Exchange code for access token
    const tokenResult = await exchangeWordPressCode(clientId, clientSecret, redirectUri, code);

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error("Token exchange failed:", tokenResult.error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(tokenResult.error || "Failed to get access token")}`
      );
    }

    // Verify the connection and get user info
    const verifyResult = await verifyWordPressConnection(tokenResult.accessToken);

    if (!verifyResult.success) {
      console.error("Connection verification failed:", verifyResult.error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(verifyResult.error || "Failed to verify connection")}`
      );
    }

    // Get user's sites
    const sitesResult = await getWordPressSites(tokenResult.accessToken);
    const sites = sitesResult.sites || [];
    const primarySite = sites.length > 0 ? sites[0] : null;

    // Update the integration record with the access token
    const { error: updateError } = await supabase
      .from("platform_integrations")
      .update({
        access_token: tokenResult.accessToken,
        platform_user_id: primarySite?.ID?.toString() || tokenResult.blogId || '',
        platform_username: verifyResult.user?.username || verifyResult.user?.display_name || '',
        status: "connected",
        error_message: null,
        metadata: {
          ...pendingIntegration.metadata,
          userId: verifyResult.user?.ID,
          username: verifyResult.user?.username,
          displayName: verifyResult.user?.display_name,
          email: verifyResult.user?.email,
          avatarUrl: verifyResult.user?.avatar_URL,
          blogId: tokenResult.blogId,
          blogUrl: tokenResult.blogUrl,
          siteId: primarySite?.ID,
          siteName: primarySite?.name,
          siteUrl: primarySite?.URL,
          sitesCount: sites.length,
          connected_at: new Date().toISOString(),
          oauth_state: null, // Clear the state
        },
        last_used_at: new Date().toISOString(),
      })
      .eq("id", pendingIntegration.id);

    if (updateError) {
      console.error("Failed to save integration:", updateError);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("Failed to save connection")}`
      );
    }

    console.log("WordPress.com connection successful:", {
      username: verifyResult.user?.username,
      sitesCount: sites.length,
      primarySite: primarySite?.name,
      userId: session.user.id,
    });

    // Redirect to settings with success message
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&success=${encodeURIComponent("WordPress.com connected successfully!")}`
    );
  } catch (error: any) {
    console.error("WordPress.com OAuth callback error:", error);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(error.message || "An unexpected error occurred")}`
    );
  }
}
