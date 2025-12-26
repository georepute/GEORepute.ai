import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GitHub OAuth Callback
 * Handles the redirect from GitHub after user authorization
 * Exchanges authorization code for access token
 * Gets user info and saves to Supabase
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

    // Get authorization code from GitHub redirect
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const errorDescription = request.nextUrl.searchParams.get("error_description");

    // Handle GitHub OAuth errors
    if (error) {
      console.error("GitHub OAuth error:", { error, errorDescription });
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?github=error&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?github=error&message=No authorization code received",
          request.url
        )
      );
    }

    // Get GitHub OAuth App credentials from environment
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    const redirectUri = `${request.nextUrl.origin}/api/auth/github/callback`;

    if (!clientId || !clientSecret) {
      console.error("GitHub OAuth credentials not configured", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        origin: request.nextUrl.origin,
      });
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?github=error&message=GitHub integration not configured. Please check your environment variables.",
          request.url
        )
      );
    }

    // Detect environment for better error messages
    const isLocalhost = request.nextUrl.origin.includes('localhost') || request.nextUrl.origin.includes('127.0.0.1');
    const environment = isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION';

    console.log("🔄 Exchanging GitHub authorization code for access token...", {
      environment,
      clientId: clientId.substring(0, 4) + "***",
      redirectUri,
      origin: request.nextUrl.origin,
    });
    
    // Log warning with environment-specific instructions
    console.log("⚠️ IMPORTANT: The redirect_uri must EXACTLY match your GitHub OAuth app callback URL");
    console.log("⚠️ Current redirect_uri:", redirectUri);
    if (isLocalhost) {
      console.log("⚠️ DEVELOPMENT: Make sure your LOCAL GitHub OAuth app has this callback URL:", redirectUri);
      console.log("⚠️ Check your .env.local has GITHUB_CLIENT_ID from your LOCAL OAuth app");
    } else {
      console.log("⚠️ PRODUCTION: Make sure your PRODUCTION GitHub OAuth app has this callback URL:", redirectUri);
      console.log("⚠️ Check your Vercel environment variables have GITHUB_CLIENT_ID from your PRODUCTION OAuth app");
    }

    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      
      // Provide more helpful error message for redirect_uri mismatch
      let errorMessage = tokenData.error_description || tokenData.error || "Failed to get access token";
      if (tokenData.error === 'redirect_uri_mismatch' || errorMessage.includes('redirect_uri')) {
        const isLocalhost = request.nextUrl.origin.includes('localhost') || request.nextUrl.origin.includes('127.0.0.1');
        if (isLocalhost) {
          errorMessage = `Redirect URI mismatch. Make sure your LOCAL GitHub OAuth app has this callback URL: ${redirectUri}. Check your .env.local has the LOCAL app's Client ID.`;
        } else {
          errorMessage = `Redirect URI mismatch. Make sure your PRODUCTION GitHub OAuth app has this callback URL: ${redirectUri}. Check your Vercel environment variables have the PRODUCTION app's Client ID.`;
        }
      }
      
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?github=error&message=${encodeURIComponent(errorMessage)}`,
          request.url
        )
      );
    }

    const accessToken = tokenData.access_token;
    const scope = tokenData.scope || "";

    console.log("✅ Got GitHub access token, scopes:", scope);

    // Step 2: Get user information
    console.log("🔍 Getting GitHub user information...");
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GeoRepute-AI",
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error("Failed to get user info:", errorData);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?github=error&message=${encodeURIComponent(errorData.message || "Failed to get user information")}`,
          request.url
        )
      );
    }

    const userData = await userResponse.json();
    const username = userData.login;
    const userId = userData.id.toString();
    const name = userData.name || username;
    const email = userData.email || null;
    const avatarUrl = userData.avatar_url || null;

    console.log("✅ Got GitHub user info:", { username, name, email: email ? "***" : "not provided" });

    // Step 3: Get user's repositories (to allow selecting one)
    console.log("🔍 Getting user's repositories...");
    let repositories: any[] = [];
    try {
      const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "GeoRepute-AI",
        },
      });

      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        repositories = reposData.map((repo: any) => ({
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          default_branch: repo.default_branch || "main",
        }));
        console.log(`✅ Found ${repositories.length} repositories`);
      }
    } catch (repoError: any) {
      console.warn("⚠️ Could not fetch repositories:", repoError.message);
      // Continue without repositories - user can manually enter repo name
    }

    // Step 4: Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "github")
      .maybeSingle();

    // Prepare integration data
    const integrationData = {
      user_id: session.user.id,
      platform: "github",
      access_token: accessToken,
      refresh_token: null, // GitHub OAuth tokens don't have refresh tokens (they don't expire unless revoked)
      expires_at: null, // GitHub OAuth tokens don't expire unless revoked
      platform_user_id: userId,
      platform_username: username,
      metadata: {
        username,
        name,
        email,
        avatarUrl,
        scope,
        repositories, // Store list of repos for selection
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

    // Save or update integration
    if (existingIntegration) {
      const { error: updateError } = await supabase
        .from("platform_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id)
        .eq("user_id", session.user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
      console.log("✅ Updated existing GitHub integration");
    } else {
      const { error: insertError } = await supabase
        .from("platform_integrations")
        .insert(integrationData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      console.log("✅ Created new GitHub integration");
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?github=connected&name=${encodeURIComponent(name || username)}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?github=error&message=${encodeURIComponent(error.message || "An unexpected error occurred")}`,
        request.url
      )
    );
  }
}


