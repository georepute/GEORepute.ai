import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { getKeywordCpcFromGoogleAds } from '@/lib/google-ads/keyword-ideas';

type GapType = 'Both' | 'Google only' | 'AI only' | 'Neither';

function bandToGapType(band: string): GapType {
  switch (band) {
    case 'ai_risk':
    case 'moderate_gap':
      return 'Google only';
    case 'balanced':
      return 'Both';
    case 'seo_opportunity':
      return 'AI only';
    case 'seo_failure':
      return 'Neither';
    default:
      return 'Neither';
  }
}

function getOpportunityNote(demand: number, gap: GapType): string {
  if (demand === 0) return 'No demand data';
  if (gap === 'Neither') return 'High demand; no organic, no AI — priority opportunity';
  if (gap === 'Google only') return 'Demand + organic; improve AI visibility';
  if (gap === 'AI only') return 'Demand + AI; improve organic visibility';
  return 'Strong: demand, organic, and AI';
}

/** GET — Load saved Opportunity report from Supabase */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');
    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from('opportunity_blind_spots_reports')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('domain_id', domainId)
      .single();

    if (error || !report) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        domain: report.domain_hostname,
        queries: report.queries || [],
        summary: {
          totalQueries: report.total_queries,
          priorityGapsCount: report.priority_gaps_count,
          avgCpc: Number(report.avg_cpc),
          revenueAtRisk: Number(report.revenue_at_risk),
        },
        enginesUsed: report.engines_used || [],
        generatedAt: report.generated_at,
      },
    });
  } catch (error: any) {
    console.error('opportunity-blind-spots GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load report' },
      { status: 500 }
    );
  }
}

/** POST — Generate report: AI vs Google Gap + CPC from Google Ads, save to Supabase */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const domainId: string | undefined = body.domainId;
    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 });
    }

    // 1. Load AI vs Google Gap report (must exist — gap from AI engines, same as that report)
    const { data: gapReport, error: gapError } = await supabase
      .from('ai_google_gap_reports')
      .select('queries, domain_hostname, engines_used')
      .eq('user_id', session.user.id)
      .eq('domain_id', domainId)
      .single();

    if (gapError || !gapReport?.queries?.length) {
      return NextResponse.json(
        { error: 'Generate the AI vs Google Gap report for this domain first.' },
        { status: 400 }
      );
    }

    const gapQueries = gapReport.queries as Array<{
      query: string;
      impressions: number;
      band: string;
      googleScore?: number;
      aiScore?: number;
      gapScore?: number;
    }>;
    const domainHostname = gapReport.domain_hostname || '';

    // 2. Get CPC from Google Ads API for these keywords
    const {
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_TEST_ACCOUNT_ID,
    } = process.env;

    const cpcByKeyword = new Map<string, number>();

    if (
      GOOGLE_ADS_CLIENT_ID &&
      GOOGLE_ADS_CLIENT_SECRET &&
      GOOGLE_ADS_REFRESH_TOKEN &&
      GOOGLE_ADS_DEVELOPER_TOKEN &&
      GOOGLE_ADS_CUSTOMER_ID
    ) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          GOOGLE_ADS_CLIENT_ID,
          GOOGLE_ADS_CLIENT_SECRET,
          'urn:ietf:wg:oauth:2.0:oob'
        );
        oauth2Client.setCredentials({ refresh_token: GOOGLE_ADS_REFRESH_TOKEN });
        const { token } = await oauth2Client.getAccessToken();
        if (token) {
          const customerId = (GOOGLE_ADS_TEST_ACCOUNT_ID || GOOGLE_ADS_CUSTOMER_ID).replace(/-/g, '');
          const keywords = gapQueries.map((q) => (q.query || '').trim()).filter(Boolean);
          const cpcResults = await getKeywordCpcFromGoogleAds(
            token,
            GOOGLE_ADS_DEVELOPER_TOKEN,
            customerId,
            keywords
          );
          cpcResults.forEach((r) => cpcByKeyword.set(r.keyword.toLowerCase().trim(), r.avgCpc));
        }
      } catch (apiErr: any) {
        console.error('Google Ads API error in opportunity report:', apiErr);
        // Continue without CPC — report still valid
      }
    }

    // 3. Build Opportunity report rows
    const getCpc = (query: string): number | null => {
      const q = (query || '').trim().toLowerCase();
      const exact = cpcByKeyword.get(q);
      if (exact != null) return exact;
      let best: { cpc: number; len: number } | null = null;
      for (const [kw, cpc] of cpcByKeyword.entries()) {
        if (kw.length < 2) continue;
        if (q.includes(kw) || kw.includes(q)) {
          if (!best || kw.length > best.len) best = { cpc, len: kw.length };
        }
      }
      return best ? best.cpc : null;
    };

    const queries = gapQueries.map((r) => {
      const query = (r.query || '').trim();
      const demand = Number(r.impressions || 0);
      const gap = bandToGapType(r.band || '');
      const cpc = getCpc(query);
      const estimatedValue = cpc != null && demand > 0 ? demand * cpc : 0;
      return {
        query: query.length > 120 ? query.slice(0, 120) + '…' : query,
        demand,
        cpc,
        gap,
        estimatedValue,
        opportunityNote: getOpportunityNote(demand, gap),
        band: r.band,
        googleScore: r.googleScore,
        aiScore: r.aiScore,
        gapScore: r.gapScore,
      };
    });

    queries.sort((a, b) => {
      if (b.estimatedValue !== a.estimatedValue) return b.estimatedValue - a.estimatedValue;
      return b.demand - a.demand;
    });

    const totalQueries = queries.length;
    const priorityGapsCount = queries.filter((q) => q.gap === 'Neither').length;
    const withCpc = queries.filter((q) => q.cpc != null);
    const avgCpc = withCpc.length > 0
      ? withCpc.reduce((s, q) => s + (q.cpc ?? 0), 0) / withCpc.length
      : 0;
    const revenueAtRisk = queries
      .filter((q) => q.gap !== 'Both' && q.estimatedValue > 0)
      .reduce((s, q) => s + q.estimatedValue, 0);

    const generatedAt = new Date().toISOString();
    const enginesUsed = gapReport.engines_used || [];

    // 4. Save to Supabase
    const { error: upsertError } = await supabase
      .from('opportunity_blind_spots_reports')
      .upsert(
        {
          user_id: session.user.id,
          domain_id: domainId,
          domain_hostname: domainHostname,
          engines_used: enginesUsed,
          total_queries: totalQueries,
          priority_gaps_count: priorityGapsCount,
          avg_cpc: avgCpc,
          revenue_at_risk: revenueAtRisk,
          queries,
          generated_at: generatedAt,
        },
        { onConflict: 'user_id,domain_id' }
      );

    if (upsertError) {
      console.error('Failed to save opportunity report:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        domain: domainHostname,
        queries,
        summary: {
          totalQueries,
          priorityGapsCount,
          avgCpc,
          revenueAtRisk,
        },
        enginesUsed,
        generatedAt,
      },
    });
  } catch (error: any) {
    console.error('opportunity-blind-spots POST error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
