/**
 * WordPress Article Template (Universal Content Standards – Article layer)
 * Full-page HTML in the style of georepute_article.html for WordPress publish.
 * User can choose theme/colour; structure (brand bar, hero, article, footer) is fixed.
 */

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

/** Remove Markdown bold/emphasis markers (** and __) from content: convert to HTML tags then strip any remaining markers. */
function stripMarkdownBoldMarkers(html: string): string {
  if (!html || typeof html !== "string") return html;
  let out = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<em>$1</em>");
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
  // Script format: featured image is first figure in article body, not in hero
  const featuredImgBlock =
    opts.featuredImageUrl && /^https?:\/\//i.test(opts.featuredImageUrl)
      ? `<div class="figure" style="margin-top:0;"><img src="${escapeHtml(opts.featuredImageUrl)}" alt="${safeTitle}" class="figure-img" style="width:100%;height:260px;object-fit:cover;display:block;" /></div>`
      : "";

  const cssVars = `
  --ink: ${theme.ink};
  --ink-2: ${theme.ink}ee;
  --ink-light: ${theme.ink}99;
  --accent: ${theme.accent};
  --accent-2: ${theme.accent2};
  --accent-warm: #d97706;
  --bg: ${theme.bg};
  --bg-2: ${theme.bg}dd;
  --border: ${theme.ink}22;
  --max: 820px;
  --green: #059669;
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle} | ${safeOrg}</title>
<meta name="description" content="${safeDesc}">
<meta name="keywords" content="${safeKeywords}">
<meta name="author" content="${safeAuthor}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(orgUrl)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:site_name" content="${safeOrg}">
<meta property="article:author" content="${safeAuthor}">
<meta property="article:published_time" content="${opts.date || new Date().toISOString().slice(0, 10)}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${safeTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}","description":"${safeDesc.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}","author":{"@type":"Person","name":"${safeAuthor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"},"datePublished":"${opts.date || ""}","publisher":{"@type":"Organization","name":"${safeOrg.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"}}
</script>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root {${cssVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:var(--bg) !important;color:var(--ink);line-height:1.85;font-size:17px}
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
/* First child (hero) starts at top to fill the gap left by removed brand bar */
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
.hero{background:linear-gradient(135deg,${theme.heroStart} 0%,${theme.heroMid} 60%,${theme.heroEnd} 100%);padding:72px 32px 64px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.hero-eyebrow{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.85);background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);padding:5px 16px;border-radius:20px;margin-bottom:24px;position:relative;z-index:1}
.hero h1{font-family:'Playfair Display',serif;font-size:clamp(2.2rem,5vw,3.4rem);font-weight:700;color:white;line-height:1.15;margin-bottom:20px;letter-spacing:-.02em;max-width:680px;margin-left:auto;margin-right:auto;position:relative;z-index:1}
.hero h1 em{font-style:italic;color:rgba(255,255,255,.9)}
.hero-sub{font-size:1.1rem;color:rgba(255,255,255,.9);max-width:560px;margin:0 auto;line-height:1.65;font-weight:300;position:relative;z-index:1}
.hero-badges{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:24px;position:relative;z-index:1}
.hero-badge{font-size:11px;font-weight:600;padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);color:white;background:rgba(255,255,255,0.07);letter-spacing:.04em}
.article{max-width:var(--max);margin:0 auto;padding:60px 32px 80px;background:var(--bg) !important}
h2{font-family:'Playfair Display',serif;font-size:1.7rem;font-weight:700;color:var(--ink);margin:60px 0 16px;line-height:1.25}
h3{font-size:1.05rem;font-weight:600;color:var(--ink);margin:32px 0 10px}
p{margin-bottom:22px;color:var(--ink-2)}
strong{color:var(--ink);font-weight:600}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid transparent}
a:hover{border-bottom-color:var(--accent)}
.article-header{margin-bottom:52px;padding-bottom:40px;border-bottom:2px solid var(--border)}
.category-tag{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);background:#eff6ff;padding:4px 12px;border-radius:4px;margin-bottom:20px}
.article-title{font-family:'Playfair Display',serif;font-size:clamp(1.9rem,4vw,2.6rem);font-weight:700;line-height:1.2;color:var(--ink);margin-bottom:16px;letter-spacing:-.01em}
.article-subtitle{font-size:1.1rem;color:var(--ink-light);font-weight:400;line-height:1.65;margin-bottom:28px}
.meta{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-light);flex-wrap:wrap}
.meta-dot{opacity:.3}
.meta-author{font-weight:600;color:var(--ink-2)}
.meta-source a{color:var(--accent);text-decoration:none;font-weight:500}
.meta-source a:hover{text-decoration:underline}
.figure{margin:28px 0;background:white;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.figure-img{width:100%;height:auto;display:block}
.figure-caption{font-size:13px;color:var(--ink-light);padding:14px 28px;border-top:1px solid var(--border);line-height:1.55}
.insight-box{background:var(--ink);color:white;border-radius:12px;padding:28px 32px;margin:44px 0}
.insight-box p{color:white;margin:0}
.comparison-table,.blog-table{width:100%;border-collapse:collapse;margin:28px 0;font-size:14px}
table th, .blog-table div[style*="table-cell"]{padding:12px 16px;text-align:left;font-weight:600;background:var(--ink);color:white}
table td, .blog-table div[style*="table-cell"]{padding:12px 16px;border:1px solid var(--border);color:var(--ink-2)}
.pull-quote{border-left:4px solid var(--accent);padding:18px 26px;margin:40px 0;background:rgba(37,99,235,.08);border-radius:0 10px 10px 0}
.pull-quote p{font-family:'Playfair Display',serif;font-style:italic;margin:0}
.author-card{background:white;border:1px solid var(--border);border-radius:16px;padding:32px;margin-top:56px}
.author-name-lg{font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:700;color:var(--ink);margin-bottom:8px}
.author-bio{font-size:14.5px;color:var(--ink-2);line-height:1.7}
.conclusion{background:linear-gradient(135deg,#eff6ff 0%,#fdf4ff 100%);border-radius:16px;padding:36px;margin-top:52px;border:1px solid var(--border)}
.conclusion .big-line{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:var(--ink);margin-bottom:14px}
.site-footer{background:var(--ink);padding:32px;text-align:center;margin-top:0}
.site-footer-logo{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:white;margin-bottom:8px}
.site-footer-text{font-size:12px;color:rgba(255,255,255,.7);line-height:1.6}
.site-footer-text a{color:rgba(255,255,255,.9);text-decoration:none}
@media(max-width:640px){ .article{padding:32px 18px 60px} .hero{padding:52px 20px 48px} }
</style>
</head>
<body>
<!-- GeoRepute article script format: full-page content; theme "Leave a Reply" and post nav stay at end. -->
<div class="georepute-article-script">
<!-- Hero (script format: no image in hero; eyebrow + badges optional) -->
<section class="hero" aria-label="${safeOrg} — ${safeTitle}">
  ${heroEyebrow ? `<div class="hero-eyebrow">${escapeHtml(heroEyebrow)}</div>` : ""}
  <h1>${safeTitle}</h1>
  <p class="hero-sub">${safeDesc}</p>
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
      <span>${opts.date ? new Date(opts.date).getFullYear() : year}</span>
    </div>
  </header>
  ${featuredImgBlock}
  ${stripMarkdownBoldMarkers(opts.bodyHtml)}
  <div class="author-card">
    <div class="author-name-lg">${safeAuthor}</div>
    <p class="author-bio">Article by ${safeAuthor}${orgName ? ` for ${safeOrg}.` : "."}</p>
  </div>
</main>
<footer class="site-footer">
  <div class="site-footer-logo">${escapeHtml(orgName)}</div>
  <div class="site-footer-text">&copy; ${year} ${safeOrg}. All rights reserved.</div>
</footer>
</div>
<script>
function toggle(el){el.classList.toggle('checked');updateProgress()}
function updateProgress(){
  var items=document.querySelectorAll('.checklist-item');
  var checked=document.querySelectorAll('.checklist-item.checked');
  var total=items.length,done=checked.length;
  var scoreEl=document.getElementById('cl-score');
  var progressEl=document.getElementById('cl-progress');
  if(scoreEl)scoreEl.textContent=done;
  if(progressEl)progressEl.style.width=(total>0?(done/total*100):0).toFixed(0)+'%';
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
