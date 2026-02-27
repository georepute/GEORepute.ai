import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getProgress, buildProgressKey } from '@/lib/global-visibility-matrix/progress';

/**
 * GET /api/global-visibility-matrix/progress?domainId=xxx
 * Returns current calculation progress for the authenticated user's domain.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json(
        { error: 'domainId is required' },
        { status: 400 }
      );
    }

    const key = buildProgressKey(session.user.id, domainId);
    const progress = getProgress(key);

    if (!progress) {
      return NextResponse.json({
        success: true,
        progress: null,
        message: 'No active calculation',
      });
    }

    const percentage =
      progress.total > 0
        ? Math.round((progress.processed / progress.total) * 100)
        : progress.phase === 'complete' || progress.phase === 'error'
          ? 100
          : 0;

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        percentage,
      },
    });
  } catch (error: unknown) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
