import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/integrations/google-search-console/analytics/summary
 * Get summary statistics for a domain
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

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get summary analytics
    let query = supabase
      .from('gsc_analytics')
      .select('*')
      .eq('domain_id', domainId)
      .eq('user_id', session.user.id)
      .eq('data_type', 'summary')
      .order('date', { ascending: true });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate totals and averages (matching GSC calculation method)
    const totalClicks = data?.reduce((sum, item) => sum + (item.clicks || 0), 0) || 0;
    const totalImpressions = data?.reduce((sum, item) => sum + (item.impressions || 0), 0) || 0;
    
    // Average CTR = total clicks / total impressions (NOT average of daily CTRs)
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    
    // Average Position = weighted average by impressions (NOT simple average of daily positions)
    const weightedPositionSum = data?.reduce((sum, item) => {
      return sum + ((item.position || 0) * (item.impressions || 0));
    }, 0) || 0;
    const avgPosition = totalImpressions > 0 ? weightedPositionSum / totalImpressions : 0;

    // Calculate trends (compare first half to second half)
    const midpoint = Math.floor((data?.length || 0) / 2);
    const firstHalf = data?.slice(0, midpoint) || [];
    const secondHalf = data?.slice(midpoint) || [];

    const firstHalfClicks = firstHalf.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const secondHalfClicks = secondHalf.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const clicksTrend = firstHalfClicks > 0 
      ? ((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100 
      : 0;

    const firstHalfImpressions = firstHalf.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const secondHalfImpressions = secondHalf.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const impressionsTrend = firstHalfImpressions > 0 
      ? ((secondHalfImpressions - firstHalfImpressions) / firstHalfImpressions) * 100 
      : 0;

    return NextResponse.json({  
      success: true,
      summary: {
        totalClicks,
        totalImpressions,
        avgCTR: parseFloat((avgCTR * 100).toFixed(2)), // Convert to percentage
        avgPosition: parseFloat(avgPosition.toFixed(1)),
        trends: {
          clicks: parseFloat(clicksTrend.toFixed(1)),
          impressions: parseFloat(impressionsTrend.toFixed(1)),
        },
      },
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

