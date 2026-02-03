/**
 * Search intent classification (NLP-style, rule-based).
 * Used by Search Intent Intelligence report with GSC + keyword data.
 */

export type IntentLabel =
  | "Informational"
  | "Commercial"
  | "Transactional"
  | "Navigational";

const TRANSACTIONAL_PATTERNS = [
  /\b(buy|purchase|order|shop|cart|checkout|subscribe|sign up|signup|book|reserve|reservation)\b/i,
  /\b(price|pricing|cost|cheap|discount|deal|coupon|voucher|free shipping|delivery)\b/i,
  /\b(pay|payment|invoice|refund|buy now|add to cart)\b/i,
  /\b(hire|rent|lease|get a quote|request quote)\b/i,
];

const NAVIGATIONAL_PATTERNS = [
  /\b(login|sign in|signin|log in|official|\.com|website|homepage|home page)\b/i,
  /\b(url|link|portal|dashboard|account|profile)\b/i,
  /^[a-z0-9-]+\.(com|io|org|net)\b/i,
];

const COMMERCIAL_PATTERNS = [
  /\b(best|top 10|top 5|vs|versus|compared?|comparison|alternative|alternatives)\b/i,
  /\b(review|reviews|rating|recommend|recommended|worth it|worth buying)\b/i,
  /\b(compare|compared to|or \w+|which one|which is better)\b/i,
  /\b(cheapest|affordable|budget|premium|pros and cons)\b/i,
];

const INFORMATIONAL_PATTERNS = [
  /\b(what|how|why|when|where|who|which|can|should|is|are|do|does|did)\b/i,
  /\b(guide|tutorial|learn|definition|meaning|examples?|explained|explain)\b/i,
  /\b(step by step|tips?|ideas?|list of|types? of|benefits? of)\b/i,
  /\?$/,
  /\b(blog|article|wiki|documentation|docs|help|faq)\b/i,
];

/**
 * Classify a search query into one of four intents.
 * Order: Transactional > Navigational > Commercial > Informational (default).
 */
export function classifyIntent(query: string): IntentLabel {
  const q = (query || "").trim();
  if (!q) return "Informational";

  const lower = q.toLowerCase();

  for (const re of TRANSACTIONAL_PATTERNS) {
    if (re.test(lower)) return "Transactional";
  }
  for (const re of NAVIGATIONAL_PATTERNS) {
    if (re.test(lower)) return "Navigational";
  }
  for (const re of COMMERCIAL_PATTERNS) {
    if (re.test(lower)) return "Commercial";
  }
  for (const re of INFORMATIONAL_PATTERNS) {
    if (re.test(lower)) return "Informational";
  }

  return "Informational";
}
