import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import crypto from "crypto";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const PKCE_COOKIE_NAME = "x_oauth_pkce";
const PKCE_COOKIE_MAX_AGE = 600; // 10 minutes

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * GET - Get X (Twitter) OAuth 2.0 authorization URL with PKCE
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

    const clientId = process.env.X_CLIENT_ID || process.env.NEXT_PUBLIC_X_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "X OAuth not configured. Add X_CLIENT_ID to .env.local." },
        { status: 500 }
      );
    }

    const returnTo =
      request.nextUrl.searchParams.get("return_to") || "/dashboard/settings?tab=integrations";
    const state = crypto.randomBytes(24).toString("hex");
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const redirectUri = `${origin.replace(/\/$/, "")}/api/auth/x/callback`;

    const scope = "tweet.read tweet.write users.read offline.access";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${X_AUTHORIZE_URL}?${params.toString()}`;

    const cookieStore = await cookies();
    cookieStore.set(PKCE_COOKIE_NAME, JSON.stringify({ state, code_verifier: codeVerifier, return_to: returnTo }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PKCE_COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error("X auth-url error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate X auth URL" },
      { status: 500 }
    );
  }
}
