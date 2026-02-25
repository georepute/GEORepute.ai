import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      country,
      countryCode,
      region,
      language,
      languageName,
      brandName,
      industry,
      description,
      websiteUrl,
      intelligenceContext,
    } = body;

    if (!country || !language || !brandName) {
      return NextResponse.json(
        { error: "country, language, and brandName are required" },
        { status: 400 }
      );
    }

    const targetArea = region ? `${region}, ${country}` : country;

    const intelligenceSummary = intelligenceContext
      ? `
EXISTING INTELLIGENCE DATA:
- Brand Health Score: ${intelligenceContext.reports?.executiveBrief?.overallHealth ?? "N/A"}/100
- AI Visibility Score: ${intelligenceContext.reports?.aiVisibility?.overallScore ?? "N/A"}/100
- Current Strengths: ${intelligenceContext.reports?.executiveBrief?.keyStrengths?.slice(0, 3).join("; ") ?? "N/A"}
- Current Gaps: ${intelligenceContext.reports?.executiveBrief?.criticalGaps?.slice(0, 3).join("; ") ?? "N/A"}
- Top Performing Keywords: ${intelligenceContext.reports?.seoAnalysis?.topKeywords?.slice(0, 6).join(", ") ?? "N/A"}
- AI Platform Presence: ${intelligenceContext.reports?.aiVisibility?.platforms?.map((p: any) => `${p.platform}: ${p.score}`).join(", ") ?? "N/A"}
`
      : "";

    const prompt = `You are a senior international business development strategist with deep expertise in digital marketing, SEO, AI visibility, and market expansion.

CRITICAL: The entire JSON response MUST be written in ${languageName}. Every string value (summary, opportunities, keyChannels, contentIdeas, tactics, etc.) must be in ${languageName}, not English. Keywords and content topics should be in ${languageName} as well. Only keep JSON keys and the "priority" enum value ("high"/"medium"/"low") in English.

BRAND PROFILE:
- Name: ${brandName}
- Industry: ${industry}
${description ? `- Description: ${description}` : ""}
${websiteUrl ? `- Website: ${websiteUrl}` : ""}
${intelligenceSummary}

TARGET MARKET:
- Country: ${country} (${countryCode})
- Region/City: ${region || "Nationwide — all major cities"}
- Primary Language: ${languageName} (${language})

TASK: Create a highly specific, immediately executable business development strategy for ${brandName} to grow in ${targetArea} using ${languageName}.

CRITICAL REQUIREMENTS — be extremely specific and practical:
1. Every action must name the exact platform, tool, or channel (not generic advice like "use social media")
2. Include real market-specific knowledge about ${country} (search engines used, popular platforms, consumer behavior)
3. The 30/60/90 day plan must have concrete steps a person could start today
4. Keywords must be realistic search terms people in ${country} would actually use in ${languageName}
5. Content ideas must be ready-to-produce topics with specific angles
6. KPI targets must be achievable numbers based on industry benchmarks
7. ALL text content in the JSON (summary, opportunities, keyChannels, contentIdeas, tactics, etc.) MUST be written in ${languageName} — the language selected for this target market.

Return ONLY a JSON object with this exact structure. Write all string values in ${languageName}:

{
  "summary": "3-sentence executive summary: current opportunity, strategic angle, expected outcome",
  "marketSizeEstimate": "Specific estimate: addressable audience size, market maturity, and monetization potential in ${targetArea}",
  "priority": "high|medium|low",
  "estimatedReach": "Realistic monthly reach range once strategy is executing (e.g. '40,000–120,000 users/month')",
  "timeToMarket": "Realistic time to first measurable results (e.g. '6–10 weeks')",

  "opportunities": [
    "Specific, named opportunity 1 (e.g. 'Google Maps dominates local search in ${country} — claim and optimize Google Business Profile in ${languageName}')",
    "Specific, named opportunity 2",
    "Specific, named opportunity 3",
    "Specific, named opportunity 4",
    "Specific, named opportunity 5"
  ],

  "actionPlan": {
    "days30": [
      "Exact step 1: What to do, which platform/tool, expected outcome (e.g. 'Register Google Business Profile at business.google.com — fill in all fields in ${languageName}, add 10 photos, collect first 5 reviews')",
      "Exact step 2",
      "Exact step 3",
      "Exact step 4",
      "Exact step 5"
    ],
    "days60": [
      "Exact step 1 for days 31–60",
      "Exact step 2",
      "Exact step 3",
      "Exact step 4",
      "Exact step 5"
    ],
    "days90": [
      "Exact step 1 for days 61–90",
      "Exact step 2",
      "Exact step 3",
      "Exact step 4",
      "Exact step 5"
    ]
  },

  "keyChannels": [
    "Channel name: specific reason it works in ${country} + how to use it",
    "Channel 2",
    "Channel 3",
    "Channel 4"
  ],

  "keywordClusters": [
    {
      "cluster": "Cluster name (e.g. 'Brand Awareness')",
      "intent": "informational|navigational|commercial|transactional",
      "keywords": ["keyword1 in ${languageName}", "keyword2", "keyword3", "keyword4", "keyword5"]
    },
    {
      "cluster": "Second cluster",
      "intent": "commercial",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
    },
    {
      "cluster": "Third cluster",
      "intent": "transactional",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ],

  "contentIdeas": [
    { "format": "Blog Post", "topic": "Specific title in ${languageName} or translated", "platform": "Website/Blog", "angle": "Why this resonates with ${country} audience" },
    { "format": "Video", "topic": "Specific video topic", "platform": "YouTube/TikTok/etc", "angle": "Angle" },
    { "format": "Social Post", "topic": "Specific post idea", "platform": "Most used platform in ${country}", "angle": "Angle" },
    { "format": "FAQ Page", "topic": "Top questions people in ${country} ask about ${industry}", "platform": "Website", "angle": "SEO + AI visibility" },
    { "format": "Local Guide", "topic": "Specific local angle", "platform": "Google Maps/Blog", "angle": "Local SEO" }
  ],

  "localSEOTactics": [
    "Specific SEO tactic with exact action (e.g. 'Submit ${websiteUrl || 'website'} to ${country}-specific directories: [specific directory names]')",
    "Tactic 2",
    "Tactic 3",
    "Tactic 4"
  ],

  "aiVisibilityTactics": [
    "Specific tactic to appear in AI answer engines (ChatGPT, Perplexity, Gemini) for ${country} queries — name the exact content type and platform",
    "Tactic 2",
    "Tactic 3"
  ],

  "contentApproach": "2–3 sentences on tone, style, cultural nuances, and messaging angle specific to ${targetArea} audience",

  "languageConsiderations": "Specific notes on ${languageName} usage: formal vs informal register, RTL/LTR, local terminology, slang to use or avoid",

  "competitiveInsights": "2 sentences: who the typical competitors are in ${country} for ${industry} and the 1–2 differentiation angles ${brandName} should exploit",

  "budgetGuidance": "Rough monthly budget range for this market and how to allocate it (e.g. '30% paid ads, 40% content, 20% SEO tools, 10% partnerships')",

  "kpiTargets": [
    { "metric": "Organic traffic from ${country}", "target": "Specific number", "timeframe": "3 months" },
    { "metric": "Google Business Profile views", "target": "Specific number", "timeframe": "30 days" },
    { "metric": "Brand mentions in AI results", "target": "Specific target", "timeframe": "90 days" },
    { "metric": "Local keyword rankings (top 10)", "target": "X keywords", "timeframe": "60 days" }
  ],

  "quickWins": [
    "Quick win 1: can be done in < 2 hours today",
    "Quick win 2",
    "Quick win 3"
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const strategy = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      strategy: {
        ...strategy,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Business development strategy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate strategy" },
      { status: 500 }
    );
  }
}
