import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { 
  verifySelfHostedWordPressConnection, 
  getSelfHostedWordPressPosts,
  SelfHostedWordPressConfig 
} from "@/lib/integrations/wordpress";

/**
 * Self-Hosted WordPress Integration API
 * GET: Get user's self-hosted WordPress configuration
 * POST: Connect/verify self-hosted WordPress
 * DELETE: Disconnect self-hosted WordPress
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

    // Get self-hosted WordPress integration from platform_integrations table
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

    // Format config from integration data (don't expose the password)
    const wordpressConfig = {
      siteUrl: integration.metadata?.siteUrl || "",
      siteName: integration.metadata?.siteName || "",
      username: integration.platform_username || "",
      connected: integration.status === "connected",
      connectedAt: integration.created_at,
      lastUsedAt: integration.last_used_at,
      userInfo: integration.metadata?.userInfo || null,
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
    console.error("Self-hosted WordPress config GET error:", error);
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
    const { action, siteUrl, username, applicationPassword } = body;

    // Action: connect - Verify and store credentials
    if (action === "connect") {
      if (!siteUrl || !username || !applicationPassword) {
        return NextResponse.json(
          { error: "Site URL, username, and application password are required" },
          { status: 400 }
        );
      }

      // Verify the connection
      const config: SelfHostedWordPressConfig = {
        siteUrl,
        username,
        applicationPassword,
      };

      const verifyResult = await verifySelfHostedWordPressConnection(config);

      if (!verifyResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: verifyResult.error,
          },
          { status: 400 }
        );
      }

      // Check if integration already exists
      const { data: existingIntegration } = await supabase
        .from("platform_integrations")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress_self_hosted")
        .maybeSingle();

      const integrationData = {
        user_id: session.user.id,
        platform: "wordpress_self_hosted",
        platform_user_id: verifyResult.user?.id?.toString() || "",
        platform_username: username,
        access_token: applicationPassword, // Store application password as access_token
        status: "connected",
        error_message: null,
        metadata: {
          siteUrl: siteUrl,
          siteName: verifyResult.siteInfo?.name || siteUrl,
          siteDescription: verifyResult.siteInfo?.description || "",
          userInfo: {
            id: verifyResult.user?.id,
            name: verifyResult.user?.name,
            username: verifyResult.user?.username,
            avatar: verifyResult.user?.avatar_urls?.['96'] || verifyResult.user?.avatar_urls?.['48'] || null,
          },
          connected_at: new Date().toISOString(),
          type: 'self_hosted',
        },
        last_used_at: new Date().toISOString(),
      };

      // Store or update credentials
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

      console.log("Self-hosted WordPress connection successful:", {
        siteUrl,
        username,
        siteName: verifyResult.siteInfo?.name,
        userId: session.user.id,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Self-hosted WordPress connected successfully!",
          siteInfo: verifyResult.siteInfo,
          userInfo: verifyResult.user,
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
        .eq("platform", "wordpress_self_hosted")
        .maybeSingle();

      if (!integration || !integration.access_token) {
        return NextResponse.json(
          { error: "Self-hosted WordPress not connected" },
          { status: 400 }
        );
      }

      const config: SelfHostedWordPressConfig = {
        siteUrl: integration.metadata?.siteUrl || "",
        username: integration.platform_username || "",
        applicationPassword: integration.access_token,
      };

      const verification = await verifySelfHostedWordPressConnection(config);

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
          siteInfo: verification.siteInfo,
        },
        { status: 200 }
      );
    }

    // Action: get-posts - Get recent posts
    if (action === "get-posts") {
      const { data: integration } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "wordpress_self_hosted")
        .maybeSingle();

      if (!integration || !integration.access_token) {
        return NextResponse.json(
          { error: "Self-hosted WordPress not connected" },
          { status: 400 }
        );
      }

      const config: SelfHostedWordPressConfig = {
        siteUrl: integration.metadata?.siteUrl || "",
        username: integration.platform_username || "",
        applicationPassword: integration.access_token,
      };

      const postsResult = await getSelfHostedWordPressPosts(config, { per_page: 10 });

      if (!postsResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: postsResult.error,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          posts: postsResult.posts,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Self-hosted WordPress POST error:", error);
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

    // Delete self-hosted WordPress integration
    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress_self_hosted");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Self-hosted WordPress disconnected successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Self-hosted WordPress disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
