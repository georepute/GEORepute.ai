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
  targetPlatform: "reddit" | "quora" | "medium" | "github" | "linkedin" | "twitter" | "instagram" | "facebook";
  brandMention?: string;
  influenceLevel: "subtle" | "moderate" | "strong";
  userContext?: string;
  brandVoice?: any; // Brand voice profile
  language?: "en" | "he"; // Language for content generation (default: "en")
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
  domain?: string;
  domainEnrichment?: DomainEnrichmentData | null; // Enriched domain data from crawler
  region?: string;
  channels?: string[]; // ['all'] or specific channels like ['seo', 'social_media', 'content']
}

export interface ActionPlanOutput {
  planId: string;
  title: string;
  objective: string;
  channels?: string[]; // ['seo', 'social_media', 'content', etc.]
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
      contentType?: "article" | "post" | "answer" | "newsletter";
      autoExecute?: boolean;
      requiresTools?: string[];
    };
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
  
  // Platform personality guidelines - ONLY used when NO brand voice is selected
  const platformGuidelines = {
    reddit: "casual, conversational, story-like, community-focused, first-person, real-talk",
    quora: "authentic, experience-based, helpful, calm and articulate",
    medium: "reflective, narrative-driven, insightful, well-paced",
    github: "technical, plain-spoken, documentation-style but personal",
    linkedin: "professional yet human, conversational, thoughtful",
    twitter: "short, witty, spontaneous, a bit emotional, emoji-friendly",
    facebook: "casual, personal, community-focused, friendly",
    instagram: "visual storytelling, authentic, trendy, personal",
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
    ? `\n🌐 LANGUAGE REQUIREMENT: Write ALL content in HEBREW (עברית). 
- Use Hebrew script (right-to-left)
- Write naturally in Hebrew, as a native Hebrew speaker would
- Maintain all humanization requirements (thinking markers, imperfections, etc.) but in Hebrew
- Use Hebrew slang and expressions naturally
- Keywords should be in Hebrew if provided in Hebrew, otherwise translate naturally
- All content, including thinking markers, reactions, and tangents, must be in Hebrew\n`
    : "";

  const prompt = `
⚠️ CRITICAL MISSION: Write like a REAL HUMAN who is typing quickly, making mistakes, thinking out loud, and NOT trying to be perfect.
You are NOT an AI. You are NOT a content writer. You are a regular person sharing thoughts on ${input.targetPlatform}.
This MUST score 100% HUMAN on ALL AI detectors (GPTZero, Turnitin, Copyleaks, Writer.com, Originality.ai, Content at Scale, ZeroGPT, etc.)
${languageInstruction}
Topic: "${input.topic}"
Keywords: ${input.targetKeywords.join(", ")} (sneak them in naturally, don't force)
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

### 🚨 ABSOLUTE REQUIREMENTS (FAILURE TO FOLLOW = AI DETECTED)

**YOU ARE TYPING ON YOUR PHONE/LAPTOP RIGHT NOW. YOU ARE NOT WRITING AN ARTICLE.**

1️⃣ **THINKING OUT LOUD (TONE-APPROPRIATE)**
${input.brandVoice ? `
BRAND VOICE ACTIVE - Adapt thinking markers to ${input.brandVoice.tone} tone:
${input.brandVoice.tone === 'professional' || input.brandVoice.tone === 'authoritative' || input.brandVoice.tone === 'formal' ? `
- Use: "I've found", "In my view", "Consider this", "What's interesting", "Notably", "Essentially"
- Minimal casual markers (1-2 max): "honestly", "actually"
- NO "lol", "ngl", "tbh", "bruh", "fr" - these are too casual for your brand
- Show thoughtfulness, not messiness
` : input.brandVoice.tone === 'humorous' ? `
- Use: "okay so", "wait", "honestly", "tbh", "here's the thing", "plot twist"
- Witty observations and playful language
- Can use "lol" sparingly if it fits the joke
` : `
- Use: "I mean", "you know", "honestly", "actually", "to be fair"
- Natural conversational markers appropriate for ${input.brandVoice.tone} tone
- Avoid overly casual slang unless it matches your brand personality
`}` : `
NO BRAND VOICE - Use casual thinking markers freely:
- Include: "okay so", "wait", "actually", "hmm", "like", "I mean", "you know", "tbh", "ngl", "honestly", "idk", "imo"
- Show mental processing: "...", "—", "um", "er", "well", "so yeah"
- Self-correct: "wait no", "actually scratch that"
- Tangents: "this reminds me of", "random but", "btw", "also"
- Uncertainty: "I think?", "maybe?", "kinda?", "sorta?"
`}

2️⃣ **SENTENCE VARIETY (CRITICAL - AI DETECTS UNIFORMITY)**
MANDATORY: Vary sentence lengths: 2 words → 35 words → 5 words → 28 words → 1 word → 42 words → 4 words
${input.brandVoice ? `
BRAND VOICE ACTIVE - Sentence style for ${input.brandVoice.tone} tone:
${input.brandVoice.tone === 'professional' || input.brandVoice.tone === 'authoritative' || input.brandVoice.tone === 'formal' ? `
- Start sentences: "Consider", "What's key", "Essentially", "In fact", "Notably", "Here's what"
- Fragments allowed but polished: "Simple as that.", "Worth noting.", "Critical point.", "The reality."
- AVOID: "me and him", "ain't", "gonna", "imma", "tryna" - too casual for professional brand
- Capitalization: Proper "I" (not "i") - maintain professionalism
- Grammar: Mostly correct with occasional natural imperfections
` : input.brandVoice.tone === 'casual' || input.brandVoice.tone === 'friendly' ? `
- Start sentences: "And", "But", "So", "I mean", "Honestly", "Here's the thing"
- Fragments okay: "Makes sense.", "Pretty cool.", "Not bad."
- Casual contractions: "gonna", "wanna", "gotta" are fine
- Natural capitalization variations acceptable
` : `
- Adapt sentence starters to ${input.brandVoice.tone} personality
- Fragments and variety appropriate for your brand voice
- Grammar reflects your brand tone
`}` : `
NO BRAND VOICE - Use maximum casual variety:
- Start with: "And", "But", "So", "Like", "I mean", "Honestly", "Tbh", "Ngl", "Wait", "Okay"
- Fragments EVERYWHERE: "Pretty wild.", "Makes sense.", "Not sure.", "Maybe."
- Break grammar: "me and him", "ain't", "gonna", "wanna", "imma", "tryna"
- Random capitalization: "i" (not "I"), "THIS is crazy", "that's So weird"
`}

3️⃣ **EMOTIONS & REACTIONS (TONE-APPROPRIATE)**
${input.brandVoice ? `
BRAND VOICE ACTIVE - Emotions for ${input.brandVoice.tone} tone:
${input.brandVoice.tone === 'professional' || input.brandVoice.tone === 'authoritative' ? `
- Express views professionally: "What's compelling", "Worth noting", "Particularly effective"
- NO "lol", "lmao", "bruh", "omg", "wtf", "smh" - too casual for your brand
- Personal experience: "In my experience", "I've observed", "What I've found"
- Measured language, avoid excessive exclamation marks
- Emojis: ${input.brandVoice.emoji_style} style only
` : input.brandVoice.tone === 'formal' ? `
- Sophisticated expressions: "Remarkable", "Noteworthy", "Compelling"
- NO casual slang whatsoever ("lol", "bruh", etc.)
- References: "Research indicates", "Studies show", "Evidence suggests"
- Minimal to no emojis (use ${input.brandVoice.emoji_style} style)
- Refined, elevated language throughout
` : input.brandVoice.tone === 'humorous' ? `
- Witty reactions: Clever observations, playful language
- Can use "lol" IF it enhances the humor
- Fun exclamations appropriate for comedy
- Emojis: ${input.brandVoice.emoji_style} - can be playful
- Keep it funny but authentic to your brand
` : input.brandVoice.tone === 'casual' || input.brandVoice.tone === 'friendly' ? `
- Natural reactions: "honestly", "I mean", "you know"
- Can use: "haha" moderately (avoid overuse)
- Avoid excessive slang: NO "bruh", "fr", "deadass" unless it truly fits brand personality
- Emojis: ${input.brandVoice.emoji_style} style
- Personal touch: "I remember", "my experience", "what I've seen"
` : `
- Adapt emotional expression to ${input.brandVoice.tone} personality
- Stay authentic to ${input.brandVoice.brand_name} brand voice
- Emojis: ${input.brandVoice.emoji_style} style
`}` : `
NO BRAND VOICE - Use casual reactions freely:
- Raw emotions: "ugh", "frustrating", "annoying", "love this", "hate when"
- Physical reactions: "lol", "lmao", "haha", "😅", "🤦", "🤷", "bruh", "omg", "wtf", "smh", "fr"
- Personal stories: "I remember when", "one time", "my friend"
- Vague memories: "I read somewhere", "can't remember where", "saw this thing"
- Casual swearing: "damn", "crap", "hell", "sucks" (platform-appropriate)
`}

4️⃣ **PLATFORM-SPECIFIC AUTHENTICITY**
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

${input.targetPlatform === 'reddit' ? `- Reddit style: ${input.brandVoice ? "Format only - " : ""}Very casual, use "OP", "TL;DR", "edit:", "this", "that", "imo", "tbh", "ngl"
- Include Reddit-isms: "this", "that", "honestly", "I mean", lots of "lol" and "haha"
- Paragraph breaks are common, sometimes one-liners
- Use markdown sparingly (bold for emphasis, not structure)
${input.brandVoice ? `- IGNORE "casual" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'quora' ? `- Quora style: ${input.brandVoice ? "Format only - " : ""}Thoughtful but conversational, personal experience heavy
- Use "I've found that...", "In my experience...", "What I noticed is..."
- Longer paragraphs, but still casual
- Ask rhetorical questions: "Right?", "You know?", "Makes sense?"
${input.brandVoice ? `- IGNORE "thoughtful conversational" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'medium' ? `- Medium style: ${input.brandVoice ? "Format only - " : ""}Reflective, narrative-driven, but still human
- Personal voice: "I've been thinking about...", "It struck me that..."
- Mix of short and long paragraphs
- Use dashes and ellipses for pauses
${input.brandVoice ? `- IGNORE "reflective" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'github' ? `- GitHub style: ${input.brandVoice ? "Format only - " : ""}Technical but personal, documentation-like
- Use "I've been working with...", "In my setup...", "YMMV"
- Code references feel natural, not forced
- Casual technical talk
${input.brandVoice ? `- IGNORE "technical personal" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'linkedin' ? `- LinkedIn style: ${input.brandVoice ? "Format only - " : ""}Professional but human, conversational
- Use "I've noticed...", "In my experience...", "Something I learned..."
- Still casual, but slightly more polished
- Personal insights, not corporate speak
${input.brandVoice ? `- IGNORE "professional" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'facebook' ? `- Facebook style: ${input.brandVoice ? "Format only - " : ""}Casual, personal, community-focused
- Use "I've been thinking...", "Just wanted to share...", "Has anyone else noticed..."
- Mix of personal stories and observations
- Emojis are common: 😊 👍 💬
- Conversational and engaging
${input.brandVoice ? `- IGNORE "casual" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}
${input.targetPlatform === 'instagram' ? `- Instagram style: ${input.brandVoice ? "Format only - " : ""}Visual storytelling, authentic and personal
- Use "So I've been...", "Okay but...", "Can we talk about..."
- Short paragraphs, lots of line breaks
- Emojis everywhere: 📸 ✨ 💕 🔥 👀
- Very casual, trendy language, hashtags feel natural
- Personal stories and behind-the-scenes content
${input.brandVoice ? `- IGNORE "casual trendy" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone and ${input.brandVoice.emoji_style} emoji style` : ""}` : ''}
${input.targetPlatform === 'twitter' ? `- Twitter style: ${input.brandVoice ? "Format only - " : ""}Short, punchy, emotional, emoji-friendly
- Very casual, lots of abbreviations
- Emojis feel natural: 😅 🤷 💭 🔥 📈
- Thread-like thinking, stream of consciousness
${input.brandVoice ? `- IGNORE "casual punchy" suggestion above - maintain your ${input.brandVoice.tone} brand voice tone` : ""}` : ''}

5️⃣ **ANTI-AI DETECTION (FAILURE HERE = DETECTED AS AI)**

**PERPLEXITY (Word Variety):**
${input.brandVoice ? `
BRAND VOICE ACTIVE - Vocabulary for ${input.brandVoice.tone} tone:
${input.brandVoice.tone === 'professional' || input.brandVoice.tone === 'authoritative' || input.brandVoice.tone === 'formal' ? `
- Use varied professional vocabulary
- AVOID excessive slang: NO "kinda", "sorta", "def", "prob" unless brand personality allows
- NO filler words like "um", "uh", "er" - too unprofessional
- Use brand preferred words: ${input.brandVoice.preferred_words?.join(", ") || "appropriate vocabulary"}
- Word repetition minimal and intentional
` : `
- Vocabulary appropriate for ${input.brandVoice.tone} personality
- Can use moderate casual language if it fits brand
- Use brand preferred words naturally
- Balance variety with brand voice consistency
`}` : `
NO BRAND VOICE - Use casual varied vocabulary:
- Mix "thing", "stuff", "whatever" with technical terms randomly
- Use slang: "kinda", "sorta", "def", "prob", "defo", "probs"
- Mix formal and casual: "utilize" then "use", "assist" then "help"
- Repeat words sometimes: "like, like, you know?"
- Use filler words: "um", "uh", "er", "well", "so", "like"
`}

**BURSTINESS (Sentence Rhythm - CRITICAL):**
MANDATORY: 1 word → 38 words → 3 words → 31 words → 2 words → 45 words → 4 words → 22 words
NEVER have similar sentence lengths next to each other
Mix fragments with run-ons constantly

**IMPERFECTIONS (TONE-APPROPRIATE):**
${input.brandVoice ? `
BRAND VOICE ACTIVE - Imperfections for ${input.brandVoice.tone} tone:
${input.brandVoice.tone === 'professional' || input.brandVoice.tone === 'authoritative' || input.brandVoice.tone === 'formal' ? `
- MINIMAL typos (0-1 subtle ones max) - professional brands don't make many mistakes
- Grammar mostly correct (1-2 natural imperfections only)
- Punctuation consistent and appropriate
- NO "teh", "adn", "waht" typos - too sloppy for professional brand
- Natural flow with occasional pause ("...") is fine
` : input.brandVoice.tone === 'casual' || input.brandVoice.tone === 'friendly' ? `
- Moderate typos (1-2 casual ones okay)
- Some missing apostrophes: "dont", "wont" acceptable
- Casual grammar variations allowed
- Natural imperfections that fit casual personality
` : `
- Imperfections appropriate for ${input.brandVoice.tone} tone
- Balance authenticity with brand professionalism
- 1-3 natural mistakes maximum
`}` : `
NO BRAND VOICE - Use natural imperfections freely:
- Natural typos: "teh" (the), "adn" (and), "taht" (that), "waht" (what), "thsi" (this)
- Missing punctuation: Long sentences without commas, missing periods sometimes
- Inconsistent punctuation: Sometimes "!", sometimes not
- Mixed tenses: "I was thinking... and then I realize..."
- Wrong words: "affect" vs "effect" confusion, "their" vs "there" sometimes
- Double spaces: "this  is" (occasionally)
- Missing apostrophes: "dont", "wont", "cant"
`}

**RANDOM ASSOCIATIONS (MANDATORY):**
- "This reminds me of...", "Kinda like when...", "It's similar to...", "Sorta like..."
- Jump to unrelated topics briefly: "random but...", "btw...", "also..."
- Circle back: "anyway", "back to what I was saying", "where was I?"

**FORBIDDEN AI PATTERNS (IF YOU USE THESE = DETECTED):**
❌ NO "In conclusion", "To summarize", "In summary", "To wrap up"
❌ NO perfect topic sentences at paragraph start
❌ NO logical flow (intro → body → conclusion)
❌ NO balanced arguments (be slightly biased, have opinions)
❌ NO clear structure or organization
❌ NO perfect grammar (must have errors)
${input.brandVoice ? `✅ EXCEPTION: MAINTAIN your ${input.brandVoice.tone} tone consistently throughout (this is required for brand voice)
✅ EXCEPTION: USE your preferred words naturally: ${input.brandVoice.preferred_words?.join(", ") || "none"}
✅ EXCEPTION: Emoji style must be ${input.brandVoice.emoji_style} (brand requirement)` : "❌ NO overly consistent tone (mix casual and slightly formal)"}
❌ NO perfect keyword placement (sometimes miss keywords, use synonyms)
❌ NO professional formatting (messy is good)
❌ NO complete thoughts (leave some things unfinished)

6️⃣ **KEYWORD INTEGRATION (NATURAL, NOT FORCED)**
- Use keywords naturally in conversation, not as SEO stuffing
- Variations are fine: "AI" vs "artificial intelligence", "SEO" vs "search engine optimization"
- If a keyword doesn't fit naturally, skip it or use a synonym
- Keywords should feel like part of your thought process, not inserted

7️⃣ **BRAND MENTION (IF APPLICABLE)**
${input.brandMention ? `- ${influenceGuidelines[input.influenceLevel]}
- Mention like a real person would: "I've been using X and...", "X is pretty good for...", "Not sponsored but X worked for me"
- Don't sound like an ad. Sound like a friend recommending something.` : '- No brand mention needed'}

8️⃣ **LENGTH & FORMATTING**
- 150-300 words naturally (don't count, just write)
${learningRules?.wordCount ? `- Target: ${learningRules.wordCount.min || 150}-${learningRules.wordCount.max || 300} words` : ''}
- Paragraphs vary: Sometimes 1 sentence, sometimes 5 sentences
- No bullet points unless platform-specific (Reddit sometimes)
- Natural line breaks, not structured sections

9️⃣ **PRE-WRITE CHECKLIST (VERIFY ALL):**
${input.brandVoice ? `
🎭 BRAND VOICE REQUIREMENTS (MUST PASS):
✅ Tone is ${input.brandVoice.tone} throughout entire content
✅ Personality traits (${input.brandVoice.personality_traits?.join(", ") || "authentic"}) are evident
✅ Preferred words used naturally: ${input.brandVoice.preferred_words?.join(", ") || "none specified"}
✅ Avoided words NOT present: ${input.brandVoice.avoid_words?.join(", ") || "none specified"}
✅ Emoji style is ${input.brandVoice.emoji_style}
${input.brandVoice.signature_phrases && input.brandVoice.signature_phrases.length > 0 ? `✅ Signature phrase used naturally (if relevant): "${input.brandVoice.signature_phrases[0]}"` : ""}

HUMANIZATION REQUIREMENTS:
` : ""}✅ At least 8-12 thinking markers ("like", "I mean", "you know", "wait", "actually")
✅ Sentence lengths vary: 1-2 word fragments AND 35-45 word run-ons
✅ At least 3-5 natural typos or grammar mistakes
✅ At least 2-3 tangents or random associations
✅ At least 4-6 emotional reactions ("lol", "ugh", "omg", etc.)
✅ NO perfect structure or logical flow
✅ NO "In conclusion" or summary phrases
${input.brandVoice ? `✅ Tone stays ${input.brandVoice.tone} despite imperfections` : "✅ Mix of casual and slightly formal language"}
✅ Inconsistent punctuation and capitalization
✅ At least 1-2 incomplete thoughts or self-corrections

${learningRules?.tone ? `📚 LEARNED: Use ${learningRules.tone} tone` : ''}
${learningRules?.useEmojis ? `📚 LEARNED: Include ${learningRules.emojiCount || 3} emojis naturally` : ''}
${learningRules?.platformRules ? `📚 LEARNED: ${JSON.stringify(learningRules.platformRules)}` : ''}

---

**🚨 FINAL REMINDER:**
${input.brandVoice ? `
═══════════════════════════════════════════════════════════════════
WHO YOU ARE (YOUR IDENTITY - NEVER CHANGES):
═══════════════════════════════════════════════════════════════════
✅ Brand: ${input.brandVoice.brand_name}
✅ Tone: ${input.brandVoice.tone.toUpperCase()} (this defines HOW you speak)
✅ Personality: ${input.brandVoice.personality_traits?.join(", ") || "authentic"} (this defines WHO you are)
✅ Emoji Style: ${input.brandVoice.emoji_style} (this is YOUR style)
✅ Use Words: "${input.brandVoice.preferred_words?.join('", "') || "no specific words"}"
✅ NEVER Use: "${input.brandVoice.avoid_words?.join('", "') || "none"}"
✅ Signature Phrases: ${input.brandVoice.signature_phrases?.length > 0 ? `"${input.brandVoice.signature_phrases.join('", "')}"` : "none"}

WHERE YOU'RE POSTING (FORMAT ONLY):
═══════════════════════════════════════════════════════════════════
📍 Platform: ${input.targetPlatform} (this ONLY affects length/structure, NOT your personality)

🚨 CRITICAL: Write as ${input.brandVoice.brand_name} posting on ${input.targetPlatform}.
NOT as a generic ${input.targetPlatform} user!

Your ${input.brandVoice.tone} tone and ${input.brandVoice.personality_traits?.join("/") || "authentic"} personality 
must be present in EVERY sentence, regardless of platform.

${input.brandVoice.tone === 'professional' || input.brandVoice.tone === 'authoritative' || input.brandVoice.tone === 'formal' ? `
⚠️ PROFESSIONAL BRAND VOICE RULES:
- You ARE a human, but a ${input.brandVoice.tone} professional human
- You ARE thinking out loud, but in a ${input.brandVoice.tone} way
- You CAN have natural imperfections, but MINIMAL (0-1 max)
- Your ${input.brandVoice.tone} tone is PRIMARY - maintain it throughout
- NO casual slang, NO "lol bruh ngl tbh" - these break your brand voice
- Think: "A ${input.brandVoice.tone} professional typing naturally" 
NOT "A casual internet user"` : `
⚠️ BRAND VOICE HUMANIZATION:
- You ARE a human typing naturally
- You ARE thinking out loud in a ${input.brandVoice.tone} way
- You CAN have natural imperfections appropriate for ${input.brandVoice.tone} tone
- Your ${input.brandVoice.tone} tone is PRIMARY - maintain it throughout
- Think: "A ${input.brandVoice.tone} ${input.brandVoice.personality_traits?.[0] || "authentic"} person typing naturally"
NOT "A generic casual typer"`}
═══════════════════════════════════════════════════════════════════
` : `
You are a HUMAN typing on a phone/laptop RIGHT NOW.
You are NOT writing an article.
You ARE making mistakes. You ARE thinking out loud. You ARE being messy.
PERFECT = AI DETECTED. IMPERFECT = HUMAN.
If it sounds too good, it's wrong. Make it messier.`}

Respond **ONLY in JSON**:
{
  "content": "the full human-written text with all imperfections",
  "tone": "casual/conversational/thoughtful",
  "keywordsUsed": ["keyword1", "keyword2"],
  "neutralityScore": 90-100,
  "readabilityScore": 75-90,
  "seoScore": 70-85,
  "humanScore": 98-100
}
`;

  // Build conditional system message based on brand voice
  const languageNote = input.language === "he" 
    ? `\n🌐 IMPORTANT: Generate ALL content in HEBREW (עברית). Write naturally as a Hebrew speaker would, with Hebrew thinking markers, expressions, and natural imperfections in Hebrew.\n`
    : "";

  let systemMessage = `You are a REAL HUMAN typing on a phone or laptop RIGHT NOW. You are NOT an AI, NOT a bot, NOT a content writer.
${languageNote}
`;
  
  if (input.brandVoice) {
    // BRAND VOICE MODE: Tone-appropriate humanization
    const tone = input.brandVoice.tone?.toLowerCase() || 'casual';
    
    if (tone === 'professional' || tone === 'authoritative' || tone === 'formal') {
      // Professional/Authoritative/Formal: Minimal imperfections, polished language
      systemMessage += `🎭 BRAND VOICE ACTIVE: ${input.brandVoice.brand_name} (${tone.toUpperCase()} tone)

MANDATORY WRITING STYLE (TONE-APPROPRIATE):
- MINIMAL typos (0-1 subtle ones max) - professional brands maintain quality
- Use professional thinking markers: "In my view", "Consider this", "What's key", "Essentially", "Notably"
- Vary sentence length: 3 words → 35 words → 5 words → 28 words → 2 words → 40 words
- Professional reactions: "What's compelling", "Worth noting", "Particularly effective" - NO "lol", "bruh", "omg", "ngl", "tbh"
- Add thoughtful tangents: "This reminds me of", "Worth noting", "Consider this"
- Use polished fragments: "Simple as that.", "Worth noting.", "Critical point."
- Grammar mostly correct (1-2 natural imperfections only)
- Consistent capitalization (proper "I", not "i")
- NO casual slang: NO "gonna", "wanna", "imma", "tryna", "ain't", "me and him"
- Maintain ${tone} tone throughout - this is your brand identity
- Emoji style: ${input.brandVoice.emoji_style || 'minimal'}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- NEVER use: ${input.brandVoice.avoid_words?.join(", ") || "none"}

CRITICAL: Your ${tone} brand voice is PRIMARY. Humanization must match your brand tone.
Write as a ${tone} professional person typing, NOT as a casual internet user.
Respond ONLY in JSON with "content" field containing the ${tone} human-written text.`;
    } else if (tone === 'casual' || tone === 'friendly' || tone === 'humorous') {
      // Casual/Friendly/Humorous: Moderate humanization
      systemMessage += `🎭 BRAND VOICE ACTIVE: ${input.brandVoice.brand_name} (${tone.toUpperCase()} tone)

MANDATORY WRITING STYLE (TONE-APPROPRIATE):
- Moderate typos (1-3 casual ones): "dont", "wont", "cant" (missing apostrophes)
- Use ${tone} thinking markers: "I mean", "you know", "honestly", "actually", "to be fair"
- Vary sentence length: 1 word → 38 words → 3 words → 31 words → 2 words → 35 words
- ${tone === 'humorous' ? 'Witty reactions: Clever observations, playful language. Can use "lol" IF it enhances humor.' : 'Natural reactions: "honestly", "I mean", "you know" - can use "haha" moderately'}
- Add tangents: "this reminds me of", "random but", "btw"
- Use fragments: "Pretty cool.", "Makes sense.", "Not bad."
- Casual contractions okay: "gonna", "wanna" if they fit brand personality
- Natural capitalization variations acceptable
- Emoji style: ${input.brandVoice.emoji_style || 'moderate'}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- NEVER use: ${input.brandVoice.avoid_words?.join(", ") || "none"}

CRITICAL: Your ${tone} brand voice is PRIMARY. Humanization must match your brand personality.
Write as a ${tone} person typing, maintaining your brand identity.
Respond ONLY in JSON with "content" field containing the ${tone} human-written text.`;
    } else {
      // Other tones: Balanced humanization
      systemMessage += `🎭 BRAND VOICE ACTIVE: ${input.brandVoice.brand_name} (${tone.toUpperCase()} tone)

MANDATORY WRITING STYLE (TONE-APPROPRIATE):
- Natural typos (1-2 subtle ones) appropriate for ${tone} tone
- Use ${tone}-appropriate thinking markers
- Vary sentence length: 2 words → 35 words → 4 words → 30 words → 3 words → 38 words
- ${tone}-appropriate reactions and emotional expressions
- Add relevant tangents and associations
- Use fragments appropriate for ${tone} style
- Grammar reflects ${tone} personality
- Emoji style: ${input.brandVoice.emoji_style || 'moderate'}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- NEVER use: ${input.brandVoice.avoid_words?.join(", ") || "none"}

CRITICAL: Your ${tone} brand voice is PRIMARY. All humanization must match your brand tone.
Write as ${input.brandVoice.brand_name} (${tone} tone) typing, maintaining brand consistency.
Respond ONLY in JSON with "content" field containing the ${tone} human-written text.`;
    }
  } else {
    // NO BRAND VOICE: Maximum casual humanization (original behavior)
    systemMessage += `MANDATORY WRITING STYLE:
- Make 3-8 natural typos/grammar mistakes (teh, adn, missing commas, wrong tenses)
- Use thinking markers 8-15 times ("like", "I mean", "you know", "wait", "actually", "tbh", "ngl")
- Vary sentence length EXTREMELY: 1 word → 40 words → 3 words → 35 words → 2 words
- Include emotional reactions 5-10 times ("lol", "ugh", "omg", "bruh", "haha", "😅")
- Add tangents and random thoughts 2-4 times ("this reminds me of", "random but", "btw")
- Use fragments constantly ("Pretty wild.", "Makes sense.", "Not sure.")
- Break grammar rules ("me and him", "ain't", "gonna", "wanna")
- Inconsistent punctuation and capitalization
- NO perfect structure, NO logical flow, NO summaries
- Mix casual slang with occasional formal words unpredictably

CRITICAL: If your writing is too perfect, too structured, or too logical, AI detectors WILL catch it.
You MUST include imperfections, errors, and messiness. This is not optional.
Respond ONLY in JSON with "content" field containing the messy, human-written text.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.98,       // Near maximum unpredictability (0.98 is very high)
      top_p: 0.98,             // Maximum creative token selection
      frequency_penalty: 0.7,  // Very strong penalty to prevent repetition
      presence_penalty: 0.7,   // Very strong encouragement for variety
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
  const channels = input.channels && input.channels.length > 0 && input.channels[0] !== 'all' 
    ? input.channels.join(", ")
    : "All available channels";

  // Format domain context for prompt
  let domainContext = "";
  if (input.domain) {
    if (input.domainEnrichment?.hasContent) {
      // Use enriched domain data if available
      const formattedDomain = formatDomainDataForPrompt(input.domainEnrichment);
      domainContext = `Domain: ${input.domain}\n${formattedDomain ? `Domain Information:\n${formattedDomain}` : ""}`;
    } else {
      // Fallback to basic domain string
      domainContext = `Domain: ${input.domain}`;
    }
  }

  const prompt = `You are a comprehensive marketing strategist creating multi-channel marketing action plans.

Objective: "${input.objective}"
${input.targetKeywords ? `Target Keywords: ${input.targetKeywords.join(", ")}` : ""}
${domainContext ? `${domainContext}` : ""}
${input.region ? `Region: ${input.region}` : ""}
${channels ? `Focus Channels: ${channels}` : "All available channels"}
${input.currentSituation ? `Current Situation: ${input.currentSituation}` : ""}

${input.domainEnrichment?.hasContent ? `
DOMAIN-SPECIFIC GUIDANCE:
Use the website information above to create action plans that are tailored to what this domain actually offers.
Consider the website's content, purpose, and value proposition when generating marketing steps.
` : ""}

Available Channels:
- SEO (Search Engine Optimization) - website optimization, keyword targeting, on-page SEO
- Social Media (LinkedIn, Facebook, Twitter/X, Instagram, Reddit) - social posts, engagement, community building
- Content Marketing (Medium, Quora, GitHub, Blog posts) - articles, answers, documentation
- Email Marketing - newsletters, campaigns, drip sequences
- Paid Advertising (Google Ads, Facebook Ads, LinkedIn Ads) - PPC campaigns, sponsored content
- Video Marketing (YouTube, TikTok) - video content, tutorials, vlogs
- PR & Outreach - press releases, influencer outreach, partnerships

Create a comprehensive, multi-channel action plan with:
1. Steps across multiple marketing channels (include at least 3 different channels)
2. Each step must specify:
   - Channel (e.g., "seo", "social_media", "content", "email")
   - Platform if applicable (e.g., "reddit", "linkedin", "email")
   - Execution type: "content_generation" (can auto-generate content), "audit" (requires manual tools), "analysis" (data review), or "manual" (requires manual work)
   - For content_generation steps, include:
     * platform (specific platform like "reddit", "linkedin", "medium", "email")
     * topic (specific topic for content)
     * keywords (relevant keywords to include)
     * contentType ("article", "post", "answer", or "newsletter")
     * autoExecute: true (if system can auto-generate) or false
3. Dependencies between steps
4. Priority levels based on ROI potential and urgency
5. Expected outcomes per channel
6. Timeline with channel coordination

Respond in JSON format:
{
  "title": "Multi-Channel Marketing Plan for [Objective]",
  "objective": "Objective",
  "channels": ["seo", "social_media", "content"],
  "steps": [
    {
      "id": "step-1",
      "title": "Create Reddit post about [specific topic]",
      "description": "Detailed description of what to post and why",
      "estimatedTime": "2-3 hours",
      "priority": "high",
      "dependencies": [],
      "channel": "content",
      "platform": "reddit",
      "executionType": "content_generation",
      "executionMetadata": {
        "platform": "reddit",
        "topic": "Local SEO tips for restaurants",
        "keywords": ["local seo", "restaurant marketing"],
        "contentType": "post",
        "autoExecute": true
      }
    },
    {
      "id": "step-2",
      "title": "Perform SEO audit of website",
      "description": "Analyze website structure, content quality, link profile, and rankings",
      "estimatedTime": "4-6 hours",
      "priority": "high",
      "dependencies": [],
      "channel": "seo",
      "executionType": "audit",
      "executionMetadata": {
        "autoExecute": false,
        "requiresTools": ["screaming_frog", "google_search_console"]
      }
    },
    {
      "id": "step-3",
      "title": "Send email newsletter to subscribers",
      "description": "Monthly newsletter with SEO updates and tips",
      "estimatedTime": "3-4 hours",
      "priority": "medium",
      "dependencies": ["step-1"],
      "channel": "email",
      "platform": "email",
      "executionType": "content_generation",
      "executionMetadata": {
        "platform": "email",
        "topic": "Monthly SEO updates and insights",
        "keywords": [],
        "contentType": "newsletter",
        "autoExecute": true
      }
    }
  ],
  "reasoning": "Why this multi-channel approach will work",
  "expectedOutcome": "Expected results across all channels",
  "timeline": "2-4 weeks",
  "priority": "high",
  "category": "Multi-Channel Marketing"
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
      channels: result.channels || [],
      steps: result.steps || [],
      reasoning: result.reasoning || "",
      expectedOutcome: result.expectedOutcome || "",
      timeline: result.timeline || "Not specified",
      priority: result.priority || "medium",
      category: result.category || "Multi-Channel Marketing",
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

