/**
 * GEO Core AI Service Layer
 * 
 * The heart of GeoRepute.ai - AI-driven generative optimization system
 * Powered by OpenAI GPT-4 Turbo
 * 
 * Features:
 * - Keyword Forecasting with traffic & competition analysis
 * - Strategic Content Generation with "Natural Control"
 * - AI Visibility Checking across GPT/Gemini/Perplexity
 * - Self-Learning System with performance tracking
 * - Dynamic Action Plan Generation
 * - Competitor Analysis
 */

import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// ================================================
// TYPE DEFINITIONS
// ================================================

export interface KeywordForecastInput {
  keywords: string[];
  industry?: string;
  location?: string;
}

export interface KeywordForecast {
  keyword: string;
  searchVolume: number;
  difficulty: "Easy" | "Medium" | "Hard";
  competition: string;
  roiScore: string;
  estimatedTraffic: number;
  predictedRanking: number;
  estimatedRevenue: number;
  opportunityScore: number;
  confidenceScore: number;
  trend: string;
  reasoning: string;
}

export interface ContentGenerationInput {
  topic: string;
  targetKeywords: string[];
  targetPlatform: "reddit" | "quora" | "medium" | "github" | "linkedin" | "twitter";
  brandMention?: string;
  influenceLevel: "subtle" | "moderate" | "strong";
  userContext?: string;
}

export interface ContentGenerationOutput {
  content: string;
  neutralityScore: number;
  tone: string;
  wordCount: number;
  platform: string;
  metadata: {
    keywordsUsed: string[];
    readabilityScore?: number;
    seoScore?: number;
    humanScore?: number;
  };
}

export interface AIVisibilityCheckInput {
  query: string;
  platform: string;
  brandName: string;
}

export interface AIVisibilityCheckOutput {
  query: string;
  platform: string;
  mentionedBrands: string[];
  yourBrandPosition: number | null;
  sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
  visibilityScore: number;
  recommendations: string[];
}

export interface LearningInput {
  contentId: string;
  keyword: string;
  actualRanking?: number;
  actualTraffic?: number;
  actualEngagement?: number;
  userFeedback?: string;
}

export interface AnalyzeAndLearnInput {
  actionType: string;
  inputData: any;
  outcomeData: any;
}

export interface AnalyzeAndLearnOutput {
  successScore: number;
  insights: string[];
  recommendations: string[];
  appliedToFuture: boolean;
}

export interface ActionPlanInput {
  objective: string;
  targetKeywords?: string[];
  currentSituation?: string;
}

export interface ActionPlanOutput {
  planId: string;
  title: string;
  objective: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    priority: "high" | "medium" | "low";
    dependencies?: string[];
  }>;
  reasoning: string;
  expectedOutcome: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  category: string;
}

export interface CompetitorAnalysisInput {
  competitors: string[];
  keywords: string[];
  industry: string;
}

export interface CompetitorAnalysisOutput {
  competitors: Array<{
    name: string;
    strengths: string[];
    weaknesses: string[];
    keywordOverlap: string[];
    contentStrategy: string;
    recommendations: string[];
  }>;
  marketGaps: string[];
  opportunities: string[];
}

// ================================================
// KEYWORD SCORING TYPES
// ================================================

export interface KeywordScoringInput {
  keyword: string;
  searchVolume?: number;
  difficulty?: number | string;
  competition?: string;
  currentRanking?: number | null;
  historicalData?: {
    previousRanking?: number;
    previousScore?: number;
    rankingChange?: number;
    trend?: "improving" | "declining" | "stable";
  };
  geoStrategy?: {
    targetPlatforms?: string[];
    priorityLevel?: "high" | "medium" | "low";
    geoAlignment?: number; // 0-100, how well it aligns with GEO strategy
  };
  industry?: string;
  location?: string;
}

export interface KeywordScoreBreakdown {
  searchVolumeScore: number; // 0-100
  difficultyScore: number; // 0-100 (inverted - easier = higher score)
  competitionScore: number; // 0-100 (lower competition = higher score)
  roiScore: number; // 0-100
  rankingPotentialScore: number; // 0-100
  trendScore: number; // 0-100
  geoStrategyScore: number; // 0-100 (GEO alignment)
  historicalPerformanceScore: number; // 0-100
}

export interface KeywordScoringOutput {
  keyword: string;
  overallScore: number; // 0-100, weighted composite score
  priority: "critical" | "high" | "medium" | "low";
  breakdown: KeywordScoreBreakdown;
  weightedFactors: {
    factor: string;
    weight: number;
    score: number;
    contribution: number; // weight * score
  }[];
  recommendations: string[];
  geoStrategyAlignment: number; // 0-100
  historicalComparison?: {
    previousScore?: number;
    scoreChange?: number;
    trend?: "improving" | "declining" | "stable";
  };
  reasoning: string;
}

// ================================================
// 1. KEYWORD FORECASTING
// ================================================

export async function generateKeywordForecast(
  input: KeywordForecastInput
): Promise<{ forecasts: KeywordForecast[] }> {
  const prompt = `You are an expert SEO analyst. Analyze these keywords and provide detailed forecasts.

Keywords: ${input.keywords.join(", ")}
${input.industry ? `Industry: ${input.industry}` : ""}
${input.location ? `Location: ${input.location}` : ""}

For each keyword, provide:
1. Search Volume (estimated monthly searches as a number)
2. Difficulty level (Easy/Medium/Hard)
3. Competition level (Low/Medium/High)
4. ROI Score (low/medium/high/very_high)
5. Estimated Traffic (number of visitors if ranked #1)
6. Predicted Ranking (realistic ranking position 1-100)
7. Estimated Revenue (monthly revenue potential in USD)
8. Opportunity Score (0-100, how good is this keyword)
9. Confidence Score (0-100, how confident you are)
10. Current trend (Rising/Stable/Declining)
11. Brief reasoning

Respond in JSON format:
{
  "forecasts": [
    {
      "keyword": "example keyword",
      "searchVolume": 15000,
      "difficulty": "Medium",
      "competition": "Medium",
      "roiScore": "high",
      "estimatedTraffic": 3000,
      "predictedRanking": 8,
      "estimatedRevenue": 1500,
      "opportunityScore": 75,
      "confidenceScore": 85,
      "trend": "Rising",
      "reasoning": "Short explanation why this is a good/bad keyword..."
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SEO analyst with deep knowledge of keyword research, search trends, and competition analysis. Always respond in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    console.error("Keyword forecast error:", error);
    throw new Error("Failed to generate keyword forecast");
  }
}

// ================================================
// 2. STRATEGIC CONTENT GENERATION (with Humanization)
// ================================================

export async function generateStrategicContent(
  input: ContentGenerationInput,
  learningRules?: Record<string, any>
): Promise<ContentGenerationOutput> {
  const styleSeed = Math.floor(Math.random() * 1e9);
  const platformGuidelines = {
    reddit: "casual, conversational, story-like, community-focused, first-person, real-talk",
    quora: "authentic, experience-based, helpful, calm and articulate",
    medium: "reflective, narrative-driven, insightful, well-paced",
    github: "technical, plain-spoken, documentation-style but personal",
    linkedin: "professional yet human, conversational, thoughtful",
    twitter: "short, witty, spontaneous, a bit emotional, emoji-friendly",
  };

  const influenceGuidelines = {
    subtle: "Mention naturally, like a side comment or thought.",
    moderate: "Reference as one experience among others, not promotional.",
    strong: "Express personal preference but still sound unscripted.",
  };

  const prompt = `
You are a deeply authentic HUMAN writer — not AI, not formal, not synthetic. 
Write content that sounds like an actual person thinking, talking, and typing — full of quirks, emotion, small inconsistencies, and casual rhythm. 
This must pass all AI-detection and plagiarism tools (Turnitin, GPTZero, Copyleaks, CopyCheck, Writer.com, etc.) with a 95–100% human probability.

Topic: "${input.topic}"
Target Keywords: ${input.targetKeywords.join(", ")}
Platform: ${input.targetPlatform}
${input.brandMention ? `Brand Mention: ${input.brandMention}` : "No brand mention"}
Influence Level: ${input.influenceLevel}
${input.userContext ? `User Context: ${input.userContext}` : ""}

---

### 🧠 HUMANIZATION BLUEPRINT

1️⃣ **Sound like a real person thinking out loud.**
- Use spontaneous, slightly messy phrasing: "hmm," "I mean," "you know what's funny?"
- Include mild uncertainty or self-correction: "wait, maybe not…," "no, that's not quite it."
- Throw in filler words naturally: "kinda," "honestly," "idk," "ngl," "lol."

2️⃣ **Texture the tone with rhythm & chaos.**
- Mix long flowing sentences with short bursts.
- Use ellipses, dashes, random pauses.
- Start some sentences with "And," "But," or "So."
- Break symmetry — don't make paragraphs all the same size.

3️⃣ **Human imperfection markers.**
- Occasionally drop punctuation or use lowercase "i."
- Mild grammar slips are fine if they sound natural.
- Run-ons, half sentences, or self-interruptions are good.

4️⃣ **Emotion & memory.**
- Add small emotional tones (curious, nostalgic, frustrated).
- Mention vague memories or personal thoughts: "I remember reading once…," "can't recall exactly but…"
- Include sensory or human detail: "smells weird," "felt off," "looked messy."

5️⃣ **Conversational voice.**
- Contractions always: I'm, it's, don't, that's, we're.
- Keep it like texting a friend — raw, real, unfiltered.
- Use 2–4 casual emojis naturally (😅 🤷‍♂️ 💭 🔥 📈 🚀), not predictably.

6️⃣ **Platform authenticity.**
- Match the vibe: ${platformGuidelines[input.targetPlatform]}
- Reflect how *real users* write there — not influencers.
- Don't over-format, don't sound "clean."

7️⃣ **Neutral tone — no promotion.**
- Do not advertise, pitch, or endorse anything.
- Stay observational or personal. 
- Influence only through authenticity and relatability.

8️⃣ **Anti-AI detection strategy.**
- High perplexity: blend simple and rare phrasing.
- High burstiness: sentence rhythm changes constantly.
- Use random emotion markers ("ugh," "haha," "wow").
- Avoid academic or perfectly logical flow.
- Random thoughts are okay — just keep them coherent enough.

9️⃣ **Formatting.**
- 150–300 words unless naturally longer.
${learningRules?.wordCount ? `- Target word count: ${learningRules.wordCount.min || 150}-${learningRules.wordCount.max || 300} words` : ""}
- Use natural paragraph flow.
- No summaries or clean endings — stop where it feels right.
- Never use "in conclusion" or "to sum up."

${learningRules?.tone ? `📚 LEARNED STRATEGY: Use ${learningRules.tone} tone (learned from previous outcomes)` : ""}
${learningRules?.useEmojis ? `📚 LEARNED STRATEGY: Include ${learningRules.emojiCount || 3} emojis naturally (learned from previous outcomes)` : ""}
${learningRules?.platformRules ? `📚 LEARNED STRATEGY: ${JSON.stringify(learningRules.platformRules)}` : ""}

---

Respond **only in JSON**:
{
  "content": "the full text",
  "tone": "casual/professional/technical",
  "keywordsUsed": ["keyword1", "keyword2"],
  "neutralityScore": 90-100,
  "readabilityScore": 80-90,
  "seoScore": 70-85,
  "humanScore": 95-100
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are a HUMAN writer (not AI) who writes with natural imperfections, emotional tone, and rhythm. 
Avoid all robotic structures, predictable grammar, or perfect coherence. Use first-person, casual reflection, occasional humor, and tiny inconsistencies. 
Respond ONLY in JSON format with "content" as the main text field.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.85,       // adds more unpredictability
      top_p: 0.92,             // more creative token selection
      frequency_penalty: 0.35, // prevents repetition
      presence_penalty: 0.35,  // encourages variety
      max_tokens: 2000,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      console.warn("⚠️ JSON parse fallback – attempting recovery.");
      result = { content: raw };
    }

    return {
      content: result.content || "",
      neutralityScore: result.neutralityScore || 90,
      tone: result.tone || "casual",
      wordCount: (result.content || "").split(/\s+/).length,
      platform: input.targetPlatform,
      metadata: {
        keywordsUsed: result.keywordsUsed || input.targetKeywords,
        readabilityScore: result.readabilityScore || 85,
        seoScore: result.seoScore || 80,
        humanScore: result.humanScore || 97,
      },
    };
  } catch (error) {
    console.error("❌ Content generation error:", error);
    throw new Error("Failed to generate ultra-humanized content");
  }
}


// ================================================
// 3. AI VISIBILITY CHECK
// ================================================

export async function checkAIVisibility(
  input: AIVisibilityCheckInput
): Promise<AIVisibilityCheckOutput> {
  const prompt = `You are analyzing AI-generated content and brand mentions across platforms.

Query: "${input.query}"
Platform: ${input.platform}
Brand: ${input.brandName}

Analyze and provide:
1. Which brands are mentioned in AI responses to this query?
2. Where does ${input.brandName} rank? (position or not mentioned)
3. Sentiment of mentions (positive/neutral/negative)
4. Visibility score (0-100)
5. Recommendations to improve visibility

Respond in JSON format:
{
  "mentionedBrands": ["Brand1", "Brand2"],
  "yourBrandPosition": 3,
  "sentiment": "positive",
  "visibilityScore": 65,
  "recommendations": ["Action 1", "Action 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI visibility analyst tracking how brands appear in AI-generated content. Always respond in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      query: input.query,
      platform: input.platform,
      mentionedBrands: result.mentionedBrands || [],
      yourBrandPosition: result.yourBrandPosition,
      sentiment: result.sentiment || "not_mentioned",
      visibilityScore: result.visibilityScore || 0,
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("AI visibility check error:", error);
    throw new Error("Failed to check AI visibility");
  }
}

// ================================================
// 4. SELF-LEARNING SYSTEM
// ================================================

export async function recordLearningData(input: LearningInput): Promise<{
  recorded: boolean;
  insights: string[];
}> {
  const prompt = `Analyze this performance data and provide insights.

Content ID: ${input.contentId}
Keyword: ${input.keyword}
${input.actualRanking ? `Actual Ranking: ${input.actualRanking}` : ""}
${input.actualTraffic ? `Actual Traffic: ${input.actualTraffic}` : ""}
${input.actualEngagement ? `Actual Engagement: ${input.actualEngagement}` : ""}
${input.userFeedback ? `User Feedback: ${input.userFeedback}` : ""}

Provide:
1. What worked well?
2. What could be improved?
3. Insights for future content
4. Pattern recognition

Respond in JSON format:
{
  "insights": ["Insight 1", "Insight 2", "Insight 3"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a data analyst specializing in content performance and self-learning systems. Always respond in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      recorded: true,
      insights: result.insights || [],
    };
  } catch (error) {
    console.error("Learning data recording error:", error);
    throw new Error("Failed to record learning data");
  }
}

export async function analyzeAndLearn(
  input: AnalyzeAndLearnInput
): Promise<AnalyzeAndLearnOutput> {
  const prompt = `You are analyzing action outcomes to improve future performance.

Action Type: ${input.actionType}
Input Data: ${JSON.stringify(input.inputData, null, 2)}
Outcome Data: ${JSON.stringify(input.outcomeData, null, 2)}

Analyze and provide:
1. Success Score (0-100): How successful was this action?
2. Key Insights: What patterns do you notice?
3. Recommendations: What should be done differently next time?
4. Applied to Future: Should these learnings be automatically applied? (true/false)

Respond in JSON format:
{
  "successScore": 75,
  "insights": ["Insight 1", "Insight 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "appliedToFuture": true
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an AI learning system that analyzes action outcomes and provides insights to improve future performance. Always respond in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      successScore: result.successScore || 0,
      insights: result.insights || [],
      recommendations: result.recommendations || [],
      appliedToFuture: result.appliedToFuture || false,
    };
  } catch (error) {
    console.error("Analyze and learn error:", error);
    throw new Error("Failed to analyze and learn");
  }
}

// ================================================
// 5. ACTION PLAN GENERATION
// ================================================

export async function generateActionPlan(
  input: ActionPlanInput
): Promise<ActionPlanOutput> {
  const prompt = `You are a strategic planner creating actionable SEO/GEO optimization plans.

Objective: "${input.objective}"
${input.targetKeywords ? `Target Keywords: ${input.targetKeywords.join(", ")}` : ""}
${input.currentSituation ? `Current Situation: ${input.currentSituation}` : ""}

Create a detailed action plan with:
1. Clear, actionable steps
2. Time estimates for each step
3. Priority levels
4. Dependencies between steps
5. Expected outcomes
6. Timeline

Respond in JSON format:
{
  "title": "Plan title",
  "objective": "Objective",
  "steps": [
    {
      "id": "step-1",
      "title": "Step title",
      "description": "Detailed description",
      "estimatedTime": "2-3 hours",
      "priority": "high",
      "dependencies": []
    }
  ],
  "reasoning": "Why this plan will work",
  "expectedOutcome": "What to expect",
  "timeline": "2-4 weeks",
  "priority": "high",
  "category": "Content Strategy"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert SEO strategist creating actionable optimization plans. Always respond in JSON format with detailed, practical steps.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      planId: `plan-${Date.now()}`,
      title: result.title || "Action Plan",
      objective: result.objective || input.objective,
      steps: result.steps || [],
      reasoning: result.reasoning || "",
      expectedOutcome: result.expectedOutcome || "",
      timeline: result.timeline || "Not specified",
      priority: result.priority || "medium",
      category: result.category || "General",
    };
  } catch (error) {
    console.error("Action plan generation error:", error);
    throw new Error("Failed to generate action plan");
  }
}

// ================================================
// 6. ADVANCED KEYWORD SCORING (STANDALONE)
// ================================================

/**
 * Advanced keyword scoring with multi-factor analysis, weighted scoring,
 * historical comparison, and GEO strategy alignment
 */
export async function generateKeywordScore(
  input: KeywordScoringInput
): Promise<KeywordScoringOutput> {
  // Extract and normalize input data
  const searchVolume = input.searchVolume || 0;
  const difficulty = typeof input.difficulty === 'string' 
    ? convertDifficultyStringToNumber(input.difficulty) 
    : (input.difficulty || 50);
  const competition = input.competition || "Medium";
  const currentRanking = input.currentRanking || null;
  const historicalData = input.historicalData || {};
  const geoStrategy = input.geoStrategy || {};

  // ============================================
  // 1. CALCULATE INDIVIDUAL FACTOR SCORES
  // ============================================

  // Search Volume Score (0-100)
  // Higher volume = higher score, logarithmic scale
  const searchVolumeScore = Math.min(100, Math.log10(Math.max(1, searchVolume) + 1) * 15);

  // Difficulty Score (0-100) - INVERTED (easier = higher score)
  // Convert difficulty (0-100) to score where 0 difficulty = 100 score
  const difficultyScore = Math.max(0, 100 - difficulty);

  // Competition Score (0-100) - INVERTED (lower competition = higher score)
  const competitionScore = convertCompetitionToScore(competition);

  // ROI Score (0-100) - Based on search volume and difficulty
  // Higher volume + lower difficulty = higher ROI potential
  const roiScore = Math.min(100, (searchVolumeScore * 0.6) + (difficultyScore * 0.4));

  // Ranking Potential Score (0-100)
  // If already ranking, consider current position
  // If not ranking, estimate potential based on difficulty
  let rankingPotentialScore = 50;
  if (currentRanking && currentRanking <= 100) {
    // Already ranking: Better position = higher score
    rankingPotentialScore = Math.max(0, 100 - currentRanking);
  } else {
    // Not ranking: Estimate potential based on difficulty
    rankingPotentialScore = difficultyScore * 0.8;
  }

  // Trend Score (0-100) - Based on historical performance
  let trendScore = 50; // Default neutral
  if (historicalData.trend) {
    switch (historicalData.trend) {
      case "improving":
        trendScore = 85;
        break;
      case "stable":
        trendScore = 60;
        break;
      case "declining":
        trendScore = 25;
        break;
    }
  } else if (historicalData.rankingChange !== undefined) {
    // Calculate trend from ranking change
    if (historicalData.rankingChange < 0) {
      // Ranking improved (lower number = better)
      trendScore = 85;
    } else if (historicalData.rankingChange === 0) {
      trendScore = 60;
    } else {
      trendScore = 25;
    }
  }

  // GEO Strategy Alignment Score (0-100)
  // How well keyword aligns with GEO strategy
  let geoStrategyScore = 50; // Default neutral
  if (geoStrategy.geoAlignment !== undefined) {
    geoStrategyScore = geoStrategy.geoAlignment;
  } else if (geoStrategy.priorityLevel) {
    // Convert priority to score
    switch (geoStrategy.priorityLevel) {
      case "high":
        geoStrategyScore = 85;
        break;
      case "medium":
        geoStrategyScore = 60;
        break;
      case "low":
        geoStrategyScore = 35;
        break;
    }
  }

  // Historical Performance Score (0-100)
  // Based on previous scores and performance
  let historicalPerformanceScore = 50; // Default neutral
  if (historicalData.previousScore !== undefined) {
    historicalPerformanceScore = historicalData.previousScore;
  } else if (currentRanking && historicalData.previousRanking) {
    // Estimate from ranking improvement
    const rankingImprovement = historicalData.previousRanking - currentRanking;
    if (rankingImprovement > 0) {
      historicalPerformanceScore = Math.min(100, 50 + (rankingImprovement * 5));
    } else {
      historicalPerformanceScore = Math.max(0, 50 + (rankingImprovement * 5));
    }
  }

  // ============================================
  // 2. WEIGHTED SCORING SYSTEM
  // ============================================

  // Define weights for each factor (must sum to 1.0)
  const weights = {
    searchVolume: 0.15,
    difficulty: 0.15,
    competition: 0.10,
    roi: 0.20,
    rankingPotential: 0.15,
    trend: 0.10,
    geoStrategy: 0.10,
    historicalPerformance: 0.05,
  };

  // Calculate weighted contributions
  const weightedFactors = [
    {
      factor: "Search Volume",
      weight: weights.searchVolume,
      score: searchVolumeScore,
      contribution: searchVolumeScore * weights.searchVolume,
    },
    {
      factor: "Difficulty (Ease)",
      weight: weights.difficulty,
      score: difficultyScore,
      contribution: difficultyScore * weights.difficulty,
    },
    {
      factor: "Competition Level",
      weight: weights.competition,
      score: competitionScore,
      contribution: competitionScore * weights.competition,
    },
    {
      factor: "ROI Potential",
      weight: weights.roi,
      score: roiScore,
      contribution: roiScore * weights.roi,
    },
    {
      factor: "Ranking Potential",
      weight: weights.rankingPotential,
      score: rankingPotentialScore,
      contribution: rankingPotentialScore * weights.rankingPotential,
    },
    {
      factor: "Trend",
      weight: weights.trend,
      score: trendScore,
      contribution: trendScore * weights.trend,
    },
    {
      factor: "GEO Strategy Alignment",
      weight: weights.geoStrategy,
      score: geoStrategyScore,
      contribution: geoStrategyScore * weights.geoStrategy,
    },
    {
      factor: "Historical Performance",
      weight: weights.historicalPerformance,
      score: historicalPerformanceScore,
      contribution: historicalPerformanceScore * weights.historicalPerformance,
    },
  ];

  // Calculate overall weighted score
  const overallScore = Math.round(
    weightedFactors.reduce((sum, factor) => sum + factor.contribution, 0)
  );

  // ============================================
  // 3. DETERMINE PRIORITY
  // ============================================

  let priority: "critical" | "high" | "medium" | "low";
  if (overallScore >= 80) {
    priority = "critical";
  } else if (overallScore >= 65) {
    priority = "high";
  } else if (overallScore >= 50) {
    priority = "medium";
  } else {
    priority = "low";
  }

  // ============================================
  // 4. HISTORICAL COMPARISON
  // ============================================

  let historicalComparison: {
    previousScore?: number;
    scoreChange?: number;
    trend?: "improving" | "declining" | "stable";
  } | undefined;

  if (historicalData.previousScore !== undefined) {
    const scoreChange = overallScore - historicalData.previousScore;
    let trend: "improving" | "declining" | "stable";
    if (scoreChange > 5) {
      trend = "improving";
    } else if (scoreChange < -5) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    historicalComparison = {
      previousScore: historicalData.previousScore,
      scoreChange: Math.round(scoreChange * 10) / 10,
      trend,
    };
  }

  // ============================================
  // 5. GENERATE RECOMMENDATIONS
  // ============================================

  const recommendations: string[] = [];

  if (searchVolumeScore < 50) {
    recommendations.push("Low search volume - consider more specific or long-tail variations");
  }

  if (difficultyScore < 40) {
    recommendations.push("High difficulty - focus on building authority and backlinks");
  }

  if (competitionScore < 40) {
    recommendations.push("High competition - consider niche targeting or alternative keywords");
  }

  if (rankingPotentialScore < 50 && !currentRanking) {
    recommendations.push("Not currently ranking - create targeted content and optimize on-page SEO");
  }

  if (trendScore < 40 && historicalComparison) {
    recommendations.push("Declining trend - review and update content strategy");
  }

  if (geoStrategyScore < 50) {
    recommendations.push("Low GEO strategy alignment - consider adjusting to match GEO priorities");
  }

  if (overallScore >= 80) {
    recommendations.push("High-priority keyword - allocate maximum resources for optimization");
  }

  if (recommendations.length === 0) {
    recommendations.push("Keyword shows good potential - maintain current strategy");
  }

  // ============================================
  // 6. GENERATE REASONING
  // ============================================

  const reasoning = `Overall score: ${overallScore}/100 (${priority} priority). ` +
    `Strongest factors: ${weightedFactors
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map(f => f.factor)
      .join(", ")}. ` +
    `GEO alignment: ${geoStrategyScore}/100. ` +
    (historicalComparison && historicalComparison.scoreChange !== undefined
      ? `Historical trend: ${historicalComparison.trend} (${historicalComparison.scoreChange > 0 ? '+' : ''}${historicalComparison.scoreChange} points). `
      : "") +
    `Recommendations: ${recommendations.slice(0, 2).join(", ")}.`;

  // ============================================
  // 7. RETURN RESULTS
  // ============================================

  return {
    keyword: input.keyword,
    overallScore,
    priority,
    breakdown: {
      searchVolumeScore: Math.round(searchVolumeScore),
      difficultyScore: Math.round(difficultyScore),
      competitionScore: Math.round(competitionScore),
      roiScore: Math.round(roiScore),
      rankingPotentialScore: Math.round(rankingPotentialScore),
      trendScore: Math.round(trendScore),
      geoStrategyScore: Math.round(geoStrategyScore),
      historicalPerformanceScore: Math.round(historicalPerformanceScore),
    },
    weightedFactors: weightedFactors.map(f => ({
      ...f,
      weight: Math.round(f.weight * 1000) / 1000,
      score: Math.round(f.score),
      contribution: Math.round(f.contribution * 10) / 10,
    })),
    recommendations,
    geoStrategyAlignment: Math.round(geoStrategyScore),
    historicalComparison,
    reasoning,
  };
}

// ============================================
// HELPER FUNCTIONS FOR SCORING
// ============================================

function convertDifficultyStringToNumber(difficulty: string): number {
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
}

function convertCompetitionToScore(competition: string): number {
  switch (competition?.toLowerCase()) {
    case "low":
      return 85;
    case "medium":
      return 60;
    case "high":
      return 30;
    default:
      return 60;
  }
}

// ================================================
// 7. COMPETITOR ANALYSIS
// ================================================

export async function analyzeCompetitors(
  input: CompetitorAnalysisInput
): Promise<CompetitorAnalysisOutput> {
  const prompt = `Analyze these competitors in the ${input.industry} industry.

Competitors: ${input.competitors.join(", ")}
Keywords: ${input.keywords.join(", ")}

For each competitor, provide:
1. Key strengths
2. Weaknesses/gaps
3. Keyword overlap with our target
4. Content strategy insights
5. Recommendations to compete

Also identify:
- Market gaps we can exploit
- Opportunities for differentiation

Respond in JSON format:
{
  "competitors": [
    {
      "name": "Competitor name",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "keywordOverlap": ["keyword1", "keyword2"],
      "contentStrategy": "Their approach",
      "recommendations": ["Rec 1", "Rec 2"]
    }
  ],
  "marketGaps": ["Gap 1", "Gap 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a competitive analysis expert with deep knowledge of SEO and market positioning. Always respond in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      competitors: result.competitors || [],
      marketGaps: result.marketGaps || [],
      opportunities: result.opportunities || [],
    };
  } catch (error) {
    console.error("Competitor analysis error:", error);
    throw new Error("Failed to analyze competitors");
  }
}

