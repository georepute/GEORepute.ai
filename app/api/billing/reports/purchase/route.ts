import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/billing/reports/purchase
 *
 * Accepts: { reportTypeIds: string[], organizationId: string }
 * - User selects one or more report types via checkboxes
 * - Progressive discount is applied based on quantity
 * - One Stripe Checkout session is created for the whole batch
 * - On completion, monitoring is auto-activated for every report
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportTypeIds, organizationId } = await request.json();
    if (!reportTypeIds?.length || !organizationId) {
      return NextResponse.json(
        { error: 'reportTypeIds (array) and organizationId are required' },
        { status: 400 }
      );
    }

    // Verify admin role
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('id, role:roles(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const role = Array.isArray(orgUser?.role) ? orgUser.role[0] : orgUser?.role;
    if (!role || role.name !== 'Admin') {
      return NextResponse.json({ error: 'Only admins can purchase reports' }, { status: 403 });
    }

    // Require active plan
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'past_due', 'trialing'])
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'An active plan subscription is required before purchasing reports' },
        { status: 400 }
      );
    }

    // Fetch all selected report types
    const { data: reportTypes, error: rtError } = await supabaseAdmin
      .from('intelligence_report_types')
      .select('*')
      .in('id', reportTypeIds)
      .eq('is_active', true);

    if (rtError || !reportTypes?.length) {
      return NextResponse.json({ error: 'No valid report types found' }, { status: 404 });
    }

    // Check for already active purchases (completed + active monitoring) — prevent duplicates
    const { data: activeMonitoring } = await supabaseAdmin
      .from('report_monitoring_subscriptions')
      .select('report_type_id')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'past_due']);

    const activeMonitoringTypeIds = new Set((activeMonitoring || []).map((m) => m.report_type_id));

    const { data: completedPurchases } = await supabaseAdmin
      .from('report_purchases')
      .select('report_type_id')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .in('report_type_id', reportTypeIds);

    const alreadyActiveIds = (completedPurchases || [])
      .filter((p) => activeMonitoringTypeIds.has(p.report_type_id))
      .map((p) => p.report_type_id);

    if (alreadyActiveIds.length > 0) {
      const alreadyActiveNames = reportTypes
        .filter((rt) => alreadyActiveIds.includes(rt.id))
        .map((rt) => rt.display_name);
      return NextResponse.json({
        error: `Already purchased with active monitoring: ${alreadyActiveNames.join(', ')}. Please deselect them before proceeding.`,
        alreadyActiveIds,
      }, { status: 400 });
    }

    // Check Stripe config
    const unconfigured = reportTypes.filter((rt) => !rt.stripe_price_id_onetime);
    if (unconfigured.length > 0) {
      return NextResponse.json({
        error: `Reports not configured in Stripe: ${unconfigured.map((r) => r.display_name).join(', ')}`,
      }, { status: 400 });
    }

    // Fetch discount tier
    const count = reportTypes.length;
    const { data: tiers } = await supabaseAdmin
      .from('report_discount_tiers')
      .select('*')
      .lte('min_reports', count)
      .order('min_reports', { ascending: false })
      .limit(1)
      .single();

    const discountPercent = tiers?.discount_percent || 0;

    // Get org
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Create a checkout group ID to link all purchases in this batch
    const checkoutGroupId = randomUUID();

    // Create pending purchase records for each report
    const purchaseInserts = reportTypes.map((rt) => ({
      organization_id: organizationId,
      report_type_id: rt.id,
      status: 'pending' as const,
      checkout_group_id: checkoutGroupId,
      discount_percent: discountPercent,
    }));

    const { data: purchases, error: insertError } = await supabaseAdmin
      .from('report_purchases')
      .insert(purchaseInserts)
      .select();

    if (insertError || !purchases?.length) {
      console.error('Failed to create purchase records:', insertError);
      return NextResponse.json({ error: 'Failed to create purchase records' }, { status: 500 });
    }

    // Build Stripe line items -- use price_data for dynamic discounted amounts
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = reportTypes.map((rt) => {
      const unitPrice = rt.price_cents; // e.g. 9900 ($99)
      const discountedPrice = Math.round(unitPrice * (1 - discountPercent / 100));

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: rt.display_name,
            description: `Intelligence Report: ${rt.display_name}${discountPercent > 0 ? ` (${discountPercent}% bundle discount)` : ''}`,
          },
          unit_amount: discountedPrice,
        },
        quantity: 1,
      };
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Store purchase IDs as comma-separated in metadata
    const purchaseIds = purchases.map((p) => p.id).join(',');
    const reportTypeIdList = reportTypes.map((rt) => rt.id).join(',');

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      // Enable Stripe invoice generation for this one-time payment.
      // This makes Stripe create a real Invoice object with a hosted URL and PDF,
      // which gets picked up by the invoice.paid webhook and sync-invoices automatically.
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `GEORepute.ai — ${count} Intelligence Report${count !== 1 ? 's' : ''}${discountPercent > 0 ? ` (${discountPercent}% bundle discount)` : ''}`,
          metadata: {
            type: 'report_purchase',
            checkoutGroupId,
            organizationId,
          },
        },
      },
      success_url: `${baseUrl}/dashboard/billing?report_success=true&group=${checkoutGroupId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/billing?report_canceled=true`,
      metadata: {
        type: 'report_purchase',
        checkoutGroupId,
        purchaseIds,
        reportTypeIds: reportTypeIdList,
        reportCount: count.toString(),
        discountPercent: discountPercent.toString(),
        organizationId,
        userId: user.id,
      },
      customer_email: org.stripe_customer_id ? undefined : user.email,
    };

    if (org.stripe_customer_id) {
      sessionParams.customer = org.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update all purchase records with the session ID
    await supabaseAdmin
      .from('report_purchases')
      .update({ stripe_checkout_session_id: session.id })
      .eq('checkout_group_id', checkoutGroupId);

    // Return pricing summary for the UI
    const perReportPrice = 9900;
    const totalBeforeDiscount = perReportPrice * count;
    const totalAfterDiscount = lineItems.reduce((sum, li) => sum + (li.price_data?.unit_amount || 0), 0);
    const savings = totalBeforeDiscount - totalAfterDiscount;

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      summary: {
        report_count: count,
        discount_percent: discountPercent,
        per_report_cents: perReportPrice,
        total_before_discount_cents: totalBeforeDiscount,
        total_after_discount_cents: totalAfterDiscount,
        savings_cents: savings,
        monitoring_monthly_cents: 5000 * count,
      },
    });
  } catch (error: any) {
    console.error('Error purchasing reports:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/reports/purchase?count=N
 * Returns the discount tier for a given report count (for live UI preview)
 */
export async function GET(request: NextRequest) {
  try {
    const count = parseInt(request.nextUrl.searchParams.get('count') || '1', 10);

    const { data: tiers } = await supabaseAdmin
      .from('report_discount_tiers')
      .select('*')
      .order('min_reports', { ascending: true });

    const applicableTier = (tiers || [])
      .filter((t: any) => t.min_reports <= count)
      .sort((a: any, b: any) => b.min_reports - a.min_reports)[0];

    const discountPercent = applicableTier?.discount_percent || 0;
    const perReport = 9900;
    const discountedPerReport = Math.round(perReport * (1 - discountPercent / 100));

    return NextResponse.json({
      success: true,
      count,
      discount_percent: discountPercent,
      per_report_cents: perReport,
      discounted_per_report_cents: discountedPerReport,
      total_cents: discountedPerReport * count,
      monitoring_monthly_cents: 5000 * count,
      all_tiers: tiers || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
