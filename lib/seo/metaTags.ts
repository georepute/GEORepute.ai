/**
 * Meta Tags Generator
 * 
 * Generates HTML meta tags for:
 * - Open Graph (OG) tags for social media
 * - Canonical URL tags
 * - Twitter Card tags
 */

export interface OGTags {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName?: string;
}

/**
 * Generate Open Graph meta tags HTML
 */
export function generateOGTagsHTML(ogTags: OGTags): string {
  const tags = [
    `<meta property="og:title" content="${escapeHtml(ogTags.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(ogTags.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogTags.image)}" />`,
    `<meta property="og:url" content="${escapeHtml(ogTags.url)}" />`,
    `<meta property="og:type" content="${escapeHtml(ogTags.type)}" />`,
  ];

  if (ogTags.siteName) {
    tags.push(`<meta property="og:site_name" content="${escapeHtml(ogTags.siteName)}" />`);
  }

  return tags.join("\n");
}

/**
 * Generate Twitter Card meta tags HTML
 */
export function generateTwitterCardHTML(ogTags: OGTags): string {
  return [
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(ogTags.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(ogTags.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogTags.image)}" />`,
  ].join("\n");
}

/**
 * Generate canonical URL tag HTML
 */
export function generateCanonicalHTML(canonicalUrl: string): string {
  return `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
}

/**
 * Generate all meta tags (OG + Twitter + Canonical)
 */
export function generateAllMetaTagsHTML(ogTags: OGTags, canonicalUrl?: string): string {
  const tags: string[] = [];

  // Open Graph tags
  tags.push("<!-- Open Graph Tags -->");
  tags.push(generateOGTagsHTML(ogTags));

  // Twitter Card tags
  tags.push("\n<!-- Twitter Card Tags -->");
  tags.push(generateTwitterCardHTML(ogTags));

  // Canonical URL
  if (canonicalUrl) {
    tags.push("\n<!-- Canonical URL -->");
    tags.push(generateCanonicalHTML(canonicalUrl));
  }

  return tags.join("\n");
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

