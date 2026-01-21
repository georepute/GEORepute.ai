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
      .eq('platform', 'ShopifyFullyManaged')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Shopify integration not found' },
        { status: 404 }
      );
    }

    // Get access token from integration
    const accessToken = integration.client_id;
    const shop = integration.account_id;

    if (!accessToken || !shop) {
      return NextResponse.json(
        { error: 'Shopify credentials not found' },
        { status: 400 }
      );
    }

    // Convert content to HTML if needed (Shopify accepts HTML)
    const htmlContent = content.replace(/\n/g, '<br>');

    // Publish to Shopify Blog API
    // First, get or create a blog
    const blogResponse = await fetch(`https://${shop}/admin/api/2024-01/blogs.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!blogResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to access Shopify blogs' },
        { status: 500 }
      );
    }

    const blogData = await blogResponse.json();
    const blogId = blogData.blogs?.[0]?.id;

    if (!blogId) {
      return NextResponse.json(
        { error: 'No blog found in Shopify store. Please create a blog first.' },
        { status: 404 }
      );
    }

    // Create blog article
    const articleResponse = await fetch(`https://${shop}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: {
          title: title,
          body_html: htmlContent,
          published: true,
        },
      }),
    });

    if (!articleResponse.ok) {
      const errorData = await articleResponse.json();
      return NextResponse.json(
        { error: errorData.errors || 'Failed to publish to Shopify' },
        { status: 500 }
      );
    }

    const articleData = await articleResponse.json();
    const articleUrl = `https://${shop}/blogs/${blogData.blogs[0].handle}/${articleData.article.handle}`;

    return NextResponse.json({
      success: true,
      url: articleUrl,
      articleId: articleData.article.id,
      message: 'Published to Shopify successfully'
    });

  } catch (error: any) {
    console.error('Shopify publish error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish to Shopify' },
      { status: 500 }
    );
  }
}
