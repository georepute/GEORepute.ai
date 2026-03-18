/**
 * RTL (right-to-left) support for published blog content (Hebrew, Arabic).
 * Wraps HTML in a div with dir="rtl" and alignment so the live page displays correctly.
 */

const RTL_WRAPPER_STYLE =
  "text-align:right;direction:rtl;unicode-bidi:embed;";
const RTL_WRAPPER_OPEN = `<div dir="rtl" class="georepute-rtl" style="${RTL_WRAPPER_STYLE}">`;
const RTL_WRAPPER_CLOSE = "</div>";

/**
 * If contentLanguage is Hebrew (he) or Arabic (ar), wraps html in a single div with
 * dir="rtl" and right-alignment so WordPress/Shopify and in-app views display RTL.
 * Otherwise returns html unchanged.
 */
export function wrapHtmlForRtl(html: string, contentLanguage?: string | null): string {
  if (!html || typeof html !== "string") return html;
  const lang = contentLanguage?.toLowerCase?.();
  if (lang !== "he" && lang !== "ar") return html;
  return RTL_WRAPPER_OPEN + html.trim() + RTL_WRAPPER_CLOSE;
}
