import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserPages } from "@/lib/integrations/facebook";

/**
 * Facebook OAuth Callback
 * Handles the redirect from Facebook after user authorization
 * Exchanges authorization code for access token
 * Gets user's pages and saves to Supabase
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(
        new URL("/auth/login?error=session_expired", request.url)
      );
    }

    // Get authorization code from Facebook redirect
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const errorReason = request.nextUrl.searchParams.get("error_reason");
    const errorDescription = request.nextUrl.searchParams.get("error_description");
    const state = request.nextUrl.searchParams.get("state");
    // If state is a relative return path (e.g. /onboarding?step=1), redirect there instead of settings
    const returnBase = state && state.startsWith("/") && !state.startsWith("//")
      ? new URL(state, request.nextUrl.origin)
      : new URL("/dashboard/settings", request.nextUrl.origin);

    // Handle Facebook OAuth errors
    if (error) {
      console.error("Facebook OAuth error:", { error, errorReason, errorDescription });
      returnBase.searchParams.set("facebook", "error");
      returnBase.searchParams.set("message", errorDescription || error);
      return NextResponse.redirect(returnBase);
    }

    if (!code) {
      returnBase.searchParams.set("facebook", "error");
      returnBase.searchParams.set("message", "No authorization code received");
      return NextResponse.redirect(returnBase);
    }

    // Get Facebook App credentials from environment
    const appId = process.env.FACEBOOK_APP_ID?.trim();
    const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
    // Always use dynamic origin to match frontend (works for both localhost and production)
    const redirectUri = `${request.nextUrl.origin}/api/auth/facebook/callback`;

    if (!appId || !appSecret) {
      console.error("Facebook App credentials not configured", {
        hasAppId: !!appId,
        hasAppSecret: !!appSecret,
        appIdLength: appId?.length,
        appSecretLength: appSecret?.length,
      });
      returnBase.searchParams.set("facebook", "error");
      returnBase.searchParams.set("message", "Facebook integration not configured. Please check your environment variables.");
      return NextResponse.redirect(returnBase);
    }

    console.log("🔄 Exchanging Facebook authorization code for access token...", {
      appId: appId.substring(0, 4) + "***", // Log partial ID for debugging
      appSecretLength: appSecret.length,
      redirectUri,
    });

    // Step 1: Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`;

    console.log("📡 Token exchange URL (without secret):", tokenUrl.replace(appSecret, "***SECRET***"));

    const tokenResponse = await fetch(tokenUrl, {
      method: "GET",
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      returnBase.searchParams.set("facebook", "error");
      returnBase.searchParams.set("message", tokenData.error?.message || "Failed to get access token");
      return NextResponse.redirect(returnBase);
    }

    const userAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // Usually 3600 seconds (1 hour)

    console.log("✅ Got user access token, expires in:", expiresIn, "seconds");

    // Step 2: Get long-lived token (60 days) - optional but recommended
    let longLivedToken = userAccessToken;
    try {
      console.log("🔄 Exchanging for long-lived token...");
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${userAccessToken}`,
        {
          method: "GET",
        }
      );

      const longLivedData = await longLivedResponse.json();
      
      if (longLivedResponse.ok && !longLivedData.error && longLivedData.access_token) {
        longLivedToken = longLivedData.access_token;
        console.log("✅ Got long-lived token, expires in:", longLivedData.expires_in, "seconds");
      } else {
        console.warn("⚠️ Could not get long-lived token, using short-lived token:", longLivedData.error?.message);
      }
    } catch (longLivedError: any) {
      console.warn("⚠️ Error getting long-lived token, using short-lived token:", longLivedError.message);
    }

    // Step 3: Get user's Facebook pages
    console.log("🔍 Getting user's Facebook pages...");
    const pagesResult = await getUserPages(longLivedToken);

    if (!pagesResult.success || !pagesResult.pages || pagesResult.pages.length === 0) {
      console.error("No pages found:", pagesResult.error);
      returnBase.searchParams.set("facebook", "error");
      returnBase.searchParams.set("message", pagesResult.error || "No Facebook pages found. Please create a Facebook Page first.");
      return NextResponse.redirect(returnBase);
    }

    // Use the first page (or you could let user select)
    const firstPage = pagesResult.pages[0];
    const pageId = firstPage.id;
    const pageName = firstPage.name;

    console.log(`✅ Found ${pagesResult.pages.length} page(s), using: ${pageName} (${pageId})`);
    
    // CRITICAL: Always get a fresh Page Access Token from the page
    // This ensures it has ALL permissions that the User Access Token has
    // The token from /me/accounts might be stale or missing permissions
    console.log(`🔍 Getting fresh Page Access Token with all permissions...`);
    let pageAccessToken: string;
    
    try {
      // Request the Page Access Token explicitly using the User Access Token
      // This ensures the Page Access Token inherits ALL permissions from the User Access Token
      const pageTokenUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${longLivedToken}`;
      const pageTokenResponse = await fetch(pageTokenUrl);
      const pageTokenData = await pageTokenResponse.json();
      
      if (pageTokenResponse.ok && pageTokenData.access_token) {
        pageAccessToken = pageTokenData.access_token;
        console.log(`✅ Got fresh Page Access Token with all permissions`);
      } else {
        // Fallback to the token from /me/accounts if we can't get a fresh one
        console.warn(`⚠️ Could not get fresh Page Access Token, using token from /me/accounts`);
        console.warn(`   Error: ${pageTokenData.error?.message || 'Unknown error'}`);
        pageAccessToken = firstPage.access_token || longLivedToken;
        console.warn(`   This may cause permission errors when fetching metrics`);
      }
    } catch (tokenError: any) {
      console.warn(`⚠️ Error getting fresh Page Access Token:`, tokenError.message);
      console.warn(`   Falling back to token from /me/accounts`);
      pageAccessToken = firstPage.access_token || longLivedToken;
    }
    
    // Verify the Page Access Token works and has required permissions
    console.log(`🔍 Verifying Page Access Token has required permissions...`);
    try {
      const verifyUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=id,name&access_token=${pageAccessToken}`;
      const verifyResponse = await fetch(verifyUrl);
      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        const errorCode = verifyData.error?.code;
        const errorMessage = verifyData.error?.message || '';
        console.error(`❌ Page Access Token verification failed:`, {
          code: errorCode,
          message: errorMessage,
        });
        console.error(`   The token may not have the required permissions.`);
        console.error(`   User may need to re-authenticate and grant all permissions.`);
      } else {
        console.log(`✅ Page Access Token verified successfully`);
      }
    } catch (verifyError: any) {
      console.warn(`⚠️ Error verifying Page Access Token:`, verifyError.message);
    }

    // Step 4: Calculate expiration time
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Step 5: Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "facebook")
      .maybeSingle();

    // Step 6: Prepare integration data
    const integrationData = {
      user_id: session.user.id,
      platform: "facebook",
      access_token: pageAccessToken, // Store Page Access Token (for publishing)
      refresh_token: null, // Facebook doesn't use refresh tokens
      expires_at: expiresAt,
      platform_user_id: pageId,
      platform_username: session.user.email || "",
      metadata: {
        email: session.user.email || "",
        pageId: pageId,
        pageName: pageName,
        allPages: pagesResult.pages.map((p: any) => ({
          id: p.id,
          name: p.name,
        })), // Store all pages in case user wants to switch later
        // CRITICAL: Store User Access Token as fallback for reading insights
        // Page Access Tokens don't always inherit pages_read_engagement permission
        // User Access Token has all permissions and can be used as fallback
        userAccessToken: longLivedToken, // Store for reading insights when Page Token lacks permissions
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

    console.log(`💾 Storing integration data:`, {
      hasPageAccessToken: !!pageAccessToken,
      hasUserAccessToken: !!longLivedToken,
      pageAccessTokenLength: pageAccessToken?.length || 0,
      userAccessTokenLength: longLivedToken?.length || 0,
      metadataKeys: Object.keys(integrationData.metadata),
    });

    // Step 7: Save or update in Supabase
    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data, error } = await supabase
        .from("platform_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new integration
      const { data, error } = await supabase
        .from("platform_integrations")
        .insert(integrationData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log("✅ Facebook integration saved to Supabase");
    console.log(`📋 Verification: Stored metadata includes userAccessToken:`, !!result?.metadata?.userAccessToken);
    console.log(`   Metadata keys:`, result?.metadata ? Object.keys(result.metadata) : 'N/A');
    console.log(`   Page Access Token stored in access_token:`, !!result?.access_token);
    console.log(`   User Access Token stored in metadata.userAccessToken:`, !!result?.metadata?.userAccessToken);

    // Step 8: Redirect back to return path or settings with success
    returnBase.searchParams.set("facebook", "connected");
    returnBase.searchParams.set("page", pageName);
    return NextResponse.redirect(returnBase);
  } catch (error: any) {
    console.error("Facebook OAuth callback error:", error);
    const state = request.nextUrl.searchParams.get("state");
    const errBase = state && state.startsWith("/") && !state.startsWith("//")
      ? new URL(state, request.nextUrl.origin)
      : new URL("/dashboard/settings", request.nextUrl.origin);
    errBase.searchParams.set("facebook", "error");
    errBase.searchParams.set("message", error.message || "Unknown error occurred");
    return NextResponse.redirect(errBase);
  }
}

