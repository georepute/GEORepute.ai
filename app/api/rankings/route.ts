import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

// GET all rankings for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get keyword_id filter from query params if provided
    const { searchParams } = new URL(request.url)
    const keywordId = searchParams.get('keyword_id')

    let query = supabase
      .from('ranking')
      .select(`
        *,
        keyword:keyword_id (
          id,
          keyword,
          location
        )
      `)
      .eq('user_id', session.user.id)
      .order('check_date', { ascending: false })

    if (keywordId) {
      query = query.eq('keyword_id', keywordId)
    }

    const { data: rankings, error } = await query

    if (error) throw error

    return NextResponse.json({ data: rankings || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new ranking entry
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyword_id, rank, source, url } = body

    // Validate required fields
    if (!keyword_id || rank === undefined) {
      return NextResponse.json(
        { error: 'Keyword ID and rank are required' },
        { status: 400 }
      )
    }

    // Insert ranking into ranking table
    const { data, error } = await supabase
      .from('ranking')
      .insert({
        user_id: session.user.id,
        keyword_id,
        rank,
        source: source || 'google',
        url: url || null,
        check_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Update ranking_score in keyword table
    const { error: updateError } = await supabase
      .from('keyword')
      .update({ 
        ranking_score: rank,
        updated_at: new Date().toISOString()
      })
      .eq('keyword_id', keyword_id)
      .eq('user_id', session.user.id)

    if (updateError) {
      console.error('Error updating keyword ranking_score:', updateError)
      // Don't fail the request if keyword update fails, ranking is still saved
    } else {
      console.log(`✅ Updated ranking_score for keyword_id ${keyword_id} to ${rank}`)
    }

    // Auto-trigger learning from ranking update (background, non-blocking)
    try {
      // Get keyword data for learning trigger
      const { data: keywordData } = await supabase
        .from('keyword')
        .select('keyword_text')
        .eq('keyword_id', keyword_id)
        .eq('user_id', session.user.id)
        .single()

      if (keywordData) {
        // Get predicted ranking from forecast if available
        const { data: forecastData } = await supabase
          .from('keyword_forecast')
          .select('predicted_ranking')
          .eq('user_id', session.user.id)
          .eq('keyword', keywordData.keyword_text)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const predictedRanking = forecastData?.predicted_ranking || rank + 5 // Default estimate

        // Trigger learning (non-blocking)
        const { triggerLearningFromRanking } = await import('@/lib/learning/autoTrigger')
        triggerLearningFromRanking(
          session.user.id,
          {
            keyword_id,
            keyword_text: keywordData.keyword_text,
            predictedRanking,
            actualRanking: rank,
          },
          supabase
        ).catch(err => console.error('Learning trigger error:', err))
      }
    } catch (triggerError) {
      console.warn('Could not trigger learning from ranking:', triggerError)
      // Don't fail the request
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
