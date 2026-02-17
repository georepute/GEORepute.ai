/**
 * POST /api/onboarding/verify-identity
 * Cross-verification: compare website, GSC, GBP/social/geography and return conflicts.
 * If conflicts exist, client must not start the scan until user corrects inputs.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function normalizeDomain(input: string): string {
  if (!input?.trim()) return '';
  let s = input.trim().toLowerCase();
  if (s.startsWith('sc-domain:')) {
    s = s.replace(/^sc-domain:\s*/i, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return s;
  }
  try {
    if (!s.startsWith('http')) s = 'https://' + s;
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');
    return host || '';
  } catch {
    return '';
  }
}

function domainToBrandSlug(domain: string): string {
  const host = normalizeDomain(domain);
  const first = host.split('.')[0] || '';
  return first.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const domain = (body.domain ?? '').toString().trim();
    const analysisCountries = Array.isArray(body.analysisCountries) ? body.analysisCountries : [];
    if (!domain) {
      return NextResponse.json({
        valid: false,
        conflicts: [{ type: 'missing_domain', message: 'Website domain is required.', source: 'website' }],
      });
    }

    const onboardingHost = normalizeDomain(domain);
    const conflicts: { type: string; message: string; source: string }[] = [];

    // --- 1. GSC: selected site must match onboarding domain ---
    const { data: gsc } = await supabase
      .from('platform_integrations')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('platform', 'google_search_console')
      .eq('status', 'connected')
      .maybeSingle();

    if (gsc?.metadata?.selected_site) {
      const gscSite = (gsc.metadata.selected_site as string).trim();
      const gscHost = normalizeDomain(gscSite);
      if (gscHost && onboardingHost && gscHost !== onboardingHost) {
        conflicts.push({
          type: 'gsc_domain_mismatch',
          message: `Your Google Search Console property (${gscSite}) does not match the website you entered (${domain}). Please connect GSC for this domain or update your website.`,
          source: 'google_search_console',
        });
      }
    }

    // --- 2. Google Maps / GBP: if we have a saved business, check name vs domain-derived brand (soft) ---
    const { data: businesses } = await supabase
      .from('google_maps_reviews')
      .select('place_name, place_address')
      .eq('user_id', user.id)
      .order('fetched_at', { ascending: false })
      .limit(5);

    const uniqueByName = new Map<string, { place_name: string; place_address: string }>();
    businesses?.forEach((b: any) => {
      const name = (b.place_name || b.place_address || '').trim();
      if (name && !uniqueByName.has(name)) uniqueByName.set(name, b);
    });
    const firstPlace = uniqueByName.values().next().value;
    const placeName = (firstPlace?.place_name || '').trim();
    const wordCount = placeName.split(/\s+/).filter(Boolean).length;
    if (placeName && wordCount >= 2) {
      const placeNameSlug = placeName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const brandSlug = domainToBrandSlug(domain);
      if (brandSlug.length >= 2 && placeNameSlug.length >= 2 && !placeNameSlug.includes(brandSlug) && !brandSlug.includes(placeNameSlug)) {
        conflicts.push({
          type: 'gbp_name_mismatch',
          message: `Google Business / company location name ("${placeName}") doesn't match your website domain (${domain}). Please confirm this is the same business or update your inputs.`,
          source: 'google_business_profile',
        });
      }
    }

    // --- 3. Geography: require at least one region when we have a company location (optional strictness) ---
    if (uniqueByName.size > 0 && analysisCountries.length === 0) {
      conflicts.push({
        type: 'geography_missing',
        message: 'You added a company location but did not select any region/country for analysis. Please add at least one region in Region & Language.',
        source: 'geography',
      });
    }

    const valid = conflicts.length === 0;
    return NextResponse.json({
      valid,
      conflicts,
    });
  } catch (error: any) {
    console.error('Verify identity error:', error);
    return NextResponse.json(
      { valid: false, conflicts: [{ type: 'error', message: error.message || 'Verification failed.', source: 'system' }] },
      { status: 500 }
    );
  }
}
