import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { verifyGitHubConfig, GitHubConfig } from "@/lib/integrations/github";

/**
 * GitHub Integration API
 * GET: Get user's GitHub configuration
 * POST: Save/update GitHub configuration
 * PUT: Test GitHub connection
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

    // Get GitHub integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "github")
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
    const githubConfig = {
      token: integration.access_token,
      owner: integration.metadata?.owner || integration.platform_user_id || "",
      repo: integration.metadata?.repo || "",
      branch: integration.metadata?.branch || "main",
      verified: integration.status === "connected",
      username: integration.platform_username || integration.platform_user_id || "",
      metadata: integration.metadata || {}, // Include full metadata (repositories, etc.)
    };

    return NextResponse.json(
      {
        success: true,
        config: githubConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GitHub config GET error:", error);
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
    const { token, owner, repo, branch } = body;

    // Validate required fields
    if (!token || !owner || !repo) {
      return NextResponse.json(
        { error: "Missing required fields: token, owner, repo" },
        { status: 400 }
      );
    }

    // Verify GitHub access
    const gitHubConfig: GitHubConfig = {
      token,
      owner,
      repo,
      branch: branch || "main",
    };

    const verification = await verifyGitHubConfig(gitHubConfig);
    
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Failed to verify GitHub access" },
        { status: 400 }
      );
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "github")
      .maybeSingle();

    // Prepare integration data matching the table schema
    const integrationData = {
      user_id: session.user.id,
      platform: "github",
      access_token: token,
      refresh_token: null, // Not used for GitHub Personal Access Tokens
      expires_at: null, // Personal Access Tokens don't expire unless revoked
      platform_user_id: owner,
      platform_username: owner,
      metadata: {
        owner,
        repo,
        branch: branch || "main",
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
        message: "GitHub configuration saved successfully",
        config: gitHubConfig,
        integration: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GitHub config POST error:", error);
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

    // Delete GitHub integration
    const { error: deleteError } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "github");

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "GitHub integration disconnected successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GitHub disconnect error:", error);
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
    const { token, owner, repo, branch } = body;

    if (!token || !owner || !repo) {
      return NextResponse.json(
        { error: "Missing required fields: token, owner, repo" },
        { status: 400 }
      );
    }

    // Test GitHub connection
    const gitHubConfig: GitHubConfig = {
      token,
      owner,
      repo,
      branch: branch || "main",
    };

    const verification = await verifyGitHubConfig(gitHubConfig);

    return NextResponse.json(
      {
        success: verification.success,
        error: verification.error,
        repo: verification.repo,
      },
      { status: verification.success ? 200 : 400 }
    );
  } catch (error: any) {
    console.error("GitHub test error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, branch } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing required fields: owner, repo" },
        { status: 400 }
      );
    }

    // Get existing integration
    const { data: existingIntegration, error: fetchError } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "github")
      .maybeSingle();

    if (fetchError || !existingIntegration) {
      return NextResponse.json(
        { error: "GitHub integration not found. Please connect your GitHub account first." },
        { status: 404 }
      );
    }

    // Verify repository access with existing token
    const gitHubConfig: GitHubConfig = {
      token: existingIntegration.access_token,
      owner,
      repo,
      branch: branch || "main",
    };

    const verification = await verifyGitHubConfig(gitHubConfig);
    
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error || "Failed to verify repository access" },
        { status: 400 }
      );
    }

    // Update metadata with new repository
    const updatedMetadata = {
      ...existingIntegration.metadata,
      owner,
      repo,
      branch: branch || "main",
      verified: true,
      verified_at: new Date().toISOString(),
    };

    const { data: updatedIntegration, error: updateError } = await supabase
      .from("platform_integrations")
      .update({
        metadata: updatedMetadata,
        platform_user_id: owner, // Update owner if changed
        last_used_at: new Date().toISOString(),
      })
      .eq("id", existingIntegration.id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Repository updated successfully",
        config: {
          owner,
          repo,
          branch: branch || "main",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GitHub PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

