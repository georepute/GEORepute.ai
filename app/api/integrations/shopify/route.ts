import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { verifyShopifyConnection, generateShopifyAuthUrl } from "@/lib/integrations/shopify";

/**
 * Shopify Integration API
 * GET: Get user's Shopify configuration
 * POST: Initiate OAuth flow (generate auth URL)
 * DELETE: Disconnect Shopify
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

    // Get Shopify integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "shopify")
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
    const shopifyConfig = {
      shopDomain: integration.metadata?.shopDomain || integration.platform_user_id || "",
      shopName: integration.platform_username || integration.metadata?.shopName || "",
      connected: integration.status === "connected",
      connectedAt: integration.created_at,
      lastUsedAt: integration.last_used_at,
    };

    return NextResponse.json(
      {
        success: true,
        connected: integration.status === "connected",
        config: shopifyConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Shopify config GET error:", error);
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
    const { action, shopDomain } = body;

    // Action: initiate - Generate OAuth URL
    if (action === "initiate") {
      if (!shopDomain) {
        return NextResponse.json(
          { error: "Shop domain is required" },
          { status: 400 }
        );
      }

      const clientId = process.env.SHOPIFY_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { error: "Shopify app not configured. Please contact support." },
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
        .eq("platform", "shopify")
        .maybeSingle();

      const integrationData = {
        user_id: session.user.id,
        platform: "shopify",
        status: "disconnected", // Use 'disconnected' during OAuth flow (allowed: connected, disconnected, expired, error)
        metadata: {
          shopDomain,
          oauth_state: state,
          initiated_at: new Date().toISOString(),
        },
      };

      // Store state in database for verification on callback
      if (existingIntegration) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("platform_integrations")
          .update(integrationData)
          .eq("id", existingIntegration.id);
        
        if (updateError) {
          console.error("Failed to update integration:", updateError);
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("platform_integrations")
          .insert(integrationData);
        
        if (insertError) {
          console.error("Failed to insert integration:", insertError);
          throw insertError;
        }
      }
      
      console.log("Stored OAuth state for Shopify:", { state: state.substring(0, 20) + "...", shopDomain });

      // Get base URL from request
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
      const redirectUri = `${baseUrl}/api/auth/shopify/callback`;

      const authUrl = generateShopifyAuthUrl(
        shopDomain,
        clientId,
        redirectUri,
        state,
        ['read_content', 'write_content']
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
        .eq("platform", "shopify")
        .maybeSingle();

      if (!integration || !integration.access_token) {
        return NextResponse.json(
          { error: "Shopify not connected" },
          { status: 400 }
        );
      }

      const verification = await verifyShopifyConnection({
        accessToken: integration.access_token,
        shopDomain: integration.metadata?.shopDomain || integration.platform_user_id,
      });

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
          shopName: verification.shopName,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Shopify POST error:", error);
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

    // Delete Shopify integration
    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "shopify");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Shopify disconnected successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Shopify disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
