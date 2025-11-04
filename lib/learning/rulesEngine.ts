/**
 * Learning Rules Engine
 * 
 * Stores and applies learnings from the self-learning loop
 * Automatically updates content generation and strategies based on outcomes
 */

export interface LearningRule {
  id?: string;
  user_id: string;
  rule_type: "content_generation" | "keyword_targeting" | "platform_strategy" | "publishing_timing";
  platform?: string;
  keyword?: string;
  condition: Record<string, any>;
  action: Record<string, any>;
  success_count: number;
  failure_count: number;
  last_applied?: string;
  applied_to_future: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Apply learning rules to content generation
 */
export async function applyLearningRules(
  userId: string,
  context: {
    platform: string;
    keywords: string[];
    topic?: string;
  },
  supabaseClient: any
): Promise<Record<string, any>> {
  try {
    // Fetch applicable rules for this user and context
    const { data: rules, error } = await supabaseClient
      .from("learning_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("applied_to_future", true)
      .or(`platform.eq.${context.platform},platform.is.null`)
      .order("success_count", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching learning rules:", error);
      return {};
    }

    if (!rules || rules.length === 0) {
      return {};
    }

    // Combine rules into a strategy object
    const strategy: Record<string, any> = {};

    rules.forEach((rule: LearningRule) => {
      // Check if rule applies to this context
      if (matchesContext(rule, context)) {
        // Apply rule actions
        Object.assign(strategy, rule.action);
        
        // Update success count (non-blocking)
        updateRuleStats(rule.id!, true, supabaseClient).catch(console.error);
      }
    });

    return strategy;
  } catch (error) {
    console.error("Error applying learning rules:", error);
    return {};
  }
}

/**
 * Store a new learning rule extracted from learning data
 */
export async function storeLearningRule(
  userId: string,
  learning: {
    actionType: string;
    platform?: string;
    keyword?: string;
    recommendations: string[];
    appliedToFuture: boolean;
  },
  supabaseClient: any
): Promise<string | null> {
  if (!learning.appliedToFuture) {
    return null; // Don't store if not meant to be applied
  }

  try {
    // Convert recommendations into actionable rules
    const rule: Omit<LearningRule, "id" | "created_at"> = {
      user_id: userId,
      rule_type: mapActionTypeToRuleType(learning.actionType),
      platform: learning.platform || undefined,
      keyword: learning.keyword || undefined,
      condition: {}, // Can be extended to add conditions
      action: parseRecommendationsToActions(learning.recommendations),
      success_count: 0,
      failure_count: 0,
      last_applied: new Date().toISOString(),
      applied_to_future: true,
    };

    const { data, error } = await supabaseClient
      .from("learning_rules")
      .insert(rule)
      .select()
      .single();

    if (error) {
      // Table might not exist, try to create it first
      console.warn("Learning rules table might not exist:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error storing learning rule:", error);
    return null;
  }
}

/**
 * Update rule statistics
 */
async function updateRuleStats(ruleId: string, success: boolean, supabaseClient: any) {
  try {
    const { data: rule } = await supabaseClient
      .from("learning_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (!rule) return;

    await supabaseClient
      .from("learning_rules")
      .update({
        success_count: success ? rule.success_count + 1 : rule.success_count,
        failure_count: !success ? rule.failure_count + 1 : rule.failure_count,
        last_applied: new Date().toISOString(),
      })
      .eq("id", ruleId);
  } catch (error) {
    console.error("Error updating rule stats:", error);
  }
}

/**
 * Check if rule matches context
 */
function matchesContext(rule: LearningRule, context: {
  platform: string;
  keywords: string[];
}): boolean {
  // Check platform match
  if (rule.platform && rule.platform !== context.platform) {
    return false;
  }

  // Check keyword match (if specified)
  if (rule.keyword && !context.keywords.includes(rule.keyword)) {
    return false;
  }

  return true;
}

/**
 * Map action type to rule type
 */
function mapActionTypeToRuleType(actionType: string): LearningRule["rule_type"] {
  if (actionType.includes("content")) return "content_generation";
  if (actionType.includes("keyword")) return "keyword_targeting";
  if (actionType.includes("platform")) return "platform_strategy";
  if (actionType.includes("publish")) return "publishing_timing";
  return "content_generation";
}

/**
 * Parse recommendations into actionable rules
 */
function parseRecommendationsToActions(recommendations: string[]): Record<string, any> {
  const actions: Record<string, any> = {};

  recommendations.forEach((rec) => {
    const lower = rec.toLowerCase();

    // Parse tone recommendations
    if (lower.includes("casual tone") || lower.includes("casual")) {
      actions.tone = "casual";
    }
    if (lower.includes("professional tone") || lower.includes("professional")) {
      actions.tone = "professional";
    }

    // Parse emoji recommendations
    if (lower.includes("emoji") || lower.includes("emojis")) {
      actions.useEmojis = true;
      if (lower.match(/\d+/)) {
        const count = parseInt(lower.match(/\d+/)![0]);
        actions.emojiCount = count;
      }
    }

    // Parse word count recommendations
    if (lower.includes("word") && lower.match(/\d+/)) {
      const wordCounts = lower.match(/\d+/g);
      if (wordCounts && wordCounts.length >= 2) {
        actions.wordCount = {
          min: parseInt(wordCounts[0]),
          max: parseInt(wordCounts[1]),
        };
      }
    }

    // Parse platform-specific recommendations
    if (lower.includes("reddit")) {
      actions.platformRules = { ...actions.platformRules, reddit: rec };
    }
    if (lower.includes("medium")) {
      actions.platformRules = { ...actions.platformRules, medium: rec };
    }
    if (lower.includes("quora")) {
      actions.platformRules = { ...actions.platformRules, quora: rec };
    }
  });

  return actions;
}

/**
 * Get learning insights for user
 */
export async function getLearningInsights(
  userId: string,
  supabaseClient: any
): Promise<{
  topRules: LearningRule[];
  successRate: number;
  totalLearnings: number;
}> {
  try {
    const { data: rules, error } = await supabaseClient
      .from("learning_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("applied_to_future", true)
      .order("success_count", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching learning insights:", error);
      return { topRules: [], successRate: 0, totalLearnings: 0 };
    }

    const topRules = (rules || []).slice(0, 10);
    
    const totalSuccess = topRules.reduce((sum: number, r: LearningRule) => sum + r.success_count, 0);
    const totalFailure = topRules.reduce((sum: number, r: LearningRule) => sum + r.failure_count, 0);
    const total = totalSuccess + totalFailure;
    const successRate = total > 0 ? (totalSuccess / total) * 100 : 0;

    return {
      topRules,
      successRate,
      totalLearnings: topRules.length,
    };
  } catch (error) {
    console.error("Error getting learning insights:", error);
    return { topRules: [], successRate: 0, totalLearnings: 0 };
  }
}

