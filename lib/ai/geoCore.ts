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
import type { DomainEnrichmentData } from "@/lib/utils/domainEnrichment";
import { formatDomainDataForPrompt } from "@/lib/utils/domainEnrichment";

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
  targetPlatform: "reddit" | "quora" | "medium" | "github" | "linkedin" | "twitter" | "instagram" | "facebook" | "shopify";
  brandMention?: string;
  influenceLevel: "subtle" | "moderate" | "strong";
  userContext?: string;
  brandVoice?: any; // Brand voice profile
  language?: "en" | "he"; // Language for content generation (default: "en")
  contentType?: "article" | "post" | "answer" | "newsletter" | "linkedin_article" | "linkedin_post" | "blog_article"; // Content type for formatting
  websiteUrl?: string; // User's website URL for backlinks (from brand project)
}

export interface ContentGenerationOutput {
  content: string;
  neutralityScore: number;
  tone: string;
  wordCount: number;
  platform: string;
  ai_model?: string;
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

export interface GscKeywordData {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface AiVisibilityPlatformData {
  platform: string;
  prompt: string;
  response: string | null;
  gap_suggestion: string | null;
  response_metadata?: Record<string, any>;
}

export interface ActionPlanInput {
  objective: string;
  targetKeywords?: string[];
  currentSituation?: string;
  domain?: string;
  domainEnrichment?: DomainEnrichmentData | null; // Enriched domain data from crawler
  region?: string;
  channels?: string[]; // ['all'] or specific channels like ['seo', 'social_media', 'content']
  language?: "en" | "he";
  // GSC performance data
  gscKeywords?: GscKeywordData[];   // Top queries from gsc_keywords (project-linked)
  gscQueries?: GscKeywordData[];    // Top queries from gsc_queries (domain-linked)
  gscPages?: GscPageData[];         // Top pages from gsc_pages (domain-linked)
  // AI visibility data from brand analysis sessions
  aiVisibilityData?: AiVisibilityPlatformData[];
}

export interface ActionPlanOutput {
  planId: string;
  title: string;
  objective: string;
  channels?: string[]; // ['seo', 'social_media', 'content', etc.]
  seo_geo_classification?: "SEO" | "GEO";
  target_keyword_phrase?: string;
  expected_timeline_months?: number;
  safety_buffer_months?: number;
  first_page_estimate_months?: number | null;
  context_explanation?: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    priority: "high" | "medium" | "low";
    dependencies?: string[];
    channel?: string; // 'seo', 'social_media', 'content', 'email', etc.
    platform?: string; // 'reddit', 'linkedin', 'email', etc.
    executionType?: "content_generation" | "audit" | "analysis" | "manual";
    executionMetadata?: {
      platform?: string;
      topic?: string;
      keywords?: string[];
      contentType?: "article" | "post" | "answer" | "newsletter" | "linkedin_article" | "linkedin_post";
      articles_per_topic?: number;
      word_count_per_article?: number;
      autoExecute?: boolean;
      requiresTools?: string[];
    };
  }>;
  reasoning: string;
  expectedOutcome: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  category: string;
  businessPlanData?: {
    kpis: Array<{
      name: string;
      current: string;
      target: string;
      timeframe: string;
      metric_type: string;
    }>;
    budget: {
      total_estimated: string;
      breakdown: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
    };
    roi_projection: {
      monthly_projections: Array<{
        month: number;
        investment: number;
        estimated_return: number;
        cumulative_roi: number;
      }>;
      break_even_month: number;
      projected_annual_roi: string;
    };
    competitive_positioning: {
      summary: string;
      strengths: string[];
      gaps: string[];
      market_opportunity: string;
    };
    milestones: Array<{
      month: number;
      title: string;
      goals: string[];
    }>;
  };
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
  
  // Platform personality guidelines - ONLY used when NO brand voice is selected
  const platformGuidelines = {
    reddit: "casual, conversational, story-like, community-focused, first-person, real-talk",
    quora: "authentic, experience-based, helpful, calm and articulate",
    medium: "reflective, narrative-driven, insightful, well-paced",
    github: "technical, plain-spoken, documentation-style but personal",
    linkedin: "professional yet human, conversational, thoughtful",
    twitter: "short, witty, spontaneous, a bit emotional",
    facebook: "casual, personal, community-focused, friendly",
    instagram: "visual storytelling, authentic, trendy, personal",
    shopify: "professional, informative, comprehensive, SEO-optimized, blog-style with HTML formatting",
  };

  const influenceGuidelines = {
    subtle: "Mention naturally, like a side comment or thought.",
    moderate: "Reference as one experience among others, not promotional.",
    strong: "Express personal preference but still sound unscripted.",
  };

  // Tone-specific guidelines to enforce brand voice tone
  const toneGuidelines = {
    casual: "Relaxed, friendly, conversational. Use contractions, informal language, be approachable. Like talking to a friend.",
    professional: "Polished, competent, respectful. Clear and concise. Maintain expertise without being stuffy or robotic.",
    formal: "Sophisticated, proper, refined. Complete sentences, proper grammar, elevated vocabulary. Authoritative yet accessible.",
    friendly: "Warm, welcoming, supportive. Positive energy, encouraging language. Make readers feel comfortable and valued.",
    humorous: "Witty, playful, entertaining. Use jokes, puns, clever observations. Keep it light and fun without being unprofessional.",
    authoritative: "Confident, expert, commanding. Assert knowledge firmly. Be the trusted source. Strong, definitive statements.",
    neutral: "Balanced, objective, informative. Present facts without strong emotion. Even-keeled and measured.",
  };

  // Language instruction
  const languageInstruction = input.language === "he" 
    ? `\n🌐 HEBREW-ONLY REQUIREMENT (STRICT):
- Output ONLY valid Hebrew text: Hebrew letters (א-ת), optional niqqud, standard punctuation (. , ? ! " ' - : ;). No other characters.
- Do NOT use Latin/English letters (e.g. "Israel", "L") or transliterations in parentheses like (Israel haGedolah). Write the concept in Hebrew only (e.g. ישראל, ישראל הגדולה).
- Do NOT output corrupted text, random symbols, or mixed scripts (e.g. no L†)@)\\|&$^ or similar). If a word is normally written in Hebrew, use only Hebrew.
- Write naturally in Hebrew, as a native speaker. Every word must be in Hebrew script. No English, no transliterations, no mixed/corrupted characters.
- Length: minimum 150 words; aim for 200-300. Complete every sentence; never cut off mid-word or with garbage characters.\n`
    : "";

  let finalReminder: string;
  if (input.brandVoice) {
    finalReminder = `═══════════════════════════════════════════════════════════════════
BRAND VOICE REQUIREMENTS:
═══════════════════════════════════════════════════════════════════
✅ Brand: ${input.brandVoice.brand_name}
✅ Tone: ${input.brandVoice.tone.toUpperCase()} (this defines HOW you speak)
✅ Personality: ${input.brandVoice.personality_traits?.join(", ") || "authentic"} (this defines WHO you are)
✅ Emoji Style: ${input.brandVoice.emoji_style} (this is YOUR style)
✅ Use Words: "${input.brandVoice.preferred_words?.join('", "') || "no specific words"}"
✅ NEVER Use: "${input.brandVoice.avoid_words?.join('", "') || "none"}"
✅ Signature Phrases: ${input.brandVoice.signature_phrases?.length > 0 ? `"${input.brandVoice.signature_phrases.join('", "')}"` : "none"}

PLATFORM FORMATTING:
═══════════════════════════════════════════════════════════════════
📍 Platform: ${input.targetPlatform} (this ONLY affects length/structure, NOT your personality)
${input.brandVoice.use_emojis ? `✅ Emoji style: ${input.brandVoice.emoji_style} - Use emojis naturally according to your brand voice` : `⚠️ PLATFORM RULE: NO EMOJIS. Brand voice disallows emojis - Remove ALL emojis from content.`}

🚨 CRITICAL: Write as ${input.brandVoice.brand_name} posting on ${input.targetPlatform}.
NOT as a generic ${input.targetPlatform} user!

Your ${input.brandVoice.tone} tone and ${input.brandVoice.personality_traits?.join("/") || "authentic"} personality
must be present in EVERY sentence, regardless of platform.
${input.brandVoice.use_emojis ? `✅ Use emojis in ${input.brandVoice.emoji_style} style as specified by your brand voice` : `⚠️ REMEMBER: Brand voice disallows emojis - content must be completely emoji-free.`}
═══════════════════════════════════════════════════════════════════

Respond **ONLY in JSON** format with fields: content (string), tone (string), keywordsUsed (array), neutralityScore (number), readabilityScore (number), seoScore (number), humanScore (number).`;
  } else {
    finalReminder = `Write professional, clean, structured content.

Respond **ONLY in JSON** format with fields: content (string), tone (string), keywordsUsed (array), neutralityScore (number), readabilityScore (number), seoScore (number), humanScore (number).`;
  }

  const prompt = `
⚠️ CRITICAL MISSION: Write like a REAL HUMAN with a professional, clean writing style.
You are NOT an AI. You are NOT a content writer. You are a professional person sharing valuable thoughts on ${input.targetPlatform}.
This MUST score 100% HUMAN on ALL AI detectors (GPTZero, Turnitin, Copyleaks, Writer.com, Originality.ai, Content at Scale, ZeroGPT, etc.)

🚫 STRICT PROHIBITIONS:
- NO EMOJIS WHATSOEVER - Content must be completely emoji-free
- NO EXCESSIVE CASUAL SLANG - Avoid: "LOL", "lol", "lmao", "bruh", "omg", "wtf", "smh", "fr", "deadass"
- NO EXCESSIVE CASUAL LANGUAGE - Write naturally but professionally, like a real person's Facebook post (clean and structured)
- Keep language clean and professional while maintaining natural human voice

✅ CONTENT REQUIREMENTS:
- Write clean, structured, professional content
- Keep language natural and professional
- Focus on clear communication and value
${languageInstruction}
Topic: "${input.topic}"
Keywords: ${input.targetKeywords.join(", ")} (sneak them in naturally, don't force${input.language === "he" ? "; when writing in Hebrew use only Hebrew equivalents—never write English or other language words in the content" : ""})
Platform: ${input.targetPlatform}
${input.brandMention ? `Brand: ${input.brandMention} (${influenceGuidelines[input.influenceLevel]})` : "No brand"}
${input.userContext ? `Context: ${input.userContext}` : ""}

${input.brandVoice ? `
═══════════════════════════════════════════════════════════════════
🎭 BRAND VOICE REQUIREMENTS - THIS IS YOUR PRIMARY IDENTITY
═══════════════════════════════════════════════════════════════════

YOU ARE WRITING AS: ${input.brandVoice.brand_name}
${input.brandVoice.description ? `Brand Identity: ${input.brandVoice.description}` : ""}

⭐ PRIMARY TONE: ${input.brandVoice.tone.toUpperCase()}
${toneGuidelines[input.brandVoice.tone as keyof typeof toneGuidelines] || ""}

EVERY SENTENCE MUST REFLECT THIS TONE. This is NOT optional.

🎯 PERSONALITY TRAITS (Embody ALL of these):
${input.brandVoice.personality_traits && input.brandVoice.personality_traits.length > 0 ? input.brandVoice.personality_traits.map((t: string) => `✓ ${t}`).join("\n") : "✓ Authentic and genuine"}

📝 WRITING STYLE:
- Sentence Length: ${input.brandVoice.sentence_length || "mixed"}
- Vocabulary Level: ${input.brandVoice.vocabulary_level || "intermediate"}
- Emoji Usage: ${input.brandVoice.emoji_style} ${input.brandVoice.use_emojis ? "(use them naturally)" : "(avoid emojis)"}

✅ PREFERRED WORDS (Weave these throughout - they define this brand):
${input.brandVoice.preferred_words && input.brandVoice.preferred_words.length > 0 ? input.brandVoice.preferred_words.map((w: string) => `"${w}"`).join(", ") : "No specific words"}

❌ FORBIDDEN WORDS (NEVER use these - they're off-brand):
${input.brandVoice.avoid_words && input.brandVoice.avoid_words.length > 0 ? input.brandVoice.avoid_words.map((w: string) => `"${w}"`).join(", ") : "None"}

💬 SIGNATURE PHRASES (Use these naturally when relevant):
${input.brandVoice.signature_phrases && input.brandVoice.signature_phrases.length > 0 ? input.brandVoice.signature_phrases.map((p: string) => `"${p}"`).join("\n") : "None"}

⚠️ CRITICAL: Your brand voice is WHO YOU ARE. The platform (${input.targetPlatform}) is just WHERE you're speaking.
Your ${input.brandVoice.tone} tone and ${input.brandVoice.personality_traits?.join(", ") || "authentic"} personality must shine through 
on ${input.targetPlatform}, while adapting to that platform's format (length, style). 

Think: "A ${input.brandVoice.tone} person posting on ${input.targetPlatform}" NOT "A generic ${input.targetPlatform} user"

═══════════════════════════════════════════════════════════════════
` : ""}

---

### 🚨 CONTENT REQUIREMENTS

4️⃣ **PLATFORM-SPECIFIC FORMATTING**
${input.brandVoice ? `
═══════════════════════════════════════════════════════════════════
🎭 BRAND VOICE MODE ACTIVE
═══════════════════════════════════════════════════════════════════
You are: ${input.brandVoice.brand_name}
Your brand voice controls EVERYTHING:
✅ TONE: ${input.brandVoice.tone} (defines HOW you speak)
✅ PERSONALITY: ${input.brandVoice.personality_traits?.join(", ") || "authentic"} (defines WHO you are)
✅ EMOJI STYLE: ${input.brandVoice.emoji_style} 
✅ USE WORDS: ${input.brandVoice.preferred_words?.join(", ") || "no specific words"}
✅ NEVER USE: ${input.brandVoice.avoid_words?.join(", ") || "none"}
${input.brandVoice.signature_phrases && input.brandVoice.signature_phrases.length > 0 ? `✅ SIGNATURE: ${input.brandVoice.signature_phrases.map((p: string) => `"${p}"`).join(", ")}` : ""}

Platform (${input.targetPlatform}) = FORMAT/STRUCTURE ONLY.
Your brand voice personality NEVER changes regardless of platform.
═══════════════════════════════════════════════════════════════════
` : ""}

${input.targetPlatform === 'reddit' ? `- Reddit style: ${input.brandVoice ? "Format only - " : ""}Casual but professional, use "OP", "TL;DR", "edit:", "this", "that", "imo", "honestly"
- Include Reddit-isms: "this", "that", "honestly", "I mean", "you know" (but NO "lol" or excessive slang)
- Paragraph breaks are common, sometimes one-liners
- Use markdown sparingly (bold for emphasis, not structure)
- Conversational, story-like, community-focused, first-person, real-talk but professional
${input.brandVoice ? `- IGNORE "casual" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'quora' ? `- Quora style: ${input.brandVoice ? "Format only - " : ""}Authentic, experience-based, helpful, calm and articulate
- Use "I've found that...", "In my experience...", "What I noticed is..."
- Longer paragraphs, but still conversational
- Ask rhetorical questions: "Right?", "You know?", "Makes sense?"
- Thoughtful but authentic, personal experience heavy
${input.brandVoice ? `- IGNORE "thoughtful conversational" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'medium' ? `- Medium style: ${input.brandVoice ? "Format only - " : ""}Reflective, narrative-driven, insightful, well-paced
- Personal voice: "I've been thinking about...", "It struck me that..."
- Mix of short and long paragraphs
- Use dashes and ellipses for pauses
- Thoughtful and well-structured but still human
${input.brandVoice ? `- IGNORE "reflective" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'github' ? `- GitHub style: ${input.brandVoice ? "Format only - " : ""}Technical, plain-spoken, documentation-style but personal
- Use "I've been working with...", "In my setup...", "YMMV"
- Code references feel natural, not forced
- Casual technical talk, straightforward and clear
${input.brandVoice ? `- IGNORE "technical personal" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'linkedin' ? `- LinkedIn style: ${input.brandVoice ? "Format only - " : ""}Professional yet human, conversational, thoughtful
- Use "I've noticed...", "In my experience...", "Something I learned..."
- Professional but approachable, slightly more polished
- Personal insights, not corporate speak
- ⚠️ CRITICAL: NO EMOJIS ALLOWED - Content must be completely emoji-free
${input.contentType === 'linkedin_article' || input.contentType === 'article' ? `
- 📄 FORMAT: ARTICLE
- Length: Long, detailed content (typically 1000+ words)
- Purpose: Inform, explain, educate deeply on the topic
- Tone: Formal or professional, well-structured
- Research: Well-researched, factual, comprehensive
- Structure: Clear sections with headings (use H2: "## Heading Text"), organized flow
- Paragraphs: Longer paragraphs (3-5 sentences each)
- Content: In-depth exploration with thorough analysis
- Must be written in clearly human tone - natural, conversational, but professional
- Professional article format suitable for LinkedIn Articles
` : input.contentType === 'linkedin_post' || input.contentType === 'post' ? `
- 📝 FORMAT: POST
- Length: Short to medium (typically 300-800 words)
- Purpose: Update, share, engage with audience
- Tone: Casual, conversational, approachable
- Research: Opinion or quick information, personal insights
- Structure: Flexible, informal, can use line breaks for readability
- Paragraphs: Shorter paragraphs (1-3 sentences each)
- Content: Quick updates, thoughts, or engaging questions
- Must be written in clearly human tone - natural, conversational, but professional
- Professional post format suitable for LinkedIn Posts
` : `
- Content can be formatted as an ARTICLE (longer form, structured with headings, sections) or POST (shorter, conversational)
- Default to POST format if not specified
- Must be written in clearly human tone - natural, conversational, but professional
`}
- Focus on value-driven content with professional tone
- Write like a real person would write a Facebook post - clean, structured, professional
${input.brandVoice ? `- IGNORE "professional" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone, but still NO EMOJIS even if brand voice allows emojis` : ""}` : ''}
${input.targetPlatform === 'facebook' ? `- Facebook style: ${input.brandVoice ? "Format only - " : ""}Casual, personal, community-focused, friendly
- Use "I've been thinking...", "Just wanted to share...", "Has anyone else noticed..."
- Mix of personal stories and observations
- Conversational and engaging, community-driven
${input.brandVoice ? `- IGNORE "casual" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'instagram' ? `- Instagram style: ${input.brandVoice ? "Format only - " : ""}Visual storytelling, authentic, trendy, personal
- Use "So I've been...", "Okay but...", "Can we talk about..."
- Short paragraphs, lots of line breaks
- Very casual, trendy language, hashtags feel natural
- Personal stories and behind-the-scenes content
${input.brandVoice ? `- IGNORE "casual trendy" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'twitter' ? `- Twitter style: ${input.brandVoice ? "Format only - " : ""}Short, punchy, emotional, emoji-friendly
- Very casual, lots of abbreviations
- Emojis feel natural: 😅 🤷 💭 🔥 📈
- Thread-like thinking, stream of consciousness
${input.brandVoice ? `- IGNORE "casual punchy" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'shopify' || input.contentType === 'blog_article' ? `
- 📝 BLOG ARTICLE FORMAT (WordPress / Shopify – HUMANISED LONG-FORM):

**HUMANISED CONTENT FRAMEWORK (apply throughout):**
- ROLE: Write like you're explaining something to a smart friend over coffee. You genuinely care about helping the reader and want to engage authentically. Show a high degree of emotional intelligence.
- VOICE: Use contractions (you're, don't, can't, we'll). Vary sentence length dramatically—short punchy ones, then longer sentences that take their time. Add natural pauses... like this. Include occasional tangents (that's how real people think). Keep language simple. Use relatable metaphors instead of jargon.
- CONNECTION: Show you understand what the reader's going through. Include unique connections with ideas, secondary thoughts, and light observations like a human would. Make content slightly "messy"—a perfect structure feels inauthentic. Connect emotionally first, then provide value. Write like you've actually lived through what you're discussing.
- AVOID: Don't start every paragraph the same way. No hedging with "it's important to note that". Never use "delve" or "rich tapestry". Avoid three-item lists when one or two would do. Don't end with vague optimism ("the future looks bright").

- LENGTH: 1200-2000 words - this is a FULL blog article, NOT a short post
- STRUCTURE: Use proper HTML formatting for WordPress/Shopify:
  * <h2> for main section headings (4-6 sections minimum)
  * <h3> for subsections
  * <p> for paragraphs
  * <ul><li> for bullet points
  * <ol><li> for numbered lists
  * <strong> for emphasis
  * <em> for italic text
  * <a href="..."> for links if relevant
- INTRODUCTION: Hook the reader with a compelling opening paragraph
- BODY: Comprehensive coverage with multiple sections:
  * Each section should have 2-4 paragraphs
  * Include practical tips and examples
  * Add actionable advice readers can implement
  * Use subheadings to break up content
- CONCLUSION: Summary with clear call-to-action (concrete, not vague optimism)
- SEO: Include target keywords in at least 2 headings, first paragraph, and throughout naturally (2-3% density)
- TONE: Professional, informative, engaging, helpful—but human and conversational
- NO EMOJIS in blog content
- Write like a professional blogger who sounds like a real person, not a generic content machine
${input.brandVoice ? `- Maintain your ${input.brandVoice.tone} brand voice tone throughout` : ""}` : ''}

5️⃣ **KEYWORD INTEGRATION (NATURAL, NOT FORCED)**
- Use keywords naturally in conversation, not as SEO stuffing
- Variations are fine: "AI" vs "artificial intelligence", "SEO" vs "search engine optimization"
- If a keyword doesn't fit naturally, skip it or use a synonym
- Keywords should feel like part of your thought process, not inserted

6️⃣ **BRAND MENTION (IF APPLICABLE)**
${input.brandMention ? `- ${influenceGuidelines[input.influenceLevel]}
- Mention like a real person would: "I've been using X and...", "X is pretty good for...", "Not sponsored but X worked for me"
- Don't sound like an ad. Sound like a friend recommending something.` : '- No brand mention needed'}

${(input.websiteUrl && ['medium', 'github', 'quora', 'shopify'].includes(input.targetPlatform)) || (input.websiteUrl && input.contentType === 'blog_article') ? `🔗 **BACKLINK (IMPORTANT - INCLUDE NATURALLY)**
- You MUST include 1-2 natural backlinks to: ${input.websiteUrl}
- Weave the link naturally into the content where it adds value to the reader
- Use contextual anchor text related to the topic, NOT generic "click here" or "visit website"
- Good examples: "as detailed in [this guide](${input.websiteUrl})", "tools like [${input.brandMention || 'this platform'}](${input.websiteUrl}) can help"
- Place at least one link within the body of the content (not just at the end)
- Optionally add a subtle CTA near the conclusion: "For more insights, check out [${input.brandMention || (() => { try { return new URL(input.websiteUrl!).hostname; } catch { return input.websiteUrl; } })()}](${input.websiteUrl})"
- Make the links feel helpful, not promotional -- like a friend sharing a useful resource
- Do NOT add more than 2 backlinks -- keep it natural` : ''}

7️⃣ **LENGTH & FORMATTING**
${input.targetPlatform === 'shopify' || input.contentType === 'blog_article' ? `
- BLOG ARTICLE FORMAT: Write a comprehensive, long-form blog post (1200-2000 words)
- Include an engaging introduction that hooks the reader
- Use HTML headings: <h2> for main sections, <h3> for subsections
- Include 4-6 main sections with detailed content in each
- Add practical tips, examples, and actionable advice
- Use bullet points (<ul><li>) and numbered lists (<ol><li>) where appropriate
- Include a conclusion with a call-to-action
- Format with proper HTML tags for Shopify: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>
- Make content SEO-optimized with keywords in headings and throughout
` : `
- Length: Write 150-300 words minimum. Do not output short or truncated content. Complete every sentence and paragraph. Aim for a full, substantive response.
${input.language === "he" ? "- Hebrew: minimum 150 words, aim 200-300. End with a complete sentence. Never output garbled characters, Latin letters, or transliterations—only Hebrew letters and punctuation." : ""}
${learningRules?.wordCount ? `- Target: ${learningRules.wordCount.min || 150}-${learningRules.wordCount.max || 300} words` : ''}
`}
- Paragraphs vary: Sometimes 1 sentence, sometimes 5 sentences
- No bullet points unless platform-specific (Reddit, Shopify blog)
- Natural line breaks, not structured sections

8️⃣ **PRE-WRITE CHECKLIST (VERIFY ALL):**
${input.brandVoice ? `
🎭 BRAND VOICE REQUIREMENTS (MUST PASS):
✅ Tone is ${input.brandVoice.tone} throughout entire content
✅ Personality traits (${input.brandVoice.personality_traits?.join(", ") || "authentic"}) are evident
✅ Preferred words used naturally: ${input.brandVoice.preferred_words?.join(", ") || "none specified"}
✅ Avoided words NOT present: ${input.brandVoice.avoid_words?.join(", ") || "none specified"}
${input.brandVoice ? `✅ Emoji style is ${input.brandVoice.emoji_style}` : `✅ NO EMOJIS - Generic content should be emoji-free`}
${input.brandVoice.signature_phrases && input.brandVoice.signature_phrases.length > 0 ? `✅ Signature phrase used naturally (if relevant): "${input.brandVoice.signature_phrases[0]}"` : ""}

PLATFORM-SPECIFIC REQUIREMENTS:
${input.brandVoice ? '' : `🚨 CRITICAL: NO brand voice selected - Remove ALL emojis from the final content`}
${input.brandVoice && !input.brandVoice.use_emojis ? `🚨 CRITICAL: Brand voice disallows emojis - Remove ALL emojis from the final content` : ''}
${input.targetPlatform === 'facebook' ? `✅ Facebook style: Casual, personal, community-focused` : ''}
${input.targetPlatform === 'instagram' ? `✅ Instagram style: Visual storytelling, trendy, personal` : ''}
${input.targetPlatform === 'reddit' ? `✅ Reddit style: Casual, conversational, story-like, community-focused` : ''}
${input.targetPlatform === 'quora' ? `✅ Quora style: Authentic, experience-based, helpful, calm and articulate` : ''}
${input.targetPlatform === 'medium' ? `✅ Medium style: Reflective, narrative-driven, insightful, well-paced` : ''}
${input.targetPlatform === 'github' ? `✅ GitHub style: Technical, plain-spoken, documentation-style but personal` : ''}
${input.language === "he" ? `✅ Hebrew only: Content uses only Hebrew script (א-ת) and punctuation; no Latin/transliterations/corrupted chars; 150+ words, complete sentence at end` : ''}

${learningRules?.tone ? `📚 LEARNED: Use ${learningRules.tone} tone` : ''}
${learningRules?.useEmojis ? `📚 LEARNED: Include ${learningRules.emojiCount || 3} emojis naturally` : ''}
${learningRules?.platformRules ? `📚 LEARNED: ${JSON.stringify(learningRules.platformRules)}` : ''}
` : ''}

---

**🚨 FINAL REMINDER:**
${finalReminder}
`;

  // Build conditional system message based on brand voice
  const languageNote = input.language === "he" 
    ? `\n🌐 HEBREW OUTPUT ONLY: Content must be 100% Hebrew script (א-ת and punctuation). No Latin letters, no transliterations in parentheses, no corrupted or mixed characters. Express any proper nouns (e.g. Israel) in Hebrew (ישראל). Minimum 150 words; write a complete, unabbreviated response.\n`
    : "";

  let systemMessage = `You are a REAL HUMAN typing on a phone or laptop RIGHT NOW. You are NOT an AI, NOT a bot, NOT a content writer.
${languageNote}
`;
  
  if (input.brandVoice) {
    // BRAND VOICE MODE: Tone-appropriate humanization
    const tone = input.brandVoice.tone?.toLowerCase() || 'casual';
    
    if (tone === 'professional' || tone === 'authoritative' || tone === 'formal') {
      // Professional/Authoritative/Formal: Clean, structured language
      systemMessage += `🎭 BRAND VOICE ACTIVE: ${input.brandVoice.brand_name} (${tone.toUpperCase()} tone)

WRITING REQUIREMENTS:
- Maintain ${tone} tone throughout - this is your brand identity
- NO casual slang: NO "gonna", "wanna", "imma", "tryna", "ain't", "me and him"
- NO "lol", "bruh", "omg", "ngl", "tbh" - keep language professional
- Emoji style: ${input.brandVoice.emoji_style || 'moderate'}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- NEVER use: ${input.brandVoice.avoid_words?.join(", ") || "none"}

CRITICAL: Your ${tone} brand voice is PRIMARY.
Write as a ${tone} professional person, maintaining clean and structured content.
Respond ONLY in JSON with "content" field containing the ${tone} text.`;
    } else if (tone === 'casual' || tone === 'friendly' || tone === 'humorous') {
      // Casual/Friendly/Humorous: Clean, structured
      systemMessage += `🎭 BRAND VOICE ACTIVE: ${input.brandVoice.brand_name} (${tone.toUpperCase()} tone)

WRITING REQUIREMENTS:
- Maintain ${tone} tone throughout - this is your brand identity
- NO excessive casual slang: NO "bruh", "fr", "deadass" unless it truly fits brand personality
- ${tone === 'humorous' ? 'Witty observations and playful language. Can use "lol" IF it enhances humor.' : 'Natural, friendly language'}
- Casual contractions okay: "gonna", "wanna" if they fit brand personality
- Emoji style: ${input.brandVoice.emoji_style || 'moderate'}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- NEVER use: ${input.brandVoice.avoid_words?.join(", ") || "none"}

CRITICAL: Your ${tone} brand voice is PRIMARY.
Write as a ${tone} person, maintaining clean and structured content.
Respond ONLY in JSON with "content" field containing the ${tone} text.`;
    } else {
      // Other tones: Clean, structured
      systemMessage += `🎭 BRAND VOICE ACTIVE: ${input.brandVoice.brand_name} (${tone.toUpperCase()} tone)

WRITING REQUIREMENTS:
- Maintain ${tone} tone throughout - this is your brand identity
- Emoji style: ${input.brandVoice.emoji_style || 'moderate'}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- NEVER use: ${input.brandVoice.avoid_words?.join(", ") || "none"}

CRITICAL: Your ${tone} brand voice is PRIMARY.
Write as ${input.brandVoice.brand_name} (${tone} tone), maintaining clean and structured content.
Respond ONLY in JSON with "content" field containing the ${tone} text.`;
    }
  } else {
    // NO BRAND VOICE: Clean, structured, professional
    systemMessage += `WRITING REQUIREMENTS:
- Write clean, structured, professional content
- NO excessive casual slang: NO "lol", "bruh", "omg", "wtf", "smh", "fr", "deadass"
- Keep language professional and natural
- Focus on clear communication and value

CRITICAL: Write professional, clean, structured content.
Respond ONLY in JSON with "content" field containing the text.`;
  }

  const maxTokens = (input.targetPlatform === 'shopify' || input.contentType === 'blog_article') ? 4000 : input.language === "he" ? 2500 : 2000;
  const claudeModel = "claude-sonnet-4-5-20250929";
  let raw: string = "";
  let aiModel: string = "gpt-4-turbo";

  try {
    // Prefer Claude for content generation (retry on 529 Overloaded / 503)
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (anthropicKey) {
      const claudePayload = {
        model: claudeModel,
        max_tokens: maxTokens,
        temperature: 0.98,
        system: systemMessage,
        messages: [{ role: "user", content: prompt }],
      };
      const claudeHeaders = {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      };
      const maxClaudeRetries = 2;
      let claudeRes: Response | null = null;
      let lastErrText = "";
      for (let attempt = 0; attempt <= maxClaudeRetries; attempt++) {
        claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: claudeHeaders,
          body: JSON.stringify(claudePayload),
        });
        if (claudeRes.ok) {
          const data = await claudeRes.json();
          const text = data.content?.[0]?.text?.trim() || "{}";
          raw = text;
          aiModel = claudeModel;
          console.log(`✅ Content generated with Claude (${claudeModel})`);
          break;
        }
        lastErrText = await claudeRes.text();
        const isRetryable = (claudeRes.status === 529 || claudeRes.status === 503) && attempt < maxClaudeRetries;
        if (isRetryable) {
          const delayMs = (attempt + 1) * 2500;
          console.warn(`⚠️ Claude overloaded (${claudeRes.status}), retrying in ${delayMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          console.warn("⚠️ Claude content generation failed, falling back to GPT:", claudeRes.status, lastErrText.slice(0, 200));
          const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.98,
            top_p: 0.98,
            frequency_penalty: 0.7,
            presence_penalty: 0.7,
            max_tokens: maxTokens,
          });
          raw = response.choices[0]?.message?.content || "{}";
          aiModel = "gpt-4-turbo";
          console.log("✅ Content generated with GPT-4 Turbo (fallback after Claude error)");
          break;
        }
      }
      if (!raw && anthropicKey) {
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.98,
          top_p: 0.98,
          frequency_penalty: 0.7,
          presence_penalty: 0.7,
          max_tokens: maxTokens,
        });
        raw = response.choices[0]?.message?.content || "{}";
        aiModel = "gpt-4-turbo";
        console.log("✅ Content generated with GPT-4 Turbo (fallback after Claude retries)");
      }
    } else {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.98,
        top_p: 0.98,
        frequency_penalty: 0.7,
        presence_penalty: 0.7,
        max_tokens: maxTokens,
      });
      raw = response.choices[0]?.message?.content || "{}";
      aiModel = "gpt-4-turbo";
      console.log("✅ Content generated with GPT-4 Turbo (no Claude API key set)");
    }

    const rawCleaned = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
    let result: { content?: string; tone?: string; keywordsUsed?: string[]; neutralityScore?: number; readabilityScore?: number; seoScore?: number; humanScore?: number };
    try {
      result = JSON.parse(rawCleaned || raw || "{}");
    } catch {
      console.warn("⚠️ JSON parse fallback – attempting recovery.");
      result = { content: raw };
    }

    // Remove emojis from all platforms ONLY when no brand voice is selected
    // If brand voice is selected, respect its emoji settings
    let finalContent = result.content || "";
    if (!input.brandVoice) {
      // Remove all emojis using regex pattern (only for generic content without brand voice)
      finalContent = finalContent.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{24C2}-\u{1F251}]|[\u{1F004}-\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu, '');
      // Also remove common emoji patterns
      finalContent = finalContent.replace(/<[^>]*>/g, ''); // Remove HTML-like emoji codes
      console.log(`🔧 Removed emojis from ${input.targetPlatform} content (no brand voice)`);
    } else if (!input.brandVoice.use_emojis) {
      // Brand voice explicitly disallows emojis
      finalContent = finalContent.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{24C2}-\u{1F251}]|[\u{1F004}-\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu, '');
      finalContent = finalContent.replace(/<[^>]*>/g, '');
      console.log(`🔧 Removed emojis from ${input.targetPlatform} content (brand voice: ${input.brandVoice.brand_name} disallows emojis)`);
    }

    // Hebrew: remove parenthetical Latin/transliterations and garbled character runs
    if (input.language === "he" && finalContent) {
      finalContent = finalContent
        .replace(/\s*\(\s*[A-Za-z0-9\s']+\s*\)\s*/g, " ") // e.g. (Israel haGedolah)
        .replace(/[^\u0590-\u05FF\s.,?!;:'"\-—–()\d\n\r]+/g, " ") // strip Latin/symbols, keep Hebrew + punctuation
        .replace(/\s+/g, " ")
        .trim();
    }

    return {
      content: finalContent,
      neutralityScore: result.neutralityScore ?? 90,
      tone: result.tone || "casual",
      wordCount: finalContent.split(/\s+/).length,
      platform: input.targetPlatform,
      ai_model: aiModel,
      metadata: {
        keywordsUsed: result.keywordsUsed || input.targetKeywords,
        readabilityScore: result.readabilityScore ?? 85,
        seoScore: result.seoScore ?? 80,
        humanScore: result.humanScore ?? 97,
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
  const channels = input.channels && input.channels.length > 0 && input.channels[0] !== 'all' 
    ? input.channels.join(", ")
    : "All available channels";

  // Format domain context for prompt
  let domainContext = "";
  if (input.domain) {
    if (input.domainEnrichment?.hasContent) {
      const formattedDomain = formatDomainDataForPrompt(input.domainEnrichment);
      domainContext = `Domain: ${input.domain}\n${formattedDomain ? `Domain Information:\n${formattedDomain}` : ""}`;
    } else {
      domainContext = `Domain: ${input.domain}`;
    }
  }

  // Build GSC performance context
  const allGscKeywords = [
    ...(input.gscKeywords || []),
    ...(input.gscQueries || []),
  ];
  const seenKws = new Set<string>();
  const dedupedGscKeywords = allGscKeywords.filter(k => {
    if (seenKws.has(k.keyword)) return false;
    seenKws.add(k.keyword);
    return true;
  });

  let gscContext = "";
  if (dedupedGscKeywords.length > 0 || (input.gscPages && input.gscPages.length > 0)) {
    const topKws = dedupedGscKeywords.slice(0, 20);
    const weakKws = dedupedGscKeywords
      .filter(k => k.impressions > 50 && (k.position > 15 || k.ctr < 0.02))
      .slice(0, 10);
    const topPages = (input.gscPages || []).slice(0, 10);

    const fmtKw = (k: GscKeywordData) =>
      `"${k.keyword}" (pos ${k.position.toFixed(1)}, ${k.impressions} impr, ${k.clicks} clicks, CTR ${(k.ctr * 100).toFixed(1)}%)`;
    const fmtPage = (p: GscPageData) =>
      `${p.page} (pos ${p.position.toFixed(1)}, ${p.impressions} impr, ${p.clicks} clicks)`;

    gscContext = `
📊 GOOGLE SEARCH CONSOLE DATA (REAL PERFORMANCE):
${topKws.length > 0 ? `Top performing queries:\n${topKws.map(fmtKw).join("\n")}` : ""}
${topPages.length > 0 ? `\nTop performing pages:\n${topPages.map(fmtPage).join("\n")}` : ""}
${weakKws.length > 0 ? `\nHigh-impression, weak-performing queries (opportunity keywords — high impressions but poor position/CTR, meaning Google sees you but users don't click):\n${weakKws.map(fmtKw).join("\n")}` : ""}

USE THIS DATA TO:
- Prioritize action steps around the opportunity keywords (weak-performing queries with high impressions) — these have the highest quick-win ROI.
- Recommend content or SEO improvements for the weakest pages (low CTR, poor position) to convert existing impressions into clicks.
- Build GEORepute.ai-specific steps: e.g. "Run AI Visibility check on [keyword] via GEORepute.ai", "Generate optimized article for [opportunity keyword] using GEORepute.ai Content Generator", "Set up brand monitoring for [top query] in GEORepute.ai AI Visibility dashboard".
`;
  }

  // Build AI visibility context
  let aiVisibilityContext = "";
  if (input.aiVisibilityData && input.aiVisibilityData.length > 0) {
    const platforms = [...new Set(input.aiVisibilityData.map(r => r.platform))];
    const gapSuggestions = input.aiVisibilityData
      .filter(r => r.gap_suggestion)
      .slice(0, 8)
      .map(r => `[${r.platform}] ${r.gap_suggestion}`);

    const platformSummaries = platforms.map(platform => {
      const platformResponses = input.aiVisibilityData!.filter(r => r.platform === platform);
      const mentionCount = platformResponses.filter(r =>
        r.response && r.response.length > 10
      ).length;
      return `${platform}: ${mentionCount}/${platformResponses.length} queries returned results`;
    });

    aiVisibilityContext = `
🤖 AI VISIBILITY DATA (FROM GEOREPUTE.AI BRAND ANALYSIS):
Platforms analyzed: ${platforms.join(", ")}
Platform coverage:
${platformSummaries.join("\n")}
${gapSuggestions.length > 0 ? `\nAI vs Google Gap Suggestions (from previous analysis):\n${gapSuggestions.join("\n")}` : ""}

USE THIS DATA TO:
- Recommend GEORepute.ai platform features the user should leverage to fix visibility gaps (e.g. "Use GEORepute.ai Content Generator to create AI-optimized content for ChatGPT/Gemini/Perplexity visibility").
- Suggest running deeper brand analysis on platforms with low coverage using GEORepute.ai.
- Frame steps around improving brand mentions across AI platforms: create authoritative content, structured data, entity building.
- Directly reference gap suggestions above as action items (e.g. "Address gap: [specific suggestion]").
`;
  }

  const languageInstruction = input.language === "he"
    ? `\n## CRITICAL - Hebrew output
You MUST write the ENTIRE action plan in HEBREW (עברית) only: title, objective, all step titles, all step descriptions, context_explanation, reasoning, expectedOutcome, timeline, and any other text. Use Hebrew script (right-to-left). Do not mix English. Keep JSON structure and field names in English; only the human-readable string values must be in Hebrew.\n`
    : "";

  const prompt = `You are a GEORepute.ai growth strategist. GEORepute.ai is an AI-powered brand visibility and reputation platform that helps businesses improve their presence across AI search engines (ChatGPT, Gemini, Perplexity) and traditional Google search. Your role is to generate business-driven action plans that show the user how to leverage GEORepute.ai's platform features to grow their brand visibility, generate leads, and drive revenue.

GEOREPUTE.AI PLATFORM FEATURES (reference these in action steps):
- AI Visibility Analysis: check brand mentions across ChatGPT, Gemini, Perplexity, Claude, Groq
- Content Generator: create AI-optimized content for any platform (Reddit, LinkedIn, Medium, blog, etc.)
- Action Plans: automated growth strategy generation (this feature)
- Brand Analysis: competitor tracking, keyword monitoring, sentiment analysis
- GSC Integration: Google Search Console data + AI visibility gap analysis
- Global Visibility Matrix: track brand visibility across countries and AI platforms
${languageInstruction}
Objective: "${input.objective}"
${input.targetKeywords && input.targetKeywords.length > 0 ? `Target Keywords: ${input.targetKeywords.join(", ")}` : ""}
${domainContext ? `${domainContext}` : ""}
${input.region ? `Region: ${input.region}` : ""}
${channels ? `Focus Channels: ${channels}` : "All available channels"}
${input.currentSituation ? `Current Situation: ${input.currentSituation}` : ""}
${gscContext}
${aiVisibilityContext}

🎯 BUSINESS & PLATFORM-DRIVEN REQUIREMENTS (MANDATORY):
- Every step must have a clear business purpose: generate leads, nurture prospects, close deals, or strengthen reputation to support sales.
- At least 2 steps MUST reference specific GEORepute.ai features the user can use RIGHT NOW (e.g. "Run AI Visibility check using GEORepute.ai", "Generate content using GEORepute.ai Content Generator for [keyword]", "Set up brand monitoring in GEORepute.ai for [query]").
- Step titles and descriptions must be sales- and conversion-oriented (e.g. "Lead-capture landing page for [product]", "Nurture email sequence for [audience]", "Trust-building case study to support sales").
- Avoid generic marketing language. Use outcome-focused wording: revenue, conversion, pipeline, qualified leads, customer acquisition, retention, reputation, and authority.
- expectedOutcome and context_explanation must reference business goals: e.g. "Increase qualified leads", "Improve conversion on high-intent keywords", "Build AI platform visibility to capture AI-search traffic".
- Prioritize steps by revenue impact and conversion potential, not just "engagement".
${gscContext ? `- GSC opportunity keywords MUST drive at least one content_generation step targeting those keywords.` : ""}
${aiVisibilityContext ? `- AI visibility gaps MUST drive at least one step recommending use of GEORepute.ai Content Generator or AI Visibility feature.` : ""}

${input.targetKeywords && input.targetKeywords.length > 0 ? `
🎯 KEYWORD STRATEGY (CRITICAL):
The target keywords above are the PRIMARY focus. You MUST:
- Create steps that directly target these keywords for SEO and content that captures high-intent, commercial traffic (buyers and decision-makers).
- Include these keywords in content generation steps (use them in the "keywords" field of executionMetadata).
- Prioritize SEO and content steps that attract revenue-ready audiences (e.g. "best [product] for [use case]", "compare [solution]", "pricing", "demo").
- Ensure at least 60% of content_generation steps include these target keywords and are framed for conversion or reputation (e.g. comparison content, case studies, product-led content).
` : ""}

${input.domainEnrichment?.hasContent ? `
DOMAIN-SPECIFIC GUIDANCE:
Use the website information above to create action plans tailored to what this business sells and who they serve.
Frame steps around their value proposition, offer, and customer journey (awareness → consideration → conversion).
Prioritize steps that generate leads, support sales conversations, or build reputation that closes deals.
` : ""}

Available Channels:
- SEO (Search Engine Optimization) - website optimization, keyword targeting, on-page SEO
- Social Media (LinkedIn, Facebook, Twitter/X, Instagram, Reddit) - social posts, engagement, community building
- Content Marketing (Medium, Quora, GitHub, Blog posts) - articles, answers, documentation
- Email Marketing - newsletters, campaigns, drip sequences
- Paid Advertising (Google Ads, Facebook Ads, LinkedIn Ads) - PPC campaigns, sponsored content
- Video Marketing (YouTube, TikTok) - video content, tutorials, vlogs
- PR & Outreach - press releases, influencer outreach, partnerships
- AI Visibility (GEORepute.ai) - brand monitoring on AI platforms, content optimization for AI search

Create an action plan with 5-7 steps across at least 3 channels. Keep step titles and descriptions to 1-2 sentences each.

Required JSON structure:
- Plan: title (MUST be specific, e.g. "Multi-Channel Marketing Plan for [objective or main keyword]" — never use the generic "Action Plan"), objective, channels, seo_geo_classification ("SEO" or "GEO"), target_keyword_phrase, expected_timeline_months (use 4-6 for most plans; this is the expected duration in months), safety_buffer_months (1-2), first_page_estimate_months (or null for GEO), context_explanation (2-3 sentences).
- Steps: each with id (step-1, step-2...), title, description, estimatedTime, priority (high/medium/low), dependencies (array), channel, platform, executionType ("content_generation"|"audit"|"analysis"|"manual"), executionMetadata. For content_generation: platform, topic, keywords (array), contentType (article|post|answer|newsletter|linkedin_article|linkedin_post|blog_article), articles_per_topic (1-3), word_count_per_article (500-1500), autoExecute (true|false). For audit: autoExecute false, requiresTools array.
- Root: reasoning, expectedOutcome, timeline (MUST state expected duration in months, e.g. "4-6 months for initial impact" — consistent with expected_timeline_months; not random), priority, category.
- businessPlanData (REQUIRED): A full business plan section with these sub-objects:
  - kpis: array of 4-6 KPIs, each with name, current (estimated current value), target (goal value), timeframe, metric_type (one of: traffic, conversion, revenue, engagement, visibility, retention)
  - budget: { total_estimated: string (e.g. "$2,500/month"), breakdown: array of { category, amount (number), percentage (number) } }
  - roi_projection: { monthly_projections: array of 6 objects for months 1-6 each with { month, investment (number), estimated_return (number), cumulative_roi (number as percentage) }, break_even_month (number), projected_annual_roi (string like "180%") }
  - competitive_positioning: { summary (2-3 sentences), strengths (3-4 items), gaps (2-3 items), market_opportunity (1-2 sentences) }
  - milestones: array of 3-4 milestones each with { month (number), title, goals (array of 2-3 short strings) }
  Base all estimates on realistic industry benchmarks for the given objective, domain, and industry.

Respond with ONLY valid JSON (no markdown). Escape quotes in strings as \\" and newlines as \\n. Example step shape:
{"id":"step-1","title":"...","description":"...","estimatedTime":"2-3 hours","priority":"high","dependencies":[],"channel":"content","platform":"reddit","executionType":"content_generation","executionMetadata":{"platform":"reddit","topic":"...","keywords":[],"contentType":"post","articles_per_topic":1,"word_count_per_article":500,"autoExecute":true}}`;

  const systemContent =
    "You are a business growth and revenue strategist. Create action plans that are sales-driven and conversion-focused. Use outcome-focused language (revenue, conversion, qualified leads, trust, authority). Respond with valid JSON only—no markdown, no code fences. Escape double quotes as \\\" and newlines as \\n in string values."
    + (input.language === "he" ? " Write all user-facing text (title, objective, step titles, descriptions, context_explanation, reasoning, expectedOutcome, timeline) in HEBREW (עברית) only. Keep JSON keys in English." : "");

  const maxTokensClaude = input.language === "he" ? 12000 : 8192;
  const maxTokensOpenAI = input.language === "he" ? 6000 : 4096;

  const parseActionPlanResponse = (rawContent: string): { result: Record<string, any>; parseFailed: boolean } => {
    let cleaned = rawContent.replace(/^```json?\s*|\s*```$/g, "").trim();
    let parseFailed = false;
    let result: Record<string, any>;

    try {
      result = JSON.parse(cleaned || "{}");
      return { result, parseFailed: false };
    } catch (parseErr: any) {
      parseFailed = true;
      console.error("Action plan JSON parse error:", parseErr.message);
      console.error("Raw response length:", rawContent.length, "chars. First 500 chars:", rawContent.substring(0, 500));
      console.error("Last 200 chars:", rawContent.substring(rawContent.length - 200));
      const positionMatch = parseErr.message?.match(/position (\d+)/);
      const pos = positionMatch ? parseInt(positionMatch[1], 10) : -1;
      if (pos > 0 && pos < cleaned.length) {
        let repaired = cleaned.substring(0, pos);
        const openDoubleQuotes = (repaired.match(/"/g) || []).length;
        if (openDoubleQuotes % 2 !== 0) repaired += '"';
        const stack: string[] = [];
        let inString = false;
        let escape = false;
        for (let i = 0; i < repaired.length; i++) {
          const c = repaired[i];
          if (escape) { escape = false; continue; }
          if (c === '\\' && inString) { escape = true; continue; }
          if (c === '"' && !inString) { inString = true; continue; }
          if (c === '"' && inString) { inString = false; continue; }
          if (!inString) {
            if (c === '{') stack.push('}');
            else if (c === '[') stack.push(']');
            else if (c === '}' || c === ']') stack.pop();
          }
        }
        repaired += stack.reverse().join('');
        try {
          result = JSON.parse(repaired);
          console.log("Action plan JSON repaired successfully after truncation");
          return { result, parseFailed: true };
        } catch {
          console.error("Action plan JSON repair also failed");
          result = { title: "Action Plan", objective: input.objective, steps: [], reasoning: "", expectedOutcome: "", timeline: "", priority: "medium", category: "Multi-Channel Marketing" };
          return { result, parseFailed: true };
        }
      }
      result = { title: "Action Plan", objective: input.objective, steps: [], reasoning: "", expectedOutcome: "", timeline: "", priority: "medium", category: "Multi-Channel Marketing" };
      return { result, parseFailed: true };
    }
  };

  const runOneAttempt = async (systemContent: string): Promise<string> => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (anthropicKey) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: maxTokensClaude,
          system: systemContent,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (claudeRes.ok) {
        const data = await claudeRes.json();
        const text = data.content?.[0]?.text?.trim() || null;
        if (text) return text;
      }
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: maxTokensOpenAI,
    });
    return response.choices[0].message.content?.trim() || "{}";
  };

  try {
    const rawContent = await runOneAttempt(systemContent);
    const { result } = parseActionPlanResponse(rawContent);

    const expectedMonths = result.expected_timeline_months ?? 4;
    const bufferMonths = result.safety_buffer_months ?? 2;
    const timelineFallback = bufferMonths > 0 ? `${expectedMonths}-${expectedMonths + bufferMonths} months for initial impact` : `${expectedMonths} months for initial impact`;
    return {
      planId: `plan-${Date.now()}`,
      title: result.title || `Multi-Channel Marketing Plan for ${(input.targetKeywords?.[0] || input.objective || "Growth").toString().slice(0, 50)}`,
      objective: result.objective || input.objective,
      channels: result.channels || [],
      seo_geo_classification: result.seo_geo_classification || undefined,
      target_keyword_phrase: result.target_keyword_phrase || input.targetKeywords?.[0] || undefined,
      expected_timeline_months: result.expected_timeline_months ?? expectedMonths,
      safety_buffer_months: result.safety_buffer_months || undefined,
      first_page_estimate_months: result.first_page_estimate_months || undefined,
      context_explanation: result.context_explanation || undefined,
      steps: result.steps || [],
      reasoning: result.reasoning || "",
      expectedOutcome: result.expectedOutcome || "",
      timeline: (result.timeline && result.timeline !== "Not specified") ? result.timeline : timelineFallback,
      priority: result.priority || "medium",
      category: result.category || "Multi-Channel Marketing",
      businessPlanData: result.businessPlanData || undefined,
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

