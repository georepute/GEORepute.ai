import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BATCH_SIZE = 10;
const ABSENCE_POSITION_THRESHOLD = 20;
const MAX_BLIND_SPOTS = 50;

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

async function callOpenAI(queries: string[], domain: string, apiKey: string): Promise<QueryAIResult[] | null> {
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

async function callGemini(queries: string[], domain: string, apiKey: string): Promise<QueryAIResult[] | null> {
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

async function callPerplexity(queries: string[], domain: string, apiKey: string): Promise<QueryAIResult[] | null> {
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

async function callClaude(queries: string[], domain: string, apiKey: string): Promise<QueryAIResult[] | null> {
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

async function callGrok(queries: string[], domain: string, apiKey: string): Promise<QueryAIResult[] | null> {
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

function calcDemandScore(impressions: number, maxImpressions: number): number {
  if (maxImpressions <= 0) return 5;
  const normalized = impressions / maxImpressions;
  return Math.min(10, normalized * 5 + 5);
}

function calcAbsenceScore(
  position: number,
  aiMentions: boolean
): number {
  let score = 0;
  if (position > ABSENCE_POSITION_THRESHOLD || position <= 0) score += 4;
  else if (position > 10) score += 3;
  if (!aiMentions) score += 2;
  return Math.min(10, score);
}

function getPriority(blindSpotScore: number): "high" | "medium" | "low" {
  if (blindSpotScore >= 50) return "high";
  if (blindSpotScore >= 20) return "medium";
  return "low";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
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
      .from("blind_spot_reports")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId)
      .single();

    if (error || !report) {
      return NextResponse.json({ success: true, data: null });
    }

    const blindSpots = report.blind_spots || [];
    const enginesUsed = report.engines_used || [];

    const perLlmStats: Record<string, { mentioned: number; total: number; pct: number }> = {};
    for (const engineKey of enginesUsed) {
      const withEngine = blindSpots.filter((b: any) => b?.llmMentions && engineKey in b.llmMentions);
      const mentioned = withEngine.filter((b: any) => b.llmMentions[engineKey]).length;
      const total = withEngine.length;
      perLlmStats[engineKey] = {
        mentioned,
        total,
        pct: total > 0 ? Math.round((mentioned / total) * 1000) / 10 : 0,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        domain: report.domain_hostname,
        blindSpots,
        summary: {
          totalBlindSpots: report.total_blind_spots,
          avgBlindSpotScore: Number(report.avg_blind_spot_score),
          aiBlindSpotPct: Number(report.ai_blind_spot_pct),
          perLlmStats,
        },
        enginesUsed,
        generatedAt: report.generated_at,
        videoUrl: report.video_url ?? null,
        videoStatus: report.video_status ?? null,
        videoGeneratedAt: report.video_generated_at ?? null,
      },
    });
  } catch (error: any) {
    console.error("strategic-blind-spots GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load saved report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const domainId: string | undefined = body.domainId;

    if (!domainId) {
      return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    const { data: domainRow, error: domainError } = await supabase
      .from("domains")
      .select("id, domain")
      .eq("id", domainId)
      .single();

    if (domainError || !domainRow) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const hostname = extractDomainName(domainRow.domain);

    const { data: gscRaw, error: gscError } = await supabase
      .from("gsc_queries")
      .select("query, clicks, impressions, ctr, position")
      .eq("domain_id", domainId)
      .order("impressions", { ascending: false });

    if (gscError) {
      return NextResponse.json({ error: "Failed to fetch GSC data" }, { status: 500 });
    }

    console.log("[strategic-blind-spots] Fetched", gscRaw?.length ?? 0, "raw GSC rows from Supabase for domain", domainId, "(no date filter - uses all synced data)");

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
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, MAX_BLIND_SPOTS);

    console.log("[strategic-blind-spots] Regenerating report on", allQueries.length, "queries:", allQueries.map((q) => q.query));

    if (allQueries.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          domain: hostname,
          blindSpots: [],
          summary: {
            totalBlindSpots: 0,
            avgBlindSpotScore: 0,
            aiBlindSpotPct: 0,
          },
          enginesUsed: [],
          generatedAt: new Date().toISOString(),
        },
      });
    }

    const availableEngines = getAvailableEngines();
    if (availableEngines.length === 0) {
      return NextResponse.json(
        { error: "No AI engine API keys configured. Set OPENAI_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY." },
        { status: 503 }
      );
    }

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

    const maxImpressions = Math.max(...allQueries.map((q) => q.impressions), 1);
    const totalEngines = availableEngines.length;

    const engineLabels: Record<string, string> = {
      chatgpt: "ChatGPT",
      gemini: "Gemini",
      perplexity: "Perplexity",
      claude: "Claude",
      grok: "Grok",
    };

    const blindSpots = allQueries.map((q) => {
      const queryKey = q.query.toLowerCase().trim();
      const engines = aiResults.get(queryKey) || {};
      const aiMentions = Object.values(engines).some((e) => e.mentioned);

      const llmMentions: Record<string, boolean> = {};
      for (const [key, result] of Object.entries(engines)) {
        llmMentions[key] = result.mentioned;
      }

      const demandScore = calcDemandScore(q.impressions, maxImpressions);
      const absenceScore = calcAbsenceScore(q.position, aiMentions);
      const blindSpotScore = Math.round(demandScore * absenceScore * 100) / 100;
      const priority = getPriority(blindSpotScore);

      return {
        query: q.query,
        topic: q.query,
        volume: q.impressions,
        gscImpressions: q.impressions,
        avgPosition: Math.round(q.position * 10) / 10,
        aiMentions,
        llmMentions,
        demandScore: Math.round(demandScore * 10) / 10,
        absenceScore: Math.round(absenceScore * 10) / 10,
        blindSpotScore,
        priority,
      };
    });

    blindSpots.sort((a, b) => b.blindSpotScore - a.blindSpotScore);

    const highDemandCount = blindSpots.filter((b) => b.gscImpressions >= 100).length;
    const aiBlindCount = blindSpots.filter((b) => !b.aiMentions && b.gscImpressions >= 100).length;
    const aiBlindSpotPct = highDemandCount > 0 ? Math.round((aiBlindCount / highDemandCount) * 1000) / 10 : 0;

    const perLlmStats: Record<string, { mentioned: number; total: number; pct: number }> = {};
    for (const engineKey of availableEngines.map((e) => e.key)) {
      const withEngine = blindSpots.filter((b) => b.llmMentions && engineKey in b.llmMentions);
      const mentioned = withEngine.filter((b) => b.llmMentions[engineKey]).length;
      const total = withEngine.length;
      perLlmStats[engineKey] = {
        mentioned,
        total,
        pct: total > 0 ? Math.round((mentioned / total) * 1000) / 10 : 0,
      };
    }

    const summary = {
      totalBlindSpots: blindSpots.length,
      avgBlindSpotScore: Math.round(
        (blindSpots.reduce((s, b) => s + b.blindSpotScore, 0) / (blindSpots.length || 1)) * 100
      ) / 100,
      aiBlindSpotPct,
      perLlmStats,
    };

    const enginesUsed = availableEngines.map((e) => e.key);
    const generatedAt = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("blind_spot_reports")
      .upsert(
        {
          user_id: session.user.id,
          domain_id: domainId,
          domain_hostname: hostname,
          query_limit: blindSpots.length,
          engines_used: enginesUsed,
          total_blind_spots: summary.totalBlindSpots,
          avg_blind_spot_score: summary.avgBlindSpotScore,
          ai_blind_spot_pct: summary.aiBlindSpotPct,
          blind_spots: blindSpots,
          generated_at: generatedAt,
          // Clear video when report is regenerated — video must be regenerated too
          video_url: null,
          video_request_id: null,
          video_status: null,
          video_generated_at: null,
          video_requested_at: null,
        },
        { onConflict: "user_id,domain_id" }
      );

    if (upsertError) {
      console.error("Failed to save blind spot report:", upsertError);
    }

    return NextResponse.json({
      success: true,
      data: {
        domain: hostname,
        blindSpots,
        summary,
        enginesUsed,
        generatedAt,
        videoUrl: null,
        videoStatus: null,
        videoGeneratedAt: null,
      },
    });
  } catch (error: any) {
    console.error("strategic-blind-spots POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate blind spot report" },
      { status: 500 }
    );
  }
}
