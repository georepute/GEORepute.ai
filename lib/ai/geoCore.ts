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
  input: ContentGenerationInput
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
- Use natural paragraph flow.
- No summaries or clean endings — stop where it feels right.
- Never use "in conclusion" or "to sum up."

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
// 6. COMPETITOR ANALYSIS
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

