import { NextRequest, NextResponse } from 'next/server';
import { createGSCClientFromTokens, normalizeSiteUrl } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/google-search-console/domains
 * List all domains from domains table
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    let domains;
    let error;

    if (orgError) {
      // If no organization, get domains by user_id
      const result = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      domains = result.data;
      error = result.error;
    } else {
      // Get all domains for the organization
      const result = await supabase
        .from('domains')
        .select('*')
        .eq('organization_id', orgUser.organization_id)
        .order('created_at', { ascending: false });
      
      domains = result.data;
      error = result.error;
    }

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
 * Add an existing domain to GSC and get verification token
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domainId } = body;

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get the domain from domains table
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Check if domain already has GSC integration
    if (domain.gsc_integration) {
      return NextResponse.json(
        { error: 'Domain already has GSC integration' },
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

    // Create GSC client
    const client = createGSCClientFromTokens({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: new Date(integration.expires_at).getTime(),
    });

    // Clean domain name (remove protocol and trailing slashes)
    const domainUrl = domain.domain;
    const cleanDomain = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // For Search Console, we'll use domain properties (sc-domain:) which require INET_DOMAIN verification
    // This means we use the domain name without protocol for verification
    const siteUrl = normalizeSiteUrl(domainUrl); // For Search Console site URL (with https://)
    const domainForVerification = cleanDomain; // For verification API (without protocol)

    // Request verification token for DNS method
    // We'll use domain verification (INET_DOMAIN type) which supports DNS_TXT and DNS_CNAME
    let verificationToken: string;
    let verificationMethod: 'DNS_TXT' | 'DNS_CNAME' | 'META' = 'DNS_TXT';
    
    try {
      // Use getVerificationToken for domain verification (INET_DOMAIN)
      // This requires just the domain name without protocol
      verificationToken = await client.getVerificationToken(domainForVerification, 'DNS_TXT');
    } catch (error: any) {
      console.error('Error getting DNS_TXT verification token:', error);
      console.error('Error details:', JSON.stringify(error?.response?.data || error?.message, null, 2));
      
      // Try DNS_CNAME as fallback
      try {
        console.log('Trying DNS_CNAME verification as fallback...');
        verificationToken = await client.getVerificationToken(domainForVerification, 'DNS_CNAME');
        verificationMethod = 'DNS_CNAME';
      } catch (cnameError: any) {
        console.error('DNS_CNAME verification also failed:', cnameError);
        
        // Try META (meta tag) verification as last resort (for URL-prefix properties)
        try {
          console.log('Trying META (meta tag) verification for URL-prefix property...');
          verificationToken = await client.getUrlVerificationToken(siteUrl, 'META');
          verificationMethod = 'META';
        } catch (metaError: any) {
          console.error('META verification also failed:', metaError);
          
          const errorMessage = error?.response?.data?.error?.message || 
                             error?.message || 
                             'Failed to get verification token. Please check the domain format.';
          return NextResponse.json(
            { 
              error: errorMessage,
              details: error?.response?.data || error?.message || 'Unknown error',
              siteUrl: siteUrl,
              domainUrl: domainUrl,
              cleanDomain: domainForVerification,
              suggestion: 'Make sure the domain is accessible and properly formatted (e.g., example.com without protocol for domain verification)'
            },
            { status: 400 }
          );
        }
      }
    }

    // Update domain with GSC integration data
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({
        user_id: session.user.id,
        gsc_integration: {
          integration_id: integration.id,
          domain_url: domainUrl,
          site_url: siteUrl,
          verification_method: verificationMethod,
          verification_token: verificationToken,
          verification_status: 'pending',
          permission_level: 'siteOwner',
          last_synced_at: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Prepare response based on verification method
    let instructions: any;
    
    if (verificationMethod === 'DNS_TXT') {
      instructions = {
        recordType: 'TXT',
        recordName: '@',
        recordValue: verificationToken,
        message: 'Add this TXT record to your DNS settings to verify ownership. It may take a few minutes for DNS changes to propagate.',
      };
    } else if (verificationMethod === 'DNS_CNAME') {
      instructions = {
        recordType: 'CNAME',
        recordName: 'Provided by Google',
        recordValue: verificationToken,
        message: 'Add this CNAME record to your DNS settings to verify ownership. It may take a few minutes for DNS changes to propagate.',
      };
    } else {
      // META
      instructions = {
        method: 'META',
        tag: `<meta name="google-site-verification" content="${verificationToken}" />`,
        message: 'Add this meta tag to the <head> section of your homepage to verify ownership.',
      };
    }

    return NextResponse.json({
      success: true,
      domain: updatedDomain,
      verificationToken,
      verificationMethod,
      instructions,
    });
  } catch (error: any) {
    console.error('Add domain to GSC error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add domain to GSC' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/google-search-console/domains
 * Remove GSC integration from a domain
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

    // Remove GSC integration from domain
    const { error } = await supabase
      .from('domains')
      .update({
        gsc_integration: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'GSC integration removed successfully',
    });
  } catch (error: any) {
    console.error('Delete GSC integration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove GSC integration' },
      { status: 500 }
    );
  }
}
