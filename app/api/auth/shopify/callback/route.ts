import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { exchangeShopifyCode, verifyShopifyConnection } from "@/lib/integrations/shopify";

/**
 * Shopify OAuth Callback
 * Handles the OAuth redirect from Shopify after user authorization
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;

    // Handle error from Shopify
    if (error) {
      console.error("Shopify OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    // Validate required parameters
    if (!code || !shop || !state) {
      console.error("Missing OAuth parameters:", { code: !!code, shop: !!shop, state: !!state });
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("Missing authorization parameters")}`
      );
    }

    const supabase = createServerSupabaseClient();

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
      .eq("platform", "shopify")
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
        metadata: pendingIntegration?.metadata,
      });
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("Invalid state parameter. Please try again.")}`
      );
    }

    // Get Shopify credentials
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Shopify credentials not configured");
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent("Shopify app not configured")}`
      );
    }

    // Exchange code for access token
    const tokenResult = await exchangeShopifyCode(shop, clientId, clientSecret, code);

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error("Token exchange failed:", tokenResult.error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(tokenResult.error || "Failed to get access token")}`
      );
    }

    // Verify the connection and get shop info
    const verifyResult = await verifyShopifyConnection({
      accessToken: tokenResult.accessToken,
      shopDomain: shop,
    });

    if (!verifyResult.success) {
      console.error("Connection verification failed:", verifyResult.error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(verifyResult.error || "Failed to verify connection")}`
      );
    }

    // Update the integration record with the access token
    const { error: updateError } = await supabase
      .from("platform_integrations")
      .update({
        access_token: tokenResult.accessToken,
        platform_user_id: shop,
        platform_username: verifyResult.shopName || shop,
        status: "connected",
        error_message: null,
        metadata: {
          ...pendingIntegration.metadata,
          shopDomain: shop,
          shopName: verifyResult.shopName,
          scopes: tokenResult.scope,
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

    console.log("Shopify connection successful:", {
      shop,
      shopName: verifyResult.shopName,
      userId: session.user.id,
    });

    // Redirect to settings with success message
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&success=${encodeURIComponent("Shopify connected successfully!")}`
    );
  } catch (error: any) {
    console.error("Shopify OAuth callback error:", error);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=integrations&error=${encodeURIComponent(error.message || "An unexpected error occurred")}`
    );
  }
}
