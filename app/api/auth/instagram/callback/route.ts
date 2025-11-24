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
    // Instagram uses its own callback URI (must match what's sent in OAuth dialog)
    const redirectUri = `${request.nextUrl.origin}/api/auth/instagram/callback`;

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

    // Step 3: Debug - Check token permissions first
    try {
      console.log("🔍 Checking token permissions...");
      const debugResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/permissions?access_token=${longLivedToken}`
      );
      const debugData = await debugResponse.json();
      console.log("📋 Token permissions:", JSON.stringify(debugData, null, 2));
      
      // Check if pages_show_list is granted
      const hasPagesShowList = debugData.data?.some((perm: any) => 
        perm.permission === 'pages_show_list' && perm.status === 'granted'
      );
      const hasInstagramBasic = debugData.data?.some((perm: any) => 
        (perm.permission === 'instagram_business_basic' || perm.permission === 'instagram_basic') && perm.status === 'granted'
      );
      console.log("✅ Has pages_show_list permission:", hasPagesShowList);
      console.log("✅ Has instagram_business_basic permission:", hasInstagramBasic);
      
      if (!hasPagesShowList) {
        return NextResponse.redirect(
          new URL(
            `/dashboard/settings?instagram=error&message=${encodeURIComponent("Missing 'pages_show_list' permission. Please reconnect and make sure to grant ALL requested permissions, especially 'pages_show_list'.")}`,
            request.url
          )
        );
      }
      
      if (!hasInstagramBasic) {
        console.warn("⚠️ Missing instagram_business_basic permission - this may cause issues");
      }
    } catch (debugError: any) {
      console.warn("⚠️ Could not check permissions:", debugError.message);
    }

    // Step 4: Get user's Facebook pages
    console.log("🔍 Getting user's Facebook pages...");
    console.log("🔑 Using long-lived token (first 20 chars):", longLivedToken.substring(0, 20) + "...");
    
    // First, get user info to verify token works
    try {
      const userInfoResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${longLivedToken}`
      );
      const userInfo = await userInfoResponse.json();
      console.log("👤 User info from token:", JSON.stringify(userInfo, null, 2));
    } catch (e) {
      console.warn("⚠️ Could not get user info:", e);
    }
    
    const pagesResult = await getUserPages(longLivedToken);
    console.log("📊 Pages result:", JSON.stringify({ 
      success: pagesResult.success, 
      pagesCount: pagesResult.pages?.length || 0,
      error: pagesResult.error 
    }, null, 2));

    if (!pagesResult.success) {
      console.error("❌ Failed to get pages:", pagesResult.error);
      
      // If no pages found, provide a more helpful error with troubleshooting steps
      if (pagesResult.error?.includes("No Facebook Pages found")) {
        return NextResponse.redirect(
          new URL(
            `/dashboard/settings?instagram=error&message=${encodeURIComponent("No Facebook Pages found. Troubleshooting: 1) Verify you're Admin (not Editor) of the Page in Page Settings → Page Roles, 2) Make sure the Page is published, 3) Try disconnecting and reconnecting, granting ALL permissions including 'instagram_business_basic'.")}`,
            request.url
          )
        );
      }
      
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram=error&message=${encodeURIComponent(pagesResult.error || "Failed to get Facebook pages. Please ensure you granted 'pages_show_list' permission.")}`,
          request.url
        )
      );
    }

    if (!pagesResult.pages || pagesResult.pages.length === 0) {
      console.error("❌ No pages found in result");
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram=error&message=${encodeURIComponent("No Facebook Pages found. Please verify: 1) You are Admin (not Editor) of the Page, 2) The Page is published, 3) You're using the same Facebook account that owns the Page, 4) Try disconnecting and reconnecting with ALL permissions granted.")}`,
          request.url
        )
      );
    }

    // Step 5: Find page with Instagram Business Account
    console.log(`🔍 Checking ${pagesResult.pages.length} page(s) for Instagram Business Account...`);
    let selectedPage: any = null;
    let instagramAccountId: string | null = null;
    let instagramUsername: string | null = null;

    for (const page of pagesResult.pages) {
      const pageAccessToken = page.access_token || longLivedToken;
      console.log(`📄 Checking page: ${page.name} (ID: ${page.id})`);
      
      try {
        // Check if this page has an Instagram Business Account
        // Try with more fields to get better error messages
        const instagramApiUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,instagram_business_account{id,username}&access_token=${pageAccessToken}`;
        console.log(`📡 Checking Instagram for page ${page.id} (${page.name})...`);
        console.log(`🔑 Using page access token (first 20 chars):`, pageAccessToken.substring(0, 20) + "...");
        
        const instagramResponse = await fetch(instagramApiUrl);

        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json();
          console.log(`📥 Instagram API response for page ${page.id}:`, JSON.stringify(instagramData, null, 2));
          
          if (instagramData.instagram_business_account?.id) {
            console.log(`✅ Found Instagram Business Account: ${instagramData.instagram_business_account.id} on page ${page.name}`);
            selectedPage = page;
            instagramAccountId = instagramData.instagram_business_account.id;
            instagramUsername = instagramData.instagram_business_account.username || null;
            
            // If username not in nested response, get it separately
            if (!instagramUsername) {
              console.log(`🔍 Getting Instagram username separately...`);
              const usernameResponse = await fetch(
                `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`
              );
              
              if (usernameResponse.ok) {
                const usernameData = await usernameResponse.json();
                instagramUsername = usernameData.username;
                console.log(`✅ Instagram username: @${instagramUsername}`);
              } else {
                const usernameError = await usernameResponse.json().catch(() => ({}));
                console.warn(`⚠️ Could not get Instagram username:`, usernameError);
              }
            } else {
              console.log(`✅ Instagram username from nested response: @${instagramUsername}`);
            }
            
            break; // Found a page with Instagram, use it
          } else {
            console.log(`ℹ️ Page ${page.name} does not have an Instagram Business Account connected`);
            console.log(`📋 Full page data:`, JSON.stringify(instagramData, null, 2));
          }
        } else {
          const instagramError = await instagramResponse.json().catch(() => ({}));
          console.error(`❌ Error checking Instagram for page ${page.id}:`, {
            status: instagramResponse.status,
            statusText: instagramResponse.statusText,
            error: instagramError
          });
          
          // If it's a permission error, log it clearly
          if (instagramResponse.status === 200 || instagramError.error?.code === 200) {
            console.error(`❌ Permission error: The access token may not have permission to read Instagram Business Account. Error: ${instagramError.error?.message || 'Unknown'}`);
          }
        }
      } catch (e: any) {
        console.error(`❌ Exception checking page ${page.id}:`, e.message);
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

