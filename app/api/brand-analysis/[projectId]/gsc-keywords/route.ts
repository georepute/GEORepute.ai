/**
 * GSC Keywords API for Brand Analysis Projects
 * Fetches GSC keywords for a specific project
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Fetch GSC keywords for a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('brand_analysis_projects')
      .select('id, user_id, gsc_enabled, last_gsc_sync')
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if GSC is enabled for this project
    if (!project.gsc_enabled) {
      return NextResponse.json({
        success: true,
        keywords: [],
        count: 0,
        message: 'GSC not enabled for this project',
      });
    }

    // Fetch GSC keywords - sorted by impressions DESC
    const { data: keywords, error: keywordsError } = await supabase
      .from('gsc_keywords')
      .select('*')
      .eq('project_id', params.projectId)
      .order('impressions', { ascending: false })
      .order('date', { ascending: false });

    if (keywordsError) {
      throw keywordsError;
    }

    // Get unique keywords (latest date for each keyword)
    const uniqueKeywords = keywords.reduce((acc: any[], curr) => {
      const existing = acc.find(k => k.keyword === curr.keyword);
      if (!existing) {
        acc.push(curr);
      }
      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      keywords: uniqueKeywords,
      count: uniqueKeywords.length,
      lastSync: project.last_gsc_sync,
    });
  } catch (error: any) {
    console.error('Error fetching GSC keywords:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

