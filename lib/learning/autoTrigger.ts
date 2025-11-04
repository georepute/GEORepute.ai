/**
 * Auto-Trigger System for Self-Learning Loop
 * 
 * Automatically triggers learning analysis when:
 * - Rankings are updated
 * - Content performance data is available
 * - Traffic changes are detected
 */

import { analyzeAndLearn } from "@/lib/ai/geoCore";
import { storeLearningRule } from "./rulesEngine";

/**
 * Trigger learning from ranking update
 */
export async function triggerLearningFromRanking(
  userId: string,
  data: {
    keyword_id: string;
    keyword_text: string;
    predictedRanking: number;
    actualRanking: number;
    keywordForecastId?: string;
  },
  supabaseClient: any
): Promise<void> {
  try {
    // Only trigger if there's a significant change (more than 3 positions)
    const rankingChange = Math.abs(data.actualRanking - data.predictedRanking);
    if (rankingChange < 3) {
      return; // Not significant enough
    }

    // Prepare learning data
    const result = await analyzeAndLearn({
      actionType: "keyword_targeting",
      inputData: {
        keyword: data.keyword_text,
        predictedRanking: data.predictedRanking,
        strategy: "SEO optimization",
      },
      outcomeData: {
        actualRanking: data.actualRanking,
        rankingChange: data.actualRanking - data.predictedRanking,
        performance: data.actualRanking <= 10 ? "excellent" : data.actualRanking <= 30 ? "good" : "needs_improvement",
      },
    });

    // Save to geo_learning_data
    const { data: learningData, error: learningError } = await supabaseClient
      .from("geo_learning_data")
      .insert({
        user_id: userId,
        action_type: "keyword_targeting",
        input_data: {
          keyword: data.keyword_text,
          predictedRanking: data.predictedRanking,
        },
        outcome_data: {
          actualRanking: data.actualRanking,
          rankingChange: data.actualRanking - data.predictedRanking,
        },
        success_score: result.successScore,
        insights: result.insights,
        recommendations: result.recommendations,
        applied_to_future: result.appliedToFuture,
        ai_model: "gpt-4-turbo",
      })
      .select()
      .single();

    if (learningError) {
      console.error("Error saving learning data:", learningError);
      return;
    }

    // If learning should be applied, extract and store rule
    if (result.appliedToFuture && learningData?.id) {
      await storeLearningRule(
        userId,
        {
          actionType: "keyword_targeting",
          keyword: data.keyword_text,
          recommendations: result.recommendations,
          appliedToFuture: true,
        },
        supabaseClient
      );
    }

    console.log(`✅ Auto-triggered learning from ranking update for keyword: ${data.keyword_text}`);
  } catch (error) {
    console.error("Error triggering learning from ranking:", error);
    // Don't throw - this is a background process
  }
}

/**
 * Trigger learning from content performance
 */
export async function triggerLearningFromContent(
  userId: string,
  data: {
    contentId: string;
    platform: string;
    keywords: string[];
    predictedEngagement?: number;
    actualEngagement?: number;
    actualTraffic?: number;
    actualRanking?: number;
  },
  supabaseClient: any
): Promise<void> {
  try {
    // Only trigger if we have outcome data
    if (!data.actualEngagement && !data.actualTraffic && !data.actualRanking) {
      return;
    }

    // Prepare learning data
    const result = await analyzeAndLearn({
      actionType: "content_generation",
      inputData: {
        platform: data.platform,
        keywords: data.keywords,
        predictedEngagement: data.predictedEngagement,
      },
      outcomeData: {
        actualEngagement: data.actualEngagement,
        actualTraffic: data.actualTraffic,
        actualRanking: data.actualRanking,
      },
    });

    // Save to geo_learning_data
    const { data: learningData, error: learningError } = await supabaseClient
      .from("geo_learning_data")
      .insert({
        user_id: userId,
        action_type: "content_generation",
        input_data: {
          platform: data.platform,
          keywords: data.keywords,
          contentId: data.contentId,
        },
        outcome_data: {
          engagement: data.actualEngagement,
          traffic: data.actualTraffic,
          ranking: data.actualRanking,
        },
        success_score: result.successScore,
        insights: result.insights,
        recommendations: result.recommendations,
        applied_to_future: result.appliedToFuture,
        ai_model: "gpt-4-turbo",
      })
      .select()
      .single();

    if (learningError) {
      console.error("Error saving learning data:", learningError);
      return;
    }

    // If learning should be applied, extract and store rule
    if (result.appliedToFuture && learningData?.id) {
      await storeLearningRule(
        userId,
        {
          actionType: "content_generation",
          platform: data.platform,
          recommendations: result.recommendations,
          appliedToFuture: true,
        },
        supabaseClient
      );
    }

    console.log(`✅ Auto-triggered learning from content performance for content: ${data.contentId}`);
  } catch (error) {
    console.error("Error triggering learning from content:", error);
    // Don't throw - this is a background process
  }
}

