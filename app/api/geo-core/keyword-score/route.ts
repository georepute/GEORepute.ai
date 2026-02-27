import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateKeywordScore } from "@/lib/ai/geoCore";
import { applyLearningRules } from "@/lib/learning/rulesEngine";

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
    const {
      keyword,
      searchVolume,
      difficulty,
      competition,
      currentRanking,
      historicalData,
      geoStrategy,
      industry,
      location,
    } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    // If keyword exists in database, fetch historical data
    let historicalFromDb: any = {};
    if (keyword) {
      const { data: keywordData } = await supabase
        .from("keyword")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("keyword_text", keyword)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (keywordData) {
        // Fetch previous score from keyword_forecast if available
        const { data: forecastData } = await supabase
          .from("keyword_forecast")
          .select("opportunity_score, predicted_ranking")
          .eq("user_id", session.user.id)
          .eq("keyword", keyword)
          .order("created_at", { ascending: false })
          .limit(2)
          .maybeSingle();

        if (forecastData && historicalData?.previousScore === undefined) {
          historicalFromDb = {
            previousScore: forecastData.opportunity_score || undefined,
            previousRanking: forecastData.predicted_ranking || keywordData.ranking_score || undefined,
          };
        }

        // Use database values if not provided
        if (!searchVolume && keywordData.search_volume) {
          body.searchVolume = keywordData.search_volume;
        }
        if (!difficulty && keywordData.difficulty) {
          body.difficulty = keywordData.difficulty;
        }
        if (!currentRanking && keywordData.ranking_score) {
          body.currentRanking = keywordData.ranking_score;
        }

        // Calculate ranking change if we have historical data
        if (keywordData.ranking_score && historicalFromDb.previousRanking) {
          historicalFromDb.rankingChange =
            keywordData.ranking_score - historicalFromDb.previousRanking;
        }
      }
    }

    // Merge provided historical data with database data
    const mergedHistoricalData = {
      ...historicalFromDb,
      ...historicalData,
    };

    // Apply learning rules for keyword targeting (if available)
    const learningRules = await applyLearningRules(
      session.user.id,
      {
        platform: "keyword_targeting",
        keywords: [keyword],
      },
      supabase
    );

    // Apply learned GEO strategy alignment if available
    const enhancedGeoStrategy = {
      ...geoStrategy,
      geoAlignment: learningRules.geoStrategyAlignment || geoStrategy?.geoAlignment,
      priorityLevel: learningRules.priorityLevel || geoStrategy?.priorityLevel,
    };

    // Generate keyword score with learning-enhanced strategy
    const result = await generateKeywordScore({
      keyword,
      searchVolume: searchVolume || body.searchVolume,
      difficulty: difficulty || body.difficulty,
      competition,
      currentRanking: currentRanking || body.currentRanking,
      historicalData: mergedHistoricalData,
      geoStrategy: enhancedGeoStrategy,
      industry,
      location,
    });

    // Save score to database (optional - could save to a new table or update keyword_forecast)
    // For now, we'll save to keyword_forecast as a new entry with score data
    try {
      await supabase.from("keyword_forecast").insert({
        user_id: session.user.id,
        keyword: keyword,
        opportunity_score: result.overallScore,
        predicted_ranking: currentRanking || body.currentRanking || null,
        metadata: {
          scoring: {
            overallScore: result.overallScore,
            priority: result.priority,
            breakdown: result.breakdown,
            weightedFactors: result.weightedFactors,
            geoStrategyAlignment: result.geoStrategyAlignment,
            historicalComparison: result.historicalComparison,
          },
          reasoning: result.reasoning,
        },
        ai_model: "gpt-4-turbo",
      });
    } catch (error) {
      // Don't fail the request if saving fails
      console.warn("Could not save keyword score to database:", error);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Keyword scoring API error:", error);
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

    // Get keyword from query params
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword parameter is required" },
        { status: 400 }
      );
    }

    // Fetch keyword data from database
    const { data: keywordData, error: keywordError } = await supabase
      .from("keyword")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("keyword_text", keyword)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keywordError || !keywordData) {
      return NextResponse.json(
        { error: "Keyword not found" },
        { status: 404 }
      );
    }

    // Fetch forecast data for historical comparison
    const { data: forecastData } = await supabase
      .from("keyword_forecast")
      .select("opportunity_score, predicted_ranking, created_at")
      .eq("user_id", session.user.id)
      .eq("keyword", keyword)
      .order("created_at", { ascending: false })
      .limit(2);

    // Prepare historical data
    const historicalData: any = {};
    if (forecastData && forecastData.length > 0) {
      historicalData.previousScore = forecastData[0].opportunity_score;
      if (forecastData.length > 1) {
        historicalData.previousRanking = forecastData[1].predicted_ranking;
      }
      if (keywordData.ranking_score && historicalData.previousRanking) {
        historicalData.rankingChange =
          keywordData.ranking_score - historicalData.previousRanking;
      }
    }

    // Generate score
    const result = await generateKeywordScore({
      keyword: keywordData.keyword_text,
      searchVolume: keywordData.search_volume,
      difficulty: keywordData.difficulty,
      currentRanking: keywordData.ranking_score,
      historicalData,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Keyword scoring GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

