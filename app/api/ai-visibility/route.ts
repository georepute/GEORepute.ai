import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET all AI visibility metrics for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: metrics, error } = await supabase
      .from('ai_visibility')
      .select('*')
      .eq('user_id', session.user.id)
      .order('check_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: metrics || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new AI visibility metric
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
    const { query, ai_engine, rank, visibility_score, response_snippet } = body

    // Validate required fields
    if (!query || !ai_engine) {
      return NextResponse.json(
        { error: 'Query and AI engine are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ai_visibility')
      .insert({
        user_id: session.user.id,
        query,
        ai_engine,
        rank: rank || null,
        visibility_score: visibility_score || 0,
        response_snippet: response_snippet || null,
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
