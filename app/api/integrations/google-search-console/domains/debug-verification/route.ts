import { NextRequest, NextResponse } from 'next/server';
import { createGSCClientFromTokens } from '@/lib/integrations/google-search-console';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/integrations/google-search-console/domains/debug-verification
 * Debug verification token format and requirements
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

    // Get domain
    const { data: domain, error: domainError } = await supabase
      .from('gsc_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', session.user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('id', domain.integration_id)
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
      expiry_date: new Date(integration.expires_at).getTime(),
    });

    const debug: any = {
      domain_url: domain.domain_url,
      site_url: domain.site_url,
      verification_method: domain.verification_method,
      verification_token: domain.verification_token,
      steps: [],
    };

    // Step 1: Try to get a fresh token to see what format Google expects
    try {
      debug.steps.push('Step 1: Requesting fresh token from Google...');
      const freshToken = await client.getVerificationToken(domain.site_url, domain.verification_method || 'DNS_TXT');
      debug.fresh_token = freshToken;
      debug.token_matches = freshToken === domain.verification_token;
      debug.steps.push(`✅ Fresh token received: ${freshToken.substring(0, 50)}...`);
    } catch (error: any) {
      debug.steps.push(`❌ Failed to get fresh token: ${error.message}`);
      debug.token_error = error.message;
    }

    // Step 2: Analyze token format
    debug.steps.push('Step 2: Analyzing token format...');
    const token = domain.verification_token || '';
    debug.token_analysis = {
      length: token.length,
      has_prefix: token.startsWith('google-site-verification='),
      raw_value: token,
      expected_dns_format: token.startsWith('google-site-verification=') 
        ? token 
        : `google-site-verification=${token}`,
    };

    // Step 3: Check what Google is expecting
    debug.steps.push('Step 3: Checking verification requirements...');
    debug.requirements = {
      site_url_format: domain.site_url,
      is_url_prefix: domain.site_url.startsWith('http'),
      is_domain_property: domain.site_url.startsWith('sc-domain:'),
      dns_record_location: domain.site_url.startsWith('http')
        ? domain.site_url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        : domain.domain_url,
    };

    // Step 4: Try verification with detailed error
    debug.steps.push('Step 4: Attempting verification...');
    try {
      const verifyResult = await client.verifySite(domain.site_url, domain.verification_method || 'DNS_TXT');
      debug.verification_result = verifyResult;
      debug.steps.push('✅ Verification successful!');
    } catch (error: any) {
      debug.verification_error = {
        message: error.message,
        code: error.code,
        details: error?.response?.data || error,
      };
      debug.steps.push(`❌ Verification failed: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      debug,
      recommendations: generateRecommendations(debug),
    });
  } catch (error: any) {
    console.error('Debug verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to debug verification' },
      { status: 500 }
    );
  }
}

function generateRecommendations(debug: any): string[] {
  const recommendations: string[] = [];

  // Check token format
  if (debug.token_analysis?.has_prefix) {
    recommendations.push('✅ Token already has google-site-verification= prefix');
    recommendations.push(`📝 Add TXT record with value: ${debug.token_analysis.raw_value}`);
  } else if (debug.token_analysis?.raw_value) {
    recommendations.push('⚠️ Token is missing the google-site-verification= prefix');
    recommendations.push(`📝 Try adding TXT record with: google-site-verification=${debug.token_analysis.raw_value}`);
    recommendations.push(`📝 OR just: ${debug.token_analysis.raw_value}`);
  }

  // Check site URL format
  if (debug.requirements?.is_url_prefix) {
    recommendations.push(`🌐 This is a URL-prefix property: ${debug.site_url}`);
    recommendations.push(`📍 Add the TXT record to domain: ${debug.requirements.dns_record_location}`);
    recommendations.push('⚠️ URL-prefix properties require the record on the exact domain (with or without www)');
  } else if (debug.requirements?.is_domain_property) {
    recommendations.push(`🌐 This is a domain property: ${debug.site_url}`);
    recommendations.push('📍 Add the TXT record to the root domain');
  }

  // Check verification error
  if (debug.verification_error) {
    recommendations.push(`❌ Verification error: ${debug.verification_error.message}`);
    
    if (debug.verification_error.message.includes('not be found')) {
      recommendations.push('💡 The TXT record is not visible to Google yet');
      recommendations.push('⏱️ Wait longer for DNS propagation (up to 48 hours)');
      recommendations.push('🔍 Use dnschecker.org to verify the record is propagated globally');
    }
  }

  // Token mismatch
  if (debug.token_matches === false) {
    recommendations.push('⚠️ The stored token differs from what Google is currently providing');
    recommendations.push('💡 Consider deleting and re-adding the domain to get a fresh token');
  }

  return recommendations;
}

