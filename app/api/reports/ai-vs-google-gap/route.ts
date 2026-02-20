import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const BATCH_SIZE = 10;

interface QueryAIResult {
  mentioned: boolean;
  rank_position: number | null;
  sentiment: number;
}

type EngineKey = "chatgpt" | "gemini" | "perplexity" | "claude" | "grok";

interface EngineConfig {
  key: EngineKey;
  label: string;
  envKeys: string[];
}

const ENGINE_CONFIGS: EngineConfig[] = [
  { key: "chatgpt", label: "ChatGPT", envKeys: ["OPENAI_API_KEY"] },
  { key: "gemini", label: "Gemini", envKeys: ["GOOGLE_API_KEY", "GEMINI_API_KEY"] },
  { key: "perplexity", label: "Perplexity", envKeys: ["PERPLEXITY_API_KEY"] },
  { key: "claude", label: "Claude", envKeys: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"] },
  { key: "grok", label: "Grok", envKeys: ["XAI_API_KEY", "GROK_API_KEY"] },
];

function getApiKey(envKeys: string[]): string | null {
  for (const k of envKeys) {
    const v = process.env[k];
    if (v) return v;
  }
  return null;
}

function getAvailableEngines(): { key: EngineKey; apiKey: string }[] {
  const available: { key: EngineKey; apiKey: string }[] = [];
  for (const cfg of ENGINE_CONFIGS) {
    const apiKey = getApiKey(cfg.envKeys);
    if (apiKey) available.push({ key: cfg.key, apiKey });
  }
  return available;
}

function extractDomainName(raw: string): string {
  return raw
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function buildCheckPrompt(queries: string[], domain: string): string {
  const brandName = domain.replace(/\.(com|org|net|io|co|ai|dev|app|xyz).*$/i, "");
  const list = queries.map((q, i) => `${i + 1}. "${q}"`).join("\n");

  return `You are analyzing search queries to determine if a specific website would be cited or recommended by an AI search assistant.

Domain: ${domain}
Brand: ${brandName}

For each query below, determine:
1. Would an AI assistant naturally mention, cite, or recommend "${domain}" (or the brand "${brandName}") when answering this query?
2. If yes, at what approximate position (1-10) among recommended sources?
3. What is the sentiment of the context where the domain might appear? (-1.0 negative to +1.0 positive)

Queries:
${list}

Return ONLY a valid JSON array with exactly ${queries.length} objects, one per query in the same order:
[{"mentioned":true,"rank_position":3,"sentiment":0.8},{"mentioned":false,"rank_position":null,"sentiment":0.0}]

Rules:
- Return ONLY the JSON array. No markdown, no explanation, no code fences.
- Each object must have exactly 3 keys: mentioned (boolean), rank_position (number 1-10 or null), sentiment (number -1.0 to 1.0).
- If not mentioned, rank_position must be null and sentiment should be 0.0.`;
}

function parseAIResponse(text: string, expectedCount: number): QueryAIResult[] | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return null;
    const results: QueryAIResult[] = arr.slice(0, expectedCount).map((item: any) => ({
      mentioned: Boolean(item.mentioned),
      rank_position: item.mentioned && typeof item.rank_position === "number"
        ? Math.max(1, Math.min(10, Math.round(item.rank_position)))
        : null,
      sentiment: typeof item.sentiment === "number"
        ? Math.max(-1, Math.min(1, item.sentiment))
        : 0,
    }));
    while (results.length < expectedCount) {
      results.push({ mentioned: false, rank_position: null, sentiment: 0 });
    }
    return results;
  } catch {
    return null;
  }
}

// ─── Engine callers ─────────────────────────────────────────────────────

async function callOpenAI(
  queries: string[],
  domain: string,
  apiKey: string
): Promise<QueryAIResult[] | null> {
  const prompt = buildCheckPrompt(queries, domain);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2048,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You return only valid JSON arrays. No other text." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseAIResponse(data.choices?.[0]?.message?.content?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callGemini(
  queries: string[],
  domain: string,
  apiKey: string
): Promise<QueryAIResult[] | null> {
  const prompt = buildCheckPrompt(queries, domain);
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseAIResponse(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callPerplexity(
  queries: string[],
  domain: string,
  apiKey: string
): Promise<QueryAIResult[] | null> {
  const prompt = buildCheckPrompt(queries, domain);
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        max_tokens: 2048,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You return only valid JSON arrays. No other text." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseAIResponse(data.choices?.[0]?.message?.content?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callClaude(
  queries: string[],
  domain: string,
  apiKey: string
): Promise<QueryAIResult[] | null> {
  const prompt = buildCheckPrompt(queries, domain);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
        system: "You return only valid JSON arrays. No other text.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseAIResponse(data.content?.[0]?.text?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callGrok(
  queries: string[],
  domain: string,
  apiKey: string
): Promise<QueryAIResult[] | null> {
  const prompt = buildCheckPrompt(queries, domain);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-3-mini-fast",
        max_tokens: 2048,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You return only valid JSON arrays. No other text." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseAIResponse(data.choices?.[0]?.message?.content?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

const ENGINE_CALLERS: Record<
  EngineKey,
  (queries: string[], domain: string, apiKey: string) => Promise<QueryAIResult[] | null>
> = {
  chatgpt: callOpenAI,
  gemini: callGemini,
  perplexity: callPerplexity,
  claude: callClaude,
  grok: callGrok,
};

// ─── Scoring ───────────────────────────────────────────────────────────

function calcGoogleScore(
  position: number,
  impressions: number,
  ctr: number,
  maxImpressions: number,
  maxCtr: number
): number {
  const positionScore = Math.max(0, Math.min(1, 1 - Math.log(Math.max(position, 1)) / Math.log(100)));
  const impressionScore = maxImpressions > 0 ? impressions / maxImpressions : 0;
  const ctrScore = maxCtr > 0 ? ctr / maxCtr : 0;
  return (0.5 * positionScore + 0.3 * impressionScore + 0.2 * ctrScore) * 100;
}

function calcAIScore(
  engineResults: Record<string, QueryAIResult> | undefined,
  totalEngines: number
): number {
  if (!engineResults || totalEngines === 0) return 0;

  const entries = Object.values(engineResults);
  const mentionCount = entries.filter((e) => e.mentioned).length;
  const mentionScore = mentionCount / totalEngines;

  const mentionedEntries = entries.filter((e) => e.mentioned && e.rank_position != null);
  const rankScoreAvg =
    mentionedEntries.length > 0
      ? mentionedEntries.reduce((sum, e) => sum + (1 - (e.rank_position! - 1) / 10), 0) /
        mentionedEntries.length
      : 0;

  const sentimentValues = entries.filter((e) => e.mentioned);
  const avgSentiment =
    sentimentValues.length > 0
      ? sentimentValues.reduce((sum, e) => sum + e.sentiment, 0) / sentimentValues.length
      : 0;
  const sentimentNormalized = (avgSentiment + 1) / 2;

  return (0.5 * mentionScore + 0.3 * rankScoreAvg + 0.2 * sentimentNormalized) * 100;
}

function getGapBand(gap: number): string {
  if (gap >= 40) return "ai_risk";
  if (gap >= 15) return "moderate_gap";
  if (gap > -15) return "balanced";
  if (gap > -40) return "seo_opportunity";
  return "seo_failure";
}

function getGapLabel(band: string): string {
  switch (band) {
    case "ai_risk": return "SEO Strong, AI Weak";
    case "moderate_gap": return "Moderate AI Gap";
    case "balanced": return "Balanced";
    case "seo_opportunity": return "AI Strong, SEO Weak";
    case "seo_failure": return "SEO Failure";
    default: return band;
  }
}

// ─── GET — Load saved report ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");
    if (!domainId) {
      return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from("ai_google_gap_reports")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId)
      .single();

    if (error || !report) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        domain: report.domain_hostname,
        queries: report.queries || [],
        summary: {
          totalQueries: report.total_queries,
          avgGapScore: Number(report.avg_gap_score),
          aiRisk: report.ai_risk_count,
          moderateGap: report.moderate_gap_count,
          balanced: report.balanced_count,
          seoOpportunity: report.seo_opportunity_count,
          seoFailure: report.seo_failure_count,
        },
        enginesUsed: report.engines_used || [],
        generatedAt: report.generated_at,
      },
    });
  } catch (error: any) {
    console.error("ai-vs-google-gap GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load saved report" },
      { status: 500 }
    );
  }
}

// ─── POST — Generate & save report ────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const domainId: string | undefined = body.domainId;

    if (!domainId) {
      return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    // 1. Get domain record
    const { data: domainRow, error: domainError } = await supabase
      .from("domains")
      .select("id, domain")
      .eq("id", domainId)
      .single();

    if (domainError || !domainRow) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const hostname = extractDomainName(domainRow.domain);

    // 2. Fetch GSC queries
    const { data: gscRaw, error: gscError } = await supabase
      .from("gsc_queries")
      .select("query, clicks, impressions, ctr, position")
      .eq("domain_id", domainId)
      .order("impressions", { ascending: false });

    if (gscError) {
      return NextResponse.json({ error: "Failed to fetch GSC data" }, { status: 500 });
    }

    // 3. Aggregate by query text
    const queryMap = new Map<
      string,
      { query: string; clicks: number; impressions: number; ctr: number; position: number; count: number }
    >();
    for (const row of gscRaw || []) {
      const key = (row.query || "").toLowerCase().trim();
      if (!key) continue;
      if (queryMap.has(key)) {
        const existing = queryMap.get(key)!;
        existing.clicks += row.clicks || 0;
        existing.impressions += row.impressions || 0;
        existing.count += 1;
        existing.position = (existing.position * (existing.count - 1) + (row.position || 0)) / existing.count;
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      } else {
        queryMap.set(key, {
          query: row.query,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
          count: 1,
        });
      }
    }

    const allQueries = Array.from(queryMap.values())
      .sort((a, b) => b.impressions - a.impressions);

    if (allQueries.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          domain: hostname,
          queries: [],
          summary: { totalQueries: 0, avgGapScore: 0, aiRisk: 0, moderateGap: 0, balanced: 0, seoOpportunity: 0, seoFailure: 0 },
          enginesUsed: [],
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // 4. Check available AI engines
    const availableEngines = getAvailableEngines();
    if (availableEngines.length === 0) {
      return NextResponse.json(
        { error: "No AI engine API keys configured. Set OPENAI_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY." },
        { status: 503 }
      );
    }

    // 5. Process queries through AI engines in batches
    const aiResults = new Map<string, Record<string, QueryAIResult>>();

    for (let i = 0; i < allQueries.length; i += BATCH_SIZE) {
      const batch = allQueries.slice(i, i + BATCH_SIZE);
      const queryTexts = batch.map((q) => q.query);

      const enginePromises = availableEngines.map(async ({ key, apiKey }) => {
        const caller = ENGINE_CALLERS[key];
        const results = await caller(queryTexts, hostname, apiKey);
        return { key, results };
      });

      const settled = await Promise.allSettled(enginePromises);

      for (let j = 0; j < queryTexts.length; j++) {
        const queryKey = queryTexts[j].toLowerCase().trim();
        if (!aiResults.has(queryKey)) aiResults.set(queryKey, {});
        const existing = aiResults.get(queryKey)!;

        for (const outcome of settled) {
          if (outcome.status === "fulfilled" && outcome.value.results?.[j]) {
            existing[outcome.value.key] = outcome.value.results[j];
          }
        }
      }
    }

    // 6. Calculate scores
    const maxImpressions = Math.max(...allQueries.map((q) => q.impressions), 1);
    const maxCtr = Math.max(...allQueries.map((q) => q.ctr), 0.001);
    const totalEngines = availableEngines.length;

    const gapTable = allQueries.map((q) => {
      const queryKey = q.query.toLowerCase().trim();
      const engines = aiResults.get(queryKey) || {};
      const googleScore = calcGoogleScore(q.position, q.impressions, q.ctr, maxImpressions, maxCtr);
      const aiScore = calcAIScore(engines, totalEngines);
      const gapScore = googleScore - aiScore;
      const band = getGapBand(gapScore);

      return {
        query: q.query,
        impressions: q.impressions,
        clicks: q.clicks,
        ctr: Math.round(q.ctr * 10000) / 100,
        position: Math.round(q.position * 10) / 10,
        googleScore: Math.round(googleScore * 10) / 10,
        aiScore: Math.round(aiScore * 10) / 10,
        gapScore: Math.round(gapScore * 10) / 10,
        band,
        bandLabel: getGapLabel(band),
        engines,
      };
    });

    gapTable.sort((a, b) => b.gapScore - a.gapScore);

    const summary = {
      totalQueries: gapTable.length,
      avgGapScore: Math.round(
        (gapTable.reduce((s, q) => s + q.gapScore, 0) / (gapTable.length || 1)) * 10
      ) / 10,
      aiRisk: gapTable.filter((q) => q.band === "ai_risk").length,
      moderateGap: gapTable.filter((q) => q.band === "moderate_gap").length,
      balanced: gapTable.filter((q) => q.band === "balanced").length,
      seoOpportunity: gapTable.filter((q) => q.band === "seo_opportunity").length,
      seoFailure: gapTable.filter((q) => q.band === "seo_failure").length,
    };

    const enginesUsed = availableEngines.map((e) => e.key);
    const generatedAt = new Date().toISOString();

    // 7. Save report to Supabase (upsert by user_id + domain_id)
    const { error: upsertError } = await supabase
      .from("ai_google_gap_reports")
      .upsert(
        {
          user_id: session.user.id,
          domain_id: domainId,
          domain_hostname: hostname,
          query_limit: allQueries.length,
          engines_used: enginesUsed,
          total_queries: summary.totalQueries,
          avg_gap_score: summary.avgGapScore,
          ai_risk_count: summary.aiRisk,
          moderate_gap_count: summary.moderateGap,
          balanced_count: summary.balanced,
          seo_opportunity_count: summary.seoOpportunity,
          seo_failure_count: summary.seoFailure,
          queries: gapTable,
          generated_at: generatedAt,
        },
        { onConflict: "user_id,domain_id" }
      );

    if (upsertError) {
      console.error("Failed to save gap report:", upsertError);
    }

    return NextResponse.json({
      success: true,
      data: {
        domain: hostname,
        queries: gapTable,
        summary,
        enginesUsed,
        generatedAt,
      },
    });
  } catch (error: any) {
    console.error("ai-vs-google-gap POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate gap report" },
      { status: 500 }
    );
  }
}
