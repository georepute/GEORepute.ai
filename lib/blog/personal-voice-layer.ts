/**
 * Personal Voice Layer (About the Author) block for blog posts.
 * Renders after Sources. Uses theme vars: --border, --accent, --accent-2, --bg-2, --ink, --ink-2.
 */

export interface PersonalVoiceLayerOptions {
  /** Author photo as base64 data URL (e.g. data:image/jpeg;base64,...) */
  authorPhotoBase64?: string | null;
  /** Display name, e.g. "Itai Gelman" */
  authorName: string;
  /** Job/title line, e.g. "Founder & CEO, GeoRepute | AI Perception Intelligence & GEO" */
  authorTitleLine?: string;
  /** Bio paragraph, min 50 words recommended */
  authorBio?: string;
  /** Up to 5 expertise tags */
  authorExpertiseTags?: string[];
  /** LinkedIn profile URL (e.g. https://linkedin.com/in/itaigelman) */
  linkedInUrl?: string;
  /** Website domain/URL (e.g. https://example.com) – button href */
  websiteUrl?: string;
  /** Organization name – used as the website button label (e.g. "GeoRepute") */
  organizationName?: string;
  /** If true, layout and text are RTL */
  isRtl?: boolean;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the Personal Voice Layer HTML block.
 * One button: organization name + website URL (no GeoRepute.ai). LinkedIn is user-provided.
 */
export function buildPersonalVoiceLayerHtml(opts: PersonalVoiceLayerOptions): string {
  const name = (opts.authorName || "").trim() || "Author";
  const titleLine = (opts.authorTitleLine || "").trim();
  const bio = (opts.authorBio || "").trim();
  const tags = Array.isArray(opts.authorExpertiseTags)
    ? opts.authorExpertiseTags.filter(Boolean).slice(0, 5)
    : [];
  const linkedInUrl = (opts.linkedInUrl || "").trim();
  const websiteUrl = (opts.websiteUrl || "").trim();
  const organizationName = (opts.organizationName || "").trim();
  const photoSrc = opts.authorPhotoBase64 && opts.authorPhotoBase64.startsWith("data:") ? opts.authorPhotoBase64 : "";
  const isRtl = !!opts.isRtl;
  const dir = isRtl ? "rtl" : "ltr";
  const textAlign = isRtl ? "right" : "left";

  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(titleLine);
  const safeBio = escapeHtml(bio);

  const photoBlock = photoSrc
    ? `<img src="${photoSrc.replace(/"/g, "&quot;")}" alt="${safeName}" class="pvl-photo" width="110" height="130" loading="lazy" />`
    : "";

  const badge = `<div class="pvl-badge" style="text-align:${textAlign}">ABOUT THE AUTHOR</div>`;
  const nameBlock = `<div class="pvl-name" itemprop="name">${safeName}</div>`;
  const titleBlock = titleLine ? `<div class="pvl-title" itemprop="jobTitle">${safeTitle}</div>` : "";
  const bioBlock = bio ? `<div class="pvl-bio" itemprop="description">${safeBio}</div>` : "";

  const tagsHtml =
    tags.length > 0
      ? `<div class="pvl-tags" style="text-align:${textAlign}">${tags
          .map((t) => `<span class="pvl-tag" itemprop="knowsAbout">${escapeHtml(t.trim())}</span>`)
          .join("")}</div>`
      : "";

  const buttons: string[] = [];
  if (websiteUrl && /^https?:\/\//i.test(websiteUrl)) {
    const btnLabel = organizationName || "Website";
    buttons.push(
      `<a class="pvl-btn" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener">${escapeHtml(btnLabel)}</a>`
    );
  }
  if (linkedInUrl && /^https?:\/\//i.test(linkedInUrl)) {
    buttons.push(
      `<a class="pvl-btn" href="${escapeHtml(linkedInUrl)}" target="_blank">LinkedIn</a>`
    );
  }
  const buttonsBlock =
    buttons.length > 0
      ? `<div class="pvl-buttons" style="text-align:${textAlign}">${buttons.join("")}</div>`
      : "";

  return `<div class="personal-voice-layer" dir="${dir}" itemscope itemtype="https://schema.org/Person">
  <div class="pvl-inner">
    ${photoSrc ? `<div class="pvl-photo-wrap">${photoBlock}</div>` : ""}
    <div class="pvl-content">
      ${badge}
      ${nameBlock}
      ${titleBlock}
      ${bioBlock}
      ${tagsHtml}
      ${buttonsBlock}
    </div>
  </div>
</div>`;
}
