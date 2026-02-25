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
      projectId,
      brandName,
      industry,
      websiteUrl,
      description,
      competitors,
      targetKeywords = [],
      intelligenceContext,
      language = "en",
    } = body;

    if (!projectId || !brandName || !competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json(
        { error: "projectId, brandName, and at least one competitor are required" },
        { status: 400 }
      );
    }

    if (competitors.length > 5) {
      return NextResponse.json({ error: "Maximum 5 competitors allowed" }, { status: 400 });
    }

    const normalisedCompetitors: Array<{ name?: string; domain: string }> = competitors.map((c: any) =>
      typeof c === "string" ? { domain: c } : { name: c.name || undefined, domain: c.domain }
    );

    const competitorList = normalisedCompetitors
      .map((c) => (c.name ? `${c.name} (${c.domain})` : c.domain))
      .join(", ");

    // ── Fetch GSC, AI visibility, intelligence (same as action-plan) ────────

    let gscKeywords: any[] = [];
    let gscQueries: any[] = [];
    let gscPages: any[] = [];
    let aiVisibilityData: any[] = [];
    let aiSessionSummary: { total_queries: number; total_mentions: number } | null = null;
    let domainIdForGSC: string | null = null;

    const rawDomain = (websiteUrl || "")
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .trim();

    if (rawDomain) {
      try {
        const { data: domainRow } = await supabase
          .from("domains")
          .select("id")
          .or(`domain.ilike.%${rawDomain}%,domain.eq.${rawDomain}`)
          .limit(1)
          .maybeSingle();
        domainIdForGSC = domainRow?.id || null;
      } catch {}

      if (domainIdForGSC) {
        try {
          const [queriesRes, pagesRes] = await Promise.all([
            supabase.from("gsc_queries").select("query, clicks, impressions, ctr, position").eq("domain_id", domainIdForGSC).eq("user_id", session.user.id),
            supabase.from("gsc_pages").select("page, clicks, impressions, ctr, position").eq("domain_id", domainIdForGSC).eq("user_id", session.user.id),
          ]);

          const queryMap = new Map<string, any>();
          for (const r of queriesRes.data || []) {
            const key = r.query;
            if (queryMap.has(key)) {
              const e = queryMap.get(key)!;
              e.clicks += r.clicks || 0;
              e.impressions += r.impressions || 0;
              e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
              e.position = (e.position + (r.position || 0)) / 2;
            } else {
              queryMap.set(key, { keyword: key, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 });
            }
          }
          gscQueries = Array.from(queryMap.values()).sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0));

          const pageMap = new Map<string, any>();
          for (const r of pagesRes.data || []) {
            const key = r.page;
            if (pageMap.has(key)) {
              const e = pageMap.get(key)!;
              e.clicks += r.clicks || 0;
              e.impressions += r.impressions || 0;
              e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
              e.position = (e.position + (r.position || 0)) / 2;
            } else {
              pageMap.set(key, { page: key, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 });
            }
          }
          gscPages = Array.from(pageMap.values()).sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0));
        } catch (e) {
          console.error("Error fetching GSC:", e);
        }
      }
    }

    try {
      const { data: kwData } = await supabase
        .from("gsc_keywords")
        .select("keyword, clicks, impressions, ctr, position")
        .eq("project_id", projectId)
        .order("impressions", { ascending: false })
        .limit(30);
      gscKeywords = kwData || [];
    } catch (e) {
      console.error("Error fetching gsc_keywords:", e);
    }

    try {
      const { data: sessions } = await supabase
        .from("brand_analysis_sessions")
        .select("id, results_summary, total_queries")
        .eq("project_id", projectId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (sessions?.length) {
        const latest = sessions[0];
        const totalQueries = latest.results_summary?.total_queries || latest.total_queries || 0;
        const { data: aiResponses } = await supabase
          .from("ai_platform_responses")
          .select("platform, prompt, gap_suggestion, response_metadata")
          .eq("project_id", projectId)
          .eq("session_id", latest.id);
        aiVisibilityData = aiResponses || [];
        const mentions = aiVisibilityData.filter((r: any) => r.response_metadata?.brand_mentioned === true).length;
        aiSessionSummary = { total_queries: totalQueries || aiVisibilityData.length, total_mentions: mentions };
      }
    } catch (e) {
      console.error("Error fetching AI visibility:", e);
    }

    // ── Build context for LLM ───────────────────────────────────────────────

    const allGsc = [...gscKeywords, ...gscQueries];
    const seenKw = new Set<string>();
    const dedupedGsc = allGsc.filter((k: any) => {
      const kw = k.keyword || k.query;
      if (seenKw.has(kw)) return false;
      seenKw.add(kw);
      return true;
    });
    const topKws = [...dedupedGsc].sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 20);
    const weakKws = dedupedGsc
      .filter((k: any) => (k.impressions || 0) > 50 && ((k.position || 99) > 15 || (k.ctr || 0) < 0.02))
      .sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 15);

    const fmtKw = (k: any) => `"${k.keyword || k.query}" — pos ${(k.position || 0).toFixed(1)}, ${(k.impressions || 0).toLocaleString()} impr`;
    const gscBlock = topKws.length
      ? `\n📊 GSC KEYWORDS:\n${topKws.map(fmtKw).join("\n")}${weakKws.length ? `\n\nHigh-opportunity (weak position/CTR):\n${weakKws.map(fmtKw).join("\n")}` : ""}`
      : "";

    const missingQueries = aiVisibilityData
      .filter((r: any) => r.response_metadata?.brand_mentioned === false && r.prompt)
      .slice(0, 15)
      .map((r: any) => `"${r.prompt}" [${r.platform}]`);
    const gapSuggestions = aiVisibilityData.filter((r: any) => r.gap_suggestion).slice(0, 10).map((r: any) => `[${r.platform}] ${r.gap_suggestion}`);
    const aiBlock =
      aiVisibilityData.length && aiSessionSummary
        ? `\n🤖 AI VISIBILITY:\nMention rate: ${aiSessionSummary.total_mentions}/${aiSessionSummary.total_queries}\n${missingQueries.length ? `Queries where brand NOT mentioned:\n${missingQueries.join("\n")}\n` : ""}${gapSuggestions.length ? `Gap suggestions:\n${gapSuggestions.join("\n")}` : ""}`
        : "";

    let intelBlock = "";
    if (intelligenceContext?.reports) {
      const r = intelligenceContext.reports;
      const parts: string[] = [];
      if (r.executiveBrief) parts.push(`Health: ${r.executiveBrief.overallHealth}/100. Gaps: ${(r.executiveBrief.criticalGaps || []).slice(0, 3).join("; ")}`);
      if (r.seoAnalysis?.topKeywords?.length) parts.push(`Top keywords: ${r.seoAnalysis.topKeywords.slice(0, 8).join(", ")}`);
      if (r.riskMatrix?.details?.topBlindSpots?.length) parts.push(`Blind spots: ${r.riskMatrix.details.topBlindSpots.map((b: any) => b.query).join(", ")}`);
      if (parts.length) intelBlock = `\n🎯 INTELLIGENCE: ${parts.join(". ")}`;
    }

    const targetKwBlock = targetKeywords?.length ? `\n🎯 TARGET KEYWORDS: ${targetKeywords.join(", ")}` : "";

    const langNames: Record<string, string> = {
      en: "English", "en-US": "English (US)", "en-GB": "English (UK)",
      he: "Hebrew", ar: "Arabic", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ja: "Japanese", zh: "Chinese (Mandarin)",
      ko: "Korean", hi: "Hindi", nl: "Dutch", sv: "Swedish", pl: "Polish",
      ru: "Russian", tr: "Turkish", th: "Thai", id: "Indonesian", ms: "Malay",
      vi: "Vietnamese", uk: "Ukrainian", ro: "Romanian", cs: "Czech",
      hu: "Hungarian", el: "Greek", da: "Danish", fi: "Finnish", no: "Norwegian",
      fa: "Persian (Farsi)", bn: "Bengali", ta: "Tamil", sw: "Swahili",
      tl: "Filipino (Tagalog)", ur: "Urdu",
    };
    const langName = langNames[language] || "English";

    const prompt = `You are a GEORepute.ai growth strategist. Create ACTION PLANS based on competitor research. The plans must be practically executable — steps that can be done by GEORepute.ai (content generation, AI visibility checks, brand monitoring) and content posting (blog, LinkedIn, Reddit, etc.).

CRITICAL: Write the ENTIRE response in ${langName} (language code: ${language}). All text — title, objective, reasoning, expectedOutcome, step titles, descriptions — must be in ${langName}.

BRAND: ${brandName}
Industry: ${industry || "N/A"}
${description ? `Description: ${description}` : ""}
${websiteUrl ? `Website: ${websiteUrl}` : ""}

COMPETITORS TO OUTPERFORM: ${competitorList}

Analyze these competitors and create action plans that exploit their weaknesses and leverage ${brandName}'s opportunities. Use the real data below.
${gscBlock}${aiBlock}${intelBlock}${targetKwBlock}

CRITICAL — OUTPUT FORMAT (same as Action Plans tab):
- Steps MUST be executable by GEORepute.ai or content posting. Use executionType "content_generation" for steps that create content (blog, post, article) — these get a "Generate Content" button.
- For content_generation steps: set autoExecute: true, include platform (shopify|linkedin|reddit|medium|quora|twitter|instagram|facebook|github), topic, keywords array, contentType (blog_article|linkedin_post|post|answer).
- Use executionType "audit" or "manual" for steps that require human action (e.g. "Run AI Visibility check in GEORepute.ai").
- Reference REAL keywords from the GSC/AI data above in content steps.
- Target the exact queries where brand is NOT mentioned.
- At least 4 steps should be content_generation with autoExecute true.
- Platforms: Blog/Website=shopify, LinkedIn=linkedin, Reddit=reddit, Medium=medium, Quora=quora.

Return ONLY valid JSON with this EXACT structure:
{
  "title": "Competitive Action Plan: [specific focus based on competitor gaps]",
  "objective": "Outperform [competitor names] by [specific strategy]",
  "reasoning": "2-3 sentences on competitive analysis and why this plan works",
  "expectedOutcome": "Expected results in 3-6 months",
  "timeline": "3-6 months for measurable impact",
  "priority": "high",
  "category": "Competitor-Based Growth",
  "channels": ["content", "seo", "ai_visibility"],
  "steps": [
    {
      "id": "step-1",
      "title": "Step title (specific, actionable)",
      "description": "What to do and why",
      "estimatedTime": "1-2 hours",
      "priority": "high",
      "dependencies": [],
      "channel": "content",
      "platform": "linkedin",
      "executionType": "content_generation",
      "executionMetadata": {
        "platform": "linkedin",
        "topic": "Specific topic from GSC/AI data",
        "keywords": ["keyword1", "keyword2"],
        "contentType": "linkedin_post",
        "articles_per_topic": 1,
        "word_count_per_article": 500,
        "autoExecute": true
      }
    }
  ]
}

Generate 5-7 steps. At least 4 must be content_generation with autoExecute true. Use real keywords from the data.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let result: any;
    try {
      result = JSON.parse(raw);
    } catch {
      result = { title: "Competitor Action Plan", objective: "Outperform competitors", steps: [], reasoning: "", expectedOutcome: "", timeline: "3-6 months", priority: "high", category: "Competitor-Based Growth", channels: [] };
    }

    // Map to frontend format (same as action-plan route)
    const mappedSteps = (result.steps || []).map((step: any, i: number) => ({
      step: step.title || step.step || "",
      description: step.description || "",
      priority: step.priority || "medium",
      estimatedImpact: step.estimatedTime || step.estimatedImpact || "Not specified",
      completed: false,
      id: step.id || `step-${i + 1}`,
      estimatedTime: step.estimatedTime,
      dependencies: step.dependencies || [],
      channel: step.channel,
      platform: step.platform,
      executionType: step.executionType || "manual",
      executionMetadata: step.executionMetadata || {
        autoExecute: false,
        executionStatus: "pending",
      },
    }));

    const plan = {
      id: `cr-${Date.now()}`,
      title: result.title,
      objective: result.objective,
      steps: mappedSteps,
      reasoning: result.reasoning,
      expectedOutcome: result.expectedOutcome,
      timeline: result.timeline,
      priority: result.priority,
      category: result.category,
      channels: result.channels,
      projectId,
      projectName: brandName,
      source: "competitor_research",
    };

    return NextResponse.json({
      success: true,
      plan,
      plans: [plan],
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Competitor research error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate competitor research" },
      { status: 500 }
    );
  }
}
