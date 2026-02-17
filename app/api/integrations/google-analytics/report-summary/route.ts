/**
 * GA4 Report Summary API
 * Returns summary metrics and top pages for the authenticated user's GA4 property.
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAnalyticsService } from '@/lib/integrations/google-analytics';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') ?? subDays(new Date(), 30).toISOString().slice(0, 10);
    const endDate = searchParams.get('end') ?? new Date().toISOString().slice(0, 10);

    const { data: integration, error: intError } = await supabase
      .from('platform_integrations')
      .select('id, access_token, refresh_token, expires_at, metadata')
      .eq('user_id', user.id)
      .eq('platform', 'google_analytics')
      .eq('status', 'connected')
      .single();

    if (intError || !integration) {
      return NextResponse.json(
        { error: 'GA4 not connected', summary: null, topPages: [] },
        { status: 200 }
      );
    }

    const accessToken = integration.access_token;
    const refreshToken = integration.refresh_token;
    const expiresAt = integration.expires_at
      ? new Date(integration.expires_at).getTime()
      : 0;
    const meta = (integration.metadata ?? {}) as { selected_property?: { propertyId?: string; propertyIdNum?: string } };
    const selected = meta.selected_property;
    let propertyId = selected?.propertyIdNum ?? selected?.propertyId;
    if (typeof propertyId === 'string' && propertyId.startsWith('properties/')) {
      propertyId = propertyId.replace(/^properties\//, '');
    }
    if (!accessToken || !refreshToken || !propertyId) {
      return NextResponse.json(
        { error: 'GA4 configuration incomplete', summary: null, topPages: [] },
        { status: 200 }
      );
    }

    const ga4 = new GoogleAnalyticsService({
      accessToken,
      refreshToken,
      expiresAt,
    });

    if (expiresAt && Date.now() >= expiresAt - 60_000) {
      try {
        const { accessToken: newToken, expiresAt: newExpiry } = await ga4.refreshAccessToken();
        await supabase
          .from('platform_integrations')
          .update({
            access_token: newToken,
            expires_at: new Date(newExpiry).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);
      } catch (_) {
        // continue with existing token
      }
    }

    const [summary, topPages] = await Promise.all([
      ga4.getSummary(String(propertyId), startDate, endDate),
      ga4.getTopPages(String(propertyId), startDate, endDate, 10),
    ]);

    return NextResponse.json({
      summary: summary ?? null,
      topPages: topPages ?? [],
    });
  } catch (error: any) {
    console.error('GA4 report-summary error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch GA4 report', summary: null, topPages: [] },
      { status: 500 }
    );
  }
}

function subDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - days);
  return out;
}
