import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyLinkedInConfig, LinkedInConfig } from "@/lib/integrations/linkedin";

/**
 * LinkedIn Integration API
 * GET: Get user's LinkedIn configuration
 * DELETE: Disconnect LinkedIn integration
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

    // Get LinkedIn integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "linkedin")
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
    const linkedInConfig = {
      fullName: integration.metadata?.fullName || integration.platform_username || "",
      personUrn: integration.metadata?.personUrn || integration.platform_user_id || "",
      verified: integration.status === "connected",
      expiresAt: integration.expires_at,
      daysUntilExpiration: daysUntilExpiration,
      isExpiringSoon: daysUntilExpiration !== null && daysUntilExpiration <= 7,
      isExpired: expiresAt !== null && expiresAt < now,
    };

    return NextResponse.json(
      {
        success: true,
        config: linkedInConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("LinkedIn config GET error:", error);
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

    // Delete LinkedIn integration
    const { error } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "linkedin");

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: "LinkedIn integration disconnected" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("LinkedIn config DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

