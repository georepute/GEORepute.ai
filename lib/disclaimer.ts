/**
 * Mandatory legal/compliance disclaimer — single source of truth.
 * Do not change the English or Hebrew body text without legal review.
 * Use exported helpers for HTML, PDF, plain text, and API payloads.
 */

/** English body (exact approved wording). */
export const DISCLAIMER_TEXT =
  "This analysis is based on publicly available data, third-party research, and GeoRepute's proprietary analytical models. It does not represent verified or audited measurements and should be interpreted as directional insights rather than definitive factual claims.";

/** Hebrew body (approved translation of DISCLAIMER_TEXT). */
export const DISCLAIMER_TEXT_HE =
  "הניתוח מבוסס על נתונים הזמינים לציבור, מחקר של צדדים שלישיים, ומודלים אנליטיים קנייניים של GeoRepute. הוא אינו מהווה מדידות מאומתות או מבוקרות, ויש לפרשו כתובנות כיווניות ולא כטענות עובדתיות סופיות.";

export const METHODOLOGY_DISCLAIMER_TITLE_EN = "Methodology & Disclaimer";
export const METHODOLOGY_DISCLAIMER_TITLE_HE = "מתודולוגיה והבהרה";

/** Unique substring used to detect if disclaimer was already appended (EN or HE). */
const DISCLAIMER_FINGERPRINT_EN = "GeoRepute's proprietary analytical models";
const DISCLAIMER_FINGERPRINT_HE = "מודלים אנליטיים קנייניים של GeoRepute";

export type DisclaimerLocale = "en" | "he";

/** Resolve UI/API language code to disclaimer locale (Hebrew vs English). */
export function resolveDisclaimerLocale(language?: string | null): DisclaimerLocale {
  if (!language || typeof language !== "string") return "en";
  const l = language.trim().toLowerCase();
  if (l === "he" || l === "hebrew" || l === "עברית" || l.startsWith("he-")) return "he";
  return "en";
}

export function getDisclaimerText(locale?: string | null): string {
  return resolveDisclaimerLocale(locale) === "he" ? DISCLAIMER_TEXT_HE : DISCLAIMER_TEXT;
}

export function getMethodologyDisclaimerTitle(locale?: string | null): string {
  return resolveDisclaimerLocale(locale) === "he"
    ? METHODOLOGY_DISCLAIMER_TITLE_HE
    : METHODOLOGY_DISCLAIMER_TITLE_EN;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type DisclaimerHtmlOptions = {
  className?: string;
  id?: string;
  /** BCP47 / app language code (e.g. he, en). */
  locale?: string | null;
  /**
   * If true, includes the "Methodology & Disclaimer" heading (for reports / long-form).
   * If false (default), compact block for article footers.
   */
  includeSectionTitle?: boolean;
};

/**
 * HTML block: smaller font, separated from main content.
 * For Hebrew, sets dir="rtl" on the wrapper.
 */
export function getDisclaimerHtml(opts?: DisclaimerHtmlOptions): string {
  const cls = opts?.className ?? "geo-disclaimer";
  const id = opts?.id ? ` id="${opts.id}"` : "";
  const loc = resolveDisclaimerLocale(opts?.locale ?? null);
  const body = loc === "he" ? DISCLAIMER_TEXT_HE : DISCLAIMER_TEXT;
  const dir = loc === "he" ? ' dir="rtl"' : "";
  const titleBlock =
    opts?.includeSectionTitle === true
      ? `<h3 class="geo-disclaimer-section-title">${escapeHtml(getMethodologyDisclaimerTitle(loc))}</h3>`
      : "";
  return `<div class="${cls}"${id}${dir} role="note">${titleBlock}<p>${escapeHtml(body)}</p></div>`;
}

/**
 * Append methodology title + disclaimer to plain text if not already present (copy/export).
 */
export function appendDisclaimerToPlainText(content: string, locale?: string | null): string {
  const trimmed = (content ?? "").trimEnd();
  if (
    trimmed.includes(DISCLAIMER_FINGERPRINT_EN) ||
    trimmed.includes(DISCLAIMER_FINGERPRINT_HE)
  ) {
    return content ?? "";
  }
  const loc = resolveDisclaimerLocale(locale);
  const title = getMethodologyDisclaimerTitle(loc);
  const body = getDisclaimerText(loc);
  if (!trimmed) return `${title}\n\n${body}`;
  return `${trimmed}\n\n---\n${title}\n\n${body}`;
}
