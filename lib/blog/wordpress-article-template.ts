/**
 * WordPress Article Template (Universal Content Standards – Article layer)
 * Full-page HTML in the style of georepute_article.html for WordPress publish.
 * User can choose theme/colour; structure (brand bar, hero, article, footer) is fixed.
 */

import { buildPersonalVoiceLayerHtml } from "./personal-voice-layer";
import { getDisclaimerHtml } from "../disclaimer";

export type ThemePreset = "default" | "green" | "purple" | "navy";

export interface WordPressArticleTheme {
  /** Main text/dark color (brand bar, footer, headings) */
  ink?: string;
  /** Primary accent (links, buttons, highlights) */
  accent?: string;
  /** Secondary accent */
  accent2?: string;
  /** Page background */
  bg?: string;
  /** Hero gradient start (left) */
  heroStart?: string;
  /** Hero gradient middle */
  heroMid?: string;
  /** Hero gradient end (right) */
  heroEnd?: string;
}

const THEME_PRESETS: Record<ThemePreset, WordPressArticleTheme> = {
  default: {
    ink: "#1a1a2e",
    accent: "#2563eb",
    accent2: "#7c3aed",
    bg: "#fafaf8",
    heroStart: "#1a1a2e",
    heroMid: "#1e3a8a",
    heroEnd: "#312e81",
  },
  green: {
    ink: "#0f172a",
    accent: "#059669",
    accent2: "#0d9488",
    bg: "#f0fdf4",
    heroStart: "#0f172a",
    heroMid: "#065f46",
    heroEnd: "#0d9488",
  },
  purple: {
    ink: "#1e1b4b",
    accent: "#7c3aed",
    accent2: "#a855f7",
    bg: "#faf5ff",
    heroStart: "#1e1b4b",
    heroMid: "#5b21b6",
    heroEnd: "#7e22ce",
  },
  navy: {
    ink: "#0c4a6e",
    accent: "#0284c7",
    accent2: "#0ea5e9",
    bg: "#f0f9ff",
    heroStart: "#0c4a6e",
    heroMid: "#0369a1",
    heroEnd: "#0284c7",
  },
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Remove Markdown bold/emphasis markers (** and __) from content: convert to HTML tags then strip any remaining markers. Use for all generated content (all languages, new content, missed prompt, multiple platform). */
export function stripMarkdownBoldMarkers(html: string): string {
  if (!html || typeof html !== "string") return html;
  let out = html
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([\s\S]+?)__/g, "<em>$1</em>");
  out = out.replace(/\*\*/g, "").replace(/__/g, "");
  return out;
}

export interface BuildWordPressArticleOptions {
  /** Article title (generated) */
  title: string;
  /** Meta description / excerpt (generated) */
  description: string;
  /** Keywords comma-separated (generated) */
  keywords: string;
  /** Publication date (generated) e.g. 2025-06-01 */
  date: string;
  /** Author name (user-filled) */
  author: string;
  /** Organization name (user-filled) */
  organizationName: string;
  /** Organization URL (optional, for brand bar CTA and footer) */
  organizationUrl?: string;
  /** Full article body HTML (generated content) */
  bodyHtml: string;
  /** Featured image URL (optional; in script format shown as first figure in article body, not in hero) */
  featuredImageUrl?: string;
  /** Theme preset or custom colors */
  themePreset?: ThemePreset;
  themeColors?: WordPressArticleTheme;
  /** Category/topic tag above article title (script: category-tag) */
  categoryTag?: string;
  /** Hero eyebrow text above title (script: hero-eyebrow) */
  heroEyebrow?: string;
  /** Hero badge pills (script: hero-badges); e.g. from keywords */
  heroBadges?: string[];
  /** CTA button text in brand bar (default: "Visit site →") */
  ctaText?: string;
  /** Optional read time in minutes for meta line */
  readTimeMinutes?: number;
  /** Content language code (e.g. "he", "ar") for RTL layout and alignment */
  contentLanguage?: string;
  /** Personal Voice Layer (About the Author) – photo as base64, name, title, bio, tags, LinkedIn */
  personalVoice?: {
    authorPhotoBase64?: string | null;
    authorName: string;
    authorTitleLine?: string;
    authorBio?: string;
    authorExpertiseTags?: string[];
    linkedInUrl?: string;
    websiteUrl?: string;
    organizationName?: string;
  } | null;
  /** Hero methodology note (e.g. "Analyzed across Claude, ChatGPT, Gemini... · Aug–Nov 2025") — spec 11px pill */
  heroMethodologyNote?: string;
  /** Hero stats: 3 numbers with label/source — spec Playfair 2rem, border-top, label 11px */
  heroStats?: Array<{ value: string; label: string; source?: string; type?: "External Data" | "Analysis" | "Estimated" }>;
  /** Word or phrase in title to render in italic blue in hero H1 (e.g. "The AI Perception War") */
  heroItalicWord?: string;
}

/** Format date as "Month YYYY" per spec (no day). */
function formatMonthYear(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return "";
  const d = new Date(dateStr.trim());
  if (isNaN(d.getTime())) return dateStr;
  const months = "January February March April May June July August September October November December".split(" ");
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Add class="drop-cap" to the first <p> in article body per spec. */
function applyDropCap(html: string): string {
  if (!html || typeof html !== "string") return html;
  return html.replace(/<p(\s[^>]*)?>/i, (m) => {
    if (m.includes("drop-cap")) return m;
    return m.replace(/<p/, '<p class="drop-cap"');
  });
}

function getTheme(opts: BuildWordPressArticleOptions): Required<WordPressArticleTheme> {
  const preset = THEME_PRESETS[opts.themePreset || "default"];
  const custom = opts.themeColors || {};
  return {
    ink: custom.ink ?? preset.ink ?? "#1a1a2e",
    accent: custom.accent ?? preset.accent ?? "#2563eb",
    accent2: custom.accent2 ?? preset.accent2 ?? "#7c3aed",
    bg: custom.bg ?? preset.bg ?? "#fafaf8",
    heroStart: custom.heroStart ?? preset.heroStart ?? "#1a1a2e",
    heroMid: custom.heroMid ?? preset.heroMid ?? "#1e3a8a",
    heroEnd: custom.heroEnd ?? preset.heroEnd ?? "#312e81",
  };
}

/**
 * Build full HTML document for WordPress article (script format).
 * Same structure as georepute_article.html: brand bar, hero, article body, author card, footer.
 * Includes inline CSS with theme variables and inline JS for checklist.
 */
export function buildWordPressArticleHtml(opts: BuildWordPressArticleOptions): string {
  const theme = getTheme(opts);
  const orgName = (opts.organizationName || "Brand").trim();
  const orgUrl = (opts.organizationUrl || "#").trim() || "#";
  const author = (opts.author || "").trim() || "Author";
  const safeTitle = escapeHtml(opts.title);
  const safeDesc = escapeHtml(opts.description);
  const safeKeywords = escapeHtml(opts.keywords);
  const safeAuthor = escapeHtml(author);
  const safeOrg = escapeHtml(orgName);
  const year = opts.date ? new Date(opts.date).getFullYear() : new Date().getFullYear();
  const ctaText = (opts.ctaText || "Visit site →").trim();
  const categoryTag = opts.categoryTag?.trim();
  const heroEyebrow = opts.heroEyebrow?.trim();
  const heroBadges = Array.isArray(opts.heroBadges) ? opts.heroBadges.filter(Boolean).slice(0, 6) : [];
  const readTime = opts.readTimeMinutes != null && opts.readTimeMinutes > 0 ? opts.readTimeMinutes : null;
  const isRtl = opts.contentLanguage === "he" || opts.contentLanguage === "ar";
  const langAttr = isRtl ? (opts.contentLanguage === "ar" ? "ar" : "he") : "en";
  const monthYear = formatMonthYear(opts.date || "");
  const heroMethodologyNote = opts.heroMethodologyNote?.trim();
  const heroStats = Array.isArray(opts.heroStats) ? opts.heroStats.slice(0, 3) : [];
  const heroItalicWord = opts.heroItalicWord?.trim();
  const heroTitleHtml = heroItalicWord
    ? escapeHtml(opts.title).replace(escapeHtml(heroItalicWord), `<em>${escapeHtml(heroItalicWord)}</em>`)
    : safeTitle;
  const showDemoModal = ctaText.toLowerCase().includes("demo") || ctaText === "Request a Demo →";
  // Script format: featured image is first figure in article body, not in hero
  const featuredImgBlock =
    opts.featuredImageUrl && /^https?:\/\//i.test(opts.featuredImageUrl)
      ? `<div class="figure" style="margin-top:0;"><img src="${escapeHtml(opts.featuredImageUrl)}" alt="${safeTitle}" class="figure-img" style="width:100%;height:260px;object-fit:cover;display:block;" /></div>`
      : "";

  const cssVars = `
  --ink: ${theme.ink};
  --ink-2: #3a3a5c;
  --ink-light: ${theme.ink}99;
  --accent: ${theme.accent};
  --accent-2: ${theme.accent2};
  --accent-warm: #d97706;
  --bg: ${theme.bg};
  --bg-2: ${theme.bg}dd;
  --border: ${theme.ink}22;
  --max: 700px;
  --green: #059669;
  --amber: #d97706;
`;

  return `<!DOCTYPE html>
<html lang="${langAttr}" dir="${isRtl ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${orgName === "GeoRepute" ? `${opts.title.slice(0, 38)} | GeoRepute Intelligence`.slice(0, 60) : `${safeTitle} | ${safeOrg}`}</title>
<meta name="description" content="${safeDesc}">
<meta name="keywords" content="${safeKeywords}">
<meta name="author" content="${safeAuthor}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(orgUrl)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:url" content="${escapeHtml(orgUrl)}">
<meta property="og:site_name" content="${safeOrg}">
<meta property="article:author" content="${safeAuthor}">
<meta property="article:published_time" content="${opts.date || new Date().toISOString().slice(0, 10)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@itaigelman">
<meta name="twitter:site" content="@georepute">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"Article","headline":"${safeTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}","description":"${safeDesc.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}","author":{"@type":"Person","name":"${safeAuthor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"},"datePublished":"${opts.date || ""}","publisher":{"@type":"Organization","name":"${safeOrg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"}},{"@type":"Person","name":"${safeAuthor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"},{"@type":"Organization","name":"${safeOrg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"}]}
</script>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {${cssVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Lora',Georgia,serif;background:var(--bg) !important;color:#1a1a1a;line-height:1.85;font-size:17px;font-weight:400;letter-spacing:-0.01em}
/* Wrapper: full viewport width (no side gaps), no top gap so body starts at top */
.georepute-article-script{background:var(--bg) !important;min-height:100vh;width:100vw;max-width:100vw;margin:0;margin-left:calc(-50vw + 50%);padding:0;position:relative;box-sizing:border-box}
.georepute-article-script .article,.georepute-article-script main.article{background:var(--bg) !important}
/* Remove theme top padding so our content starts at top and fills the gap (broad selectors for any theme) */
body:has(.georepute-article-script) .entry-content,
body:has(.georepute-article-script) .content-area,
body:has(.georepute-article-script) main#main,
body:has(.georepute-article-script) .site-content,
body:has(.georepute-article-script) .site-inner,
body:has(.georepute-article-script) #content,
body:has(.georepute-article-script) .main-content,
body:has(.georepute-article-script) .post-content,
body:has(.georepute-article-script) .entry-content-wrap,
body:has(.georepute-article-script) article .entry-content,
body:has(.georepute-article-script) .single .site-content,
body:has(.georepute-article-script) .single .content-area{padding-top:0 !important;margin-top:0 !important;max-width:none !important}
/* Fallback: zero top space on any wrapper that contains our script (handles unknown theme classes) */
body:has(.georepute-article-script) .georepute-article-script{margin-top:0 !important;padding-top:0 !important}
/* No gap between brand bar and hero — merge them visually */
.brand-bar{margin-bottom:0 !important}
.hero{margin-top:0 !important}
.georepute-article-script>.hero,.georepute-article-script>section:first-child{margin-top:0 !important;padding-top:40px}
/* Hide theme's top block (title, Leave a Comment/Uncategorized, featured image) and any wrapper so space collapses */
body:has(.georepute-article-script) .entry-header,
body:has(.georepute-article-script) .post-thumbnail,
body:has(.georepute-article-script) .wp-block-post-featured-image,
body:has(.georepute-article-script) .entry-meta,
body:has(.georepute-article-script) .post-meta,
body:has(.georepute-article-script) .featured-image,
body:has(.georepute-article-script) .entry-header-wrap,
body:has(.georepute-article-script) .post-header,
body:has(.georepute-article-script) .single-post-header{display:none !important}
.hero{background:linear-gradient(135deg,${theme.heroStart} 0%,${theme.heroMid} 55%,${theme.heroEnd} 100%);padding:72px 32px 64px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.hero-eyebrow{display:inline-block;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#93c5fd;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);padding:5px 16px;border-radius:20px;margin-bottom:14px;position:relative;z-index:1}
.hero h1{font-family:'Lora',Georgia,serif;font-size:clamp(2.375rem,5vw,2.75rem);font-weight:700;color:white;line-height:1.15;margin-bottom:20px;letter-spacing:-0.02em;max-width:680px;margin-left:auto;margin-right:auto;position:relative;z-index:1}
.hero h1 em{font-style:italic;font-weight:700;color:#93c5fd}
.hero-sub{font-size:1.05rem;color:#c7d2fe;max-width:600px;margin:0 auto;line-height:1.65;font-weight:300;position:relative;z-index:1}
.hero-methodology{font-size:11px;color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;display:inline-block;margin-top:16px;position:relative;z-index:1}
.hero-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:720px;margin:28px auto 0;position:relative;z-index:1}
.hero-stat{border-top:3px solid rgba(255,255,255,0.25);padding-top:16px;text-align:center}
.hero-stat-num{font-family:'Inter',sans-serif;font-size:2.5rem;font-weight:700;color:white;display:block;margin-bottom:4px;line-height:1}
.hero-stat-label{font-size:11px;color:rgba(255,255,255,.8);line-height:1.3}
.hero-badges{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:24px;position:relative;z-index:1}
.hero-badge{font-size:10px;font-weight:600;padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);color:white;background:rgba(255,255,255,0.07);letter-spacing:.04em}
.article{max-width:var(--max);margin:0 auto;padding:60px 32px 80px;background:var(--bg) !important}
.article .post-content,.article .entry-content{max-width:100%}
.article p{font-family:'Lora',Georgia,serif;font-size:17px;line-height:1.85;margin-bottom:26px;color:#1a1a1a}
.article p+p{text-indent:0}
.article h2{font-family:'Lora',Georgia,serif;font-size:clamp(1.375rem,3.5vw,1.875rem);font-weight:700;color:var(--ink);margin-top:52px;margin-bottom:16px;line-height:1.25;letter-spacing:-0.015em}
.article h3{font-family:'Inter',sans-serif;font-size:18px;font-weight:600;color:#444;margin-top:36px;margin-bottom:10px}
.drop-cap::first-letter{font-family:'Lora',Georgia,serif;font-size:4.2rem;color:var(--accent);float:left;line-height:1;margin-right:12px;margin-top:-4px}
/* Blockquote / pull-quote — editorial style (left border, background tint) */
blockquote,.pull-quote{border-left:4px solid var(--accent);margin:32px 0;padding:16px 24px;background:rgba(83,74,183,0.05);border-radius:0 8px 8px 0}
blockquote p,.pull-quote p{font-family:'Lora',Georgia,serif;font-size:18px;font-style:italic;line-height:1.7;color:#1a1a1a;margin:0 0 8px}
blockquote cite,.pull-quote cite{font-size:12px;color:#888;font-style:normal;letter-spacing:0.03em;font-family:'Inter',sans-serif}
/* Widgets — stat cards (editorial 3-col grid), method-box, geo-box, ref-list */
.stat-grid,.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:32px 0}
.stat-card,.stat-box{border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);background:white}
.stat-card{border-top:4px solid var(--accent)}
.stat-box{border-top:4px solid var(--accent)}
.stat-number,.stat-num{font-family:'Inter',sans-serif;font-size:40px;font-weight:700;line-height:1;color:var(--ink);display:block}
.stat-label{font-size:12px;font-weight:500;margin-top:8px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-2);font-family:'Inter',sans-serif}
.stat-num{font-size:2rem}
.stat-box .stat-num,.stat-box .stat-label{margin:0 auto}
.method-box{border-left:4px solid var(--accent-2);padding:24px 28px;margin:32px 0;background:white;border-radius:0 12px 12px 0;display:grid;grid-template-columns:1fr 1fr;gap:24px;border:1px solid var(--border);border-left:4px solid var(--accent-2)}
.geo-box{background:#fdf4ff;border:1px solid #e9d5ff;border-radius:12px;padding:28px;margin:32px 0}
.geo-steps{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.ref-list{list-style:none;counter-reset:refs;margin:28px 0}
.ref-list li{counter-increment:refs;margin-bottom:12px;padding-left:0;display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.ref-list li::before{content:counter(refs)". ";font-weight:600;color:var(--ink);flex-shrink:0}
.ref-list li > span:first-of-type{min-width:0}
.ref-type{font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;margin-left:8px;flex-shrink:0;white-space:nowrap}
.ref-type.external{background:#eff6ff;color:var(--accent)}
.ref-type.georepute{background:#f5f3ff;color:var(--accent-2)}
.brand-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:start;margin:32px 0}
.brand-box{padding:24px;border-radius:12px;border:1px solid var(--border);border-top:4px solid var(--accent)}
.brand-box.coke,.brand-box.win-coke{border-top-color:#b91c1c}
.brand-box.pepsi,.brand-box.win-pepsi{border-top-color:#2563eb}
.chart-section{margin:32px 0}
.bar-chart{display:flex;align-items:flex-end;gap:12px;min-height:180px;margin:16px 0}
.bar-fill{background:var(--accent);border-radius:6px 6px 0 0;min-height:20px}
.checklist-section{margin:32px 0;padding:24px;background:white;border:1px solid var(--border);border-radius:12px}
.checklist-item{cursor:pointer;padding:12px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px}
.checklist-item:last-child{border-bottom:none}
.checklist-item.checked{color:var(--green)}
#cl-progress{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin:16px 0}
#cl-progress{display:block}
#cl-progress{background:var(--border)}
#cl-progress .fill{height:100%;background:var(--accent);border-radius:3px;transition:width .3s}
#cl-done-msg{display:none;margin-top:16px;padding:16px;background:#f0fdf4;color:var(--green);border-radius:8px;font-weight:600}
#cl-done-msg.visible{display:block}
strong{color:var(--ink);font-weight:600}
a.cite{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--accent)}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid transparent}
a:hover{border-bottom-color:var(--accent)}
.article-header{margin-bottom:52px;padding-bottom:40px;border-bottom:2px solid var(--border)}
.post-eyebrow,.category-tag{display:block;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin-bottom:14px;font-family:'Inter',sans-serif}
.category-tag{display:inline-block;color:var(--accent);background:#eff6ff;padding:4px 12px;border-radius:4px;margin-bottom:14px}
.article-title{font-family:'Lora',Georgia,serif;font-size:clamp(1.875rem,5vw,2.75rem);font-weight:700;line-height:1.15;color:var(--ink);margin-bottom:16px;letter-spacing:-0.02em}
.article-title em{font-style:italic;font-weight:700}
.article-subtitle{font-size:1.1rem;color:var(--ink-light);font-weight:400;line-height:1.65;margin-bottom:28px}
.post-byline,.meta{display:flex;align-items:center;flex-wrap:wrap;gap:0 6px;font-size:13px;color:#999;font-family:'Inter',sans-serif;margin-top:14px}
.meta-dot{opacity:.5}
.meta-author{font-weight:600;color:var(--ink-2)}
.meta-source a{color:var(--accent);text-decoration:none;font-weight:500}
.meta-source a:hover{text-decoration:underline}
.post-footnote{font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;margin-top:20px;font-style:italic;font-family:'Inter',sans-serif}
.figure{margin:28px 0;background:white;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.figure-img{width:100%;height:auto;display:block}
.figure-caption{font-size:13px;color:var(--ink-light);padding:14px 28px;border-top:1px solid var(--border);line-height:1.55}
.insight-box{background:var(--ink);color:white;border-radius:12px;padding:28px 32px;margin:44px 0}
.insight-box p{color:white;margin:0}
.insight-box strong{color:#93c5fd}
/* Comparison table — Inter for UI, thead var(--ink), zebra rows */
.comparison-table,.blog-table,.blog-styled-table,.geo-comparison-table{width:100%;border-collapse:collapse;margin:28px 0;font-size:14px;border:none;font-family:'Inter',sans-serif}
.comparison-table thead th,.blog-table thead th,.blog-styled-table thead th,.geo-comparison-table thead th,
table.geo-comparison-table th,table.blog-styled-table th,table.comparison-table th{padding:14px 18px;text-align:left;font-weight:700;text-transform:uppercase;background:var(--ink);color:#fff;border:none;font-size:0.8125rem;letter-spacing:0.02em}
.comparison-table tbody td,.blog-table tbody td,.blog-styled-table tbody td,.geo-comparison-table tbody td,
table.geo-comparison-table td,table.blog-styled-table td,table.comparison-table td{padding:14px 18px;text-align:left;vertical-align:top;border:none;color:#374151;line-height:1.5}
.comparison-table tbody tr:nth-child(even) td,.blog-table tbody tr:nth-child(even) td,.blog-styled-table tbody tr:nth-child(even) td,.geo-comparison-table tbody tr:nth-child(even) td{background:#F9F8F4}
.comparison-table tbody tr:nth-child(odd) td,.blog-table tbody tr:nth-child(odd) td,.blog-styled-table tbody tr:nth-child(odd) td,.geo-comparison-table tbody tr:nth-child(odd) td{background:#fff}
table th, .blog-table div[style*="table-cell"]{padding:12px 16px;text-align:left;font-weight:600;background:var(--ink);color:white}
table td, .blog-table div[style*="table-cell"]{padding:12px 16px;border:1px solid var(--border);color:var(--ink-2)}
.author-card{background:white;border:1px solid var(--border);border-radius:16px;padding:32px;margin-top:56px;font-family:'Inter',sans-serif}
.author-name-lg{font-family:'Lora',Georgia,serif;font-size:1.5rem;font-weight:700;color:var(--ink);margin-bottom:8px}
.author-bio{font-size:14.5px;color:var(--ink-2);line-height:1.7}
.conclusion{background:linear-gradient(135deg,#eff6ff 0%,#fdf4ff 100%);border-radius:16px;padding:36px;margin-top:52px;border:1px solid var(--border)}
.conclusion .big-line{font-family:'Lora',Georgia,serif;font-size:1.25rem;font-weight:700;color:var(--ink);margin-bottom:14px}
.site-footer{background:var(--ink);padding:32px;text-align:center;margin-top:0;font-family:'Inter',sans-serif}
.site-footer-logo{font-family:'Inter',sans-serif;font-size:1.3rem;font-weight:700;color:white;margin-bottom:8px}
.site-footer-text{font-size:12px;color:rgba(255,255,255,.7);line-height:1.6}
.site-footer-text a{color:rgba(255,255,255,.9);text-decoration:none}
/* RTL: right-align hero, article header, and meta for Hebrew/Arabic */
.georepute-article-script.rtl .brand-bar{flex-direction:row-reverse}
.georepute-article-script.rtl .hero{text-align:center}
.georepute-article-script.rtl .hero h1,.georepute-article-script.rtl .hero-sub{margin-left:auto;margin-right:auto}
.georepute-article-script.rtl .hero-badges{justify-content:center}
.georepute-article-script.rtl .article-header{text-align:right}
.georepute-article-script.rtl .category-tag,.georepute-article-script.rtl .article-title,.georepute-article-script.rtl .article-subtitle{text-align:right}
.georepute-article-script.rtl .meta{justify-content:flex-end;flex-direction:row-reverse}
.georepute-article-script.rtl .author-card{text-align:right}
.georepute-article-script.rtl .site-footer{text-align:center}
.georepute-article-script.rtl table th,.georepute-article-script.rtl table td,.georepute-article-script.rtl .blog-table div[style*="table-cell"]{text-align:right}
.georepute-article-script.rtl .pull-quote,.georepute-article-script.rtl blockquote{border-left:none;border-right:4px solid var(--accent);border-radius:10px 0 0 10px}
/* Personal Voice Layer (About the Author) – theme vars */
.personal-voice-layer{background:white;border:1px solid var(--border);border-radius:16px;padding:28px 32px;margin-top:56px}
.personal-voice-layer .pvl-inner{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.personal-voice-layer .pvl-photo{width:110px;height:130px;object-fit:cover;object-position:top center;border-radius:12px;border:2px solid var(--border);display:block}
.personal-voice-layer .pvl-badge{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent);background:#eff6ff;padding:4px 10px;border-radius:20px;display:inline-block;margin-bottom:10px}
.personal-voice-layer .pvl-name{font-family:'Lora',Georgia,serif;font-size:1.5rem;font-weight:700;color:var(--ink);margin-bottom:6px}
.personal-voice-layer .pvl-title{font-size:13px;color:var(--accent-2);font-weight:600;margin-bottom:12px;line-height:1.4}
.personal-voice-layer .pvl-bio{font-size:14px;line-height:1.7;color:var(--ink-2);margin-bottom:14px}
.personal-voice-layer .pvl-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.personal-voice-layer .pvl-tag{font-size:12px;padding:5px 12px;border-radius:20px;background:var(--bg-2);color:var(--ink-2)}
.personal-voice-layer .pvl-buttons{display:flex;flex-wrap:wrap;gap:10px}
.personal-voice-layer .pvl-btn{display:inline-block;font-size:14px;font-weight:600;padding:8px 18px;border-radius:8px;border:2px solid var(--accent);color:var(--accent);text-decoration:none}
.personal-voice-layer .pvl-btn:hover{background:#eff6ff;color:var(--accent)}
.georepute-article-script.rtl .personal-voice-layer .pvl-inner{flex-direction:row-reverse}
.georepute-article-script.rtl .personal-voice-layer .pvl-badge,.georepute-article-script.rtl .personal-voice-layer .pvl-name,.georepute-article-script.rtl .personal-voice-layer .pvl-title,.georepute-article-script.rtl .personal-voice-layer .pvl-bio,.georepute-article-script.rtl .personal-voice-layer .pvl-tags,.georepute-article-script.rtl .personal-voice-layer .pvl-buttons{text-align:right}
/* Mandatory disclaimer – end of every article */
.geo-disclaimer{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);font-size:0.8125rem;line-height:1.5;color:var(--ink-light)}
.geo-disclaimer p{margin:0}
.geo-disclaimer-section-title{font-family:'Inter',sans-serif;font-size:0.9375rem;font-weight:700;color:var(--ink);margin:0 0 0.5rem;padding:0}
.brand-bar{background:#1a1a2e;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-family:'Inter',sans-serif}
.brand-bar-logo{font-family:'Inter',sans-serif;font-size:1.4rem;font-weight:700;color:white}
.brand-bar-logo .accent{color:#93c5fd}
.brand-bar-tagline{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a5b4fc}
.brand-bar-cta{font-size:14px;font-weight:600;color:white;cursor:pointer;background:transparent;border:none;padding:8px 0}
.brand-bar-cta:hover{color:#93c5fd}
/* Demo modal — spec: fixed overlay, form, WhatsApp submit, success state, close on overlay or X */
#demoModalOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px}
#demoModalOverlay.visible{display:flex}
#demoModal{background:white;border-radius:16px;max-width:440px;width:100%;padding:28px;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}
#demoModalClose{position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#64748b;line-height:1}
#demoModalClose:hover{color:var(--ink)}
#demoModal h3{margin-bottom:8px;font-family:'Inter',sans-serif;font-size:1.25rem}
#demoModal label{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2);margin-bottom:6px}
#demoModal input,#demoModal textarea{width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:8px;font-size:15px;margin-bottom:16px;transition:border-color .2s}
#demoModal input:focus,#demoModal textarea:focus{outline:none;border-color:var(--accent)}
#demoModalSubmit{width:100%;padding:14px;background:var(--accent);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:15px}
#demoModalSubmit:hover{opacity:.95}
#demoSuccess{display:none;text-align:center;padding:20px 0}
#demoSuccess.visible{display:block}
#demoForm.visible{display:none}
@media(max-width:640px){ .article{padding:32px 18px 60px} .hero{padding:52px 20px 48px} .brand-bar{flex-direction:column;align-items:flex-start} .hero-stats{grid-template-columns:1fr} }
</style>
</head>
<body>
<!-- GeoRepute article script format: full-page content; theme "Leave a Reply" and post nav stay at end. -->
<div class="georepute-article-script${isRtl ? " rtl" : ""}" dir="${isRtl ? "rtl" : "ltr"}">
<!-- Brand bar — spec: dark navy, logo, tagline, Demo CTA opens modal -->
<header class="brand-bar" role="banner">
  <div>
    <div class="brand-bar-logo">${orgName === "GeoRepute" ? "<span>Geo</span><span class=\"accent\">Repute</span>" : safeOrg}</div>
    <div class="brand-bar-tagline">AI Citation &amp; Narrative Intelligence Platform</div>
  </div>
  ${showDemoModal ? `<button type="button" class="brand-bar-cta" onclick="openDemoModal()">${escapeHtml(ctaText)}</button>` : `<a href="${escapeHtml(orgUrl)}" target="_blank" rel="noopener" class="brand-bar-cta">${escapeHtml(ctaText)}</a>`}
</header>
<!-- Hero — spec: eyebrow #93c5fd, H1 font-weight 900, one italic blue word, methodology note, 3 hero stats -->
<section class="hero" aria-label="${safeOrg} — ${safeTitle}">
  ${heroEyebrow ? `<div class="hero-eyebrow">${escapeHtml(heroEyebrow)}</div>` : ""}
  <h1>${heroTitleHtml}</h1>
  <p class="hero-sub">${safeDesc}</p>
  ${heroMethodologyNote ? `<div class="hero-methodology">${escapeHtml(heroMethodologyNote)}</div>` : ""}
  ${heroStats.length > 0 ? `<div class="hero-stats">${heroStats.map((s) => `<div class="hero-stat"><span class="hero-stat-num">${escapeHtml(s.value)}</span><span class="hero-stat-label">${escapeHtml(s.label)}${s.source ? `<br><small>${escapeHtml(s.source)}</small>` : ""}</span></div>`).join("")}</div>` : ""}
  ${heroBadges.length > 0 ? `<div class="hero-badges">${heroBadges.map((b) => `<span class="hero-badge">${escapeHtml(b)}</span>`).join("")}</div>` : ""}
</section>
<main class="article" id="main-content">
  <header class="article-header">
    ${categoryTag ? `<div class="category-tag">${escapeHtml(categoryTag)}</div>` : ""}
    <h2 class="article-title">${safeTitle}</h2>
    <p class="article-subtitle">${safeDesc}</p>
    <div class="meta">
      <span>By</span>
      <span class="meta-author">${safeAuthor}</span>
      <span class="meta-dot">&middot;</span>
      <span class="meta-source">Published on <a href="${escapeHtml(orgUrl)}" target="_blank" rel="noopener">${safeOrg}</a></span>
      <span class="meta-dot">&middot;</span>
      ${readTime != null ? `<span>${readTime} min read</span><span class="meta-dot">&middot;</span>` : ""}
      <span>${monthYear || year}</span>
    </div>
  </header>
  ${featuredImgBlock}
  ${applyDropCap(stripMarkdownBoldMarkers(opts.bodyHtml))}
  ${(function () {
    const pv = opts.personalVoice;
    if (pv && (pv.authorName || author)) {
      return buildPersonalVoiceLayerHtml({
        authorPhotoBase64: pv.authorPhotoBase64 ?? undefined,
        authorName: (pv.authorName || author).trim() || author,
        authorTitleLine: pv.authorTitleLine,
        authorBio: pv.authorBio,
        authorExpertiseTags: pv.authorExpertiseTags,
        linkedInUrl: pv.linkedInUrl,
        websiteUrl: pv.websiteUrl,
        organizationName: pv.organizationName ?? orgName,
        isRtl,
      });
    }
    return `<div class="author-card">
    <div class="author-name-lg">${safeAuthor}</div>
    <p class="author-bio">Article by ${safeAuthor}${orgName ? ` for ${safeOrg}.` : "."}</p>
  </div>`;
  })()}
  ${getDisclaimerHtml({ locale: opts.contentLanguage ?? null })}
</main>
<footer class="site-footer">
  <div class="site-footer-logo">${orgName === "GeoRepute" ? "<span>Geo</span><span class=\"accent\">Repute</span>" : safeOrg}</div>
  <div class="site-footer-text">AI Citation &amp; Narrative Intelligence Platform &middot; &copy; ${year} ${safeOrg} &middot; <a href="${escapeHtml(orgUrl)}" target="_blank" rel="noopener">${safeOrg.toLowerCase().replace(/\s/g, "")}.ai</a></div>
</footer>
<!-- Demo modal — spec: WhatsApp form, wa.me/972556800600, success then open after 600ms -->
<div id="demoModalOverlay" onclick="if(event.target===this)closeDemoModal()">
  <div id="demoModal" onclick="event.stopPropagation()">
    <button type="button" id="demoModalClose" onclick="closeDemoModal()" aria-label="Close">&times;</button>
    <div id="demoForm">
      <h3>Request a Demo</h3>
      <p style="font-size:14px;color:var(--ink-2);margin-bottom:20px">Tell us a bit about your brand and we'll be in touch within one business day.</p>
      <form onsubmit="submitDemoForm(event)">
        <label for="demoName">Full Name *</label>
        <input type="text" id="demoName" required placeholder="Your name">
        <label for="demoCompany">Company / Brand *</label>
        <input type="text" id="demoCompany" required placeholder="Company or brand">
        <label for="demoEmail">Email *</label>
        <input type="email" id="demoEmail" required placeholder="you@company.com">
        <label for="demoMessage">What would you like to measure?</label>
        <textarea id="demoMessage" rows="3" placeholder="Optional message"></textarea>
        <button type="submit" id="demoModalSubmit">Send via WhatsApp</button>
      </form>
      <p style="font-size:12px;color:var(--ink-light);margin-top:12px">Your details will be sent directly to the GeoRepute team via WhatsApp.</p>
    </div>
    <div id="demoSuccess">
      <p style="font-size:18px;font-weight:600;color:var(--green);margin-bottom:8px">✅ Message Sent!</p>
      <p style="font-size:14px;color:var(--ink-2)">Your WhatsApp message is opening now. The GeoRepute team will be in touch shortly.</p>
    </div>
  </div>
</div>
</div>
<script>
function openDemoModal(){document.getElementById('demoModalOverlay').classList.add('visible');document.body.style.overflow='hidden'}
function closeDemoModal(){document.getElementById('demoModalOverlay').classList.remove('visible');document.body.style.overflow='';document.getElementById('demoForm').classList.add('visible');document.getElementById('demoSuccess').classList.remove('visible')}
function submitDemoForm(e){e.preventDefault();var n=document.getElementById('demoName').value||'';var c=document.getElementById('demoCompany').value||'';var em=document.getElementById('demoEmail').value||'';var msg=document.getElementById('demoMessage').value||'';var text='🚀 New Demo Request\\n👤 Name: '+n+'\\n🏢 Company: '+c+'\\n📧 Email: '+em+'\\n💬 Message: '+msg;document.getElementById('demoForm').classList.add('visible');document.getElementById('demoSuccess').classList.add('visible');setTimeout(function(){window.open('https://wa.me/972556800600?text='+encodeURIComponent(text),'_blank');closeDemoModal();},600)}
</script>
<script>
function toggle(el){el.classList.toggle('checked');updateProgress()}
function updateProgress(){
  var items=document.querySelectorAll('.checklist-item');
  var checked=document.querySelectorAll('.checklist-item.checked');
  var total=items.length,done=checked.length;
  var scoreEl=document.getElementById('cl-score');
  var progressEl=document.getElementById('cl-progress');
  if(scoreEl)scoreEl.textContent=done;
  var fillEl=progressEl?progressEl.querySelector('.fill'):null;
  if(fillEl)fillEl.style.width=(total>0?(done/total*100):0).toFixed(0)+'%';
  else if(progressEl)progressEl.style.width=(total>0?(done/total*100):0).toFixed(0)+'%';
  var msg=document.getElementById('cl-done-msg');
  if(msg){if(done===total&&total>0)msg.classList.add('visible');else msg.classList.remove('visible');}
}
function resetChecklist(){
  document.querySelectorAll('.checklist-item').forEach(function(el){el.classList.remove('checked');});
  updateProgress();
}
document.addEventListener('DOMContentLoaded',function(){
  var totalEl=document.getElementById('cl-total');
  if(totalEl)totalEl.textContent=document.querySelectorAll('.checklist-item').length;
  var script=document.querySelector('.georepute-article-script');
  if(script){
    document.querySelectorAll('.entry-header, .post-thumbnail, .wp-block-post-featured-image, .entry-meta, .post-meta, .featured-image').forEach(function(el){ el.style.setProperty('display','none','important'); });
    var prev=script.previousElementSibling;
    while(prev){ prev.style.setProperty('display','none','important'); prev=prev.previousElementSibling; }
    var el=script.parentElement;
    while(el&&el!==document.body){ el.style.setProperty('padding-top','0','important'); el.style.setProperty('margin-top','0','important'); el=el.parentElement; }
  }
});
</script>
</body>
</html>`;
}
