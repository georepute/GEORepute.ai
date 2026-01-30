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

    // Get base URL (must match what was used when initiating OAuth)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const baseUrlRaw = isLocalhost
      ? `http://${host}`
      : (process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'https'}://${host}`);
    const baseUrl = baseUrlRaw.replace(/\/+$/, '');

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

    // Try to verify the connection and get user info
    const verifyResult = await verifyWordPressConnection(tokenResult.accessToken);

    // Get user's sites - this might work even if /me fails
    const sitesResult = await getWordPressSites(tokenResult.accessToken);
    const sites = sitesResult.sites || [];
    const primarySite = sites.length > 0 ? sites[0] : null;

    // If both verification and sites fetch failed, return error
    if (!verifyResult.success && !sitesResult.success) {
      console.error("Connection verification failed:", verifyResult.error);
      console.error("Sites fetch also failed:", sitesResult.error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(verifyResult.error || sitesResult.error || "Failed to verify connection")}`
      );
    }

    // Log if verification failed but we can still proceed with sites
    if (!verifyResult.success && sitesResult.success) {
      console.warn("User verification failed but sites fetch succeeded. Proceeding with limited info.");
    }

    // Update the integration record with the access token
    const { error: updateError } = await supabase
      .from("platform_integrations")
      .update({
        access_token: tokenResult.accessToken,
        platform_user_id: primarySite?.ID?.toString() || tokenResult.blogId || '',
        platform_username: verifyResult.user?.username || verifyResult.user?.display_name || primarySite?.name || 'WordPress User',
        status: "connected",
        error_message: null,
        metadata: {
          ...pendingIntegration.metadata,
          userId: verifyResult.user?.ID || null,
          username: verifyResult.user?.username || null,
          displayName: verifyResult.user?.display_name || null,
          email: verifyResult.user?.email || null,
          avatarUrl: verifyResult.user?.avatar_URL || null,
          blogId: tokenResult.blogId,
          blogUrl: tokenResult.blogUrl,
          siteId: primarySite?.ID,
          siteName: primarySite?.name,
          siteUrl: primarySite?.URL,
          sitesCount: sites.length,
          connected_at: new Date().toISOString(),
          oauth_state: null, // Clear the state
          verificationSkipped: !verifyResult.success, // Track if we skipped verification
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
    
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const baseUrlRaw = isLocalhost
      ? `http://${host}`
      : (process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'https'}://${host}`);
    const baseUrl = baseUrlRaw.replace(/\/+$/, '');

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(error.message || "An unexpected error occurred")}`
    );
  }
}
