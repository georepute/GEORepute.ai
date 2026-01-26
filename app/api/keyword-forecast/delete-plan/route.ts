import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

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

    // Delete the keyword plan (RLS policy will ensure user can only delete organization plans)
    const { error: deleteError } = await supabase
      .from('keyword_plans')
      .delete()
      .eq('id', planId);

    if (deleteError) {
      console.error('Error deleting plan:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete keyword plan or you do not have access to it' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Keyword plan deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in delete-plan route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

