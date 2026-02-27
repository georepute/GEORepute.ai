import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { publishToWordPress, WordPressConfig } from "@/lib/integrations/wordpress";

/**
 * WordPress.com Publish API
 * POST: Publish a blog post to WordPress.com
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, excerpt, tags, categories, status, featuredImage, siteId } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Get WordPress.com integration
    const { data: integration, error: integrationError } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "wordpress")
      .maybeSingle();

    if (integrationError) {
      throw integrationError;
    }

    if (!integration || integration.status !== "connected") {
      return NextResponse.json(
        { error: "WordPress.com is not connected. Please connect your account first." },
        { status: 400 }
      );
    }

    if (!integration.access_token) {
      return NextResponse.json(
        { error: "WordPress.com access token is missing. Please reconnect your account." },
        { status: 400 }
      );
    }

    // Use the provided siteId or the one stored in metadata
    const targetSiteId = siteId || integration.platform_user_id || integration.metadata?.siteId;

    if (!targetSiteId) {
      return NextResponse.json(
        { error: "No WordPress.com site selected. Please select a site first." },
        { status: 400 }
      );
    }

    const config: WordPressConfig = {
      accessToken: integration.access_token,
      siteId: targetSiteId.toString(),
    };

    // Publish to WordPress.com
    const result = await publishToWordPress(config, {
      title,
      content,
      excerpt,
      status: status || 'publish',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : undefined,
      categories: categories ? (Array.isArray(categories) ? categories : categories.split(',').map((c: string) => c.trim())) : undefined,
      featured_image: featuredImage,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to publish to WordPress.com" },
        { status: 500 }
      );
    }

    // Update last_used_at timestamp
    await supabase
      .from("platform_integrations")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", integration.id);

    // Save to content_strategy for tracking
    const { data: contentRecord } = await supabase
      .from("content_strategy")
      .insert({
        user_id: session.user.id,
        topic: title,
        generated_content: content,
        target_platform: "wordpress",
        status: "published",
        published_url: result.url,
        metadata: {
          wordpressPostId: result.postId,
          wordpressSiteId: result.siteId,
          excerpt,
          tags,
          categories,
          featuredImage,
        },
      })
      .select()
      .single();

    // Save to published_content
    if (contentRecord) {
      await supabase
        .from("published_content")
        .insert({
          user_id: session.user.id,
          content_strategy_id: contentRecord.id,
          platform: "wordpress",
          published_url: result.url,
          platform_post_id: result.postId?.toString(),
          status: "published",
          published_at: new Date().toISOString(),
          metadata: {
            siteId: result.siteId,
            postId: result.postId,
          },
        });
    }

    console.log("Blog post published to WordPress.com:", {
      url: result.url,
      postId: result.postId,
    });

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        postId: result.postId,
        siteId: result.siteId,
        message: "Successfully published to WordPress.com",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("WordPress.com publish error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
