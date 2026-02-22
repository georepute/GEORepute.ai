/**
 * Country merge rules for territorial consolidation.
 * GSC may report Palestine (PS/PSE) and Israel (IL/ISR) as separate regions,
 * but they represent the same territorial area - traffic should be merged into Israel.
 */

/** Palestine codes (2-letter and 3-letter ISO) that map to Israel */
const PALESTINE_CODES = new Set(['ps', 'pse', 'PS', 'PSE']);

/** Israel 3-letter code - normalize to 2-letter for consistency */
const ISRAEL_ALPHA3 = new Set(['isr', 'ISR']);

/** Israel 2-letter code - canonical form for aggregation */
const ISRAEL_ALPHA2 = 'il';

/**
 * Normalizes a country code by merging Palestine into Israel and unifying Israel variants.
 * Use when storing or aggregating GSC/analytics data.
 *
 * @param code - Raw country code (e.g. "ps", "pse", "il", "isr")
 * @returns Normalized code - Palestine + Israel (il/isr) become "il", others unchanged
 */
export function normalizeCountryForMerge(code: string): string {
  if (!code || typeof code !== 'string') return code;

  const trimmed = code.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  if (PALESTINE_CODES.has(upper) || PALESTINE_CODES.has(lower)) {
    return ISRAEL_ALPHA2;
  }
  if (ISRAEL_ALPHA3.has(upper) || ISRAEL_ALPHA3.has(lower) || lower === 'il') {
    return ISRAEL_ALPHA2;
  }

  return trimmed;
}
