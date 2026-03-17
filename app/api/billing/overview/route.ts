import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const orgId = profile.organization_id;

    const [orgResult, subResult, modulesResult, reportsResult, monitoringResult, plansResult, allModulesResult, reportTypesResult, discountTiersResult] = await Promise.all([
      supabaseAdmin.from('organizations').select('id, name, stripe_customer_id, current_plan_id, seats, seats_used').eq('id', orgId).single(),
      supabaseAdmin.from('subscriptions').select('*, plan:subscription_plans(*)').eq('organization_id', orgId).in('status', ['active', 'past_due', 'trialing']).order('created_at', { ascending: false }).limit(1).single(),
      supabaseAdmin.from('subscription_modules').select('*, module:modules(*)').eq('status', 'active'),
      supabaseAdmin.from('report_purchases').select('*, report_type:intelligence_report_types(*)').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabaseAdmin.from('report_monitoring_subscriptions').select('*, report_type:intelligence_report_types(*)').eq('organization_id', orgId).in('status', ['active', 'past_due']).order('created_at', { ascending: false }),
      supabaseAdmin.from('subscription_plans').select('*').eq('is_active', true).order('monthly_price_cents', { ascending: true }),
      supabaseAdmin.from('modules').select('*').eq('is_active', true),
      supabaseAdmin.from('intelligence_report_types').select('*').eq('is_active', true),
      supabaseAdmin.from('report_discount_tiers').select('*').order('min_reports', { ascending: true }),
    ]);

    // Filter subscription modules to only those on the active subscription
    const activeModules = subResult.data
      ? (modulesResult.data || []).filter((sm: any) => sm.subscription_id === subResult.data.id)
      : [];

    // Count domains registered for this org
    const { count: domainsUsed } = await supabaseAdmin
      .from('domains')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    const subscription = subResult.data;
    const plan = subscription?.plan || null;

    const commitmentEnd = subscription?.commitment_end_date
      ? new Date(subscription.commitment_end_date)
      : null;
    const isWithinCommitment = commitmentEnd ? commitmentEnd > new Date() : false;

    // Deduplicate monitoring by report_type_id — keep the newest record per type.
    // Guards against duplicate rows that may exist before the unique constraint migration runs.
    const seenMonitoringTypeIds = new Set<string>();
    const deduplicatedMonitoring = (monitoringResult.data || []).filter((rm: any) => {
      if (seenMonitoringTypeIds.has(rm.report_type_id)) return false;
      seenMonitoringTypeIds.add(rm.report_type_id);
      return true;
    });

    return NextResponse.json({
      success: true,
      organization: orgResult.data,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        stripe_subscription_id: subscription.stripe_subscription_id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        commitment_end_date: subscription.commitment_end_date,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
      } : null,
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        display_name: plan.display_name,
        monthly_price_cents: plan.monthly_price_cents,
        domain_limit: plan.domain_limit,
        features: plan.features,
      } : null,
      activeModules: activeModules.map((sm: any) => ({
        id: sm.id,
        module_id: sm.module?.id,
        name: sm.module?.name,
        display_name: sm.module?.display_name,
        monthly_price_cents: sm.module?.monthly_price_cents,
        activated_at: sm.activated_at,
      })),
      reports: (reportsResult.data || []).map((rp: any) => ({
        id: rp.id,
        report_type: rp.report_type?.display_name,
        report_type_slug: rp.report_type?.name,
        report_type_id: rp.report_type_id,
        status: rp.status,
        pdf_url: rp.pdf_url,
        purchased_at: rp.purchased_at,
      })),
      monitoring: deduplicatedMonitoring.map((rm: any) => ({
        id: rm.id,
        report_type: rm.report_type?.display_name,
        report_type_slug: rm.report_type?.name,
        report_type_id: rm.report_type_id,
        status: rm.status,
        current_period_end: rm.current_period_end,
        commitment_end_date: rm.commitment_end_date,
      })),
      usage: {
        domains_used: domainsUsed || 0,
        domain_limit: plan?.domain_limit || 0,
      },
      isWithinCommitment,
      availablePlans: plansResult.data || [],
      availableModules: allModulesResult.data || [],
      availableReportTypes: reportTypesResult.data || [],
      discountTiers: discountTiersResult.data || [],
    });
  } catch (error: any) {
    console.error('Error fetching billing overview:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
