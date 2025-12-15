import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/google-search-console/analytics/queries
 * Get top queries for a domain
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
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sortBy') || 'clicks'; // clicks, impressions, ctr, position

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('gsc_queries')
      .select('*')
      .eq('domain_id', domainId)
      .eq('user_id', session.user.id)
      .order(sortBy, { ascending: sortBy === 'position' }) // Lower position is better
      .limit(limit);

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
      queries: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Get queries error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queries' },
      { status: 500 }
    );
  }
}

