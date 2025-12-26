import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { trackQuoraPerformance, QuoraConfig } from "@/lib/integrations/quora";

/**
 * API Route: Track Performance for a Single Post
 * 
 * This route triggers performance tracking:
 * - For Quora: Uses Selenium crawler to extract metrics
 * - For other platforms (Instagram, Facebook, LinkedIn, GitHub): Uses Edge Function
 * 
 * POST /api/geo-core/track-performance
 * Body: { contentStrategyId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { contentStrategyId } = body;

    if (!contentStrategyId) {
      return NextResponse.json(
        { error: "contentStrategyId is required" },
        { status: 400 }
      );
    }

    // Verify the content belongs to the user and get metadata
    const { data: contentStrategy, error: contentError } = await supabase
      .from("content_strategy")
      .select("id, user_id, metadata")
      .eq("id", contentStrategyId)
      .eq("user_id", session.user.id)
      .single();

    if (contentError || !contentStrategy) {
      return NextResponse.json(
        { error: "Content not found or access denied" },
        { status: 404 }
      );
    }

    // Get published content to determine platform and post URL
    const { data: publishedContent, error: publishedError } = await supabase
      .from("published_content")
      .select("id, platform, platform_post_id, published_url, metadata")
      .eq("content_strategy_id", contentStrategyId)
      .eq("status", "published");

    if (publishedError) {
      console.error("Error fetching published content:", publishedError);
      return NextResponse.json(
        { error: "Failed to fetch published content" },
        { status: 500 }
      );
    }

    // Check if any published content is for Quora
    const quoraContent = publishedContent?.find(pc => pc.platform === "quora");
    
    if (quoraContent) {
      // === QUORA: Use Selenium Crawler ===
      console.log("📊 Quora content detected - using Selenium crawler");
      
      // Get Quora integration for this user
      const { data: quoraIntegration, error: integrationError } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("platform", "quora")
        .eq("status", "connected")
        .maybeSingle();

      if (integrationError || !quoraIntegration) {
        console.warn("⚠️ No Quora integration found");
        return NextResponse.json(
          { error: "Quora integration not found. Please connect Quora in Settings." },
          { status: 400 }
        );
      }

      // Get post URL
      const postUrl = quoraContent.published_url || quoraContent.metadata?.url;
      if (!postUrl) {
        return NextResponse.json(
          { error: "Quora post URL not found" },
          { status: 400 }
        );
      }

      console.log(`📊 Tracking Quora post: ${postUrl}`);

      // Configure Quora credentials
      const quoraConfig: QuoraConfig = {
        email: quoraIntegration.platform_username || quoraIntegration.metadata?.email || "",
        password: quoraIntegration.metadata?.password,
        cookies: quoraIntegration.metadata?.cookies,
      };

      // Track performance using Render crawler service
      let quoraMetrics;
      if (process.env.QUORA_MEDIUM_URL) {
        console.log('📡 Calling Render service for Quora tracking...');
        const response = await fetch(`${process.env.QUORA_MEDIUM_URL}/quora/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: quoraConfig.email,
            cookies: quoraConfig.cookies,
            postUrl: postUrl,
          }),
        });
        const result = await response.json();
        quoraMetrics = result.metrics || result;
      } else {
        // Fallback to local Selenium (for development)
        quoraMetrics = await trackQuoraPerformance(quoraConfig, postUrl);
      }

      console.log("📊 Quora metrics received:", quoraMetrics);

      // Get current metadata
      const currentMetadata = contentStrategy.metadata || {};
      const currentPerformance = currentMetadata.performance || {};

      // Update content_strategy with Quora metrics
      const updatedMetadata = {
        ...currentMetadata,
        performance: {
          ...currentPerformance,
          quora: {
            upvotes: quoraMetrics.upvotes,
            comments: quoraMetrics.comments,
            views: quoraMetrics.views,
            shares: quoraMetrics.shares,
            engagement: quoraMetrics.engagement,
            lastUpdated: quoraMetrics.lastUpdated,
            error: quoraMetrics.error,
          },
          engagement: quoraMetrics.engagement || currentPerformance.engagement,
        },
      };

      const { error: updateError } = await supabase
        .from("content_strategy")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contentStrategyId);

      if (updateError) {
        console.error("Error updating content strategy:", updateError);
        return NextResponse.json(
          { error: "Failed to save Quora metrics" },
          { status: 500 }
        );
      }

      // Create performance snapshot
      try {
        await supabase
          .from("performance_snapshots")
          .insert({
            content_strategy_id: contentStrategyId,
            platform: "quora",
            snapshot_date: new Date().toISOString(),
            metrics: {
              upvotes: quoraMetrics.upvotes,
              comments: quoraMetrics.comments,
              views: quoraMetrics.views,
              shares: quoraMetrics.shares,
              engagement: quoraMetrics.engagement,
              lastUpdated: quoraMetrics.lastUpdated,
            },
          });
        console.log("✅ Created Quora performance snapshot");
      } catch (snapshotError) {
        console.warn("⚠️ Could not create snapshot:", snapshotError);
      }

      return NextResponse.json({
        success: true,
        message: "Quora performance tracked successfully",
        platform: "quora",
        metrics: quoraMetrics,
      });
    }

    // === OTHER PLATFORMS: Use Edge Function ===
    console.log("📊 Non-Quora content - using Edge Function");

    // Get Supabase service role key from environment
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("NEXT_PUBLIC_SUPABASE_URL is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call the Edge Function with the specific contentStrategyId
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auto-track-performance`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        contentStrategyId: contentStrategyId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Edge Function error:", errorData);
      return NextResponse.json(
        { 
          error: errorData.error || "Failed to track performance",
          details: errorData 
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "Performance tracking triggered successfully",
      result: result,
    });

  } catch (error: any) {
    console.error("Error tracking performance:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
