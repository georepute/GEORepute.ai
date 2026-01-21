import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { integrationId, title, content } = body;

    if (!integrationId || !title || !content) {
      return NextResponse.json(
        { error: 'integrationId, title, and content are required' },
        { status: 400 }
      );
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('id', integrationId)
      .eq('created_by_user_id', session.user.id)
      .eq('platform', 'WordPress')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'WordPress integration not found' },
        { status: 404 }
      );
    }

    // Decrypt WordPress password via edge function
    const { data: testData, error: testError } = await supabase.functions.invoke('integrations-api', {
      method: 'GET',
      body: { integrationId }
    });

    if (testError) {
      return NextResponse.json(
        { error: 'Failed to decrypt WordPress credentials' },
        { status: 500 }
      );
    }

    // Get credentials
    const siteUrl = integration.account_id;
    const username = integration.client_secret;
    
    // Call edge function to publish
    const { data: publishData, error: publishError } = await supabase.functions.invoke('wordpress-publish', {
      body: {
        integrationId,
        title,
        content,
      }
    });

    if (publishError || !publishData?.success) {
      return NextResponse.json(
        { error: publishData?.error || publishError?.message || 'Failed to publish to WordPress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publishData.url,
      postId: publishData.postId,
      message: 'Published to WordPress successfully'
    });

  } catch (error: any) {
    console.error('WordPress publish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish to WordPress' },
      { status: 500 }
    );
  }
}
