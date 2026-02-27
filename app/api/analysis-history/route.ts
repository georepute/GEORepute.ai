import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("brand_analysis_projects")
      .select("id, analysis_frequency, next_scheduled_at")
      .eq("id", projectId)
      .eq("user_id", session.user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Fetch run history ordered by creation date
    const { data: runs, error: runsError } = await supabase
      .from("analysis_run_history")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (runsError) {
      return NextResponse.json(
        { error: runsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        analysis_frequency: project.analysis_frequency,
        next_scheduled_at: project.next_scheduled_at,
      },
      runs: runs || [],
      total: (runs || []).length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
