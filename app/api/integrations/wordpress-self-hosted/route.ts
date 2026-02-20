import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  verifySelfHostedWordPress,
  normalizeSelfHostedSiteUrl,
} from "@/lib/integrations/wordpress";

/**
 * Self-Hosted WordPress Integration API
 * GET: Get user's self-hosted WordPress config (site URL, username - never password)
 * POST: Connect - verify credentials and store
 * DELETE: Disconnect
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

    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress_self_hosted")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!integration) {
      return NextResponse.json(
        {
          success: true,
          connected: false,
          config: null,
        },
        { status: 200 }
      );
    }

    const config = {
      siteUrl: integration.metadata?.siteUrl || integration.platform_user_id || "",
      username: integration.platform_username || integration.metadata?.username || "",
      connected: integration.status === "connected",
      connectedAt: integration.created_at,
    };

    return NextResponse.json(
      {
        success: true,
        connected: integration.status === "connected",
        config,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("WordPress self-hosted config GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { siteUrl, username, applicationPassword } = body;

    if (!siteUrl || !username || !applicationPassword) {
      return NextResponse.json(
        { error: "Site URL, username, and Application Password are required" },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeSelfHostedSiteUrl(siteUrl);
    if (!normalizedUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Site URL must use HTTPS" },
        { status: 400 }
      );
    }

    const verification = await verifySelfHostedWordPress({
      siteUrl: normalizedUrl,
      username: username.trim(),
      applicationPassword: applicationPassword.trim(),
    });

    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Verification failed" },
        { status: 400 }
      );
    }

    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress_self_hosted")
      .maybeSingle();

    const integrationData = {
      user_id: session.user.id,
      platform: "wordpress_self_hosted",
      platform_user_id: normalizedUrl,
      platform_username: username.trim(),
      access_token: applicationPassword.trim(),
      status: "connected",
      metadata: {
        siteUrl: normalizedUrl,
        username: username.trim(),
        verified_at: new Date().toISOString(),
      },
    };

    if (existingIntegration) {
      const { error: updateError } = await supabase
        .from("platform_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("platform_integrations")
        .insert(integrationData);

      if (insertError) throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Self-hosted WordPress connected successfully",
        user: verification.user,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("WordPress self-hosted POST error:", error);
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

    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress_self_hosted");

    if (deleteError) throw deleteError;

    return NextResponse.json(
      {
        success: true,
        message: "Self-hosted WordPress disconnected successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("WordPress self-hosted disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
