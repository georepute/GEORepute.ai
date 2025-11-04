import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getLearningInsights } from "@/lib/learning/rulesEngine";

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

    // Fetch user's learning rules
    const { data, error } = await supabase
      .from("learning_rules")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("applied_to_future", true)
      .order("success_count", { ascending: false })
      .limit(100);

    if (error) {
      // Table might not exist yet
      if (error.code === "42P01") {
        return NextResponse.json({ rules: [], insights: null }, { status: 200 });
      }
      throw error;
    }

    // Get learning insights
    const insights = await getLearningInsights(session.user.id, supabase);

    return NextResponse.json(
      {
        rules: data || [],
        insights: {
          topRules: insights.topRules,
          successRate: Math.round(insights.successRate * 10) / 10,
          totalLearnings: insights.totalLearnings,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Learning rules GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { ruleId, action } = body; // action: "enable", "disable", "delete"

    if (!ruleId || !action) {
      return NextResponse.json(
        { error: "ruleId and action are required" },
        { status: 400 }
      );
    }

    let updateData: any = {};

    if (action === "disable") {
      updateData.applied_to_future = false;
    } else if (action === "enable") {
      updateData.applied_to_future = true;
    } else if (action === "delete") {
      const { error: deleteError } = await supabase
        .from("learning_rules")
        .delete()
        .eq("id", ruleId)
        .eq("user_id", session.user.id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update rule
    const { data, error } = await supabase
      .from("learning_rules")
      .update(updateData)
      .eq("id", ruleId)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rule: data }, { status: 200 });
  } catch (error: any) {
    console.error("Learning rules POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

