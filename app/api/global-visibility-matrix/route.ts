import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeCountryForMerge } from '@/lib/utils/countryMerge'

// GET - Fetch stored global visibility matrix data
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domainId')

    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 })
    }

    // Fetch ALL TIME matrix data from database
    // Get the most recent calculation for each country
    const { data: allData, error } = await supabase
      .from('global_visibility_matrix')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('domain_id', domainId)
      .order('last_calculated_at', { ascending: false })

    if (error) {
      console.error('Error fetching matrix data:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Merge Israel/Palestine (il, isr, ps, pse) and get most recent per country
    const countryMap = new Map<string, any>();
    (allData || []).forEach((record: any) => {
      const normalizedCode = normalizeCountryForMerge(record.country_code || '');
      if (!normalizedCode) return;
      const existing = countryMap.get(normalizedCode);
      if (!existing) {
        countryMap.set(normalizedCode, { ...record, country_code: normalizedCode });
      } else {
        // Aggregate: sum GSC metrics, weighted avg for scores
        const imp1 = existing.gsc_impressions || 0;
        const imp2 = record.gsc_impressions || 0;
        const totalImp = imp1 + imp2;
        existing.gsc_clicks = (existing.gsc_clicks || 0) + (record.gsc_clicks || 0);
        existing.gsc_impressions = totalImp;
        existing.gsc_ctr = totalImp > 0 ? existing.gsc_clicks / totalImp : 0;
        existing.gsc_avg_position = totalImp > 0
          ? ((existing.gsc_avg_position || 0) * imp1 + (record.gsc_avg_position || 0) * imp2) / totalImp
          : existing.gsc_avg_position;
        existing.organic_score = totalImp > 0
          ? ((existing.organic_score || 0) * imp1 + (record.organic_score || 0) * imp2) / totalImp
          : existing.organic_score;
        existing.ai_visibility_score = Math.max(existing.ai_visibility_score || 0, record.ai_visibility_score || 0);
        existing.demand_score = totalImp > 0
          ? ((existing.demand_score || 0) * imp1 + (record.demand_score || 0) * imp2) / totalImp
          : existing.demand_score;
        existing.overall_visibility_score = totalImp > 0
          ? ((existing.overall_visibility_score || 0) * imp1 + (record.overall_visibility_score || 0) * imp2) / totalImp
          : existing.overall_visibility_score;
        existing.ai_mention_count = (existing.ai_mention_count || 0) + (record.ai_mention_count || 0);
        existing.ai_platforms_present = [...new Set([...(existing.ai_platforms_present || []), ...(record.ai_platforms_present || [])])];
        existing.ai_mentioned_competitors = [...new Set([...(existing.ai_mentioned_competitors || []), ...(record.ai_mentioned_competitors || [])])];
        if (record.ai_domain_found) existing.ai_domain_found = true;
        if (record.ai_best_position != null && (existing.ai_best_position == null || record.ai_best_position < existing.ai_best_position)) {
          existing.ai_best_position = record.ai_best_position;
        }
      }
    });

    const matrixData = Array.from(countryMap.values()).sort((a: any, b: any) =>
      a.country_code.localeCompare(b.country_code)
    );

    // If no data exists, return empty array
    if (!matrixData || matrixData.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: 'No data available. Click "Calculate Matrix" to generate the report.'
      })
    }

    // Calculate summary statistics
    const summary = {
      totalCountries: matrixData.length,
      strongCountries: matrixData.filter((c: any) => c.quadrant === 'strong').length,
      emergingCountries: matrixData.filter((c: any) => c.quadrant === 'emerging').length,
      decliningCountries: matrixData.filter((c: any) => c.quadrant === 'declining').length,
      absentCountries: matrixData.filter((c: any) => c.quadrant === 'absent').length,
      avgVisibilityScore: matrixData.reduce((sum: number, c: any) => sum + (c.overall_visibility_score || 0), 0) / matrixData.length,
      topOpportunities: matrixData
        .sort((a: any, b: any) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
        .slice(0, 5)
        .map((c: any) => ({
          country: c.country_code,
          opportunityScore: c.opportunity_score,
          demandScore: c.demand_score,
          presenceScore: c.overall_visibility_score
        }))
    }

    return NextResponse.json({ 
      success: true, 
      data: matrixData,
      summary
    })
  } catch (error: any) {
    console.error('Global visibility matrix API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
