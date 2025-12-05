import { NextRequest, NextResponse } from 'next/server';
import { createGSCClientFromTokens, getDateDaysAgo } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/integrations/google-search-console/analytics/sync
 * Fetch analytics from GSC and store in database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      domainId, 
      startDate, 
      endDate, 
      dimensions = ['date'],
      rowLimit = 25000 
    } = body;

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get domain
    const { data: domain, error: domainError } = await supabase
      .from('gsc_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', session.user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    if (domain.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain is not verified. Please verify the domain first.' },
        { status: 400 }
      );
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('id', domain.integration_id)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Create GSC client
    const client = createGSCClientFromTokens({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: new Date(integration.expires_at).getTime(),
    });

    // Fetch analytics data
    const analyticsStartDate = startDate || getDateDaysAgo(30);
    const analyticsEndDate = endDate || getDateDaysAgo(0);

    const rows = await client.queryAnalytics(domain.site_url, {
      startDate: analyticsStartDate,
      endDate: analyticsEndDate,
      dimensions,
      rowLimit,
    });

    // Process and store analytics data
    let storedCount = 0;
    
    if (dimensions.length === 1 && dimensions[0] === 'date') {
      // Store summary data
      const analyticsData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: row.keys?.[0] || null,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        data_type: 'summary',
      }));

      if (analyticsData.length > 0) {
        const { error: insertError } = await supabase
          .from('gsc_analytics')
          .upsert(analyticsData, {
            onConflict: 'domain_id,date,data_type,query,page,country,device',
          });

        if (insertError) throw insertError;
        storedCount = analyticsData.length;
      }
    } else if (dimensions.includes('query')) {
      // Store query data in separate table
      const queryData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: row.keys?.[0] || analyticsEndDate,
        query: row.keys?.[dimensions.indexOf('query')] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));

      if (queryData.length > 0) {
        const { error: insertError } = await supabase
          .from('gsc_queries')
          .upsert(queryData, {
            onConflict: 'domain_id,date,query',
          });

        if (insertError) throw insertError;
        storedCount = queryData.length;
      }
    } else if (dimensions.includes('page')) {
      // Store page data in separate table
      const pageData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: row.keys?.[0] || analyticsEndDate,
        page: row.keys?.[dimensions.indexOf('page')] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));

      if (pageData.length > 0) {
        const { error: insertError } = await supabase
          .from('gsc_pages')
          .upsert(pageData, {
            onConflict: 'domain_id,date,page',
          });

        if (insertError) throw insertError;
        storedCount = pageData.length;
      }
    }

    // Update last synced time
    await supabase
      .from('gsc_domains')
      .update({ 
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId);

    return NextResponse.json({
      success: true,
      message: `Synced ${storedCount} data points successfully`,
      data: {
        count: rows.length,
        stored: storedCount,
        startDate: analyticsStartDate,
        endDate: analyticsEndDate,
      },
    });
  } catch (error: any) {
    console.error('Sync analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync analytics' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/google-search-console/analytics/sync
 * Retrieve stored analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dataType = searchParams.get('dataType') || 'summary';

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('gsc_analytics')
      .select('*')
      .eq('domain_id', domainId)
      .eq('user_id', session.user.id)
      .eq('data_type', dataType)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      analytics: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

