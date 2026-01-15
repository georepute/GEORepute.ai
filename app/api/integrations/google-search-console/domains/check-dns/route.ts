import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Resolver } from 'dns/promises';

/**
 * POST /api/integrations/google-search-console/domains/check-dns
 * Check if DNS TXT record is properly configured
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

    // Extract domain name
    let domainName = domain.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');

    // Check DNS TXT records
    const resolver = new Resolver();
    let txtRecords: string[][] = [];
    let dnsError: string | null = null;

    try {
      txtRecords = await resolver.resolveTxt(domainName);
    } catch (error: any) {
      dnsError = error.code || error.message;
      console.error('DNS resolution error:', error);
    }

    // Flatten TXT records and look for the verification token
    const allRecords = txtRecords.map(record => record.join('')).flat();
    const tokenFound = allRecords.some(record => 
      record.includes(domain.gsc_integration.verification_token || '')
    );

    // Also check with 'www' prefix if not found
    let wwwRecords: string[][] = [];
    let wwwTokenFound = false;
    if (!tokenFound && !domainName.startsWith('www.')) {
      try {
        wwwRecords = await resolver.resolveTxt(`www.${domainName}`);
        const allWwwRecords = wwwRecords.map(record => record.join('')).flat();
        wwwTokenFound = allWwwRecords.some(record => 
          record.includes(domain.gsc_integration.verification_token || '')
        );
      } catch (error) {
        // www subdomain doesn't exist, that's ok
      }
    }

    return NextResponse.json({
      success: true,
      domain: domainName,
      verificationToken: domain.gsc_integration.verification_token,
      tokenFound: tokenFound || wwwTokenFound,
      foundIn: tokenFound ? 'root' : wwwTokenFound ? 'www' : null,
      allTxtRecords: allRecords,
      wwwTxtRecords: wwwRecords.length > 0 ? wwwRecords.map(r => r.join('')).flat() : [],
      dnsError,
      siteUrl: domain.gsc_integration.site_url,
      verificationMethod: domain.gsc_integration.verification_method,
      advice: getAdvice(tokenFound || wwwTokenFound, dnsError, domain),
    });
  } catch (error: any) {
    console.error('Check DNS error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check DNS' },
      { status: 500 }
    );
  }
}

function getAdvice(tokenFound: boolean, dnsError: string | null, domain: any): string[] {
  const advice: string[] = [];

  if (dnsError) {
    advice.push(`DNS Error: ${dnsError}. Your domain might not have any TXT records set up yet.`);
  }

  if (!tokenFound) {
    advice.push('❌ Verification token NOT FOUND in DNS records.');
    advice.push('📝 Make sure you added a TXT record with the exact token value.');
    advice.push(`🎯 Record Name: Use "@" or leave empty (or try "${domain.domain}")`);
    advice.push('⏱️ DNS propagation can take 5 minutes to 48 hours. Current wait time may not be enough.');
    advice.push('🔄 Try using a DNS propagation checker: https://dnschecker.org');
    
    if (domain.gsc_integration.verification_method === 'DNS_TXT') {
      advice.push(`💡 Alternative: Try using META tag verification instead by re-adding the domain.`);
    }
  } else {
    advice.push('✅ Verification token FOUND in your DNS records!');
    advice.push('🎉 Google should be able to verify your domain now.');
    advice.push('⚠️ If verification still fails, wait a few more minutes and try again.');
    advice.push(`📍 Site URL format being verified: ${domain.gsc_integration.site_url}`);
  }

  return advice;
}
