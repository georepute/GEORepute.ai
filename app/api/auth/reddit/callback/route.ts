import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * Reddit OAuth Callback
 * Handles the redirect from Reddit after user authorization
 * Exchanges authorization code for access token and refresh token
 * Gets user's profile info and saves to Supabase
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

    // Get authorization code from Reddit redirect
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const state = request.nextUrl.searchParams.get("state");

    // Handle Reddit OAuth errors
    if (error) {
      console.error("Reddit OAuth error:", { error });
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?reddit=error&message=${encodeURIComponent(error || "OAuth authorization failed")}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?reddit=error&message=No authorization code received",
          request.url
        )
      );
    }

    // Get Reddit App credentials from environment
    const clientId = process.env.REDDIT_CLIENT_ID?.trim();
    const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
    // Always use dynamic origin to match frontend (works for both localhost and production)
    const redirectUri = `${request.nextUrl.origin}/api/auth/reddit/callback`;

    if (!clientId || !clientSecret) {
      console.error("Reddit App credentials not configured", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?reddit=error&message=Reddit integration not configured. Please check your environment variables.",
          request.url
        )
      );
    }

    console.log("🔄 Exchanging Reddit authorization code for access token...", {
      clientId: clientId.substring(0, 4) + "***",
      redirectUri,
    });

    // Step 1: Exchange authorization code for access token
    // Reddit uses Basic Authentication with client_id:client_secret
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    
    const tokenUrl = "https://www.reddit.com/api/v1/access_token";
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "web:GeoRepute.ai:1.0.0 (by /u/georepute)",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?reddit=error&message=${encodeURIComponent(tokenData.error || "Failed to get access token")}`,
          request.url
        )
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in; // Usually 3600 seconds (1 hour) for access token
    const tokenType = tokenData.token_type || "bearer";

    console.log("✅ Got Reddit tokens:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresIn,
      tokenType,
    });

    // Step 2: Get user's Reddit profile info
    console.log("🔍 Getting user's Reddit profile...");
    const userAgent = "web:GeoRepute.ai:1.0.0 (by /u/georepute)";
    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": userAgent,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Failed to get Reddit user info:", errorText);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?reddit=error&message=${encodeURIComponent("Failed to get user information from Reddit")}`,
          request.url
        )
      );
    }

    const userData = await userResponse.json();
    const username = userData.name || userData.username || "";

    console.log("✅ Got Reddit user info:", {
      username,
      userId: userData.id,
    });

    // Step 3: Save to Supabase platform_integrations table
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "reddit")
      .maybeSingle();

    const integrationData = {
      user_id: session.user.id,
      platform: "reddit",
      access_token: accessToken,
      refresh_token: refreshToken, // Store refresh token for automatic renewal
      expires_at: expiresAt,
      platform_user_id: username,
      platform_username: username,
      metadata: {
        clientId,
        clientSecret, // Store securely
        username: username,
        verified: true,
        verified_at: new Date().toISOString(),
        token_type: tokenType,
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data, error: updateError } = await supabase
        .from("platform_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
      result = data;
    } else {
      // Create new integration
      const { data, error: insertError } = await supabase
        .from("platform_integrations")
        .insert(integrationData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      result = data;
    }

    console.log("✅ Reddit integration saved successfully");

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?reddit=success&message=${encodeURIComponent(`Connected as u/${username}`)}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error("Reddit OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?reddit=error&message=${encodeURIComponent(error.message || "Failed to connect Reddit account")}`,
        request.url
      )
    );
  }
}

