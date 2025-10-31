import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateStrategicContent } from "@/lib/ai/geoCore";

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
    const {
      topic,
      targetKeywords,
      targetPlatform,
      brandMention,
      influenceLevel,
      userContext,
    } = body;

    if (!topic || !targetKeywords || !targetPlatform) {
      return NextResponse.json(
        { error: "Topic, targetKeywords, and targetPlatform are required" },
        { status: 400 }
      );
    }

    // Generate content
    const result = await generateStrategicContent({
      topic,
      targetKeywords,
      targetPlatform,
      brandMention,
      influenceLevel: influenceLevel || "subtle",
      userContext,
    });

    // Save to database
    const { data, error } = await supabase
      .from("content_strategy")
      .insert({
        user_id: session.user.id,
        topic,
        target_keywords: targetKeywords,
        target_platform: targetPlatform,
        brand_mention: brandMention,
        influence_level: influenceLevel || "subtle",
        generated_content: result.content,
        neutrality_score: result.neutralityScore,
        tone: result.tone,
        word_count: result.wordCount,
        ai_model: "gpt-4-turbo",
        metadata: result.metadata,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
    }

    return NextResponse.json(
      {
        content: result.content,
        metadata: {
          neutralityScore: result.neutralityScore,
          tone: result.tone,
          wordCount: result.wordCount,
          platform: result.platform,
          ...result.metadata,
        },
        contentId: data?.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Content generation API error:", error);
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

    // Fetch user's content
    const { data, error } = await supabase
      .from("content_strategy")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ content: data }, { status: 200 });
  } catch (error: any) {
    console.error("Content GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

