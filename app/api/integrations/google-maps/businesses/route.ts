import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET - Fetch user's Google Maps businesses (unique places)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all unique businesses for the user
    // Group by place_id to get only unique businesses
    const { data, error } = await supabase
      .from('google_maps_reviews')
      .select('id, place_id, place_name, place_address, place_rating, place_reviews_total, fetched_at')
      .eq('user_id', user.id)
      .order('fetched_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching businesses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    // Filter unique businesses by place_id (keep the most recent one)
    const uniqueBusinesses = data?.reduce((acc: any[], current) => {
      const existingIndex = acc.findIndex(item => item.place_id === current.place_id);
      if (existingIndex === -1) {
        acc.push(current);
      }
      return acc;
    }, []) || [];

    return NextResponse.json({
      success: true,
      businesses: uniqueBusinesses,
    });
  } catch (error: any) {
    console.error('❌ Error in GET handler:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch businesses',
      },
      { status: 500 }
    );
  }
}

