import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard/prompts
 * Returns topics, intent distribution, and prompts for the dashboard
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

    // Get projects with keywords, manual_queries, industry
    const { data: projects } = await supabase
      .from("brand_analysis_projects")
      .select("id, brand_name, industry, keywords, target_keywords, manual_queries")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const projectIds = (projects || []).map((p: { id: string }) => p.id);

    // Build topics from projects (industry + brand)
    const topicCounts = new Map<string, number>();
    (projects || []).forEach((p: any) => {
      const industry = p.industry || "General";
      topicCounts.set(industry, (topicCounts.get(industry) || 0) + 1);
    });
    const topics = [
      { id: "all", name: "All Topics", count: projectIds.length || 0 },
      ...Array.from(topicCounts.entries()).map(([name, count], i) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        count,
      })),
    ];

    // Fetch prompts from ai_platform_responses (latest session per project)
    let prompts: Array<{
      id: string;
      text: string;
      visibility: number;
      sentiment: number;
      rank: number;
      intent: string;
      region: string;
      created: string;
      tags: string[];
      projectName: string;
    }> = [];

    if (projectIds.length > 0) {
      const { data: sessions } = await supabase
        .from("brand_analysis_sessions")
        .select("id, project_id, started_at")
        .in("project_id", projectIds)
        .eq("status", "completed")
        .order("started_at", { ascending: false });

      const sessionIds = (sessions || []).map((s: any) => s.id).slice(0, 5);
      const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));

      if (sessionIds.length > 0) {
        const { data: responses } = await supabase
          .from("ai_platform_responses")
          .select("id, prompt, response_metadata, session_id")
          .in("session_id", sessionIds)
          .limit(100);

        const promptMap = new Map<string, { mentions: number; total: number; sentiment: number }>();
        (responses || []).forEach((r: any) => {
          const text = (r.prompt || "").trim();
          if (!text) return;
          const meta = r.response_metadata || {};
          const mentioned = meta.brand_mentioned === true ? 1 : 0;
          const sentiment = typeof meta.sentiment === "number" ? meta.sentiment : 0;
          const existing = promptMap.get(text) || { mentions: 0, total: 0, sentiment: 0 };
          promptMap.set(text, {
            mentions: existing.mentions + mentioned,
            total: existing.total + 1,
            sentiment: existing.sentiment + (sentiment || 0),
          });
        });

        const sessionProjectMap = new Map((sessions || []).map((s: any) => [s.id, s.project_id]));
        const seen = new Set<string>();
        (responses || []).forEach((r: any, idx: number) => {
          const text = (r.prompt || "").trim();
          if (!text || seen.has(text)) return;
          seen.add(text);
          const stats = promptMap.get(text) || { mentions: 0, total: 0, sentiment: 0 };
          const visibility = stats.total > 0 ? Math.round((stats.mentions / stats.total) * 100) : 0;
          const sentimentScore = stats.total > 0 ? Math.round(stats.sentiment / stats.total) : 0;
          const projectId = sessionProjectMap.get(r.session_id);
          const project = projectId ? projectMap.get(projectId) : null;
          prompts.push({
            id: r.id || `p-${idx}`,
            text,
            visibility,
            sentiment: Math.min(100, Math.max(0, sentimentScore + 50)),
            rank: visibility > 80 ? 1.5 : visibility > 50 ? 2.5 : 3.5,
            intent: "I B",
            region: "US",
            created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            tags: project?.industry ? [project.industry] : [],
            projectName: project?.brand_name || "",
          });
        });
        // Sort by visibility descending and take top prompts
        prompts.sort((a, b) => b.visibility - a.visibility);
      }

      // Fallback: use keywords + manual_queries from projects if no responses
      if (prompts.length === 0) {
        (projects || []).forEach((p: any, pi: number) => {
          const manual = Array.isArray(p.manual_queries) ? p.manual_queries : [];
          const kw = [...(Array.isArray(p.keywords) ? p.keywords : []), ...(Array.isArray(p.target_keywords) ? p.target_keywords : [])];
          const texts = [...new Set([...manual.map((q: any) => (typeof q === "string" ? q : q?.text || "").trim()).filter(Boolean), ...kw])];
          texts.slice(0, 10).forEach((text: string, ti: number) => {
            prompts.push({
              id: `kw-${pi}-${ti}`,
              text,
              visibility: 0,
              sentiment: 0,
              rank: 0,
              intent: "I B",
              region: "US",
              created: "-",
              tags: p.industry ? [p.industry] : [],
              projectName: p.brand_name || "",
            });
          });
        });
      }
    }

    // Intent distribution (placeholder - we don't have intent in responses, use even split or from prompts)
    const totalPrompts = prompts.length;
    const intentDistribution = [
      { name: "Informational", value: totalPrompts > 0 ? Math.round(48) : 48, color: "#93c5fd" },
      { name: "Navigational", value: totalPrompts > 0 ? Math.round(24) : 24, color: "#a78bfa" },
      { name: "Transactional", value: totalPrompts > 0 ? Math.round(16) : 16, color: "#fb923c" },
      { name: "Commercial", value: totalPrompts > 0 ? Math.round(12) : 12, color: "#a3e635" },
    ];

    return NextResponse.json({
      success: true,
      topics,
      intentDistribution,
      topPrompts: prompts.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Dashboard prompts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}
