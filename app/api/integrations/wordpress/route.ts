import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { verifyWordPressConnection, generateWordPressAuthUrl, getWordPressSites } from "@/lib/integrations/wordpress";

/**
 * WordPress.com Integration API
 * GET: Get user's WordPress.com configuration
 * POST: Initiate OAuth flow (generate auth URL)
 * DELETE: Disconnect WordPress.com
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

    // Get WordPress integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress")
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

    // Format config from integration data
    const wordpressConfig = {
      siteId: integration.platform_user_id || "",
      siteName: integration.platform_username || "",
      siteUrl: integration.metadata?.siteUrl || "",
      username: integration.metadata?.username || "",
      connected: integration.status === "connected",
      connectedAt: integration.created_at,
      lastUsedAt: integration.last_used_at,
    };

    return NextResponse.json(
      {
        success: true,
        connected: integration.status === "connected",
        config: wordpressConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("WordPress config GET error:", error);
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
    const { action } = body;

    // Action: initiate - Generate OAuth URL
    if (action === "initiate") {
      const clientId = process.env.WORDPRESS_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { error: "WordPress.com app not configured. Please contact support." },
          { status: 500 }
        );
      }

      // Generate state for CSRF protection
      const state = `${session.user.id}:${Date.now()}:${Math.random().toString(36).substring(7)}`;

      // Check if integration already exists
      const { data: existingIntegration } = await supabase
        .from("platform_integrations")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress")
        .maybeSingle();

      const integrationData = {
        user_id: session.user.id,
        platform: "wordpress",
        status: "disconnected",
        metadata: {
          oauth_state: state,
          initiated_at: new Date().toISOString(),
        },
      };

      // Store state in database for verification on callback
      if (existingIntegration) {
        const { error: updateError } = await supabase
          .from("platform_integrations")
          .update(integrationData)
          .eq("id", existingIntegration.id);
        
        if (updateError) {
          console.error("Failed to update integration:", updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("platform_integrations")
          .insert(integrationData);
        
        if (insertError) {
          console.error("Failed to insert integration:", insertError);
          throw insertError;
        }
      }
      
      console.log("Stored OAuth state for WordPress.com:", { state: state.substring(0, 20) + "..." });

      // Build redirect_uri to match exactly what's registered in WordPress.com app
      // Production (Vercel): set NEXT_PUBLIC_APP_URL=https://geo-repute-ai.vercel.app (no trailing slash)
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const baseUrlRaw = isLocalhost
        ? `http://${host}`
        : (process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'https'}://${host}`);
      const baseUrl = baseUrlRaw.replace(/\/+$/, ''); // strip trailing slash
      const redirectUri = `${baseUrl}/api/auth/wordpress/callback`;

      // Request scopes for auth (user info), posts, media, and sites
      const authUrl = generateWordPressAuthUrl(
        clientId,
        redirectUri,
        state,
        ['auth', 'posts', 'media', 'sites'] // auth scope needed for /me endpoint
      );

      return NextResponse.json(
        {
          success: true,
          authUrl,
        },
        { status: 200 }
      );
    }

    // Action: verify - Verify existing connection
    if (action === "verify") {
      const { data: integration } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress")
        .maybeSingle();

      if (!integration || !integration.access_token) {
        return NextResponse.json(
          { error: "WordPress.com not connected" },
          { status: 400 }
        );
      }

      const verification = await verifyWordPressConnection(integration.access_token);

      if (!verification.success) {
        // Update status to error
        await supabase
          .from("platform_integrations")
          .update({
            status: "error",
            error_message: verification.error,
          })
          .eq("id", integration.id);

        return NextResponse.json(
          { 
            success: false, 
            error: verification.error,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          user: verification.user,
        },
        { status: 200 }
      );
    }

    // Action: get-sites - Get user's WordPress.com sites
    if (action === "get-sites") {
      const { data: integration } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress")
        .maybeSingle();

      if (!integration || !integration.access_token) {
        return NextResponse.json(
          { error: "WordPress.com not connected" },
          { status: 400 }
        );
      }

      const sitesResult = await getWordPressSites(integration.access_token);

      if (!sitesResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: sitesResult.error,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          sites: sitesResult.sites,
        },
        { status: 200 }
      );
    }

    // Action: select-site - Select a specific site for publishing
    if (action === "select-site") {
      const { siteId, siteName, siteUrl } = body;

      if (!siteId) {
        return NextResponse.json(
          { error: "Site ID is required" },
          { status: 400 }
        );
      }

      const { data: integration } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress")
        .maybeSingle();

      if (!integration) {
        return NextResponse.json(
          { error: "WordPress.com not connected" },
          { status: 400 }
        );
      }

      // Update the selected site
      const { error: updateError } = await supabase
        .from("platform_integrations")
        .update({
          platform_user_id: siteId.toString(),
          platform_username: siteName,
          metadata: {
            ...integration.metadata,
            siteId,
            siteName,
            siteUrl,
            selected_at: new Date().toISOString(),
          },
        })
        .eq("id", integration.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json(
        {
          success: true,
          message: "Site selected successfully",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("WordPress POST error:", error);
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

    // Delete WordPress integration
    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "WordPress.com disconnected successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("WordPress disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
