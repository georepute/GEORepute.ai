import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard/summary
 * Returns aggregated account data summary for the current user
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Get organization
    const { data: orgUser } = await supabase
      .from("organization_users")
      .select("organization_id, organization:organizations(id, name, seats, seats_used)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single();

    const organizationId = orgUser?.organization_id ?? null;
    const org = (orgUser as any)?.organization;

    // Parallel fetches for all summary data
    const [
      projectsResult,
      domainsResult,
      teamResult,
      keywordsResult,
      contentResult,
      keywordPlansResult,
      sessionsResult,
      reportsResult,
      videoReportsResult,
    ] = await Promise.all([
      // Projects (brand_analysis_projects - user_id)
      supabase
        .from("brand_analysis_projects")
        .select("id, keywords, target_keywords", { count: "exact", head: true })
        .eq("user_id", userId),
      // Domains (organization_id)
      organizationId
        ? supabase
            .from("domains")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
        : Promise.resolve({ count: 0, error: null }),
      // Team members (organization_users)
      organizationId
        ? supabase
            .from("organization_users")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("status", "active")
        : Promise.resolve({ count: 0, error: null }),
      // Keywords (keyword table - user_id, may not exist in all setups)
      (async () => {
        try {
          return await supabase
            .from("keyword")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
        } catch {
          return { count: 0, error: null };
        }
      })(),
      // Content (content_strategy - user_id)
      (async () => {
        try {
          return await supabase
            .from("content_strategy")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
        } catch {
          return { count: 0, error: null };
        }
      })(),
      // Keyword plans (keyword_plans - organization_id)
      organizationId
        ? supabase
            .from("keyword_plans")
            .select("id, keywords", { count: "exact", head: false })
            .eq("organization_id", organizationId)
        : Promise.resolve({ data: [], count: 0, error: null }),
      // Latest sessions for visibility (brand_analysis_sessions via projects)
      supabase
        .from("brand_analysis_projects")
        .select("id")
        .eq("user_id", userId)
        .limit(50),
      // Generated reports (reports table - user_id)
      (async () => {
        try {
          return await supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
        } catch {
          return { count: 0, error: null };
        }
      })(),
      // Video reports count (videos with video_url or video_status = 'done')
      (async () => {
        let total = 0;
        const tables = [
          ["ai_google_gap_reports", "video_url"],
          ["market_share_reports", "video_url"],
          ["opportunity_blind_spots_reports", "video_url"],
          ["blind_spot_reports", "video_url"],
        ];
        for (const [table, col] of tables) {
          try {
            const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).not(col, "is", "null");
            total += count ?? 0;
          } catch {
            /* table may not exist */
          }
        }
        try {
          const { count } = await supabase.from("report_videos").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("video_status", "done");
          total += count ?? 0;
        } catch {
          /* table may not exist */
        }
        return { count: total };
      })(),
    ]);

    // Get project IDs for session lookup
    const projectIds = (sessionsResult.data || []).map((p: { id: string }) => p.id);

    let totalVisibility = 0;
    let totalMentions = 0;
    let totalQueries = 0;
    let completedSessionsCount = 0;

    if (projectIds.length > 0) {
      const { data: sessions } = await supabase
        .from("brand_analysis_sessions")
        .select("id, results_summary, status")
        .in("project_id", projectIds)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(100);

      (sessions || []).forEach((s: any) => {
        const summary = s.results_summary || {};
        const mentions = summary.total_mentions || 0;
        const queries = summary.total_queries || 0;
        totalMentions += mentions;
        totalQueries += queries;
        if (queries > 0) {
          completedSessionsCount++;
        }
      });
      totalVisibility = totalQueries > 0 ? Math.round((totalMentions / totalQueries) * 100) : 0;
    }

    // Count keywords from projects (keywords + target_keywords arrays)
    let keywordsFromProjects = 0;
    const { data: projectsWithKeywords } = await supabase
      .from("brand_analysis_projects")
      .select("keywords, target_keywords")
      .eq("user_id", userId);

    (projectsWithKeywords || []).forEach((p: any) => {
      const k1 = Array.isArray(p.keywords) ? p.keywords.length : 0;
      const k2 = Array.isArray(p.target_keywords) ? p.target_keywords.length : 0;
      keywordsFromProjects += k1 + k2;
    });

    // Keyword plans keywords
    let keywordsFromPlans = 0;
    (keywordPlansResult.data || []).forEach((p: any) => {
      keywordsFromPlans += Array.isArray(p?.keywords) ? p.keywords.length : 0;
    });

    const keywordCount = (keywordsResult.count ?? 0) + keywordsFromProjects + keywordsFromPlans;

    const summary = {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
      },
      organization: org
        ? {
            id: org.id,
            name: org.name,
            seats: org.seats ?? 1,
            seatsUsed: org.seats_used ?? 0,
          }
        : null,
      counts: {
        projects: projectsResult.count ?? 0,
        domains: domainsResult.count ?? 0,
        teamMembers: teamResult.count ?? 0,
        keywords: keywordCount,
        content: contentResult.count ?? 0,
        keywordPlans: keywordPlansResult.count ?? 0,
        reports: reportsResult?.count ?? 0,
        videoReports: videoReportsResult?.count ?? 0,
      },
      visibility: {
        totalVisibility,
        totalMentions,
        totalQueries,
        completedSessions: completedSessionsCount,
      },
    };

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
