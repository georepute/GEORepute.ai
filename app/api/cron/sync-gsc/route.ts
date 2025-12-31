import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDateDaysAgo } from '@/lib/integrations/google-search-console';
import { google } from 'googleapis';

/**
 * GET /api/cron/sync-gsc
 * Automated cron job to sync GSC data for all verified domains
 * Should be called by Vercel Cron or similar scheduling service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role for cron jobs (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Starting GSC sync cron job...');

    // Get all verified domains with their integrations
    const { data: domains, error: domainsError } = await supabase
      .from('gsc_domains')
      .select(`
        id,
        user_id,
        domain_url,
        site_url,
        last_synced_at,
        integration_id,
        platform_integrations!inner (
          access_token,
          refresh_token,
          expires_at,
          status
        )
      `)
      .eq('verification_status', 'verified');

    if (domainsError) {
      console.error('Error fetching domains:', domainsError);
      throw domainsError;
    }

    if (!domains || domains.length === 0) {
      console.log('No verified domains to sync');
      return NextResponse.json({
        success: true,
        message: 'No domains to sync',
        synced: 0,
        errors: 0,
      });
    }

    console.log(`Found ${domains.length} verified domains to sync`);

    let syncedCount = 0;
    let errorCount = 0;
    const errors: Array<{ domain: string; error: string }> = [];

    // Process each domain
    for (const domain of domains) {
      try {
        console.log(`Syncing domain: ${domain.domain_url}`);

        const integration = (domain as any).platform_integrations;

        // Check if integration is valid
        if (!integration || integration.status !== 'connected') {
          console.log(`Skipping ${domain.domain_url}: Integration not active`);
          continue;
        }

        // Create GSC client using googleapis directly
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          access_token: integration.access_token,
          refresh_token: integration.refresh_token,
          expiry_date: new Date(integration.expires_at).getTime(),
        });

        const searchConsole = google.searchconsole({
          version: 'v1',
          auth: oauth2Client,
        });

        // Fetch last 7 days of summary data
        console.log(`Fetching analytics for ${domain.domain_url}...`);
        const response = await searchConsole.searchanalytics.query({
          siteUrl: domain.site_url,
          requestBody: {
            startDate: getDateDaysAgo(7),
            endDate: getDateDaysAgo(0),
            dimensions: ['date'],
            rowLimit: 25000,
          },
        });

        const rows = response.data.rows || [];
        console.log(`Fetched ${rows.length} rows for ${domain.domain_url}`);

        // Store analytics data
        if (rows.length > 0) {
          const analyticsData = rows.map((row: any) => ({
            domain_id: domain.id,
            user_id: domain.user_id,
            date: row.keys?.[0],
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
            data_type: 'summary',
          }));

          const { error: insertError } = await supabase
            .from('gsc_analytics')
            .upsert(analyticsData, {
              onConflict: 'domain_id,date,data_type,query,page,country,device',
            });

          if (insertError) {
            console.error(`Error inserting analytics for ${domain.domain_url}:`, insertError);
            throw insertError;
          }
        }

        // Update last synced timestamp
        await supabase
          .from('gsc_domains')
          .update({
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', domain.id);

        syncedCount++;
        console.log(`Successfully synced ${domain.domain_url}`);
      } catch (error: any) {
        console.error(`Error syncing domain ${domain.domain_url}:`, error);
        errorCount++;
        errors.push({
          domain: domain.domain_url,
          error: error.message || 'Unknown error',
        });

        // If token is expired, update integration status
        if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been expired')) {
          await supabase
            .from('platform_integrations')
            .update({ status: 'expired' })
            .eq('id', domain.integration_id);
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      total: domains.length,
      synced: syncedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
    };

    console.log('Cron job completed:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/sync-gsc
 * Manual trigger for testing (requires authentication)
 */
export async function POST(request: NextRequest) {
  // Allow manual triggering for testing
  return GET(request);
}

