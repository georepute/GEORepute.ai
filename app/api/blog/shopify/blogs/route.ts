import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getShopifyBlogs } from "@/lib/integrations/shopify";

/**
 * GET: Fetch available blogs from connected Shopify store
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
        { error: "Shopify not connected" },
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

    // Fetch blogs from Shopify
    const result = await getShopifyBlogs({
      accessToken: integration.access_token,
      shopDomain: shopDomain,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch blogs" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      blogs: result.blogs || [],
    });
  } catch (error: any) {
    console.error("Get Shopify blogs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
