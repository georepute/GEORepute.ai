import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * LinkedIn OAuth Callback
 * Handles the redirect from LinkedIn after user authorization
 * Exchanges authorization code for access token
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

    // Get authorization code from LinkedIn redirect
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const errorDescription = request.nextUrl.searchParams.get("error_description");
    const state = request.nextUrl.searchParams.get("state");

    // Handle LinkedIn OAuth errors
    if (error) {
      console.error("LinkedIn OAuth error:", { error, errorDescription });
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?linkedin=error&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?linkedin=error&message=No authorization code received",
          request.url
        )
      );
    }

    // Get LinkedIn App credentials from environment
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI?.trim() || 
      `${request.nextUrl.origin}/api/auth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      console.error("LinkedIn App credentials not configured", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?linkedin=error&message=LinkedIn integration not configured. Please check your environment variables.",
          request.url
        )
      );
    }

    console.log("🔄 Exchanging LinkedIn authorization code for access token...", {
      clientId: clientId.substring(0, 4) + "***",
      redirectUri,
    });

    // Step 1: Exchange authorization code for access token
    const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?linkedin=error&message=${encodeURIComponent(tokenData.error_description || tokenData.error || "Failed to get access token")}`,
          request.url
        )
      );
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // Usually 5184000 seconds (60 days)

    console.log("✅ Got LinkedIn access token, expires in:", expiresIn, "seconds");

    // Step 2: Get user's LinkedIn profile info
    // Use OpenID Connect userinfo endpoint or v2/me with projection
    console.log("🔍 Getting user's LinkedIn profile...");
    
    // Try OpenID Connect userinfo endpoint first (works with openid scope)
    let profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    let profileData: any;
    
    // If userinfo fails, try v2/me with projection
    if (!profileResponse.ok) {
      console.log("⚠️ userinfo endpoint failed, trying v2/me with projection...");
      profileResponse = await fetch("https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
    }

    if (!profileResponse.ok) {
      const error = await profileResponse.json().catch(() => ({ error: { message: "Unknown error" } }));
      console.error("Failed to get LinkedIn profile:", error);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?linkedin=error&message=${encodeURIComponent(error.error?.message || error.message || "Failed to get LinkedIn profile. Please ensure you granted profile permissions.")}`,
          request.url
        )
      );
    }

    profileData = await profileResponse.json();
    
    // Handle both userinfo and v2/me response formats
    let personUrn = profileData.sub || profileData.id; // userinfo uses 'sub', v2/me uses 'id'
    
    // Ensure Person URN is in correct format (urn:li:person:xxxxx)
    if (personUrn && !personUrn.startsWith('urn:li:person:')) {
      // If it's just an ID or partial URN, format it correctly
      const personId = personUrn.replace('urn:li:person:', '').trim();
      personUrn = `urn:li:person:${personId}`;
    }
    
    const firstName = profileData.given_name || profileData.localizedFirstName || "";
    const lastName = profileData.family_name || profileData.localizedLastName || "";
    const fullName = profileData.name || `${firstName} ${lastName}`.trim() || "";

    console.log(`✅ Got LinkedIn profile: ${fullName} (${personUrn})`);

    // Step 3: Calculate expiration time (60 days from now)
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // Default to 60 days

    // Step 4: Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "linkedin")
      .maybeSingle();

    // Step 5: Prepare integration data
    const integrationData = {
      user_id: session.user.id,
      platform: "linkedin",
      access_token: accessToken,
      refresh_token: null, // LinkedIn doesn't provide refresh tokens
      expires_at: expiresAt,
      platform_user_id: personUrn,
      platform_username: fullName || session.user.email || "",
      metadata: {
        email: session.user.email || "",
        personUrn: personUrn,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

    // Step 6: Save or update in Supabase
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

    console.log("✅ LinkedIn integration saved to Supabase");

    // Step 7: Redirect back to settings with success
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?linkedin=connected&name=${encodeURIComponent(fullName)}#linkedin-integration`,
        request.url
      )
    );
  } catch (error: any) {
    console.error("LinkedIn OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?linkedin=error&message=${encodeURIComponent(error.message || "Unknown error occurred")}`,
        request.url
      )
    );
  }
}

