import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user using the proper auth helper
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization ID
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (orgError || !orgUser) {
      console.error('Organization error:', orgError);
      // Return empty array if user has no organization
      return NextResponse.json({
        success: true,
        plans: [],
        message: 'No active organization found.',
      });
    }

    // Fetch organization's keyword plans (all plans in the organization)
    const { data: plans, error: dbError } = await supabase
      .from('keyword_plans')
      .select('*')
      .eq('organization_id', orgUser.organization_id)
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

