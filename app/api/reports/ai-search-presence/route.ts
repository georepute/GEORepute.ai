import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const AI_ENGINES = [
  { id: "chatgpt", displayName: "ChatGPT" },
  { id: "claude", displayName: "Claude" },
  { id: "gemini", displayName: "Gemini" },
  { id: "perplexity", displayName: "Perplexity" },
  { id: "groq", displayName: "Groq" },
];

function buildEnginesData(responses: any[]) {
  const totalCount = responses.length || 0;
  return AI_ENGINES.map(({ id, displayName }) => {
    const engineResponses = responses.filter(
      (r: any) => (r.platform || "").toLowerCase() === id
    );
    const totalQueries = engineResponses.length;
    const mentionCount = engineResponses.filter(
      (r: any) => r.response_metadata?.brand_mentioned === true
    ).length;
    const mentionRatePct =
      totalQueries > 0 ? (mentionCount / totalQueries) * 100 : 0;
    const shareOfVoicePct =
      totalCount > 0 ? (totalQueries / totalCount) * 100 : 0;
    const withSentiment = engineResponses.filter(
      (r: any) =>
        r.response_metadata?.brand_mentioned &&
        r.response_metadata?.sentiment_score != null
    );
    const avgSentiment =
      withSentiment.length > 0
        ? withSentiment.reduce(
            (sum: number, r: any) =>
              sum + (r.response_metadata?.sentiment_score ?? 0),
            0
          ) / withSentiment.length
        : null;

    return {
      platform: id,
      displayName,
      presenceScore: mentionRatePct,
      totalQueries,
      mentionCount,
      mentionRatePct,
      shareOfVoicePct,
      avgSentiment,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // Fetch user's brand analysis projects
    const { data: projects, error: projectsError } = await supabase
      .from("brand_analysis_projects")
      .select("id, brand_name")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (projectsError) {
      return NextResponse.json(
        { error: projectsError.message },
        { status: 500 }
      );
    }

    const projectIds = projectId
      ? [projectId]
      : (projects || []).map((p: any) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          projects: [],
          engines: [],
          enginesByProject: {},
          summary: {
            totalQueries: 0,
            totalMentions: 0,
            overallMentionRate: 0,
            hasRepresentationIssue: false,
            recommendation: "Run AI Visibility analysis to generate report data.",
          },
          responses: [],
        },
      });
    }

    // Fetch latest completed session per project only (AI Visibility versions)
    const { data: allSessions } = await supabase
      .from("brand_analysis_sessions")
      .select("id, project_id, started_at")
      .in("project_id", projectIds)
      .eq("status", "completed")
      .order("started_at", { ascending: false });

    // Keep only the latest session per project
    const seenProjects = new Set<string>();
    const latestSessionIds: string[] = [];
    (allSessions || []).forEach((s: any) => {
      if (!seenProjects.has(s.project_id)) {
        seenProjects.add(s.project_id);
        latestSessionIds.push(s.id);
      }
    });

    let responses: any[] = [];
    if (latestSessionIds.length > 0) {
      const { data: respData, error: respError } = await supabase
        .from("ai_platform_responses")
        .select("id, project_id, session_id, platform, prompt, response, response_metadata, created_at")
        .in("session_id", latestSessionIds)
        .order("created_at", { ascending: false });

      if (!respError) {
        responses = respData || [];
      }
    }

    // Build engines for all projects (or selected project)
    const engines = buildEnginesData(responses);

    // Build engines per project
    const enginesByProject: Record<
      string,
      ReturnType<typeof buildEnginesData>
    > = {};
    (projects || []).forEach((p: any) => {
      const projResponses = responses.filter((r: any) => r.project_id === p.id);
      enginesByProject[p.id] = buildEnginesData(projResponses);
    });

    // Summary
    const totalQueries = responses.length;
    const totalMentions = responses.filter(
      (r: any) => r.response_metadata?.brand_mentioned === true
    ).length;
    const overallMentionRate =
      totalQueries > 0 ? (totalMentions / totalQueries) * 100 : 0;

    // Decision insight: "Is there an AI representation issue?"
    // Low mention rate (< 30%) suggests representation issue
    const hasRepresentationIssue = totalQueries > 0 && overallMentionRate < 30;
    let recommendation = "";
    if (totalQueries === 0) {
      recommendation =
        "Run AI Visibility analysis to generate report data.";
    } else if (hasRepresentationIssue) {
      recommendation =
        "AI representation issue detected. Low brand recognition across AI engines. Consider improving content visibility, citations, and brand authority signals.";
    } else if (overallMentionRate < 50) {
      recommendation =
        "Moderate AI visibility. There is room to improve brand recognition by optimizing content and citations.";
    } else {
      recommendation =
        "Strong AI visibility. Your brand is well-recognized by AI engines.";
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: projects || [],
        engines,
        enginesByProject,
        summary: {
          totalQueries,
          totalMentions,
          overallMentionRate: Math.round(overallMentionRate * 10) / 10,
          hasRepresentationIssue,
          recommendation,
        },
        responses,
      },
    });
  } catch (error: any) {
    console.error("AI Search Presence API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
