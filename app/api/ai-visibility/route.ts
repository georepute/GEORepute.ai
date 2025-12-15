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

// POST - Run brand analysis and create AI visibility metrics
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
    const { 
      projectId, 
      brandName, 
      industry = 'Technology', 
      keywords = [], 
      competitors = [], 
      websiteUrl = '',
      platforms = ['chatgpt'],
      queryLimit = 10,
      companyDescription = '',
      companyImageUrl = ''
    } = body

    // Validate required fields
    if (!brandName) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      )
    }

    // Get Supabase URL and anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    let finalProjectId = projectId

    // Create or find project if projectId not provided
    if (!finalProjectId) {
      // Check if project exists for this user and brand
      const { data: existingProject } = await supabase
        .from('brand_analysis_projects')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('brand_name', brandName)
        .maybeSingle()

      if (existingProject) {
        finalProjectId = existingProject.id
        // Update existing project with crawled data if provided
        if (companyDescription || companyImageUrl) {
          await supabase
            .from('brand_analysis_projects')
            .update({
              company_description: companyDescription || existingProject.company_description,
              company_image_url: companyImageUrl || existingProject.company_image_url,
              active_platforms: platforms,
              keywords: keywords,
              competitors: competitors,
            })
            .eq('id', finalProjectId)
        }
      } else {
        // Create new project
        const { data: newProject, error: projectError } = await supabase
          .from('brand_analysis_projects')
          .insert({
            user_id: session.user.id,
            brand_name: brandName,
            industry: industry,
            website_url: websiteUrl,
            keywords: keywords,
            competitors: competitors,
            active_platforms: platforms,
            target_keywords: keywords,
            company_description: companyDescription,
            company_image_url: companyImageUrl
          })
          .select('id')
          .single()

        if (projectError || !newProject) {
          return NextResponse.json(
            { error: `Failed to create project: ${projectError?.message}` },
            { status: 500 }
          )
        }

        finalProjectId = newProject.id
      }
    }

    // Just return the project ID - don't call the edge function here
    // The edge function will be called separately when user clicks "Run Analysis" button
    return NextResponse.json({ 
      success: true,
      projectId: finalProjectId,
      message: 'Project created/updated successfully. Click "Run Analysis" to start the analysis.'
    }, { status: 200 })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
