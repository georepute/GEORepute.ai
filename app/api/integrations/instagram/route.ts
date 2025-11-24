import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { verifyInstagramConfig, InstagramConfig } from "@/lib/integrations/instagram";

/**
 * Instagram Integration API
 * GET: Get user's Instagram configuration
 * DELETE: Disconnect Instagram integration
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Instagram integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "instagram")
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

    // Check if token is expired or expiring soon
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    const now = new Date();
    const daysUntilExpiration = expiresAt 
      ? Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Format config from integration data
    const instagramConfig = {
      username: integration.metadata?.instagramUsername || integration.platform_username || "",
      instagramAccountId: integration.metadata?.instagramAccountId || integration.platform_user_id || "",
      pageName: integration.metadata?.pageName || "",
      pageId: integration.metadata?.pageId || "",
      verified: integration.status === "connected",
      expiresAt: integration.expires_at,
      daysUntilExpiration: daysUntilExpiration,
      isExpiringSoon: daysUntilExpiration !== null && daysUntilExpiration <= 7,
      isExpired: expiresAt !== null && expiresAt < now,
    };

    return NextResponse.json(
      {
        success: true,
        config: instagramConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Instagram config GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete Instagram integration
    const { error } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "instagram");

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: "Instagram integration disconnected" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Instagram config DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

