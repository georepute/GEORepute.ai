/**
 * AI-powered gap suggestions for AI vs Google Gap report.
 * Analyzes each query and its gap type, returns tailored suggestions via Claude or Gemini.
 * When project_id is provided, suggestions are persisted to ai_platform_responses.gap_suggestion.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const MAX_ITEMS = 20;

/** Match frontend: normalized query key for matching prompts */
function normalizeQuery(q: string): string {
  return (q || "").trim().toLowerCase();
}

type GapType = "Both" | "Google only" | "AI only" | "Neither";

interface GapItem {
  query: string;
  gap: GapType;
}

function buildPrompt(items: GapItem[]): string {
  const list = items
    .map(
      (item, i) =>
        `${i + 1}. Query: "${item.query}" | Gap: ${item.gap} (Google top 100: ${item.gap === "Google only" || item.gap === "Both"}, AI brand mentioned: ${item.gap === "AI only" || item.gap === "Both"})`
    )
    .join("\n");
  return `You are an SEO and brand visibility expert. For each search query below, the "gap" shows whether the brand appears in Google organic top 100 and/or is mentioned by AI engines (e.g. ChatGPT, Claude).

Analyze each query and its gap. For each one, give ONE short actionable suggestion (1–2 sentences, under 120 chars) on how to cover this gap. Be specific to the query topic when possible.

Queries and gaps:
${list}

Return ONLY a JSON array of strings in the same order (one suggestion per query). No markdown, no explanation. Example: ["Create a blog post about X and submit to AI training.","Improve your product page for Y to rank in Google."]`;
}

async function callClaude(items: GapItem[]): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) return null;
  const prompt = buildPrompt(items);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: "You return only valid JSON arrays of strings. No other text.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const text = data.content?.[0]?.text?.trim() || "";
  return parseSuggestions(text, items.length);
}

async function callGemini(items: GapItem[]): Promise<string[] | null> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const prompt = buildPrompt(items);
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  return parseSuggestions(text, items.length);
}

async function callOpenAI(items: GapItem[]): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const prompt = buildPrompt(items);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: "You return only valid JSON arrays of strings. No other text." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  return parseSuggestions(text, items.length);
}

function parseSuggestions(text: string, expectedLength: number): string[] | null {
  const cleaned = text.replace(/^```json?\s*|\s*```$/g, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) return null;
    const suggestions = arr.slice(0, expectedLength).map((s) => String(s).slice(0, 200));
    while (suggestions.length < expectedLength) suggestions.push("");
    return suggestions;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: GapItem[] = Array.isArray(body.items) ? body.items : [];
    const projectId = typeof body.project_id === "string" && body.project_id ? body.project_id : null;
    if (items.length === 0 || items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Send 1–${MAX_ITEMS} items` },
        { status: 400 }
      );
    }
    for (const item of items) {
      if (!item.query || !item.gap) {
        return NextResponse.json(
          { error: "Each item must have query and gap" },
          { status: 400 }
        );
      }
    }

    // Prefer Claude, then Gemini, then OpenAI
    let suggestions: string[] | null = await callClaude(items);
    if (!suggestions) suggestions = await callGemini(items);
    if (!suggestions) suggestions = await callOpenAI(items);

    if (!suggestions) {
      return NextResponse.json(
        { error: "No AI provider configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env.local." },
        { status: 503 }
      );
    }

    // Persist suggestions to ai_platform_responses.gap_suggestion when project_id is provided
    if (projectId && suggestions.length > 0) {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { data: rows, error: fetchError } = await supabase
        .from("ai_platform_responses")
        .select("id, prompt")
        .eq("project_id", projectId);
      if (fetchError) {
        console.error("gap-suggestions: failed to fetch rows for persist", fetchError);
      } else if (!rows?.length) {
        console.warn("gap-suggestions: no ai_platform_responses rows for project_id", projectId);
      } else {
        const normalizedToIds = new Map<string, string[]>();
        for (const r of rows) {
          const norm = normalizeQuery(r.prompt ?? "");
          if (!norm) continue;
          if (!normalizedToIds.has(norm)) normalizedToIds.set(norm, []);
          normalizedToIds.get(norm)!.push(r.id);
        }
        for (let i = 0; i < items.length && i < suggestions.length; i++) {
          const query = items[i].query;
          const suggestion = (suggestions[i] ?? "").slice(0, 500);
          const norm = normalizeQuery(query);
          const ids = normalizedToIds.get(norm);
          if (ids?.length) {
            const { error: updateError } = await supabase
              .from("ai_platform_responses")
              .update({ gap_suggestion: suggestion })
              .in("id", ids);
            if (updateError) {
              console.error("gap-suggestions: failed to update gap_suggestion", { query: norm.slice(0, 50), ids: ids.length, error: updateError });
            }
          }
        }
      }
    }

    return NextResponse.json({ suggestions });
  } catch (e: any) {
    console.error("gap-suggestions error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
