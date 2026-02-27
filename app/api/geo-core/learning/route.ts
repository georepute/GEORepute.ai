import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeAndLearn } from "@/lib/ai/geoCore";
import { storeLearningRule } from "@/lib/learning/rulesEngine";

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
    const { actionType, inputData, outcomeData } = body;

    if (!actionType || !inputData || !outcomeData) {
      return NextResponse.json(
        { error: "actionType, inputData, and outcomeData are required" },
        { status: 400 }
      );
    }

    // Analyze and learn
    const result = await analyzeAndLearn({
      actionType,
      inputData,
      outcomeData,
    });

    // Save to database
    const { data, error } = await supabase
      .from("geo_learning_data")
      .insert({
        user_id: session.user.id,
        action_type: actionType,
        input_data: inputData,
        outcome_data: outcomeData,
        success_score: result.successScore,
        insights: result.insights,
        applied_to_future: result.appliedToFuture,
        ai_model: "gpt-4-turbo",
      })
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
    }

    // Auto-extract and store rule if applicable
    if (result.appliedToFuture && data?.id) {
      try {
        await storeLearningRule(
          session.user.id,
          {
            actionType,
            platform: inputData.platform,
            keyword: inputData.keyword,
            recommendations: result.recommendations,
            appliedToFuture: true,
          },
          supabase
        );
      } catch (ruleError) {
        console.warn("Could not store learning rule:", ruleError);
        // Don't fail the request if rule storage fails
      }
    }

    return NextResponse.json(
      {
        successScore: result.successScore,
        insights: result.insights,
        recommendations: result.recommendations,
        appliedToFuture: result.appliedToFuture,
        learningId: data?.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Learning API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's learning data
    const { data, error } = await supabase
      .from("geo_learning_data")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ learnings: data }, { status: 200 });
  } catch (error: any) {
    console.error("Learning GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

