import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyFacebookConfig, FacebookConfig, getUserPages } from "@/lib/integrations/facebook";

/**
 * Facebook Integration API
 * GET: Get user's Facebook configuration
 * POST: Save/update Facebook configuration
 * DELETE: Disconnect Facebook integration
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Facebook integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "facebook")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!integration) {
      return NextResponse.json(
        {
          success: true,
          config: null,
        },
        { status: 200 }
      );
    }

    // Format config from integration data
    const facebookConfig = {
      email: integration.metadata?.email || integration.platform_username || "",
      pageId: integration.metadata?.pageId || "",
      pageName: integration.metadata?.pageName || "",
      verified: integration.status === "connected",
    };

    return NextResponse.json(
      {
        success: true,
        config: facebookConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Facebook config GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, accessToken, skipVerification } = body;

    console.log("📥 Received Facebook config request:");
    console.log("  - Email:", email ? "provided" : "missing");
    console.log("  - Access Token:", accessToken ? "provided" : "missing");

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access Token is required" },
        { status: 400 }
      );
    }

    const trimmedToken = accessToken.trim();
    let pageAccessToken = trimmedToken;
    let pageId = "";
    let pageName = "";

    // Try to detect token type and get page info
    // First, try to get user's pages (if it's a User Access Token)
    console.log("🔍 Detecting token type and getting page info...");
    const pagesResult = await getUserPages(trimmedToken);
    
    if (pagesResult.success && pagesResult.pages && pagesResult.pages.length > 0) {
      // It's a User Access Token - use first page
      const firstPage = pagesResult.pages[0];
      pageId = firstPage.id;
      pageName = firstPage.name;
      pageAccessToken = firstPage.access_token; // Use page access token from the page
      console.log(`✅ Found ${pagesResult.pages.length} page(s), using first page: ${pageName} (${pageId})`);
    } else {
      // Might be a Page Access Token - try to get page info by testing with a common endpoint
      // We'll try to get user info first to see if token is valid
      try {
        const userInfoResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${trimmedToken}`
        );
        const userInfo = await userInfoResponse.json();
        
        if (userInfo.error) {
          // Token might be invalid or expired
          return NextResponse.json(
            { 
              error: `Invalid access token: ${userInfo.error.message || 'Token validation failed'}`,
              suggestions: [
                "Verify your access token is still valid (tokens expire after ~1 hour)",
                "Get a new token from Facebook Graph API Explorer",
                "Ensure you have the correct permissions (pages_manage_posts, pages_read_engagement, or pages_show_list)"
              ]
            },
            { status: 400 }
          );
        }

        // If getUserPages failed, it might be a Page Access Token
        // Try to get page info by calling the page endpoint with the token
        // We'll try a few common endpoints to detect the page
        try {
          // Try to get page info - if token is a Page Access Token, we can get page details
          // But we need to know the page ID first... 
          // Alternative: Try to get user's accounts again with different permissions
          const accountsResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${trimmedToken}`
          );
          const accountsData = await accountsResponse.json();
          
          if (accountsData.data && accountsData.data.length > 0) {
            // Found pages through accounts endpoint
            const firstPage = accountsData.data[0];
            pageId = firstPage.id;
            pageName = firstPage.name;
            pageAccessToken = firstPage.access_token || trimmedToken;
            console.log(`✅ Found page via /me/accounts: ${pageName} (${pageId})`);
          } else {
            // Still no pages - might be a Page Access Token but we need page ID
            // Try to extract from token or ask user
            return NextResponse.json(
              { 
                error: "Could not automatically detect your Facebook Page. Please ensure:",
                details: pagesResult.error || "No pages found with this token",
                suggestions: [
                  "Use a User Access Token with 'pages_show_list' permission to automatically detect your pages",
                  "Or get a Page Access Token from Facebook Graph API Explorer (select your page when generating token)",
                  "Make sure you have at least one Facebook Page created"
                ]
              },
              { status: 400 }
            );
          }
        } catch (accountsError: any) {
          return NextResponse.json(
            { 
              error: "Could not access your Facebook pages",
              details: accountsError.message || pagesResult.error,
              suggestions: [
                "Verify your access token is valid and not expired",
                "Ensure your token has 'pages_show_list' or 'pages_manage_posts' permission",
                "Get a new token from Facebook Graph API Explorer"
              ]
            },
            { status: 400 }
          );
        }
      } catch (error: any) {
        return NextResponse.json(
          { 
            error: "Failed to validate access token",
            details: error.message
          },
          { status: 400 }
        );
      }
    }

    // Verify Facebook access with the page
    const facebookConfig: FacebookConfig = {
      pageAccessToken: pageAccessToken,
      pageId: pageId,
    };

    // Skip verification if requested (for testing/debugging)
    let verification: { success: boolean; error?: string } = { success: true };
    if (!skipVerification) {
      console.log("🔍 Starting Facebook verification...");
      const startTime = Date.now();
      
      try {
        verification = await Promise.race([
          verifyFacebookConfig(facebookConfig).then((result) => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Facebook verification completed in ${elapsed}s`);
            return result;
          }),
          new Promise<{ success: false; error: string }>((resolve) =>
            setTimeout(() => {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.error(`⏱️ Facebook verification timeout after ${elapsed}s`);
              resolve({ 
                success: false, 
                error: "Verification timeout after 30 seconds. Please check your Page ID and Access Token." 
              });
            }, 30000)
          ),
        ]);
      } catch (verifyError: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ Facebook verification error after ${elapsed}s:`, verifyError);
        verification = {
          success: false,
          error: verifyError.message || "Failed to verify Facebook access",
        };
      }
      
      if (!verification.success) {
        console.error("Facebook verification failed:", verification.error);
        return NextResponse.json(
          { 
            error: verification.error || "Failed to verify Facebook access",
            details: "Please ensure you have a valid Page Access Token (not User Access Token) and correct Page ID.",
            suggestions: [
              "Verify your Page Access Token is still valid (they can expire)",
              "Check that the Page ID matches your Facebook Page",
              "Ensure you have 'pages_manage_posts' permission for the page",
              "You can temporarily skip verification for testing (not recommended for production)"
            ]
          },
          { status: 400 }
        );
      }
    } else {
      console.warn("⚠️ Skipping Facebook verification (skipVerification=true)");
    }

    // Get page name from verification if available (or use the one we got from pages list)
    if ((verification as any).pageInfo?.name) {
      pageName = (verification as any).pageInfo.name;
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "facebook")
      .maybeSingle();

    // Prepare integration data
    // Note: Page Access Tokens can be long-lived (60 days) or short-lived
    // We'll store expires_at as null and let user refresh when needed
    const integrationData = {
      user_id: session.user.id,
      platform: "facebook",
      access_token: pageAccessToken, // Store Page Access Token
      refresh_token: null, // Facebook doesn't use refresh tokens for Page Access Tokens
      expires_at: null, // Page Access Tokens can be long-lived, but we'll let user refresh manually
      platform_user_id: pageId,
      platform_username: email,
      metadata: {
        email: email,
        pageId: pageId,
        pageName: pageName,
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

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

    return NextResponse.json(
      {
        success: true,
        config: {
          email: result.metadata?.email || email,
          pageId: result.metadata?.pageId || pageId,
          pageName: result.metadata?.pageName || pageName,
          verified: result.status === "connected",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Facebook config POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete Facebook integration
    const { error } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "facebook");

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: "Facebook integration disconnected" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Facebook config DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

