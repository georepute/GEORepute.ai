import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { verifyRedditConfig, RedditConfig } from "@/lib/integrations/reddit";

/**
 * Reddit Integration API
 * GET: Get user's Reddit configuration
 * POST: Save/update Reddit configuration
 * PUT: Test Reddit connection
 * DELETE: Disconnect Reddit integration
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

    // Get Reddit integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "reddit")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
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

    // Format config from integration data
    const redditConfig = {
      clientId: integration.metadata?.clientId || "",
      clientSecret: integration.metadata?.clientSecret || "",
      accessToken: integration.access_token || "",
      username: integration.platform_username || integration.platform_user_id || "",
      verified: integration.status === "connected",
    };

    return NextResponse.json(
      {
        success: true,
        config: redditConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reddit config GET error:", error);
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
    const { clientId, clientSecret, accessToken, username } = body;

    // Validate required fields
    if (!clientId || !clientSecret || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, clientSecret, accessToken" },
        { status: 400 }
      );
    }

    // Verify Reddit access
    const redditConfig: RedditConfig = {
      clientId,
      clientSecret,
      accessToken,
      username: username || undefined,
    };

    const verification = await verifyRedditConfig(redditConfig);
    
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Failed to verify Reddit access" },
        { status: 400 }
      );
    }

    // Get username from verification if not provided
    const verifiedUsername = verification.user?.name || username || "";

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "reddit")
      .maybeSingle();

    // Prepare integration data matching the table schema
    // Note: Access tokens expire after ~1 hour, user will need to update periodically
    const integrationData = {
      user_id: session.user.id,
      platform: "reddit",
      access_token: accessToken, // Store access token directly
      refresh_token: null, // Not using refresh token
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // Access tokens expire in ~1 hour
      platform_user_id: verifiedUsername,
      platform_username: verifiedUsername,
      metadata: {
        clientId,
        clientSecret, // Store securely
        username: verifiedUsername,
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null, // Clear any previous errors
      last_used_at: new Date().toISOString(),
    };

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data, error: updateError } = await supabase
        .from("platform_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error details:", {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          integrationData,
        });
        throw updateError;
      }
      result = data;
    } else {
      // Create new integration
      const { data, error: insertError } = await supabase
        .from("platform_integrations")
        .insert(integrationData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error details:", {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          integrationData,
        });
        throw insertError;
      }
      result = data;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Reddit configuration saved successfully",
        config: {
          clientId,
          username: verifiedUsername,
          verified: true,
        },
        integration: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reddit config POST error:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    
    // Return detailed error information
    const errorMessage = error.message || "Internal server error";
    const errorDetails = {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: errorMessage,
    };
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
      },
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

    // Delete Reddit integration
    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "reddit");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Reddit integration disconnected successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reddit disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, clientSecret, accessToken } = body;

    if (!clientId || !clientSecret || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, clientSecret, accessToken" },
        { status: 400 }
      );
    }

    // Test Reddit connection
    const redditConfig: RedditConfig = {
      clientId,
      clientSecret,
      accessToken,
    };

    const verification = await verifyRedditConfig(redditConfig);

    return NextResponse.json(
      {
        success: verification.success,
        error: verification.error,
        user: verification.user,
      },
      { status: verification.success ? 200 : 400 }
    );
  } catch (error: any) {
    console.error("Reddit test error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

