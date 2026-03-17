import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are an expert blog writer. When given a topic, write a complete blog post that follows Universal Content Standards – Article layer.

ARTICLE LAYER (mandatory):
- LENGTH: 800–1,500 words total (across all sections). Do not exceed 1,500 words.
- STRUCTURE: Introduction, topic explanation, examples, insights, conclusion. Include a short FAQ section (3–5 Q&As) for AI/search visibility where relevant—either as a final text section with "FAQ" in the heading and Q&A format, or as a dedicated subsection.
- DATA/VISUAL: At least one comparison table, chart, or statistical reference (required). Use the chart and table types in the JSON structure below to satisfy this.

Quality requirements (apply in EVERY language: English, Hebrew, French, Portuguese, Arabic, Italian, Spanish, etc.):
- ACCURACY: Use only factual, verifiable information. Data and statistics must be realistic and plausible for the topic. Do not invent numbers; use ranges or typical figures that could be cited from real reports.
- DEPTH: Write substantive content. Each text section should have 2–4 full paragraphs with concrete points, context, and clear reasoning—not generic filler or short bullet-style text.
- CREDIBILITY: Use an authoritative, professional tone. Include specific terminology appropriate to the topic. Sources must be real, reputable, and authentic (e.g. official sites, major publications, Wikipedia); every source URL must be a working link that does not 404.
- PROFESSIONAL QUALITY IN ALL LANGUAGES: Content must be publication-ready with no grammar, spelling, or punctuation errors. In Hebrew, French, Portuguese, Arabic, Italian, Spanish, and any other language: use correct grammar, spelling, accents, and punctuation as expected by native readers. Quality must match a professional article in that language.
- HUMANIZED CONTENT: Write naturally, as a skilled human writer would—never robotic or machine-like. Vary sentence structure, use appropriate idioms and phrasing for the target language, and avoid repetitive or stiff wording. Content should read as if written by a native or fluent professional in that language.

You MUST return a JSON object in this exact structure (no other text, no markdown code fences):

{
  "title": "Blog title",
  "subtitle": "One line description",
  "sections": [
    {
      "type": "text",
      "heading": "Section heading",
      "content": "Paragraph text here..."
    },
    {
      "type": "chart",
      "heading": "Chart title",
      "caption": "What this chart shows",
      "chartType": "bar",
      "labels": ["Label1", "Label2", "Label3"],
      "datasets": [
        { "label": "Dataset name", "data": [10, 20, 30] }
      ]
    },
    {
      "type": "table",
      "heading": "Table title",
      "headers": ["Column1", "Column2", "Column3"],
      "rows": [
        ["val1", "val2", "val3"],
        ["val1", "val2", "val3"]
      ]
    }
  ],
  "sources": [
    { "title": "Source name", "url": "https://..." }
  ]
}

Rules:
- LENGTH: Total content must be 800–1,500 words (Article layer). Count text in "content" and headings.
- Include AT LEAST one comparison table and one chart (or more) so the article has at least one comparison table, chart, or statistical reference as per Article layer standards.
- Include a FAQ section where relevant: either a text section with heading containing "FAQ" and Q&A format, or a final subsection with 3–5 questions and answers.
- Place charts/tables where they naturally support the text
- Use realistic, accurate data for the topic (numbers and labels must be plausible and consistent with the narrative)
- chartType must be one of: "bar", "line", "pie", "doughnut"
- Tables (apply in ALL languages - English, Hebrew, French, Portuguese, Arabic, Italian, Spanish, etc.): "headers" must be an array of separate column names (one string per column). "rows" must be an array of rows, each row an array of cell strings with one cell per column. Do not concatenate all headers or all cells into a single string. Keep table content in proper columns for every language.
- Do NOT use em dashes (—) or en dashes (–) in any "content" or "heading" text, in ANY language (English, Hebrew, French, Portuguese, Arabic, Italian, Spanish, etc.). Use commas, parentheses, or " - " (space hyphen space) instead. Example: "in the morning - before getting out of bed - or last thing" not "in the morning—before getting out of bed—or last thing". Same rule for Hebrew, French, Arabic, and all other languages.
- For sources: include 3–5 items. CRITICAL - All links must be REAL, working, and authentic — no dead/404 URLs.
  - Use ONLY URLs you know exist: e.g. Wikipedia (e.g. https://en.wikipedia.org/wiki/... or the correct language subdomain like https://fr.wikipedia.org/wiki/... for French), official .gov / .gouv sites, major publication homepages or known articles.
  - Do NOT invent or guess URLs. Invented URLs cause 404 errors and hurt credibility. Sources must be authentic and real.
  - If you cannot provide a verified working URL for a source, set "url": "#" so the source title still appears without a broken link.
- Return ONLY valid JSON, no markdown, no code fences, no extra text before or after the JSON.
- CRITICAL - Valid JSON: Inside every string value you MUST escape: double quote as \\", backslash as \\\\. Do NOT put literal newline characters inside strings—use \\n for line breaks or keep the value on one line. This applies to all languages (Arabic, French, etc.): keep each "content", "heading", "title" etc. as a single line or use \\n so the output is parseable.`;

export interface StructuredSectionText {
  type: "text";
  heading: string;
  content: string;
}

export interface StructuredSectionChart {
  type: "chart";
  heading: string;
  caption?: string;
  chartType: "bar" | "line" | "pie" | "doughnut";
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export interface StructuredSectionTable {
  type: "table";
  heading: string;
  headers: string[];
  rows: string[][];
}

export type StructuredSection =
  | StructuredSectionText
  | StructuredSectionChart
  | StructuredSectionTable;

export interface StructuredBlog {
  title: string;
  subtitle: string;
  sections: StructuredSection[];
  sources: { title: string; url: string }[];
}

function extractJson(text: string): string {
  let raw = text.trim();
  // Strip markdown code fence: ```json ... ``` or ``` ... ``` (content may span many lines; strip closing ``` even with trailing content)
  if (raw.startsWith("```")) {
    const afterOpenFence = raw.replace(/^```(?:json)?\s*\n?/i, "");
    const lastClose = afterOpenFence.lastIndexOf("\n```");
    const closeIdx = lastClose >= 0 ? lastClose : afterOpenFence.indexOf("```");
    raw = (closeIdx >= 0 ? afterOpenFence.slice(0, closeIdx) : afterOpenFence).trim();
  }
  return raw;
}

/** Fix literal newlines and unescaped double-quotes inside JSON string values so the output is parseable. */
function repairJsonStrings(jsonStr: string): string {
  let inDoubleString = false;
  let escape = false;
  let out = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];
    if (escape) {
      out += c;
      escape = false;
      continue;
    }
    if (c === "\\") {
      out += c;
      escape = true;
      continue;
    }
    if (c === '"' && !escape) {
      if (!inDoubleString) {
        inDoubleString = true;
        out += c;
      } else {
        // Peek ahead: if next non-whitespace is : , } ] then this " closes the string
        let j = i + 1;
        while (j < jsonStr.length && /[\s\n\r]/.test(jsonStr[j])) j++;
        const next = jsonStr[j];
        if (next === ":" || next === "," || next === "}" || next === "]") {
          inDoubleString = false;
          out += c;
        } else {
          // Quote is inside content (e.g. Italian "così", Arabic quotation) — escape it
          out += '\\"';
        }
      }
      continue;
    }
    if (inDoubleString && (c === "\n" || c === "\r")) {
      out += "\\n";
      if (c === "\r" && jsonStr[i + 1] === "\n") i++;
      continue;
    }
    out += c;
  }
  return out;
}

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
    const { topic, language = "en" } = body as { topic?: string; language?: string };
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

    const LANGUAGE_NAMES: Record<string, string> = {
      he: "Hebrew",
      ar: "Arabic",
      fr: "French",
      pt: "Portuguese",
      it: "Italian",
      es: "Spanish",
      de: "German",
      ru: "Russian",
      ja: "Japanese",
      zh: "Chinese",
    };
    const languageName = language && language !== "en" ? (LANGUAGE_NAMES[language] || language) : null;

    const userMessage =
      languageName
        ? `Write a blog about: ${topic.trim()}

CRITICAL - Language: You MUST write ALL user-facing content ONLY in ${languageName}. Every title, subtitle, section heading, paragraph, chart title/caption, table heading, cell text, and source title must be in ${languageName}. Do NOT use English or any other language for that content. Keep only the JSON keys (e.g. "title", "sections") in English.

CRITICAL - Professional quality for ${languageName}: The article must be publication-ready with ZERO grammar, spelling, or punctuation errors. Use correct ${languageName} grammar, accents, and punctuation as a native or fluent professional would. Content must be humanized: natural, varied sentence structure, appropriate idioms and phrasing—never robotic or machine-like. The article must be as accurate, in-depth, and credible as a professional piece in ${languageName}. Write substantial paragraphs (not short or generic). Prefer sources in ${languageName} where they exist (e.g. fr.wikipedia.org, .gouv.fr for French); otherwise use well-known international sources. Data in charts and tables must be realistic and consistent with the text. Do NOT use em dashes (—) or en dashes (–); use commas, parentheses, or " - " instead. Keep table headers and row cells as separate array elements (one per column).`
        : `Write a blog about: ${topic.trim()}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: languageName ? 12000 : 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic structured blog error:", response.status, errText.slice(0, 500));
      return NextResponse.json(
        { error: `Claude API error: ${response.status}`, details: errText.slice(0, 300) },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text?.trim() || "";

    // Log raw AI response preview in terminal (format inspection)
    console.log("\n" + "=".repeat(60));
    console.log("📄 GENERATED CONTENT (raw from AI – /api/blog/generate-structured)");
    console.log("   Topic:", topic?.slice(0, 50) + (topic && topic.length > 50 ? "..." : ""));
    console.log("   Raw length:", rawText.length, "chars");
    console.log("   First 800 chars (format check):");
    console.log("-".repeat(40));
    console.log(rawText.slice(0, 800));
    if (rawText.length > 800) console.log("\n... [truncated]");
    console.log("=".repeat(60) + "\n");

    let jsonStr = extractJson(rawText);

    let blog: StructuredBlog;
    try {
      blog = JSON.parse(jsonStr) as StructuredBlog;
    } catch (e) {
      try {
        jsonStr = repairJsonStrings(jsonStr);
        blog = JSON.parse(jsonStr) as StructuredBlog;
      } catch (e2) {
        console.error("Structured blog JSON parse error:", e2);
        return NextResponse.json(
          { error: "Invalid JSON from Claude", rawPreview: rawText.slice(0, 400) },
          { status: 502 }
        );
      }
    }

    if (!blog.title || !Array.isArray(blog.sections)) {
      return NextResponse.json(
        { error: "Missing title or sections in response" },
        { status: 502 }
      );
    }
    if (!Array.isArray(blog.sources)) blog.sources = [];

    // Log parsed structured blog summary in terminal
    console.log("\n" + "=".repeat(60));
    console.log("📄 PARSED STRUCTURED BLOG (summary)");
    console.log("   Topic:", topic?.slice(0, 50) + (topic && topic.length > 50 ? "..." : ""));
    console.log("   Title:", blog.title?.slice(0, 60) + (blog.title && blog.title.length > 60 ? "..." : ""));
    console.log("   Subtitle:", blog.subtitle?.slice(0, 60) + (blog.subtitle && blog.subtitle.length > 60 ? "..." : ""));
    console.log("   Sections:", blog.sections?.length ?? 0);
    (blog.sections || []).forEach((sec: StructuredSection, i: number) => {
      if (sec.type === "text") {
        const preview = (sec.content || "").slice(0, 80).replace(/\n/g, " ");
        console.log(`   [${i + 1}] text | heading: "${(sec.heading || "").slice(0, 40)}" | content preview: ${preview}...`);
      } else if (sec.type === "table") {
        const t = sec as StructuredSectionTable;
        console.log(`   [${i + 1}] table | heading: "${(t.heading || "").slice(0, 40)}" | headers: ${(t.headers || []).join(", ")} | rows: ${(t.rows || []).length}`);
      } else if (sec.type === "chart") {
        const c = sec as StructuredSectionChart;
        console.log(`   [${i + 1}] chart | heading: "${(c.heading || "").slice(0, 40)}" | type: ${c.chartType} | labels: ${(c.labels || []).slice(0, 4).join(", ")}`);
      }
    });
    console.log("   Sources:", blog.sources?.length ?? 0);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json(blog);
  } catch (err) {
    console.error("generate-structured error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
