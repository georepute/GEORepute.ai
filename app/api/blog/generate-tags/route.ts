import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Generate top-quality tags from a blog topic/query.
 * Used when the user does not supply keywords; tags are derived from the topic.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic } = body as { topic?: string };
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY or CLAUDE_API_KEY not configured" },
        { status: 503 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 256,
        system: `You are an expert at generating SEO- and discovery-friendly tags for blog posts. Given a blog topic or title, output 5–10 high-quality tags: specific, relevant, and useful for search and categorization. Return ONLY a JSON array of strings, no other text. Example: ["seo tips","content marketing","search rankings","digital strategy"]. Use lowercase, comma-separated concepts; no hashtags.`,
        messages: [
          {
            role: "user",
            content: `Generate 5–10 top-quality tags for this blog topic. Return only a JSON array of tag strings.\n\nTopic: ${topic.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic generate-tags error:", response.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: `Failed to generate tags (${response.status})`, details: errText.slice(0, 200) },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const data = await response.json();
    const rawText = (data.content?.[0]?.text ?? "").trim();
    let tags: string[] = [];

    try {
      const parsed = JSON.parse(rawText.replace(/^```\w*\n?|```$/g, "").trim());
      tags = Array.isArray(parsed)
        ? parsed.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean)
        : [];
    } catch {
      const fallback = rawText.split(/[,;]/).map((s: string) => s.trim().replace(/^["'\s]+|["'\s]+$/g, "")).filter(Boolean);
      tags = fallback.length > 0 ? fallback : [topic.trim().split(/\s+/).slice(0, 5).join(" ")];
    }

    if (tags.length === 0) {
      tags = topic.trim().split(/\s+/).filter(Boolean).slice(0, 6);
    }

    return NextResponse.json({ tags });
  } catch (err) {
    console.error("generate-tags error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
