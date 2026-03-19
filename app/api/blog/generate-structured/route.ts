import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OpenAI from "openai";

/** fetch with extended timeout to avoid HeadersTimeoutError on long-running AI requests */
function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = 300000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

const SYSTEM_PROMPT = `You are an expert blog writer. When given a topic, write a complete blog post that follows Universal Content Standards – Article layer.

ARTICLE LAYER (mandatory):
- LENGTH: 800–1,500 words total (across all sections). Do not exceed 1,500 words.
- STRUCTURE: Introduction, topic explanation, examples, insights, conclusion. Include a short FAQ section (3–5 Q&As) for AI/search visibility where relevant—either as a final text section with "FAQ" in the heading and Q&A format, or as a dedicated subsection.
- DATA/VISUAL (MANDATORY): You MUST include BOTH (1) at least one chart section (type "chart") AND (2) at least one table section (type "table") in the sections array. Every article must have at least one chart and one table. Use the chart and table types in the JSON structure below.

Mandatory Content Layer (every article must include ALL 4 layers). Weave these into your sections as text subsections or dedicated paragraphs; use clear headings or subheadings so each layer is identifiable:
| Layer | Requirement |
| GEO Layer | How ChatGPT / Gemini (or other AI assistants) represent the topic—what framing, angles, or sources they tend to use. |
| Narrative Control | Who controls the narrative around this topic and why—which voices, institutions, or sources dominate the conversation. |
| Market Gap | What is not being discussed—missing perspectives, underserved angles, or underreported aspects of the topic. |
| Strategic Prediction | What will happen next—informed outlook, trends, or likely developments based on the topic. |

GeoReput Article Standard (Mandatory Structure). Every article MUST include ALL 10 components below. Weave them into your sections as text, tables, or charts; use clear headings so each is identifiable:
| # | Component | Requirement |
| 1 | Unique Insight | Clear, non-obvious argument or angle. |
| 2 | Perception Analysis | How AI and/or the market perceives the topic. |
| 3 | Reality vs Perception Gap | Where reality differs from common perception. |
| 4 | Unique Metric / Score | Reference a DCS, Visibility Score, or similar metric where relevant. |
| 5 | Data + Visualization | At least one chart, one table, and one infographic (infographic is added separately). |
| 6 | Business Impact | Why this matters for companies or decision-makers. |
| 7 | Competitive Angle | Who is winning and why, or who leads in this space. |
| 8 | Risks / Weaknesses | Address downsides, risks, or weaknesses—not only advantages. |
| 9 | Smart CTA | Natural transition to a report, analysis, or next step (e.g. deeper analysis, full report). |
| 10 | Strong Sources | Cite Gartner, McKinsey, or other verified data sources where possible; real URLs only. |

HEADINGS: Do NOT use the layer names as title prefixes. Section headings must be topic-only, not "GEO Layer: ...", "Narrative Control: ...", "Market Gap: ...", or "Strategic Prediction: ...". Use descriptive headings only, e.g. "How AI Assistants Frame [Topic]", "Who Shapes the Narrative", "What Nobody Talks About", "What Will Happen Next"—never lead with the layer label.

Quality requirements (apply in EVERY language: English, Hebrew, French, Portuguese, Arabic, Italian, Spanish, etc.):
- ACCURACY: Use only factual, verifiable information. Data and statistics must be realistic and plausible for the topic. Do not invent numbers; use ranges or typical figures that could be cited from real reports.
- DEPTH: Write substantive content. Each text section should have 2–4 full paragraphs with concrete points, context, and clear reasoning—not generic filler or short bullet-style text.
- CREDIBILITY: Use an authoritative, professional tone. Include specific terminology appropriate to the topic. Sources must be real, reputable, and authentic (e.g. official sites, major publications, Wikipedia); every source URL must be a working link that does not 404.
- PROFESSIONAL QUALITY IN ALL LANGUAGES: Content must be publication-ready with no grammar, spelling, or punctuation errors. In Hebrew, French, Portuguese, Arabic, Italian, Spanish, and any other language: use correct grammar, spelling, accents, and punctuation as expected by native readers. Quality must match a professional article in that language.

Humanization of Content – Mandatory. Content must not feel AI-generated. Required improvements:
- NATURAL SENTENCE VARIATION: Mix short and long sentences. Vary openings (avoid starting every paragraph with "The" or "It"). Use different clause structures so the rhythm feels natural, not templated.
- LESS REPETITIVE PHRASING: Do not reuse the same adjectives, transition words, or sentence patterns in close succession. Rephrase ideas instead of repeating the same construction (e.g. avoid "It is important to... It is also important to...").
- MORE HUMAN TONE AND FLOW: Write as a knowledgeable person would speak or write for a real audience. Use concrete examples, occasional asides or nuance, and a consistent voice. Avoid stiff, formal lists of points where a flowing narrative would work better.
- AVOID GENERIC STRUCTURES AND PREDICTABLE PATTERNS: Do not follow obvious templates (e.g. "In conclusion," / "Firstly... Secondly... Finally..." in every piece). Surprise the reader with structure and wording where it fits the topic. Content should read as if written by a native or fluent professional in that language—never robotic or machine-like.

You MUST return a JSON object in this exact structure (no other text, no markdown code fences):

{
  "title": "Blog title",
  "subtitle": "One line description",
  "titleItalicPhrase": "Optional: exact phrase from title to show in italic in hero (e.g. The AI Perception War)",
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
    { "title": "Source name or article title", "url": "https://...", "type": "External" }
  ]
}

Rules:
- LENGTH: Total content must be 800–1,500 words (Article layer). Count text in "content" and headings.
- GEOREPUT ARTICLE STANDARD: Every article MUST include ALL 10 components: (1) Unique Insight, (2) Perception Analysis, (3) Reality vs Perception Gap, (4) Unique Metric/Score, (5) Data + Visualization (chart, table, infographic), (6) Business Impact, (7) Competitive Angle, (8) Risks/Weaknesses, (9) Smart CTA, (10) Strong Sources (Gartner, McKinsey, or other verified). Weave them into sections with topic-only headings.
- MANDATORY CONTENT LAYERS: Every article MUST include ALL 4 layers—GEO Layer (how ChatGPT/Gemini represent the topic), Narrative Control (who controls the narrative and why), Market Gap (what is not being discussed), and Strategic Prediction (what will happen next). Use text sections with clear headings so each layer is present—but headings must be topic-only (e.g. "How AI Assistants Frame Budgeting"), never prefixed with "GEO Layer:", "Narrative Control:", "Market Gap:", or "Strategic Prediction:".
- HUMANIZATION (mandatory): Content must not feel AI-generated. Use natural sentence variation, avoid repetitive phrasing, maintain a human tone and flow, and avoid generic structures or predictable patterns (e.g. overused "Firstly/Secondly/In conclusion" or identical sentence templates).
- MANDATORY SECTIONS: You MUST include at least one section with "type": "chart" (chartType "bar", "line", "pie", or "doughnut" with labels and datasets) AND at least one section with "type": "table" (headers array and rows array). The response is incomplete without both a chart and a table. Add more charts/tables if they fit the topic.
- FAQ section: Include where relevant as a text section with heading containing \"FAQ\" and 3–5 Q&As. In FAQ content do NOT use any HTML tags (no <strong>, <br>, etc.). Use plain text only: each question on its own line as \"Q: Question text\" and the answer on the next line(s) as \"A: Answer text\", with a blank line between each Q&A pair. The system will style them for display. This avoids raw tags appearing to the reader.
- Place charts/tables where they naturally support the text
- Use realistic, accurate data for the topic (numbers and labels must be plausible and consistent with the narrative)
- chartType must be one of: "bar", "line", "pie", "doughnut"
- Tables (apply in ALL languages - English, Hebrew, French, Portuguese, Arabic, Italian, Spanish, etc.): "headers" must be an array of separate column names (one string per column). "rows" must be an array of rows, each row an array of cell strings with one cell per column. Do not concatenate all headers or all cells into a single string. Keep table content in proper columns for every language.
- Do NOT use em dashes (—) or en dashes (–) in any "content" or "heading" text, in ANY language (English, Hebrew, French, Portuguese, Arabic, Italian, Spanish, etc.). Use commas, parentheses, or " - " (space hyphen space) instead. Example: "in the morning - before getting out of bed - or last thing" not "in the morning—before getting out of bed—or last thing". Same rule for Hebrew, French, Arabic, and all other languages.
- NO HTML OR TAGS IN CONTENT (strict): In every text section \"content\" use PLAIN TEXT ONLY. Do NOT use any HTML or markup: no <strong>, <em>, <a href>, <blockquote>, <br>, <p>, or any other tags. If you include them, the reader will see the raw code. Write normal prose; for emphasis use word choice, not tags. For sources, mention the name in the body (e.g. \"According to McKinsey, 25% will shift\") and add that source to the \"sources\" array below; links are rendered only in the References section.
- REFERENCES & SOURCES: The \"sources\" array is rendered as \"References & Sources\" at the end. Each item: \"title\" = SOURCE NAME ONLY (e.g. \"Gartner\", \"McKinsey\"); \"url\" = real working URL; \"type\": \"External\" or \"GeoRepute\". Include 3–8 sources. CRITICAL - All URLs must be REAL — no invented or 404 links.
  - Use ONLY URLs you know exist: e.g. Wikipedia (correct language subdomain), official .gov / .gouv sites, Gartner/McKinsey/publication homepages or known articles.
  - If you cannot provide a verified working URL for a source, set "url": "#" so the source title still appears without a broken link.
- Return ONLY valid JSON, no markdown, no code fences, no extra text before or after the JSON.
- CRITICAL - Valid JSON: Inside every string value you MUST escape: double quote as \\", backslash as \\\\. Do NOT put literal newline characters inside strings—use \\n for line breaks or keep the value on one line. This applies to all languages (Arabic, French, etc.): keep each "content", "heading", "title" etc. as a single line or use \\n so the output is parseable.
- EDITORIAL STYLING (no tags): (1) Include optional \"titleItalicPhrase\" with the exact phrase from the title to show in italic in the hero. (2) In \"content\" use plain text only - no HTML. (3) For key metrics, write a clear number and label in the sentence (e.g. \"McKinsey puts the figure at 25%.\") so it reads well. Do not add <strong>, <em>, or other tags.`;

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

export interface StructuredSectionInfographic {
  type: "infographic";
  /** Inline SVG (optional when url is set, e.g. raster from Nano Banana 2). */
  svg?: string;
  /** Public or data URL for the infographic image (SVG or PNG/JPEG). */
  url?: string;
}

export type StructuredSection =
  | StructuredSectionText
  | StructuredSectionChart
  | StructuredSectionTable
  | StructuredSectionInfographic;

export interface StructuredBlogSource {
  title: string;
  url: string;
  /** "External" for third-party (Gartner, Adweek, etc.), "GeoRepute" for own analysis. Defaults to External. */
  type?: "External" | "GeoRepute";
}

export interface StructuredBlog {
  title: string;
  subtitle: string;
  /** Optional phrase from the title to show in italic in the hero (editorial styling). */
  titleItalicPhrase?: string;
  sections: StructuredSection[];
  sources: StructuredBlogSource[];
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

/** Build the infographic prompt prefix with tone/language so the output matches the blog. */
function getInfographicPromptPrefix(languageName: string | null): string {
  const toneLine = languageName
    ? `Match the tone and language of the article: write any labels or text in the infographic in ${languageName}, and keep the visual style consistent with a professional article in that language. `
    : "Match the tone of the article: keep the infographic style and any text consistent with the blog's tone (professional, clear). ";
  return `Based on this blog content, generate a single SVG infographic that visualizes the key concept. ${toneLine}Return ONLY raw SVG code—no markdown code fences, no explanation, no text before or after. The SVG must be self-contained (no external images or scripts), readable at around 600px width, with clear labels and a clean design.

Content:
`;
}

/** Extract raw SVG from model text (strip code fences, find <svg>...</svg>). */
function extractSvgFromResponse(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();
  text = text.replace(/^```(?:svg)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
  const out = svgMatch ? svgMatch[0] : (text.startsWith("<svg") ? text : null);
  if (!out) console.warn("📊 Infographic: no <svg>...</svg> found in response (length:", text.length, ")");
  return out;
}

/** Build content summary from blog for infographic prompt. */
function getInfographicContentSummary(blog: StructuredBlog): string | null {
  const textParts: string[] = [blog.title || "", blog.subtitle || ""];
  let charCount = 0;
  const maxChars = 2500;
  for (const sec of blog.sections || []) {
    if (sec.type === "text" && "content" in sec) {
      const heading = (sec as StructuredSectionText).heading || "";
      const content = (sec as StructuredSectionText).content || "";
      textParts.push(heading + "\n" + content);
      charCount += heading.length + content.length;
      if (charCount >= maxChars) break;
    }
  }
  const contentSummary = textParts.join("\n\n").slice(0, maxChars);
  return contentSummary.trim() || null;
}

/** Generate an SVG infographic using Google Gemini 2.0 Flash. Returns raw SVG or null. */
async function generateInfographicSvgWithGemini(blog: StructuredBlog, languageName: string | null): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey?.trim()) return null;
  const contentSummary = getInfographicContentSummary(blog);
  if (!contentSummary) {
    console.warn("📊 Infographic (Gemini): no text content, skipping");
    return null;
  }
  const prompt = getInfographicPromptPrefix(languageName) + contentSummary;
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 120000, // 2 min for infographic
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.4,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("📊 Infographic (Gemini) API error:", res.status, (data as { error?: { message?: string } })?.error?.message ?? JSON.stringify(data).slice(0, 200));
      return null;
    }
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) {
      console.warn("📊 Infographic (Gemini): no text in response");
      return null;
    }
    const out = extractSvgFromResponse(raw);
    if (out) console.log("📊 Infographic: generated with Gemini 2.0 Flash");
    return out;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("📊 Infographic (Gemini) request failed:", msg);
    return null;
  }
}

/** Generate an SVG infographic from blog content via Claude (fallback). Returns raw SVG or null. */
async function generateInfographicSvgWithClaude(
  blog: StructuredBlog,
  anthropicKey: string,
  languageName: string | null
): Promise<string | null> {
  const contentSummary = getInfographicContentSummary(blog);
  if (!contentSummary) {
    console.warn("📊 Infographic (Claude): no text content, skipping");
    return null;
  }
  const prompt = getInfographicPromptPrefix(languageName) + contentSummary;
  try {
    const res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        timeoutMs: 120000,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("📊 Infographic (Claude) API error:", res.status, (data as { error?: { message?: string } }).error?.message ?? (typeof data === "object" ? JSON.stringify(data).slice(0, 200) : ""));
      return null;
    }
    const contentBlocks = Array.isArray((data as { content?: unknown[] }).content) ? (data as { content: { type?: string; text?: string }[] }).content : [];
    const textBlock = contentBlocks.find((b: { type?: string }) => b.type === "text");
    const raw = (textBlock && "text" in textBlock ? (textBlock as { text: string }).text : (data as { content?: { text?: string }[] }).content?.[0]?.text || "").trim();
    if (!raw) {
      console.warn("📊 Infographic (Claude): no text content. Content blocks:", contentBlocks.length);
      return null;
    }
    const out = extractSvgFromResponse(raw);
    if (out) console.log("📊 Infographic: generated with Claude");
    return out;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("📊 Infographic (Claude) request failed:", msg);
    return null;
  }
}

/** Generate a high-quality raster infographic using Nano Banana 2 (Gemini 3.1 Flash Image). Returns base64 PNG + mimeType or null. */
async function generateInfographicWithNanoBanana2(blog: StructuredBlog, languageName: string | null): Promise<{ imageBase64: string; mimeType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey?.trim()) return null;
  const contentSummary = getInfographicContentSummary(blog);
  if (!contentSummary) return null;

  const toneLine = languageName
    ? `Match the tone and language of the article: any text in the image must be in ${languageName}, and the visual style should feel consistent with a professional article in that language. `
    : "Match the tone of the article: keep the infographic style and any text consistent with the blog (professional, clear). ";
  const prompt = `Create a single, professional infographic image that visualizes the key concept from this article. ${toneLine}Style: clean data visualization or editorial infographic—clear labels, readable text in the image, minimal layout. Do not add markdown or code. Output only the image.

Article summary:
${contentSummary.slice(0, 2000)}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 120000,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("📊 Infographic (Nano Banana 2) API error:", res.status, (data as { error?: { message?: string } })?.error?.message ?? JSON.stringify(data).slice(0, 200));
      return null;
    }
    const parts = data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        console.log("📊 Infographic: generated with Nano Banana 2 (Gemini 3.1 Flash Image)");
        return { imageBase64: part.inlineData.data, mimeType };
      }
    }
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("📊 Infographic (Nano Banana 2) request failed:", msg);
    return null;
  }
}

/** Generate infographic SVG: try Gemini first, then Claude. */
async function generateInfographicSvg(blog: StructuredBlog, anthropicKey: string, languageName: string | null): Promise<string | null> {
  let svg = await generateInfographicSvgWithGemini(blog, languageName);
  if (!svg && anthropicKey) {
    svg = await generateInfographicSvgWithClaude(blog, anthropicKey, languageName);
  }
  return svg;
}

/** Prompt for GEO Layer: ask ChatGPT/Gemini to respond in structured format (Tone, Framing, Key Risk, Opportunity). */
function getGeoStructuredPrompt(topic: string, languageName: string | null): string {
  const isHebrew = languageName && (languageName.toLowerCase() === "hebrew" || languageName === "עברית");
  if (isHebrew) {
    return `You are analyzing how this topic is typically represented to a general audience. You MUST write your entire response in Hebrew only. Do not use English for Framing, Key Risk, or Opportunity. Do not use em dashes (—). Use commas or " - " instead.

טון: [choose exactly one, keep in English: MIXED, BALANCED, CONTESTED, POSITIVE]
מסגור: [1-3 sentences in Hebrew describing how the topic is usually framed and what is emphasized]
סיכון מרכזי: [1-2 sentences in Hebrew on the main risk or downside, or write "אין" if not applicable]
הזדמנות: [1-2 sentences in Hebrew on the main opportunity or upside, or write "אין" if not applicable]

If the topic is mostly about risks, fill סיכון מרכזי and set הזדמנות to "אין". If mostly about opportunities, fill הזדמנות and set סיכון מרכזי to "אין". You may provide both if relevant. All text except the Tone value must be in Hebrew.

Topic: ${topic}`;
  }
  const langInstruction = languageName
    ? ` You MUST write ALL of Framing, Key Risk, and Opportunity in ${languageName} only. Do not mix in English. For Tone use exactly one of: MIXED, BALANCED, CONTESTED, POSITIVE.`
    : " Respond in English.";
  return `You are analyzing how this topic is typically represented to a general audience. Reply using exactly these labels and format. Do not use em dashes (—).${langInstruction}

Tone: [choose exactly one: MIXED, BALANCED, CONTESTED, POSITIVE]
Framing: [1-3 sentences describing how the topic is usually framed and what is emphasized]
Key Risk: [1-2 sentences on the main risk or downside, or write "None" if not applicable]
Opportunity: [1-2 sentences on the main opportunity or upside, or write "None" if not applicable]

If the topic is mostly about risks, fill Key Risk and set Opportunity to "None". If mostly about opportunities, fill Opportunity and set Key Risk to "None". You may provide both if relevant.

Topic: ${topic}`;
}

/** Parsed GEO response for table: Tone, Framing, Key Risk / Opportunity. */
interface GeoStructuredRow {
  tone: string;
  framing: string;
  keyRisk: string;
  opportunity: string;
}

/** Parse structured GEO response (English or Hebrew labels). Falls back to null if format not found. */
function parseGeoStructuredResponse(text: string | null): GeoStructuredRow | null {
  if (!text || !text.trim()) return null;
  const s = text.trim();
  const noneValues = /^(None|אין|ללא|—|-)$/i;
  const normalizeNone = (v: string) => (v && !noneValues.test(v.trim()) ? v : "");

  // English labels
  let toneMatch = s.match(/\bTone:\s*(MIXED|BALANCED|CONTESTED|POSITIVE)/i);
  let framingMatch = s.match(/\bFraming:\s*([\s\S]*?)(?=\n\s*(?:Key Risk|Opportunity):|$)/i);
  let keyRiskMatch = s.match(/\bKey Risk:\s*([\s\S]*?)(?=\n\s*Opportunity:|$)/i);
  let opportunityMatch = s.match(/\bOpportunity:\s*([\s\S]*)/i);

  // Hebrew labels (טון, מסגור, סיכון מרכזי, הזדמנות)
  if (!toneMatch) toneMatch = s.match(/טון:\s*(MIXED|BALANCED|CONTESTED|POSITIVE)/i);
  if (!framingMatch) framingMatch = s.match(/מסגור:\s*([\s\S]*?)(?=\n\s*(?:סיכון|הזדמנות):|$)/);
  if (!keyRiskMatch) keyRiskMatch = s.match(/סיכון\s*מרכזי:\s*([\s\S]*?)(?=\n\s*הזדמנות:|$)/);
  if (!keyRiskMatch) keyRiskMatch = s.match(/סיכון:\s*([\s\S]*?)(?=\n\s*הזדמנות:|$)/);
  if (!opportunityMatch) opportunityMatch = s.match(/הזדמנות:\s*([\s\S]*)/);

  const tone = toneMatch ? toneMatch[1].toUpperCase() : "";
  const framing = (framingMatch ? framingMatch[1].trim() : "").replace(/\n+/g, " ").slice(0, 800);
  const keyRisk = (keyRiskMatch ? keyRiskMatch[1].trim() : "").replace(/\n+/g, " ").slice(0, 500);
  const opportunityRaw = opportunityMatch ? opportunityMatch[1].trim() : "";
  const opportunity = opportunityRaw.replace(/\n+/g, " ").slice(0, 500);
  if (!tone && !framing && !keyRisk && !opportunity) return null;
  return {
    tone: tone || "—",
    framing: framing || "—",
    keyRisk: normalizeNone(keyRisk) || "None",
    opportunity: normalizeNone(opportunity) || "None",
  };
}

/** Fetch how ChatGPT represents the topic (real-time) for the GEO Layer. Returns structured-format text. */
async function fetchChatGPTResponse(topic: string, languageName: string | null): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  const prompt = getGeoStructuredPrompt(topic, languageName);
  try {
    const openai = new OpenAI({ apiKey, timeout: 60000 }); // 1 min for GEO layer
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.5,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("   GEO Layer ChatGPT API error:", msg);
    return null;
  }
}

/** Fetch how Gemini represents the topic (real-time) for the GEO Layer. Returns structured-format text. */
async function fetchGeminiResponse(topic: string, languageName: string | null): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  const prompt = getGeoStructuredPrompt(topic, languageName);
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 60000, // 1 min for GEO layer
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.5 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
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

    // Real-time GEO Layer: fetch how ChatGPT and Gemini represent this topic so the article can ground the GEO Layer in their actual responses
    console.log("\n" + "-".repeat(50));
    console.log("🧠 GEO LAYER: Calling ChatGPT and Gemini for real responses (topic: " + topic.trim().slice(0, 50) + (topic.trim().length > 50 ? "..." : "") + ")");
    const [chatGPTResult, geminiResult] = await Promise.allSettled([
      fetchChatGPTResponse(topic.trim(), languageName),
      fetchGeminiResponse(topic.trim(), languageName),
    ]);
    const chatGPTText = chatGPTResult.status === "fulfilled" ? chatGPTResult.value : null;
    const geminiText = geminiResult.status === "fulfilled" ? geminiResult.value : null;
    console.log("   ChatGPT:", chatGPTText ? `${chatGPTText.length} chars` : (chatGPTResult.status === "rejected" ? "rejected" : "no response (missing OPENAI_API_KEY or see error above)"));
    console.log("   Gemini:", geminiText ? `${geminiText.length} chars` : (geminiResult.status === "rejected" ? "rejected" : "no response (missing GEMINI_API_KEY or see error above)"));
    console.log("-".repeat(50) + "\n");

    let geoLayerBlock = "";
    if (chatGPTText || geminiText) {
      geoLayerBlock = `

GEO LAYER – REAL RESPONSES (use these to write the GEO Layer section):
The following are real responses from AI assistants when asked to represent this topic. Your article MUST include a GEO Layer section (or clearly identifiable subsection) that summarizes how ChatGPT and/or Gemini represent this topic—their framing, what they emphasize, and how they differ. Base that section on the actual responses below.
${chatGPTText ? `\nChatGPT response:\n${chatGPTText}` : "\n(ChatGPT response not available.)"}
${geminiText ? `\nGemini response:\n${geminiText}` : "\n(Gemini response not available.)"}`;
    } else {
      geoLayerBlock = `

GEO LAYER: No live ChatGPT/Gemini responses were available (API keys may be missing). Write the GEO Layer section based on your knowledge of how these assistants typically represent such topics—framing, common angles, and typical tone.`;
    }

    const userMessage =
      languageName
        ? `Write a blog about: ${topic.trim()}
${geoLayerBlock}

CRITICAL - Language: You MUST write ALL user-facing content ONLY in ${languageName}. Every title, subtitle, section heading, paragraph, chart title/caption, table heading, cell text, and source title must be in ${languageName}. Do NOT use English or any other language for that content. Keep only the JSON keys (e.g. "title", "sections") in English.

CRITICAL - Professional quality for ${languageName}: The article must be publication-ready with ZERO grammar, spelling, or punctuation errors. Use correct ${languageName} grammar, accents, and punctuation as a native or fluent professional would. Content must be humanized: natural, varied sentence structure, appropriate idioms and phrasing—never robotic or machine-like. The article must be as accurate, in-depth, and credible as a professional piece in ${languageName}. Write substantial paragraphs (not short or generic). Prefer sources in ${languageName} where they exist (e.g. fr.wikipedia.org, .gouv.fr for French); otherwise use well-known international sources. Data in charts and tables must be realistic and consistent with the text. Do NOT use em dashes (—) or en dashes (–); use commas, parentheses, or " - " instead. Keep table headers and row cells as separate array elements (one per column).
EDITORIAL STYLING: (1) Include \"titleItalicPhrase\" with one exact phrase from the title to show in italic in the hero. (2) In text section content use PLAIN TEXT ONLY — no HTML tags (no <strong>, <em>, <blockquote>, <a>, etc.). (3) Structure key metrics as clear number + label in prose.
SOURCES & CREDIBILITY: Mention source names in the body (e.g. \"According to Gartner, ...\"). Do NOT put HTML or links in content. Add every cited source to \"sources\" with title = source name only, url, and type. References & Sources section will show each name as a hyperlink. Use only real URLs.${(languageName && (languageName.toLowerCase() === "hebrew" || languageName === "עברית")) ? `
HEBREW humanization: Write as a fluent professional would in Hebrew. Vary sentence length and openings; avoid filler phrases (e.g. חשוב לציין, לסיכום, יתר על כן, בנוסף, לפיכך, בעולם המודרני, מצד אחד מצד שני). Use natural Hebrew terminology, not literal translations of English. Reduce repetition; do not repeat the same phrase or structure in adjacent sentences. Where appropriate include a clear point of view or concrete example. Content must not feel machine-generated.` : ""}`
        : `Write a blog about: ${topic.trim()}
${geoLayerBlock}`;

    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        timeoutMs: 300000, // 5 min – main blog generation can be slow
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
      }
    );

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

    // Generate infographic: try Nano Banana 2 (raster) first, then SVG (Gemini 2.0 Flash / Claude)
    try {
      let infographicSection: StructuredSectionInfographic | null = null;

      const nanoBananaImage = await generateInfographicWithNanoBanana2(blog, languageName);
      if (nanoBananaImage) {
        const { imageBase64, mimeType } = nanoBananaImage;
        const ext = mimeType.includes("png") ? "png" : "jpeg";
        let infographicUrl: string | undefined;
        const userId = session?.user?.id;
        if (userId) {
          try {
            const fileName = `${userId}/blog-infographic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
            const buf = Buffer.from(imageBase64, "base64");
            const { error: uploadError } = await supabase.storage
              .from("platform-content-images")
              .upload(fileName, buf, {
                contentType: mimeType,
                cacheControl: "3600",
                upsert: false,
              });
            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("platform-content-images")
                .getPublicUrl(fileName);
              infographicUrl = urlData.publicUrl;
              console.log("📊 Infographic: Nano Banana 2 image uploaded, url length:", infographicUrl.length);
            }
          } catch (upErr) {
            console.warn("📊 Infographic: upload failed for Nano Banana 2 image", upErr);
          }
        }
        if (!infographicUrl) {
          infographicUrl = `data:${mimeType};base64,${imageBase64}`;
        }
        infographicSection = { type: "infographic", url: infographicUrl };
      }

      if (!infographicSection) {
        let svg = await generateInfographicSvg(blog, anthropicKey, languageName);
        if (!svg) svg = await generateInfographicSvg(blog, anthropicKey, languageName);
        if (svg) {
          let infographicUrl: string | undefined;
          const userId = session?.user?.id;
          if (userId) {
            try {
              const fileName = `${userId}/blog-infographic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.svg`;
              const { error: uploadError } = await supabase.storage
                .from("platform-content-images")
                .upload(fileName, Buffer.from(svg, "utf8"), {
                  contentType: "image/svg+xml",
                  cacheControl: "3600",
                  upsert: false,
                });
              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from("platform-content-images")
                  .getPublicUrl(fileName);
                infographicUrl = urlData.publicUrl;
                console.log("📊 Infographic: SVG uploaded to storage, url length:", infographicUrl.length);
              }
            } catch (upErr) {
              console.warn("📊 Infographic: upload failed, frontend will use data URL fallback", upErr);
            }
          }
          infographicSection = { type: "infographic", svg, url: infographicUrl };
        }
      }

      if (infographicSection) {
        blog.sections.splice(1, 0, infographicSection);
        console.log("📊 Infographic: generated and inserted after first section");
      } else {
        console.log("📊 Infographic: skipped (no image/SVG returned)");
      }
    } catch (e) {
      console.warn("📊 Infographic: failed", e);
    }

    // GEO Layer: add a table section (structured: Engine | Tone | Framing | Key Risk / Opportunity, or fallback Assistant | Response)
    if (chatGPTText || geminiText) {
      const geoTableHeadingByLang: Record<string, string> = {
        en: "How ChatGPT and Gemini Represent This Topic",
        he: "איך ChatGPT ו-Gemini מייצגים את הנושא",
        ar: "كيف يمثل ChatGPT وGemini هذا الموضوع",
        fr: "Comment ChatGPT et Gemini représentent ce sujet",
        pt: "Como o ChatGPT e o Gemini representam este tópico",
        it: "Come ChatGPT e Gemini rappresentano questo argomento",
        es: "Cómo representan ChatGPT y Gemini este tema",
        de: "Wie ChatGPT und Gemini dieses Thema darstellen",
        ru: "Как ChatGPT и Gemini представляют эту тему",
        ja: "ChatGPTとGeminiがこのトピックをどう表現するか",
        zh: "ChatGPT和Gemini如何呈现这一主题",
      };
      const geoTableHeadersStructuredByLang: Record<string, [string, string, string, string]> = {
        en: ["Engine", "Tone", "Framing", "Key Risk / Opportunity"],
        he: ["מנוע", "טון", "מסגור", "סיכון / הזדמנות"],
        ar: ["المحرك", "النبرة", "الإطار", "المخاطر / الفرصة"],
        fr: ["Moteur", "Ton", "Cadrage", "Risque / Opportunité"],
        pt: ["Motor", "Tom", "Enquadramento", "Risco / Oportunidade"],
        it: ["Motore", "Tono", "Inquadramento", "Rischio / Opportunità"],
        es: ["Motor", "Tono", "Encuadre", "Riesgo / Oportunidad"],
        de: ["Engine", "Ton", "Rahmung", "Risiko / Chance"],
        ru: ["Движок", "Тон", "Фрейминг", "Риск / Возможность"],
        ja: ["エンジン", "トーン", "フレーミング", "リスク／機会"],
        zh: ["引擎", "语气", "框架", "风险／机遇"],
      };
      const geoTableHeadersFallbackByLang: Record<string, [string, string]> = {
        en: ["Assistant", "Response"],
        he: ["מערכת", "תשובה"],
        ar: ["المساعد", "الرد"],
        fr: ["Assistant", "Réponse"],
        pt: ["Assistente", "Resposta"],
        it: ["Assistente", "Risposta"],
        es: ["Asistente", "Respuesta"],
        de: ["Assistent", "Antwort"],
        ru: ["Ассистент", "Ответ"],
        ja: ["アシスタント", "回答"],
        zh: ["助手", "回复"],
      };
      const langKey = language && typeof language === "string" ? language.toLowerCase() : "en";
      const heading = geoTableHeadingByLang[langKey] ?? geoTableHeadingByLang.en;
      const maxCellChars = 2000;
      const truncate = (s: string) => (s.length <= maxCellChars ? s : s.slice(0, maxCellChars) + "...");
      const chatGPTParsed = parseGeoStructuredResponse(chatGPTText);
      const geminiParsed = parseGeoStructuredResponse(geminiText);
      const useStructured = chatGPTParsed || geminiParsed;
      let headers: string[];
      const rows: string[][] = [];
      if (useStructured) {
        headers = geoTableHeadersStructuredByLang[langKey] ?? geoTableHeadersStructuredByLang.en;
        const riskLabel = langKey === "he" ? "סיכון מרכזי:" : "Key Risk:";
        const oppLabel = langKey === "he" ? "הזדמנות:" : "Opportunity:";
        const formatRiskOpp = (r: GeoStructuredRow): string => {
          const parts: string[] = [];
          if (r.keyRisk && r.keyRisk !== "None" && r.keyRisk !== "אין") parts.push(`${riskLabel} ${r.keyRisk}`);
          if (r.opportunity && r.opportunity !== "None" && r.opportunity !== "אין") parts.push(`${oppLabel} ${r.opportunity}`);
          return parts.length ? parts.join(" ") : "—";
        };
        if (chatGPTParsed && chatGPTText) {
          rows.push([
            "ChatGPT",
            chatGPTParsed.tone,
            truncate(chatGPTParsed.framing),
            formatRiskOpp(chatGPTParsed),
          ]);
        }
        if (geminiParsed && geminiText) {
          rows.push([
            "Gemini",
            geminiParsed.tone,
            truncate(geminiParsed.framing),
            formatRiskOpp(geminiParsed),
          ]);
        }
      } else {
        headers = geoTableHeadersFallbackByLang[langKey] ?? geoTableHeadersFallbackByLang.en;
        if (chatGPTText) rows.push(["ChatGPT", truncate(chatGPTText)]);
        if (geminiText) rows.push(["Gemini", truncate(geminiText)]);
      }
      if (headers.length && rows.length) {
        const geoTableSection: StructuredSectionTable = {
          type: "table",
          heading,
          headers,
          rows,
        };
        const insertAt = Math.min(2, blog.sections.length);
        blog.sections.splice(insertAt, 0, geoTableSection);
        console.log("📊 GEO Layer: inserted responses table at index", insertAt, useStructured ? "(structured)" : "(fallback)");
      }
    }

    // Ensure at least one chart and one table (insert placeholders if missing)
    const hasChart = blog.sections.some((s: StructuredSection) => s.type === "chart");
    const hasTable = blog.sections.some((s: StructuredSection) => s.type === "table");
    const topicShort = (topic || blog.title || "Topic").trim().slice(0, 40);
    if (!hasChart) {
      const placeholderChart: StructuredSectionChart = {
        type: "chart",
        heading: "Key data",
        caption: "Overview",
        chartType: "bar",
        labels: ["A", "B", "C", "D", "E"],
        datasets: [{ label: "Value", data: [28, 45, 32, 50, 38] }],
      };
      const insertIdx = Math.min(2, blog.sections.length);
      blog.sections.splice(insertIdx, 0, placeholderChart);
      console.log("📊 Chart: none in response; inserted placeholder at index", insertIdx);
    }
    if (!hasTable) {
      const placeholderTable: StructuredSectionTable = {
        type: "table",
        heading: "Overview",
        headers: ["Item", "Description"],
        rows: [
          [topicShort, "Main focus of this article"],
          ["Summary", "Key points and takeaways"],
        ],
      };
      const insertIdx = Math.min(4, blog.sections.length);
      blog.sections.splice(insertIdx, 0, placeholderTable);
      console.log("📊 Table: none in response; inserted placeholder at index", insertIdx);
    }

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
      } else if (sec.type === "infographic") {
        const inf = sec as StructuredSectionInfographic;
        console.log(`   [${i + 1}] infographic | svg length: ${(inf.svg || "").length} chars`);
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
