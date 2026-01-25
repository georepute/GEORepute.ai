import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user using the proper auth helper
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's keyword plans
    const { data: plans, error: dbError } = await supabase
      .from('keyword_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database error:', dbError);
      // Return empty array if table doesn't exist
      return NextResponse.json({
        success: true,
        plans: [],
        message: 'No plans found or database table needs to be created.',
      });
    }

    return NextResponse.json({
      success: true,
      plans: plans || [],
    });

  } catch (error: any) {
    console.error('Error fetching keyword plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch keyword plans' },
      { status: 500 }
    );
  }
}

