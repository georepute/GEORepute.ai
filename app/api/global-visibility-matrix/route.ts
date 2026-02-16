import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

    // Get only the most recent entry per country (deduplication)
    const countryMap = new Map();
    (allData || []).forEach((record: any) => {
      if (!countryMap.has(record.country_code)) {
        countryMap.set(record.country_code, record);
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
