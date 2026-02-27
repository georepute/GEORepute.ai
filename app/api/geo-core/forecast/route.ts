import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateKeywordForecast } from "@/lib/ai/geoCore";

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
    const { keywords, industry, location } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    // Generate forecasts using AI
    const result = await generateKeywordForecast({
      keywords,
      industry,
      location,
    });

    // Helper function to convert difficulty string to number
    const convertDifficultyToNumber = (difficulty: string): number => {
      switch (difficulty?.toLowerCase()) {
        case "easy":
          return 30;
        case "medium":
          return 60;
        case "hard":
          return 85;
        default:
          return 60;
      }
    };

    // Helper function to convert ROI score to priority
    const convertRoiToPriority = (roiScore: string): string => {
      switch (roiScore?.toLowerCase()) {
        case "very_high":
        case "very high":
          return "high";
        case "high":
          return "high";
        case "medium":
          return "medium";
        case "low":
          return "low";
        default:
          return "medium";
      }
    };

    // Save each forecast - BOTH analyzing data AND tracking data
    for (const forecast of result.forecasts) {
      // 1. SAVE ANALYSIS DATA to keyword_forecast table (as before)
      const forecastInsertData = {
        user_id: session.user.id,
        keyword: forecast.keyword,
        search_volume: forecast.searchVolume || 0,
        competition: forecast.competition || "Medium",
        roi_score: forecast.roiScore || "medium",
        estimated_traffic: forecast.estimatedTraffic || 0,
        predicted_ranking: forecast.predictedRanking || 0,
        estimated_revenue: forecast.estimatedRevenue || 0,
        opportunity_score: forecast.opportunityScore || 50,
        confidence_score: forecast.confidenceScore || 75,
        reasoning: forecast.reasoning || "AI-generated forecast",
        ai_model: "gpt-4-turbo",
        metadata: {
          difficulty: forecast.difficulty,
          trend: forecast.trend,
        },
      };

      const { data: forecastData, error: forecastError } = await supabase
        .from("keyword_forecast")
        .insert(forecastInsertData);

      if (forecastError) {
        console.error("❌ Database insert error for keyword_forecast:", forecast.keyword);
        console.error("Error details:", JSON.stringify(forecastError, null, 2));
      } else {
        console.log("✅ Saved keyword forecast (analysis):", forecast.keyword);
      }

      // 2. SAVE TRACKING DATA to keyword table (new - for tracking)
      // Check if keyword already exists using keyword_text field
      const { data: existingKeyword } = await supabase
        .from("keyword")
        .select("keyword_id")
        .eq("user_id", session.user.id)
        .eq("keyword_text", forecast.keyword)
        .maybeSingle();

      if (existingKeyword) {
        console.log(`⚠️ Keyword "${forecast.keyword}" already being tracked, skipping tracking insert...`);
      } else {
        // Use actual keyword table schema fields:
        // keyword_id, user_id, keyword_text, ranking_score, search_volume, difficulty, created_at, updated_at
        const keywordInsertData = {
          user_id: session.user.id,
          keyword_text: forecast.keyword, // Use keyword_text not keyword
          search_volume: forecast.searchVolume || 0,
          difficulty: convertDifficultyToNumber(forecast.difficulty),
          ranking_score: forecast.predictedRanking || null, // Use AI predicted ranking as initial score
          // created_at and updated_at have defaults, don't need to specify
        };

        const { data: keywordData, error: keywordError } = await supabase
          .from("keyword")
          .insert(keywordInsertData);

        if (keywordError) {
          console.error("❌ Database insert error for keyword tracking:", forecast.keyword);
          console.error("Error details:", JSON.stringify(keywordError, null, 2));
          console.error("Error code:", keywordError.code);
          console.error("Error message:", keywordError.message);
        } else {
          console.log("✅ Started tracking keyword:", forecast.keyword);
          console.log("   Keyword Text:", keywordInsertData.keyword_text);
          console.log("   Search Volume:", keywordInsertData.search_volume);
          console.log("   Difficulty:", forecast.difficulty, "→", keywordInsertData.difficulty);
        }
      }
    }

    return NextResponse.json({ forecasts: result.forecasts }, { status: 200 });
  } catch (error: any) {
    console.error("Forecast API error:", error);
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

    // Fetch user's forecasts
    const { data, error } = await supabase
      .from("keyword_forecast")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ forecasts: data }, { status: 200 });
  } catch (error: any) {
    console.error("Forecast GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

