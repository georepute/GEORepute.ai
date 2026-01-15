import { NextRequest, NextResponse } from 'next/server';
import { getDateDaysAgo, getSearchConsoleSiteUrl } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

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
      .from('domains')
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

    if (!domain.gsc_integration) {
      return NextResponse.json(
        { error: 'Domain does not have GSC integration enabled' },
        { status: 400 }
      );
    }

    const gscData = domain.gsc_integration;

    if (gscData.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain is not verified. Please verify the domain first.' },
        { status: 400 }
      );
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('id', gscData.integration_id)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Create GSC client using googleapis directly
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: new Date(integration.expires_at).getTime(),
    });

    const searchConsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    });

    // Fetch analytics data
    const analyticsStartDate = startDate || getDateDaysAgo(30);
    const analyticsEndDate = endDate || getDateDaysAgo(0);

    // Get the correct Search Console site URL format based on verification method
    const verificationMethod = gscData.verification_method || 'DNS_TXT';
    const searchConsoleSiteUrl = getSearchConsoleSiteUrl(gscData.domain_url, verificationMethod);

    console.log(`Querying analytics for ${searchConsoleSiteUrl} (verification method: ${verificationMethod})`);

    // Validate dimensions - searchAppearance cannot be combined with other dimensions
    if (dimensions.includes('searchAppearance') && dimensions.length > 1) {
      return NextResponse.json(
        { error: 'searchAppearance dimension cannot be combined with other dimensions. Query it separately.' },
        { status: 400 }
      );
    }

    const response = await searchConsole.searchanalytics.query({
      siteUrl: searchConsoleSiteUrl,
      requestBody: {
        startDate: analyticsStartDate,
        endDate: analyticsEndDate,
        dimensions,
        rowLimit,
      },
    });

    const rows = response.data.rows || [];

    // Process and store analytics data
    let storedCount = 0;
    
    if (dimensions.length === 1 && dimensions[0] === 'date') {
      // Store summary data in gsc_analytics table
      const analyticsData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: row.keys?.[0] || null,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        data_type: 'summary',
        query: null,
        page: null,
        country: null,
        device: null,
      }));

      if (analyticsData.length > 0) {
        // Delete existing summary data for this date range to avoid conflicts
        await supabase
          .from('gsc_analytics')
          .delete()
          .eq('domain_id', domainId)
          .eq('data_type', 'summary')
          .gte('date', analyticsStartDate)
          .lte('date', analyticsEndDate);

        // Insert new data
        const { error: insertError } = await supabase
          .from('gsc_analytics')
          .insert(analyticsData);

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
        // Delete existing query data for this date range
        await supabase
          .from('gsc_queries')
          .delete()
          .eq('domain_id', domainId)
          .gte('date', analyticsStartDate)
          .lte('date', analyticsEndDate);

        // Insert new data
        const { error: insertError } = await supabase
          .from('gsc_queries')
          .insert(queryData);

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
        // Delete existing page data for this date range
        await supabase
          .from('gsc_pages')
          .delete()
          .eq('domain_id', domainId)
          .gte('date', analyticsStartDate)
          .lte('date', analyticsEndDate);

        // Insert new data
        const { error: insertError } = await supabase
          .from('gsc_pages')
          .insert(pageData);

        if (insertError) throw insertError;
        storedCount = pageData.length;
      }
    } else if (dimensions.includes('country')) {
      // Store country data in gsc_analytics table
      const countryData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: row.keys?.[0] || analyticsEndDate,
        country: row.keys?.[dimensions.indexOf('country')] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        data_type: 'country',
        query: null,
        page: null,
        device: null,
        search_appearance: null,
      }));

      if (countryData.length > 0) {
        // Delete existing country data for this date range
        await supabase
          .from('gsc_analytics')
          .delete()
          .eq('domain_id', domainId)
          .eq('data_type', 'country')
          .gte('date', analyticsStartDate)
          .lte('date', analyticsEndDate);

        // Insert new data
        const { error: insertError } = await supabase
          .from('gsc_analytics')
          .insert(countryData);

        if (insertError) throw insertError;
        storedCount = countryData.length;
      }
    } else if (dimensions.includes('device')) {
      // Store device data in gsc_analytics table
      const deviceData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: row.keys?.[0] || analyticsEndDate,
        device: row.keys?.[dimensions.indexOf('device')] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        data_type: 'device',
        query: null,
        page: null,
        country: null,
        search_appearance: null,
      }));

      if (deviceData.length > 0) {
        // Delete existing device data for this date range
        await supabase
          .from('gsc_analytics')
          .delete()
          .eq('domain_id', domainId)
          .eq('data_type', 'device')
          .gte('date', analyticsStartDate)
          .lte('date', analyticsEndDate);

        // Insert new data
        const { error: insertError } = await supabase
          .from('gsc_analytics')
          .insert(deviceData);

        if (insertError) throw insertError;
        storedCount = deviceData.length;
      }
    } else if (dimensions.includes('searchAppearance')) {
      // Store search appearance data in gsc_analytics table
      // Note: searchAppearance must be queried alone (not combined with other dimensions)
      const searchAppearanceData = rows.map((row) => ({
        domain_id: domainId,
        user_id: session.user.id,
        date: analyticsEndDate, // Use endDate since we can't group by date with searchAppearance
        search_appearance: row.keys?.[0] || '', // First key is searchAppearance when queried alone
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
        data_type: 'search_appearance',
        query: null,
        page: null,
        country: null,
        device: null,
      }));

      if (searchAppearanceData.length > 0) {
        // Delete existing search appearance data for this date range
        await supabase
          .from('gsc_analytics')
          .delete()
          .eq('domain_id', domainId)
          .eq('data_type', 'search_appearance')
          .gte('date', analyticsStartDate)
          .lte('date', analyticsEndDate);

        // Insert new data
        const { error: insertError } = await supabase
          .from('gsc_analytics')
          .insert(searchAppearanceData);

        if (insertError) throw insertError;
        storedCount = searchAppearanceData.length;
      }
    }

    // Update last synced time in GSC integration data
    const updatedGscData = {
      ...gscData,
      last_synced_at: new Date().toISOString(),
    };

    await supabase
      .from('domains')
      .update({ 
        gsc_integration: updatedGscData,
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
      .order('date', { ascending: true });

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

