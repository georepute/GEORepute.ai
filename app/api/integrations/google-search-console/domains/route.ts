import { NextRequest, NextResponse } from 'next/server';
import { createGSCClientFromTokens, normalizeSiteUrl } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/google-search-console/domains
 * List all user's GSC domains
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all domains for the user
    const { data: domains, error } = await supabase
      .from('gsc_domains')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      domains: domains || [],
    });
  } catch (error: any) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/google-search-console/domains
 * Add a new domain and get verification token
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domainUrl } = body;

    if (!domainUrl) {
      return NextResponse.json(
        { error: 'Domain URL is required' },
        { status: 400 }
      );
    }

    // Get GSC integration tokens
    const { data: integration, error: integrationError } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'google_search_console')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Google Search Console not connected. Please connect your account first.' },
        { status: 400 }
      );
    }

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('gsc_domains')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('domain_url', domainUrl)
      .maybeSingle();

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists' },
        { status: 400 }
      );
    }

    // Create GSC client
    const client = createGSCClientFromTokens({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: new Date(integration.expires_at).getTime(),
    });

    // Normalize site URL
    const siteUrl = normalizeSiteUrl(domainUrl);

    // Request verification token for DNS method
    let verificationToken: string;
    try {
      verificationToken = await client.getVerificationToken(siteUrl, 'DNS_TXT');
    } catch (error: any) {
      console.error('Error getting verification token:', error);
      return NextResponse.json(
        { error: 'Failed to get verification token. Please check the domain format.' },
        { status: 400 }
      );
    }

    // Store domain in database
    const { data: domain, error: domainError } = await supabase
      .from('gsc_domains')
      .insert({
        user_id: session.user.id,
        integration_id: integration.id,
        domain_url: domainUrl,
        site_url: siteUrl,
        verification_method: 'DNS_TXT',
        verification_token: verificationToken,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (domainError) throw domainError;

    return NextResponse.json({
      success: true,
      domain,
      verificationToken,
      instructions: {
        recordType: 'TXT',
        recordName: '@',
        recordValue: verificationToken,
        message: 'Add this TXT record to your DNS settings to verify ownership. It may take a few minutes for DNS changes to propagate.',
      },
    });
  } catch (error: any) {
    console.error('Add domain error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add domain' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/google-search-console/domains
 * Remove a domain
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Delete domain (will cascade delete analytics)
    const { error } = await supabase
      .from('gsc_domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', session.user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Domain removed successfully',
    });
  } catch (error: any) {
    console.error('Delete domain error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete domain' },
      { status: 500 }
    );
  }
}

