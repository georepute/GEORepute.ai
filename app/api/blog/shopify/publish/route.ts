import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { publishToShopify } from "@/lib/integrations/shopify";

/**
 * POST: Publish a blog post to Shopify
 */
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
    const {
      title,
      content,
      author,
      tags,
      imageUrl,
      summary,
      blogId,
      published = true,
    } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Get Shopify integration
    const { data: integration, error } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("platform", "shopify")
      .eq("status", "connected")
      .maybeSingle();

    if (error || !integration) {
      return NextResponse.json(
        { error: "Shopify not connected. Please connect your Shopify store in Settings." },
        { status: 400 }
      );
    }

    const shopDomain = integration.metadata?.shopDomain || integration.platform_user_id;
    if (!shopDomain || !integration.access_token) {
      return NextResponse.json(
        { error: "Invalid Shopify configuration" },
        { status: 400 }
      );
    }

    // Publish to Shopify
    const result = await publishToShopify(
      {
        accessToken: integration.access_token,
        shopDomain: shopDomain,
      },
      {
        title,
        body_html: content,
        author: author || "GeoRepute.ai",
        tags: tags || "",
        published,
        summary_html: summary,
        image: imageUrl ? { src: imageUrl } : undefined,
      },
      blogId || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to publish blog post" },
        { status: 400 }
      );
    }

    // Update last used timestamp
    await supabase
      .from("platform_integrations")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", integration.id);

    // Optionally save to content_strategy for tracking
    const { data: contentRecord } = await supabase
      .from("content_strategy")
      .insert({
        user_id: session.user.id,
        topic: title,
        generated_content: content,
        target_platform: "shopify",
        status: "published",
        published_url: result.url,
        metadata: {
          shopifyArticleId: result.articleId,
          shopifyBlogId: result.blogId,
          author,
          tags,
          imageUrl,
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
          platform: "shopify",
          published_url: result.url,
          platform_post_id: result.articleId?.toString(),
          status: "published",
          published_at: new Date().toISOString(),
          metadata: {
            blogId: result.blogId,
            articleId: result.articleId,
          },
        });
    }

    console.log("Blog post published to Shopify:", {
      url: result.url,
      articleId: result.articleId,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      articleId: result.articleId,
      blogId: result.blogId,
      message: "Blog post published successfully",
    });
  } catch (error: any) {
    console.error("Publish to Shopify error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
