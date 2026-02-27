import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/integrations/google-search-console/analytics/queries
 * Get top queries for a domain
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null; // No default limit
    const sortBy = searchParams.get('sortBy') || 'clicks'; // clicks, impressions, ctr, position

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Build query to fetch all records in date range
    let query = supabase
      .from('gsc_queries')
      .select('*')
      .eq('domain_id', domainId)
      .eq('user_id', session.user.id);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Aggregate data by query
    const queryMap = new Map();
    (data || []).forEach((row: any) => {
      const queryText = row.query;
      if (queryMap.has(queryText)) {
        const existing = queryMap.get(queryText);
        existing.clicks += row.clicks || 0;
        existing.impressions += row.impressions || 0;
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
        existing.position = (existing.position + (row.position || 0)) / 2;
      } else {
        queryMap.set(queryText, {
          id: row.id,
          query: queryText,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        });
      }
    });

    // Convert to array and sort
    let aggregatedQueries = Array.from(queryMap.values());
    
    // Sort based on sortBy parameter
    aggregatedQueries.sort((a, b) => {
      if (sortBy === 'position') {
        return a.position - b.position; // Lower position is better
      }
      return b[sortBy] - a[sortBy]; // Descending for other metrics
    });

    // Apply limit only if specified
    if (limit) {
      aggregatedQueries = aggregatedQueries.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      queries: aggregatedQueries,
      count: aggregatedQueries.length,
    });
  } catch (error: any) {
    console.error('Get queries error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queries' },
      { status: 500 }
    );
  }
}

