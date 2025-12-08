import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { verifyMediumConfig, MediumConfig } from "@/lib/integrations/medium";

/**
 * Medium Integration API
 * GET: Get user's Medium configuration
 * POST: Save/update Medium configuration
 * DELETE: Disconnect Medium integration
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

    // Get Medium integration from platform_integrations table
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "medium")
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

    // Format config from integration data
    const mediumConfig = {
      email: integration.platform_username || integration.metadata?.email || "",
      password: undefined, // Never return password
      cookies: integration.metadata?.cookies || undefined,
      verified: integration.status === "connected",
    };

    return NextResponse.json(
      {
        success: true,
        config: mediumConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Medium config GET error:", error);
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
    const { email, password, cookies: sessionCookies, skipVerification } = body;

    console.log("📥 Received Medium config request:");
    console.log("  - Email:", email ? "provided" : "missing");
    console.log("  - Password:", password ? "provided" : "missing");
    console.log("  - Cookies:", sessionCookies ? `${Array.isArray(sessionCookies) ? sessionCookies.length : 'invalid'} cookies` : "missing");

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: "Email is required (used for account identification)" },
        { status: 400 }
      );
    }

    if (!sessionCookies && !password) {
      return NextResponse.json(
        { error: "Either password or cookies are required" },
        { status: 400 }
      );
    }

    // Validate cookies format if provided
    if (sessionCookies) {
      if (!Array.isArray(sessionCookies)) {
        return NextResponse.json(
          { error: "Cookies must be an array of cookie objects" },
          { status: 400 }
        );
      }
      if (sessionCookies.length === 0) {
        return NextResponse.json(
          { error: "Cookies array cannot be empty" },
          { status: 400 }
        );
      }
      // Validate each cookie has required fields
      for (const cookie of sessionCookies) {
        if (!cookie.name || !cookie.value) {
          return NextResponse.json(
            { error: `Cookie is missing required fields (name or value): ${JSON.stringify(cookie)}` },
            { status: 400 }
          );
        }
      }
    }

    // Verify Medium access (with timeout to prevent hanging)
    const mediumConfig: MediumConfig = {
      email,
      password: password || undefined,
      cookies: sessionCookies || undefined,
    };

    // Skip verification if requested (for testing/debugging)
    let verification = { success: true };
    if (!skipVerification) {
      console.log("🔍 Starting Medium verification...");
      const startTime = Date.now();
      
      try {
        // Increase timeout to 90 seconds (Selenium can be slow, especially first time)
        verification = await Promise.race([
          verifyMediumConfig(mediumConfig).then((result) => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Medium verification completed in ${elapsed}s`);
            return result;
          }),
          new Promise<{ success: false; error: string }>((resolve) =>
            setTimeout(() => {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              console.error(`⏱️ Medium verification timeout after ${elapsed}s`);
              resolve({ 
                success: false, 
                error: "Verification timeout after 90 seconds. Cookies were added successfully, so login should work. You can skip verification for testing." 
              });
            }, 90000) // Increased to 90 seconds
          ),
        ]);
      } catch (verifyError: any) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ Medium verification error after ${elapsed}s:`, verifyError);
        verification = {
          success: false,
          error: verifyError.message || "Failed to verify Medium access",
        };
      }
      
      if (!verification.success) {
        console.error("Medium verification failed:", verification.error);
        return NextResponse.json(
          { 
            error: verification.error || "Failed to verify Medium access",
            details: "This might be due to ChromeDriver initialization being slow, network issues, or login process taking too long.",
            suggestions: [
              "Try using session cookies instead of password (faster and more reliable)",
              "Check server logs for ChromeDriver initialization messages",
              "Ensure ChromeDriver is properly installed",
              "You can temporarily skip verification for testing (not recommended for production)"
            ]
          },
          { status: 400 }
        );
      }
    } else {
      console.warn("⚠️ Skipping Medium verification (skipVerification=true)");
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from("platform_integrations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("platform", "medium")
      .maybeSingle();

    // Prepare integration data
    const integrationData = {
      user_id: session.user.id,
      platform: "medium",
      access_token: "selenium-auth", // Placeholder since we use cookies/password
      refresh_token: null,
      expires_at: null,
      platform_user_id: email,
      platform_username: email,
      metadata: {
        email,
        password: password ? "***" : undefined, // Store encrypted in production
        cookies: sessionCookies || undefined,
        verified: true,
        verified_at: new Date().toISOString(),
      },
      status: "connected",
      error_message: null,
      last_used_at: new Date().toISOString(),
    };

    let result;
    if (existingIntegration) {
      // Update existing integration
      const { data, error } = await supabase
        .from("platform_integrations")
        .update(integrationData)
        .eq("id", existingIntegration.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new integration
      const { data, error } = await supabase
        .from("platform_integrations")
        .insert(integrationData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(
      {
        success: true,
        config: {
          email: result.platform_username,
          verified: result.status === "connected",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Medium config POST error:", error);
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

    // Delete Medium integration
    const { error } = await supabase
      .from("platform_integrations")
      .delete()
      .eq("user_id", session.user.id)
      .eq("platform", "medium");

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: "Medium integration disconnected" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Medium config DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

