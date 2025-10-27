import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET all rankings for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
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
    const supabase = createRouteHandlerClient({ cookies })
    
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

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
