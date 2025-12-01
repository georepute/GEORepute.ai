import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const reportId = params.shareToken; // Now using report ID instead of share token

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Fetch the report using the ID
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("is_public", true)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: "Report not found or has been removed" },
        { status: 404 }
      );
    }

    // Increment view count
    await supabase.rpc("increment_report_view_count", {
      report_id_param: report.id,
    });

    // Return report data
    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        date_range: report.date_range,
        generated_at: report.generated_at,
        // Keywords
        total_keywords: report.total_keywords,
        keywords_change: report.keywords_change,
        avg_ranking: report.avg_ranking,
        ranking_change: report.ranking_change,
        top_keywords: report.top_keywords,
        ranking_trend: report.ranking_trend,
        // Content
        total_content: report.total_content,
        content_change: report.content_change,
        published_content: report.published_content,
        draft_content: report.draft_content,
        content_by_platform: report.content_by_platform,
        content_by_status: report.content_by_status,
        recent_content: report.recent_content,
        // AI Visibility
        avg_visibility_score: report.avg_visibility_score,
        visibility_change: report.visibility_change,
        total_mentions: report.total_mentions,
        mentions_change: report.mentions_change,
        visibility_by_platform: report.visibility_by_platform,
        visibility_trend: report.visibility_trend,
        // Brand Analysis
        total_projects: report.total_projects,
        active_sessions: report.active_sessions,
        total_responses: report.total_responses,
        responses_by_platform: report.responses_by_platform,
        // Performance
        performance_summary: report.performance_summary,
        view_count: report.view_count + 1, // Return incremented count
      },
    });
  } catch (error: any) {
    console.error("Error fetching public report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

