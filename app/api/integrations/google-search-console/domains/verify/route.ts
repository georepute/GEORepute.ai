import { NextRequest, NextResponse } from 'next/server';
import { createGSCClientFromTokens } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/integrations/google-search-console/domains/verify
 * Verify domain ownership
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

    // Get domain from domains table
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

    // Check if domain has GSC integration
    if (!domain.gsc_integration) {
      return NextResponse.json(
        { error: 'Domain does not have GSC integration' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (domain.gsc_integration.verification_status === 'verified') {
      return NextResponse.json({
        success: true,
        message: 'Domain is already verified',
        domain,
      });
    }

    // Get GSC integration
    const { data: integration, error: integrationError } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('id', domain.gsc_integration.integration_id)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Create GSC client
    const client = createGSCClientFromTokens({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: new Date(integration.expires_at).getTime(),
    });

    try {
      // Determine which verification method to use
      const verificationMethod = domain.gsc_integration.verification_method || 'DNS_TXT';
      
      // For domain verification (DNS_TXT, DNS_CNAME), we need just the domain without protocol
      // For URL verification (META, FILE), we need the full URL
      let verificationIdentifier: string;
      
      if (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME') {
        // Use domain without protocol for INET_DOMAIN verification
        verificationIdentifier = domain.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        await client.verifySite(verificationIdentifier, verificationMethod as 'DNS_TXT' | 'DNS_CNAME');
      } else {
        // Use full URL for SITE verification (META, FILE, etc.)
        verificationIdentifier = domain.gsc_integration.site_url;
        await client.verifyUrlSite(verificationIdentifier, verificationMethod);
      }

      // Update domain GSC integration status to verified
      const updatedGscIntegration = {
        ...domain.gsc_integration,
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        last_synced_at: domain.gsc_integration.last_synced_at,
      };

      const { data: updatedDomain, error: updateError } = await supabase
        .from('domains')
        .update({
          gsc_integration: updatedGscIntegration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Add site to Search Console
      // For domain verification, use sc-domain: prefix
      // For URL verification, use the site URL directly
      const searchConsoleSiteUrl = (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME')
        ? `sc-domain:${verificationIdentifier}`
        : domain.gsc_integration.site_url;
      
      try {
        await client.addSite(searchConsoleSiteUrl);
        console.log(`Successfully added ${searchConsoleSiteUrl} to Search Console`);
      } catch (addSiteError: any) {
        // Site might already be added, that's okay
        console.log('Site add result:', addSiteError.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Domain verified successfully!',
        domain: updatedDomain,
      });
    } catch (verifyError: any) {
      console.error('Verification failed:', verifyError);

      // Update domain GSC integration status to failed
      const failedGscIntegration = {
        ...domain.gsc_integration,
        verification_status: 'failed',
        error: verifyError.message,
        failed_at: new Date().toISOString(),
      };

      await supabase
        .from('domains')
        .update({
          gsc_integration: failedGscIntegration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId);

      return NextResponse.json(
        {
          error: 'Domain verification failed. Please ensure the TXT record is correctly added to your DNS settings. It may take a few minutes for DNS changes to propagate.',
          details: verifyError.message,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Verify domain error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify domain' },
      { status: 500 }
    );
  }
}
