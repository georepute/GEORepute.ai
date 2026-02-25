import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Weighted position scoring: 1st mention = 3pts, 2nd = 2pts, 3rd = 1pt
function positionPoints(position: number | null): number {
  if (!position) return 0;
  if (position === 1) return 3;
  if (position === 2) return 2;
  if (position === 3) return 1;
  return 0;
}

function extractDomainName(raw: string): string {
  return raw
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function extractBrandName(domain: string): string {
  return domain.replace(/\.(com|org|net|io|co|ai|dev|app|xyz).*$/i, "");
}

const QUERY_INTENT_BUCKETS = {
  commercial: [
    "best {brand} alternatives",
    "top {brand} competitors",
    "{brand} vs competitors",
    "buy {brand}",
    "{brand} pricing",
    "{brand} review",
    "best {category} tools",
    "top {category} software",
  ],
  comparison: [
    "{brand} vs",
    "compare {brand}",
    "{brand} comparison",
    "alternatives to {brand}",
    "similar to {brand}",
  ],
  informational: [
    "what is {brand}",
    "how does {brand} work",
    "{brand} features",
    "{brand} use cases",
    "who uses {brand}",
  ],
};

function buildMarketSharePrompt(queries: string[], domain: string): string {
  const brand = extractBrandName(domain);
  const list = queries.map((q, i) => `${i + 1}. "${q}"`).join("\n");

  return `You are an AI analyst measuring "Market Share of Attention" for brands.

Domain: ${domain}
Brand: ${brand}

For each query below, determine how AI search engines would respond:
1. Would "${brand}" be mentioned at all?
2. If mentioned, at what position (1-10)? First mention is most important.
3. Would it be RECOMMENDED as "best", "top", or "leading"?
4. Would it be framed as the "default" or most obvious choice?

Queries:
${list}

Return ONLY a valid JSON array with exactly ${queries.length} objects:
[{"mentioned":true,"position":1,"recommended":true,"is_default":true},{"mentioned":false,"position":null,"recommended":false,"is_default":false}]

Rules:
- Return ONLY the JSON array. No markdown, no explanation.
- mentioned: boolean — is the brand mentioned at all?
- position: number 1-10 or null — position of first mention
- recommended: boolean — is it called "best", "top", "leading"?
- is_default: boolean — is it framed as the obvious/default choice?`;
}

interface BrandMentionResult {
  mentioned: boolean;
  position: number | null;
  recommended: boolean;
  is_default: boolean;
}

function parseAIMentionResponse(text: string, expectedCount: number): BrandMentionResult[] | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return null;
    const results: BrandMentionResult[] = arr.slice(0, expectedCount).map((item: any) => ({
      mentioned: Boolean(item.mentioned),
      position: item.mentioned && typeof item.position === "number"
        ? Math.max(1, Math.min(10, Math.round(item.position)))
        : null,
      recommended: Boolean(item.recommended),
      is_default: Boolean(item.is_default),
    }));
    while (results.length < expectedCount) {
      results.push({ mentioned: false, position: null, recommended: false, is_default: false });
    }
    return results;
  } catch {
    return null;
  }
}

async function callOpenAI(queries: string[], domain: string, apiKey: string): Promise<BrandMentionResult[] | null> {
  const prompt = buildMarketSharePrompt(queries, domain);
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
    return parseAIMentionResponse(data.choices?.[0]?.message?.content?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callGemini(queries: string[], domain: string, apiKey: string): Promise<BrandMentionResult[] | null> {
  const prompt = buildMarketSharePrompt(queries, domain);
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
    return parseAIMentionResponse(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callPerplexity(queries: string[], domain: string, apiKey: string): Promise<BrandMentionResult[] | null> {
  const prompt = buildMarketSharePrompt(queries, domain);
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
    return parseAIMentionResponse(data.choices?.[0]?.message?.content?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callClaude(queries: string[], domain: string, apiKey: string): Promise<BrandMentionResult[] | null> {
  const prompt = buildMarketSharePrompt(queries, domain);
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
    return parseAIMentionResponse(data.content?.[0]?.text?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

async function callGrok(queries: string[], domain: string, apiKey: string): Promise<BrandMentionResult[] | null> {
  const prompt = buildMarketSharePrompt(queries, domain);
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
    return parseAIMentionResponse(data.choices?.[0]?.message?.content?.trim() || "", queries.length);
  } catch {
    return null;
  }
}

type EngineKey = "chatgpt" | "gemini" | "perplexity" | "claude" | "grok";

const ENGINE_CONFIGS: { key: EngineKey; label: string; envKeys: string[] }[] = [
  { key: "chatgpt", label: "ChatGPT", envKeys: ["OPENAI_API_KEY"] },
  { key: "gemini", label: "Gemini", envKeys: ["GOOGLE_API_KEY", "GEMINI_API_KEY"] },
  { key: "perplexity", label: "Perplexity", envKeys: ["PERPLEXITY_API_KEY"] },
  { key: "claude", label: "Claude", envKeys: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"] },
  { key: "grok", label: "Grok", envKeys: ["XAI_API_KEY", "GROK_API_KEY"] },
];

const ENGINE_CALLERS: Record<EngineKey, (q: string[], d: string, k: string) => Promise<BrandMentionResult[] | null>> = {
  chatgpt: callOpenAI,
  gemini: callGemini,
  perplexity: callPerplexity,
  claude: callClaude,
  grok: callGrok,
};

function getApiKey(envKeys: string[]): string | null {
  for (const k of envKeys) {
    const v = process.env[k];
    if (v) return v;
  }
  return null;
}

function getAvailableEngines(): { key: EngineKey; apiKey: string }[] {
  return ENGINE_CONFIGS.flatMap(cfg => {
    const apiKey = getApiKey(cfg.envKeys);
    return apiKey ? [{ key: cfg.key, apiKey }] : [];
  });
}

// Get project linked to domain: brand_analysis_projects.domain_id = domains.id (FK)
// Returns project or null. No fallbacks.
function getProjectForDomain(
  projectsByDomainId: Map<string, { id: string; brand_name: string; website_url?: string }>,
  domainId: string
): { id: string; brand_name: string; website_url?: string } | null {
  return projectsByDomainId.get(domainId) ?? null;
}

// Resolve project by domain_id (single query for POST handler)
async function resolveProjectByDomainId(
  supabase: any,
  userId: string,
  domainId: string
): Promise<{ id: string; brand_name: string; website_url?: string } | null> {
  const { data } = await supabase
    .from("brand_analysis_projects")
    .select("id, brand_name, website_url")
    .eq("user_id", userId)
    .eq("domain_id", domainId)
    .limit(1)
    .maybeSingle();
  return data;
}

// ── GET: return domains with project link + data status + saved report ────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");

    // Fetch domains - same logic as /api/integrations/google-search-console/domains
    const { data: orgUser, error: orgError } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single();

    let domains: { id: string; domain: string; gsc_integration?: { verification_status?: string } | null }[] = [];
    if (orgError) {
      const { data } = await supabase
        .from("domains")
        .select("id, domain, gsc_integration")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      domains = data || [];
    } else {
      const { data } = await supabase
        .from("domains")
        .select("id, domain, gsc_integration")
        .eq("organization_id", orgUser!.organization_id)
        .order("created_at", { ascending: false });
      domains = data || [];
    }

    const domainIds = domains.map((d) => d.id);

    // Fetch projects linked by domain_id (brand_analysis_projects.domain_id = domains.id)
    const projectsByDomainId = new Map<string, { id: string; brand_name: string; website_url?: string }>();
    if (domainIds.length > 0) {
      const { data: projects } = await supabase
        .from("brand_analysis_projects")
        .select("id, brand_name, website_url, domain_id")
        .eq("user_id", session.user.id)
        .in("domain_id", domainIds);
      for (const p of projects || []) {
        if (p.domain_id) projectsByDomainId.set(p.domain_id, { id: p.id, brand_name: p.brand_name, website_url: p.website_url });
      }
    }

    // Enrich each domain with project, hasAiData, hasGscData, isGscVerified, report
    const enriched: Array<{
      id: string;
      domain: string;
      projectId: string | null;
      brandName: string | null;
      hasAiData: boolean;
      hasGscData: boolean;
      isGscVerified: boolean;
      missingRequirements: string[];
      report: any;
    }> = [];

    for (const d of domains) {
      const isGscVerified = d.gsc_integration?.verification_status === "verified";
      const project = getProjectForDomain(projectsByDomainId, d.id);

      let hasAiData = false;
      if (project?.id) {
        const { count } = await supabase
          .from("ai_platform_responses")
          .select("id", { count: "exact", head: true })
          .eq("project_id", project.id);
        hasAiData = (count || 0) > 0;
      }

      let hasGscData = false;
      const { count: gscCount } = await supabase
        .from("gsc_queries")
        .select("id", { count: "exact", head: true })
        .eq("domain_id", d.id);
      hasGscData = (gscCount || 0) > 0;

      const missingRequirements: string[] = [];
      if (!isGscVerified) missingRequirements.push("Domain must be GSC verified. Verify this domain in Google Search Console first.");
      if (!project) missingRequirements.push("No AI Visibility project linked to this domain. Create a project in AI Visibility and select this domain in Step 1.");
      else if (!hasAiData) missingRequirements.push("Run AI Visibility analysis first to collect AI engine responses.");
      if (!hasGscData) missingRequirements.push("Connect Google Search Console for this domain and sync data to get organic metrics.");

      let report: any = null;
      if (project?.id) {
        const { data: saved } = await supabase
          .from("market_share_reports")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("project_id", project.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        report = saved;
      }

      enriched.push({
        id: d.id,
        domain: d.domain,
        projectId: project?.id || null,
        brandName: project?.brand_name || null,
        hasAiData,
        hasGscData,
        isGscVerified,
        missingRequirements,
        report,
      });
    }

    // If domainId provided, return single domain's report
    if (domainId) {
      const found = enriched.find(e => e.id === domainId);
      return NextResponse.json({
        success: true,
        data: {
          domains: enriched,
          report: found?.report || null,
          selectedDomain: found || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        domains: enriched,
        report: null,
        selectedDomain: null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load report" }, { status: 500 });
  }
}

// ── POST: generate new report ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const domainId: string | undefined = body.domainId;
    if (!domainId) return NextResponse.json({ error: "domainId is required" }, { status: 400 });

    // Load domain (with GSC verification status)
    const { data: domainRow, error: domainError } = await supabase
      .from("domains")
      .select("id, domain, gsc_integration")
      .eq("id", domainId)
      .single();

    if (domainError || !domainRow) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

    const isGscVerified = domainRow.gsc_integration?.verification_status === "verified";
    if (!isGscVerified) {
      return NextResponse.json({
        error: "Domain must be GSC verified. Verify this domain in Google Search Console first.",
      }, { status: 400 });
    }

    const domainHost = extractDomainName(domainRow.domain);

    // Resolve project by domain_id (brand_analysis_projects.domain_id = domain.id)
    const project = await resolveProjectByDomainId(supabase, session.user.id, domainId);
    if (!project) {
      return NextResponse.json({
        error: "No AI Visibility project linked to this domain. Create a project in AI Visibility and select this domain in Step 1.",
      }, { status: 400 });
    }

    const projectId = project.id;
    const brandName = extractBrandName(domainHost) || project.brand_name;

    // ── Validate: AI data required ───────────────────────────────────────────
    const { count: aiCount } = await supabase
      .from("ai_platform_responses")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if ((aiCount || 0) === 0) {
      return NextResponse.json({
        error: "No AI Visibility data found. Run AI Visibility analysis first to collect AI engine responses for this domain.",
      }, { status: 400 });
    }

    // ── Validate: GSC data required ───────────────────────────────────────────
    const { count: gscCount } = await supabase
      .from("gsc_queries")
      .select("id", { count: "exact", head: true })
      .eq("domain_id", domainId);

    if ((gscCount || 0) === 0) {
      return NextResponse.json({
        error: "No Google Search Console data found for this domain. Connect GSC in Assets Hub and sync data first.",
      }, { status: 400 });
    }

    // ── 1. Build query dataset from existing AI visibility data ─────────────
    const { data: aiResponses } = await supabase
      .from("ai_platform_responses")
      .select("prompt, platform, response_metadata, response, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(500);

    const storedQueries: string[] = Array.from(
      new Set((aiResponses || []).map((r: any) => r.prompt).filter(Boolean))
    );

    // ── 2. Fetch GSC organic data ─────────────────────────────────────────────
    const { data: gscData } = await supabase
      .from("gsc_queries")
      .select("query, impressions, clicks, position")
      .eq("domain_id", domainId)
      .order("impressions", { ascending: false })
      .limit(200);
    const gscQueries: any[] = gscData || [];

    // ── 3. Calculate AI Mention Share from stored responses ──────────────────
    const AI_ENGINES: EngineKey[] = ["chatgpt", "claude", "gemini", "perplexity", "grok"];
    const engineStats: Record<string, { totalQueries: number; mentions: number; recommendations: number; weightedScore: number; isDefault: number }> = {};

    for (const eng of AI_ENGINES) {
      engineStats[eng] = { totalQueries: 0, mentions: 0, recommendations: 0, weightedScore: 0, isDefault: 0 };
    }

    let hasStoredData = false;
    if (aiResponses && aiResponses.length > 0) {
      hasStoredData = true;
      for (const resp of aiResponses) {
        const eng = (resp.platform || "").toLowerCase() as EngineKey;
        if (!engineStats[eng]) continue;
        engineStats[eng].totalQueries++;
        const meta = resp.response_metadata || {};
        if (meta.brand_mentioned) {
          engineStats[eng].mentions++;
          const pos: number | null = meta.rank_position ?? null;
          engineStats[eng].weightedScore += positionPoints(pos);
          if (meta.is_recommended || meta.recommended) engineStats[eng].recommendations++;
          if (meta.is_default) engineStats[eng].isDefault++;
        }
      }
    }

    // If not enough stored data, run fresh AI queries on a sample (fallback - should not happen after validation)
    const availableEngines = getAvailableEngines();
    const BATCH_SIZE = 8;

    if (!hasStoredData && storedQueries.length === 0 && availableEngines.length > 0) {
      const genericQueries = [
        `best ${brandName} alternatives`,
        `${brandName} review`,
        `top ${brandName} competitors`,
        `${brandName} vs competitors`,
        `what is ${brandName}`,
        `${brandName} features`,
        `${brandName} pricing`,
        `${brandName} use cases`,
      ];

      for (const eng of availableEngines) {
        const batch = genericQueries.slice(0, BATCH_SIZE);
        const results = await ENGINE_CALLERS[eng.key](batch, domainHost, eng.apiKey);
        if (!results) continue;
        engineStats[eng.key].totalQueries += batch.length;
        for (const r of results) {
          if (r.mentioned) {
            engineStats[eng.key].mentions++;
            engineStats[eng.key].weightedScore += positionPoints(r.position);
            if (r.recommended) engineStats[eng.key].recommendations++;
            if (r.is_default) engineStats[eng.key].isDefault++;
          }
        }
      }
    }

    // ── 4. Calculate AI Mention Share % ─────────────────────────────────────
    const totalAIQueries = Object.values(engineStats).reduce((s, e) => s + e.totalQueries, 0);
    const totalAIMentions = Object.values(engineStats).reduce((s, e) => s + e.mentions, 0);
    const totalAIWeightedScore = Object.values(engineStats).reduce((s, e) => s + e.weightedScore, 0);
    const totalRecommendations = Object.values(engineStats).reduce((s, e) => s + e.recommendations, 0);

    const aiMentionShare = totalAIQueries > 0 ? (totalAIMentions / totalAIQueries) * 100 : 0;
    const aiRecommendationShare = totalAIMentions > 0 ? (totalRecommendations / totalAIMentions) * 100 : 0;

    // Weighted AI share: normalise weighted score to 0-100
    const maxPossibleWeighted = totalAIQueries * 3; // all first-position
    const weightedAIShare = maxPossibleWeighted > 0 ? (totalAIWeightedScore / maxPossibleWeighted) * 100 : aiMentionShare;

    // Per-engine breakdown
    const engineBreakdown = AI_ENGINES.map(eng => ({
      engine: eng,
      label: ENGINE_CONFIGS.find(c => c.key === eng)?.label || eng,
      totalQueries: engineStats[eng].totalQueries,
      mentions: engineStats[eng].mentions,
      mentionSharePct: engineStats[eng].totalQueries > 0
        ? Math.round((engineStats[eng].mentions / engineStats[eng].totalQueries) * 1000) / 10
        : 0,
      weightedScore: engineStats[eng].weightedScore,
      recommendations: engineStats[eng].recommendations,
    })).filter(e => e.totalQueries > 0);

    // ── 5. Organic Proxy Share from GSC ─────────────────────────────────────
    let organicSharePct = 0;
    let top3FrequencyPct = 0;
    let impressionWeightedSharePct = 0;
    let totalImpressions = 0;
    let top3Count = 0;

    if (gscQueries.length > 0) {
      totalImpressions = gscQueries.reduce((s: number, q: any) => s + (q.impressions || 0), 0);
      const top3Queries = gscQueries.filter((q: any) => q.position <= 3);
      top3Count = top3Queries.length;
      top3FrequencyPct = gscQueries.length > 0 ? (top3Count / gscQueries.length) * 100 : 0;

      const top3Impressions = top3Queries.reduce((s: number, q: any) => s + (q.impressions || 0), 0);
      impressionWeightedSharePct = totalImpressions > 0 ? (top3Impressions / totalImpressions) * 100 : 0;

      // Better method: weight by impressions
      organicSharePct = impressionWeightedSharePct > 0 ? impressionWeightedSharePct : top3FrequencyPct;
    }

    // ── 6. Combined Market Share of Attention ───────────────────────────────
    const AI_WEIGHT = 0.6;
    const ORGANIC_WEIGHT = 0.4;

    // Normalise AI mention share to be in the same range (0-100)
    const normAIShare = Math.min(100, aiMentionShare);
    const normOrganicShare = Math.min(100, organicSharePct);

    const marketShareScore =
      gscQueries.length > 0
        ? AI_WEIGHT * normAIShare + ORGANIC_WEIGHT * normOrganicShare
        : normAIShare;

    const isDefaultLeader = marketShareScore >= 35;

    // Query intent breakdown
    const intentBreakdown = {
      commercial: { queries: 0, mentions: 0 },
      comparison: { queries: 0, mentions: 0 },
      informational: { queries: 0, mentions: 0 },
    };

    if (aiResponses && aiResponses.length > 0) {
      for (const resp of aiResponses) {
        const q = (resp.prompt || "").toLowerCase();
        let intent: "commercial" | "comparison" | "informational" = "informational";
        if (q.includes("best") || q.includes("buy") || q.includes("price") || q.includes("top ")) {
          intent = "commercial";
        } else if (q.includes("vs") || q.includes("compare") || q.includes("alternative")) {
          intent = "comparison";
        }
        intentBreakdown[intent].queries++;
        if (resp.response_metadata?.brand_mentioned) {
          intentBreakdown[intent].mentions++;
        }
      }
    }

    // ── 7. Persist report ───────────────────────────────────────────────────
    const reportPayload = {
      user_id: session.user.id,
      project_id: projectId,
      brand_name: brandName,
      domain: domainHost,
      ai_mention_share_pct: Math.round(aiMentionShare * 10) / 10,
      ai_recommendation_share_pct: Math.round(aiRecommendationShare * 10) / 10,
      weighted_ai_share_pct: Math.round(weightedAIShare * 10) / 10,
      organic_share_pct: Math.round(organicSharePct * 10) / 10,
      market_share_score: Math.round(marketShareScore * 10) / 10,
      is_default_leader: isDefaultLeader,
      total_ai_queries: totalAIQueries,
      total_ai_mentions: totalAIMentions,
      total_recommendations: totalRecommendations,
      total_gsc_queries: gscQueries.length,
      top3_count: top3Count,
      total_impressions: totalImpressions,
      engine_breakdown: engineBreakdown,
      intent_breakdown: intentBreakdown,
      generated_at: new Date().toISOString(),
    };

    // Upsert report
    const { data: upserted, error: upsertError } = await supabase
      .from("market_share_reports")
      .upsert(
        { ...reportPayload },
        { onConflict: "user_id,project_id" }
      )
      .select()
      .single();

    if (upsertError) {
      // If table doesn't exist yet, return the computed data anyway
      console.warn("market_share_reports upsert error:", upsertError.message);
      return NextResponse.json({ success: true, data: { report: reportPayload } });
    }

    return NextResponse.json({ success: true, data: { report: upserted || reportPayload } });
  } catch (error: any) {
    console.error("market-share-of-attention POST error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate report" }, { status: 500 });
  }
}
