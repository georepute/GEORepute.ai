import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { triggerLearningFromContent } from "@/lib/learning/autoTrigger";

/**
 * API endpoint to record content performance and trigger learning
 * This can be called:
 * - Automatically when analytics data is available
 * - Manually by user when they have performance data
 * - From webhooks when content performance updates
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const {
      contentId,
      platform,
      keywords,
      actualEngagement,
      actualTraffic,
      actualRanking,
      predictedEngagement,
    } = body;

    if (!contentId || !platform) {
      return NextResponse.json(
        { error: "contentId and platform are required" },
        { status: 400 }
      );
    }

    // Update content strategy with performance data
    const { data: updatedContent, error: updateError } = await supabase
      .from("content_strategy")
      .update({
        metadata: {
          performance: {
            engagement: actualEngagement,
            traffic: actualTraffic,
            ranking: actualRanking,
            recordedAt: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", contentId)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating content performance:", updateError);
    }

    // Auto-trigger learning from content performance (background, non-blocking)
    try {
      await triggerLearningFromContent(
        session.user.id,
        {
          contentId,
          platform,
          keywords: keywords || [],
          predictedEngagement,
          actualEngagement,
          actualTraffic,
          actualRanking,
        },
        supabase
      );
    } catch (triggerError) {
      console.warn("Could not trigger learning from content performance:", triggerError);
      // Don't fail the request
    }

    return NextResponse.json(
      {
        success: true,
        content: updatedContent,
        message: "Performance data recorded and learning triggered",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Content performance API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

