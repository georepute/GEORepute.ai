import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * API Route: Track Performance for a Single Post
 * 
 * This route triggers the auto-track-performance Edge Function
 * for a specific content strategy (single post tracking).
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

    // Verify the content belongs to the user
    const { data: content, error: contentError } = await supabase
      .from("content_strategy")
      .select("id, user_id")
      .eq("id", contentStrategyId)
      .eq("user_id", session.user.id)
      .single();

    if (contentError || !content) {
      return NextResponse.json(
        { error: "Content not found or access denied" },
        { status: 404 }
      );
    }

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

