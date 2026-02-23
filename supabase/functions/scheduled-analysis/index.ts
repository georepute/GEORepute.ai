/**
 * Supabase Edge Function: Scheduled Analysis
 * 
 * Checks for brand analysis projects with scheduled re-runs (daily/weekly/monthly)
 * and triggers re-analysis using the same queries from the original run.
 * 
 * Called by pg_cron every hour.
 * 
 * Setup:
 * 1. Deploy: supabase functions deploy scheduled-analysis
 * 2. Set up pg_cron:
 *    SELECT cron.schedule(
 *      'scheduled-analysis',
 *      '0 * * * *',  -- every hour
 *      $$SELECT net.http_post(
 *        url := '<SUPABASE_URL>/functions/v1/scheduled-analysis',
 *        headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
 *        body := '{}'::jsonb
 *      )$$
 *    );
 */

// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computeNextScheduledAt(frequency: string): string | null {
  if (frequency === "manual") return null;
  const now = new Date();
  if (frequency === "daily") now.setDate(now.getDate() + 1);
  else if (frequency === "weekly") now.setDate(now.getDate() + 7);
  else if (frequency === "monthly") now.setMonth(now.getMonth() + 1);
  else return null;
  return now.toISOString();
}

interface ProjectDue {
  id: string;
  brand_name: string;
  analysis_frequency: string;
  active_platforms: string[];
  analysis_languages: string[];
  analysis_countries: string[];
  queries_per_platform: number;
  query_mode: string;
  manual_queries: any[];
  website_url: string | null;
  industry: string;
  keywords: string[];
  competitors: string[];
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("🕐 Scheduled Analysis: checking for due projects...");

    // Find projects that are due for re-analysis
    const now = new Date().toISOString();
    const { data: dueProjects, error: fetchError } = await supabase
      .from("brand_analysis_projects")
      .select("*")
      .neq("analysis_frequency", "manual")
      .not("next_scheduled_at", "is", null)
      .lte("next_scheduled_at", now)
      .limit(10); // Process max 10 per run to avoid timeouts

    if (fetchError) {
      console.error("Failed to fetch due projects:", fetchError.message);
      return new Response(
        JSON.stringify({ error: fetchError.message, success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueProjects || dueProjects.length === 0) {
      console.log("✅ No projects due for scheduled analysis");
      return new Response(
        JSON.stringify({ success: true, message: "No projects due", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Found ${dueProjects.length} project(s) due for re-analysis`);

    const results: Array<{ projectId: string; brandName: string; status: string; error?: string }> = [];

    for (const project of dueProjects as ProjectDue[]) {
      try {
        console.log(`\n🔄 Processing project: ${project.brand_name} (${project.id})`);
        console.log(`   Frequency: ${project.analysis_frequency}`);

        // 1. Get the queries from the most recent completed session
        const { data: lastSession } = await supabase
          .from("brand_analysis_sessions")
          .select("id, results_summary")
          .eq("project_id", project.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lastSession) {
          console.log(`   ⚠️ No completed session found, skipping`);
          // Update next_scheduled_at so we check again next cycle
          await supabase
            .from("brand_analysis_projects")
            .update({ next_scheduled_at: computeNextScheduledAt(project.analysis_frequency) })
            .eq("id", project.id);
          results.push({ projectId: project.id, brandName: project.brand_name, status: "skipped", error: "No completed session" });
          continue;
        }

        // 2. Get the original queries from the last session's responses
        const { data: previousResponses } = await supabase
          .from("ai_platform_responses")
          .select("prompt")
          .eq("session_id", lastSession.id);

        const originalQueries = previousResponses
          ? [...new Set(previousResponses.map((r: any) => r.prompt).filter(Boolean))]
          : [];

        if (originalQueries.length === 0) {
          console.log(`   ⚠️ No queries found in last session, skipping`);
          await supabase
            .from("brand_analysis_projects")
            .update({ next_scheduled_at: computeNextScheduledAt(project.analysis_frequency) })
            .eq("id", project.id);
          results.push({ projectId: project.id, brandName: project.brand_name, status: "skipped", error: "No queries found" });
          continue;
        }

        console.log(`   📝 Found ${originalQueries.length} original queries to re-run`);

        // 3. Count existing runs to set run_number
        const { count: runCount } = await supabase
          .from("analysis_run_history")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id);

        const runNumber = (runCount || 0) + 1;

        // 4. Get previous run's scores for delta calculation
        const { data: previousRun } = await supabase
          .from("analysis_run_history")
          .select("overall_visibility_score, brand_mention_rate")
          .eq("project_id", project.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // 5. Create a run history entry (status: running)
        const configSnapshot = {
          platforms: project.active_platforms,
          languages: project.analysis_languages,
          countries: project.analysis_countries,
          queries_per_platform: project.queries_per_platform,
          query_count: originalQueries.length,
        };

        const { data: runHistoryEntry, error: runInsertError } = await supabase
          .from("analysis_run_history")
          .insert({
            project_id: project.id,
            run_number: runNumber,
            run_type: "scheduled",
            config_snapshot: configSnapshot,
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (runInsertError) {
          console.error(`   ❌ Failed to create run history:`, runInsertError.message);
          results.push({ projectId: project.id, brandName: project.brand_name, status: "error", error: runInsertError.message });
          continue;
        }

        // 6. Call the brand-analysis edge function with the same queries
        const analysisLanguages = project.analysis_languages || [];
        const preferredLanguage = analysisLanguages.length > 0
          ? analysisLanguages[0].toLowerCase().split("-")[0]
          : "en";

        console.log(`   🚀 Triggering brand-analysis with ${originalQueries.length} queries on ${project.active_platforms.length} platforms`);

        const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/brand-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            projectId: project.id,
            platforms: project.active_platforms,
            rerunQueries: originalQueries,
            language: preferredLanguage,
            languages: analysisLanguages,
            countries: project.analysis_countries || [],
          }),
        });

        const analysisData = await analysisResponse.json();

        if (!analysisResponse.ok || !analysisData.success) {
          console.error(`   ❌ Analysis failed:`, analysisData.error);
          await supabase
            .from("analysis_run_history")
            .update({ status: "failed", completed_at: new Date().toISOString() })
            .eq("id", runHistoryEntry.id);
          results.push({ projectId: project.id, brandName: project.brand_name, status: "error", error: analysisData.error });
        } else {
          console.log(`   ✅ Analysis triggered, session: ${analysisData.session_id}`);

          // Link session to run history
          await supabase
            .from("analysis_run_history")
            .update({ session_id: analysisData.session_id })
            .eq("id", runHistoryEntry.id);

          results.push({ projectId: project.id, brandName: project.brand_name, status: "triggered" });
        }

        // 7. Update project: set next_scheduled_at and last_analysis_at
        await supabase
          .from("brand_analysis_projects")
          .update({
            next_scheduled_at: computeNextScheduledAt(project.analysis_frequency),
            last_analysis_at: new Date().toISOString(),
          })
          .eq("id", project.id);

      } catch (projectError: any) {
        console.error(`   ❌ Error processing project ${project.brand_name}:`, projectError.message);
        results.push({ projectId: project.id, brandName: project.brand_name, status: "error", error: projectError.message });

        // Still update next_scheduled_at so we don't retry immediately
        await supabase
          .from("brand_analysis_projects")
          .update({ next_scheduled_at: computeNextScheduledAt(project.analysis_frequency) })
          .eq("id", project.id);
      }
    }

    console.log(`\n📋 Scheduled Analysis Summary:`);
    console.log(`   Total: ${results.length}`);
    console.log(`   Triggered: ${results.filter(r => r.status === "triggered").length}`);
    console.log(`   Skipped: ${results.filter(r => r.status === "skipped").length}`);
    console.log(`   Errors: ${results.filter(r => r.status === "error").length}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Scheduled Analysis fatal error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
