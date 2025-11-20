import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getUserPages } from "@/lib/integrations/facebook";

/**
 * Instagram OAuth Callback
 * Handles the redirect from Facebook after user authorization
 * Instagram uses Facebook OAuth, so this is similar to Facebook callback
 * Gets user's Facebook Pages, finds Instagram Business Account, and saves to Supabase
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
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

    // Handle Facebook OAuth errors
    if (error) {
      console.error("Instagram OAuth error:", { error, errorReason, errorDescription });
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram=error&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?instagram=error&message=No authorization code received",
          request.url
        )
      );
    }

    // Get Facebook App credentials from environment (same as Facebook integration)
    const appId = process.env.FACEBOOK_APP_ID?.trim();
    const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI?.trim() || 
      `${request.nextUrl.origin}/api/auth/instagram/callback`;

    if (!appId || !appSecret) {
      console.error("Facebook App credentials not configured", {
        hasAppId: !!appId,
        hasAppSecret: !!appSecret,
      });
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?instagram=error&message=Instagram integration not configured. Please check your environment variables.",
          request.url
        )
      );
    }

    console.log("🔄 Exchanging Instagram authorization code for access token...", {
      appId: appId.substring(0, 4) + "***",
      redirectUri,
    });

    // Step 1: Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "GET",
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram=error&message=${encodeURIComponent(tokenData.error?.message || "Failed to get access token")}`,
          request.url
        )
      );
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
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram=error&message=${encodeURIComponent(pagesResult.error || "No Facebook pages found. Please create a Facebook Page and connect it to your Instagram Business account.")}`,
          request.url
        )
      );
    }

    // Step 4: Find page with Instagram Business Account
    let selectedPage: any = null;
    let instagramAccountId: string | null = null;
    let instagramUsername: string | null = null;

    for (const page of pagesResult.pages) {
      const pageAccessToken = page.access_token || longLivedToken;
      
      try {
        // Check if this page has an Instagram Business Account
        const instagramResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${pageAccessToken}`
        );

        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json();
          
          if (instagramData.instagram_business_account?.id) {
            selectedPage = page;
            instagramAccountId = instagramData.instagram_business_account.id;
            
            // Get Instagram username
            const usernameResponse = await fetch(
              `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`
            );
            
            if (usernameResponse.ok) {
              const usernameData = await usernameResponse.json();
              instagramUsername = usernameData.username;
            }
            
            break; // Found a page with Instagram, use it
          }
        }
      } catch (e) {
        // Continue to next page
        continue;
      }
    }

    if (!selectedPage || !instagramAccountId) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram=error&message=${encodeURIComponent("No Instagram Business Account found. Please ensure: 1) Your Instagram account is a Business account, 2) It's connected to a Facebook Page, 3) You have admin access to that Page.")}`,
          request.url
        )
      );
    }

    const pageAccessToken = selectedPage.access_token || longLivedToken;
    const pageId = selectedPage.id;
    const pageName = selectedPage.name;

    console.log(`✅ Found Instagram Business Account: @${instagramUsername} (${instagramAccountId}) for page: ${pageName} (${pageId})`);

    // Step 5: Calculate expiration time
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Step 6: Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "instagram")
      .maybeSingle();

    // Step 7: Prepare integration data
    const integrationData = {
      user_id: session.user.id,
      platform: "instagram",
      access_token: pageAccessToken, // Store Page Access Token
      refresh_token: null, // Facebook doesn't use refresh tokens
      expires_at: expiresAt,
      platform_user_id: instagramAccountId, // Store Instagram Business Account ID
      platform_username: instagramUsername || session.user.email || "",
      metadata: {
        email: session.user.email || "",
        pageId: pageId,
        pageName: pageName,
        instagramAccountId: instagramAccountId,
        instagramUsername: instagramUsername,
        allPages: pagesResult.pages.map((p: any) => ({
          id: p.id,
          name: p.name,
        })),
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

    // Step 8: Save or update in Supabase
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

    console.log("✅ Instagram integration saved to Supabase");

    // Step 9: Redirect back to settings with success
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?instagram=connected&username=${encodeURIComponent(instagramUsername || pageName)}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error("Instagram OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?instagram=error&message=${encodeURIComponent(error.message || "Unknown error occurred")}`,
        request.url
      )
    );
  }
}

