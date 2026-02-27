import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

// GET all keywords for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch keywords
    const { data: keywords, error: keywordsError } = await supabase
      .from('keyword')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (keywordsError) throw keywordsError

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Try to fetch latest rankings for each keyword (if ranking table exists)
    let rankingMap = new Map()
    
    try {
      const keywordIds = keywords.map(k => k.keyword_id)
      
      if (keywordIds.length > 0) {
        const { data: rankings, error: rankingsError } = await supabase
          .from('ranking')
          .select('keyword_id, rank, check_date')
          .eq('user_id', session.user.id)
          .in('keyword_id', keywordIds)
          .order('check_date', { ascending: false })

        if (rankingsError) {
          // Table doesn't exist or not accessible - continue without rankings
          console.warn('Ranking table not available (may not exist yet):', rankingsError.message)
        } else if (rankings) {
          // Create a map of keyword_id to latest ranking
          rankings.forEach((ranking: any) => {
            if (!rankingMap.has(ranking.keyword_id)) {
              rankingMap.set(ranking.keyword_id, ranking.rank)
            }
          })
        }
      }
    } catch (error) {
      // Ranking table might not exist - that's okay, continue with keywords only
      console.warn('Could not fetch rankings (table may not exist):', error)
    }

    // Merge ranking data with keywords (use existing ranking_score from keyword table if no ranking found)
    const keywordsWithRankings = keywords.map((keyword: any) => ({
      ...keyword,
      ranking_score: rankingMap.get(keyword.keyword_id) || keyword.ranking_score || null,
    }))

    return NextResponse.json({ data: keywordsWithRankings || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new keyword
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
    const { keyword_text, search_volume, difficulty, ranking_score } = body

    // Validate required fields
    if (!keyword_text) {
      return NextResponse.json({ error: 'Keyword text is required' }, { status: 400 })
    }

    // Check if keyword already exists
    const { data: existing } = await supabase
      .from('keyword')
      .select('keyword_id')
      .eq('user_id', session.user.id)
      .eq('keyword_text', keyword_text)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Keyword already tracked' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('keyword')
      .insert({
        user_id: session.user.id,
        keyword_text,
        search_volume: search_volume || 0,
        difficulty: difficulty || 0,
        ranking_score: ranking_score || null,
        // created_at and updated_at have defaults
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

