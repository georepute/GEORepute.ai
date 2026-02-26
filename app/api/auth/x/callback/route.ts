import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getXCurrentUser } from "@/lib/integrations/x";

const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const PKCE_COOKIE_NAME = "x_oauth_pkce";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(new URL("/login?error=session_expired", request.nextUrl.origin));
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const errorParam = request.nextUrl.searchParams.get("error");
    const errorDescription = request.nextUrl.searchParams.get("error_description");

    const cookieStore = await cookies();
    const pkceCookie = cookieStore.get(PKCE_COOKIE_NAME)?.value;
    cookieStore.delete(PKCE_COOKIE_NAME); // consume once

    let returnBase = new URL("/dashboard/settings?tab=integrations", request.nextUrl.origin);
    let codeVerifier: string | undefined;
    if (pkceCookie) {
      try {
        const pkceData = JSON.parse(pkceCookie) as { code_verifier?: string; return_to?: string; state?: string };
        codeVerifier = pkceData?.code_verifier;
        if (pkceData?.return_to && typeof pkceData.return_to === "string" && pkceData.return_to.startsWith("/")) {
          returnBase = new URL(pkceData.return_to, request.nextUrl.origin);
        }
      } catch {
        // ignore parse error
      }
    }

    if (errorParam) {
      returnBase.searchParams.set("x", "error");
      returnBase.searchParams.set("message", errorDescription || errorParam);
      return NextResponse.redirect(returnBase);
    }

    if (!code || !state) {
      returnBase.searchParams.set("x", "error");
      returnBase.searchParams.set("message", "No authorization code or state received");
      return NextResponse.redirect(returnBase);
    }
    if (!codeVerifier) {
      returnBase.searchParams.set("x", "error");
      returnBase.searchParams.set("message", "Missing PKCE code verifier. Please try connecting again.");
      return NextResponse.redirect(returnBase);
    }

    const clientId = process.env.X_CLIENT_ID || process.env.NEXT_PUBLIC_X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const redirectUri = `${origin.replace(/\/$/, "")}/api/auth/x/callback`;

    if (!clientId) {
      returnBase.searchParams.set("x", "error");
      returnBase.searchParams.set("message", "X integration not configured.");
      return NextResponse.redirect(returnBase);
    }

    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    }

    const tokenRes = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers,
      body: body.toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok) {
      const errMsg = tokenData?.error_description || tokenData?.error || tokenRes.statusText;
      returnBase.searchParams.set("x", "error");
      returnBase.searchParams.set("message", errMsg || "Failed to get access token");
      return NextResponse.redirect(returnBase);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    const userResult = await getXCurrentUser(accessToken);
    const username = userResult.username || userResult.id || "";
    const userId = userResult.id || "";

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { data: existing } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "x")
      .maybeSingle();

    const integrationRow = {
      user_id: session.user.id,
      platform: "x",
      platform_user_id: userId,
      platform_username: username,
      access_token: accessToken,
      refresh_token: refreshToken || null,
      token_type: "Bearer",
      expires_at: expiresAt,
      scope: tokenData.scope || null,
      status: "connected",
      metadata: {
        username: userResult.username,
        name: userResult.name,
        id: userResult.id,
      },
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from("platform_integrations")
        .update(integrationRow)
        .eq("id", existing.id);
    } else {
      await supabase.from("platform_integrations").insert(integrationRow);
    }

    returnBase.searchParams.set("x", "connected");
    if (username) returnBase.searchParams.set("username", username);
    return NextResponse.redirect(returnBase);
  } catch (error: any) {
    console.error("X OAuth callback error:", error);
    const returnBase = new URL("/dashboard/settings?tab=integrations", request.nextUrl.origin);
    returnBase.searchParams.set("x", "error");
    returnBase.searchParams.set("message", error.message || "Unknown error");
    return NextResponse.redirect(returnBase);
  }
}
