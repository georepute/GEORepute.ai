import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Import without type to avoid potential issues
let generateActionPlan: any;
try {
  const geoCore = require("@/lib/ai/geoCore");
  generateActionPlan = geoCore.generateActionPlan;
} catch (error) {
  console.error("Failed to import geoCore:", error);
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
    const { objective, targetKeywords } = body;

    if (!objective) {
      return NextResponse.json(
        { error: "Objective is required" },
        { status: 400 }
      );
    }

    // Check if AI function is available
    if (!generateActionPlan) {
      console.error("generateActionPlan function not available");
      return NextResponse.json(
        { error: "AI service not available. Check OpenAI setup." },
        { status: 500 }
      );
    }

    // Generate action plan with AI
    const result = await generateActionPlan({
      objective,
      targetKeywords: targetKeywords || [],
    });

    // Save to database
    const { data, error } = await supabase
      .from("action_plan")
      .insert({
        user_id: session.user.id,
        title: result.title,
        objective: result.objective,
        steps: result.steps,
        reasoning: result.reasoning,
        expected_outcome: result.expectedOutcome,
        timeline: result.timeline,
        priority: result.priority,
        category: result.category,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      // Continue anyway, return result even if DB save fails
    }

    return NextResponse.json(
      {
        ...result,
        planId: data?.id || Date.now().toString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Action plan API error:", error);
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

    // Fetch user's action plans
    const { data, error } = await supabase
      .from("action_plan")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ plans: data }, { status: 200 });
  } catch (error: any) {
    console.error("Action plans GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
