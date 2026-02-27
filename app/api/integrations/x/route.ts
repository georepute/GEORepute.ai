import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * X (Twitter) Integration API
 * GET: Status and username
 * DELETE: Disconnect (optionally revoke token at X)
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

    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("id, platform_username, platform_user_id, status, metadata")
      .eq("user_id", session.user.id)
      .eq("platform", "x")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!integration) {
      return NextResponse.json({
        success: true,
        connected: false,
        config: null,
      });
    }

    return NextResponse.json({
      success: true,
      connected: integration.status === "connected",
      config: {
        username: integration.platform_username || integration.metadata?.username,
        userId: integration.platform_user_id || integration.metadata?.id,
        verified: integration.status === "connected",
      },
    });
  } catch (error: any) {
    console.error("X integration GET error:", error);
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

    const { data: integration } = await supabase
      .from("platform_integrations")
      .select("id, access_token")
      .eq("user_id", session.user.id)
      .eq("platform", "x")
      .maybeSingle();

    if (integration?.access_token) {
      const clientId = process.env.X_CLIENT_ID || process.env.NEXT_PUBLIC_X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;
      try {
        const revokeBody = new URLSearchParams({
          token: integration.access_token,
          token_type_hint: "access_token",
        });
        const headers: Record<string, string> = {
          "Content-Type": "application/x-www-form-urlencoded",
        };
        if (clientId && clientSecret) {
          headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
        } else if (clientId) {
          revokeBody.set("client_id", clientId);
        }
        await fetch("https://api.x.com/2/oauth2/revoke", {
          method: "POST",
          headers,
          body: revokeBody.toString(),
        });
      } catch (e) {
        console.warn("X revoke token failed (non-fatal):", e);
      }
    }

    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "x");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("X integration DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
