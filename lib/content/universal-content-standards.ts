/**
 * Universal Content Standards (Post + Article only)
 * Aligned with Universal Content Standards.pdf – we use only the Post and Article columns.
 * Research and Deep Research layers are not used.
 */

export type ContentLayer = "post" | "article";

/** Post: 300–600 words. Quick visibility, website activity, early traffic. */
export const POST_LAYER = {
  wordCountMin: 300,
  wordCountMax: 600,
  wordCountLabel: "300–600 words",
  objective:
    "Generate quick visibility, website activity, and early traffic. Basic authority – builds topical presence and content breadth.",
  structure:
    "Strong opening, one clear idea, short conclusion with a call to action.",
  seo:
    "Targeted keywords, H2 headings, internal links to deeper articles, clear meta description.",
  dataVisual:
    "Include at least one data point or small visual element if relevant.",
} as const;

/** Article: 800–1,500 words. Professional explanation, subject authority. */
export const ARTICLE_LAYER = {
  wordCountMin: 800,
  wordCountMax: 1500,
  wordCountLabel: "800–1,500 words",
  objective:
    "Provide professional explanation of a key topic and strengthen subject authority. Medium authority – recognized as professional knowledge content.",
  structure:
    "Introduction, topic explanation, examples, insights, conclusion.",
  seo:
    "Primary and secondary keywords, structured H2–H3 hierarchy, internal and external links, FAQ section for AI queries.",
  dataVisual:
    "At least one comparison table, chart, or statistical reference.",
} as const;

export const UNIVERSAL_CONTENT_STANDARDS = {
  post: POST_LAYER,
  article: ARTICLE_LAYER,
} as const;

/**
 * Returns the content layer for a given contentType and/or target platform.
 * - Blog/WordPress/Shopify long-form → Article (800–1,500 words).
 * - Post / LinkedIn post / social short-form → Post (300–600 words).
 */
export function getContentLayer(options: {
  contentType?: string;
  targetPlatform?: string;
}): ContentLayer {
  const { contentType, targetPlatform } = options;
  const isBlogArticle =
    contentType === "blog_article" ||
    contentType === "article" ||
    targetPlatform === "shopify";
  if (isBlogArticle) return "article";
  return "post";
}
