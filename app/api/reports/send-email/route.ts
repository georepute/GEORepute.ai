import { NextRequest, NextResponse } from "next/server";
import { sendReportEmail } from "@/lib/email";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { email, userName, reportData, fullReportData } = body;

    // Validate required fields
    if (!email || !reportData) {
      return NextResponse.json(
        { error: "Missing required fields: email or reportData" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: orgUser } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    // Save report to database (always save when sending email)
    let savedReport = null;
    if (fullReportData) {
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          organization_id: orgUser?.organization_id || null,
          title: `${reportData.dateRange} Performance Report`,
          date_range: reportData.dateRange,
          // Keywords data
          total_keywords: fullReportData.totalKeywords || 0,
          keywords_change: fullReportData.keywordsChange || 0,
          avg_ranking: fullReportData.avgRanking || 0,
          ranking_change: fullReportData.rankingChange || 0,
          top_keywords: fullReportData.topKeywords || [],
          ranking_trend: fullReportData.rankingTrend || [],
          // Content data
          total_content: fullReportData.totalContent || 0,
          content_change: fullReportData.contentChange || 0,
          published_content: fullReportData.publishedContent || 0,
          draft_content: fullReportData.draftContent || 0,
          content_by_platform: fullReportData.contentByPlatform || [],
          content_by_status: fullReportData.contentByStatus || [],
          recent_content: fullReportData.recentContent || [],
          // AI Visibility data
          avg_visibility_score: fullReportData.avgVisibilityScore || 0,
          visibility_change: fullReportData.visibilityChange || 0,
          total_mentions: fullReportData.totalMentions || 0,
          mentions_change: fullReportData.mentionsChange || 0,
          visibility_by_platform: fullReportData.visibilityByPlatform || [],
          visibility_trend: fullReportData.visibilityTrend || [],
          // Brand Analysis data
          total_projects: fullReportData.totalProjects || 0,
          active_sessions: fullReportData.activeSessions || 0,
          total_responses: fullReportData.totalResponses || 0,
          responses_by_platform: fullReportData.responsesByPlatform || [],
          // Performance summary
          performance_summary: fullReportData.performanceSummary || [],
          // Access control
          is_public: true,
        })
        .select()
        .single();

      if (reportError) {
        console.error("Error saving report:", reportError);
        // Don't fail the whole request if report saving fails
      } else {
        savedReport = report;
      }
    }

    // Send the report email (include report link if saved)
    const result = await sendReportEmail(
      email,
      userName || user.email || "User",
      reportData,
      savedReport?.id || null
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
      reportId: savedReport?.id || null,
      publicUrl: savedReport?.id 
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/public/report/${savedReport.id}`
        : null,
    });
  } catch (error: any) {
    console.error("Error in send-email route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

