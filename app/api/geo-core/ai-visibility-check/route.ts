import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { checkAIVisibility } from "@/lib/ai/geoCore";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { query, platform, brandName } = body;

    if (!query || !platform || !brandName) {
      return NextResponse.json(
        { error: "Query, platform, and brandName are required" },
        { status: 400 }
      );
    }

    // Check AI visibility
    const result = await checkAIVisibility({
      query,
      platform,
      brandName,
    });

    // Save to database
    const { data, error } = await supabase
      .from("ai_engine_results")
      .insert({
        user_id: session.user.id,
        check_type: "visibility",
        query,
        platform,
        result_data: {
          mentionCount: result.mentionCount,
          insights: result.insights,
          recommendations: result.recommendations,
        },
        visibility_score: result.visibilityScore,
        sentiment: result.sentiment,
        ai_model: "gpt-4-turbo",
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
    }

    return NextResponse.json(
      {
        visibilityScore: result.visibilityScore,
        sentiment: result.sentiment,
        mentionCount: result.mentionCount,
        insights: result.insights,
        recommendations: result.recommendations,
        checkId: data?.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("AI visibility check API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's visibility checks
    const { data, error } = await supabase
      .from("ai_engine_results")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("check_type", "visibility")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ checks: data }, { status: 200 });
  } catch (error: any) {
    console.error("Visibility GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

