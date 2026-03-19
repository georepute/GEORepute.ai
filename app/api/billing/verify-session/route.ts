import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/billing/verify-session
 *
 * Called after Stripe checkout redirect to verify payment and create
 * the subscription record if the webhook hasn't processed it yet.
 * This is a safety net for local dev (no webhook) and webhook delays.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const metadata = session.metadata || {};
    const type = metadata.type;

    if (type === 'plan_subscription') {
      return await handlePlanVerification(session, metadata);
    } else if (type === 'report_purchase') {
      return await handleReportVerification(session, metadata);
    } else if (type === 'module_purchase') {
      return await handleModuleVerification(session, metadata);
    }

    return NextResponse.json({ success: true, message: 'Session verified, no action needed' });
  } catch (error: any) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function handlePlanVerification(session: Stripe.Checkout.Session, metadata: Record<string, string>) {
  const { planId, organizationId } = metadata;
  if (!planId || !organizationId) {
    return NextResponse.json({ error: 'Missing plan metadata' }, { status: 400 });
  }

  // Check if subscription already exists (webhook may have already processed it)
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'past_due', 'trialing'])
    .limit(1)
    .single();

  if (existingSub) {
    return NextResponse.json({
      success: true,
      message: 'Subscription already active',
      alreadyProcessed: true,
    });
  }

  // Create the subscription record
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : (session.customer as any)?.id;

  const stripeSubscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as any)?.id;

  const commitmentEnd = new Date();
  commitmentEnd.setMonth(commitmentEnd.getMonth() + 6);

  // Fetch period dates from Stripe subscription if available
  let periodStart = new Date().toISOString();
  let periodEnd: string | null = null;
  if (stripeSubscriptionId) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;
      periodStart = new Date(stripeSub.current_period_start * 1000).toISOString();
      periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
    } catch {
      // Use defaults
    }
  }

  const { error: insertError } = await supabaseAdmin.from('subscriptions').insert({
    organization_id: organizationId,
    plan_id: planId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: customerId,
    status: 'active',
    current_period_start: periodStart,
    current_period_end: periodEnd,
    commitment_end_date: commitmentEnd.toISOString(),
  });

  if (insertError) {
    console.error('Failed to create subscription:', insertError);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }

  // Update organization
  await supabaseAdmin
    .from('organizations')
    .update({
      current_plan_id: planId,
      stripe_customer_id: customerId,
    })
    .eq('id', organizationId);

  console.log(`[verify-session] Plan subscription created for org ${organizationId}, plan ${planId}`);

  return NextResponse.json({
    success: true,
    message: 'Subscription activated successfully',
    alreadyProcessed: false,
  });
}

async function handleReportVerification(session: Stripe.Checkout.Session, metadata: Record<string, string>) {
  const { checkoutGroupId } = metadata;
  if (!checkoutGroupId) {
    return NextResponse.json({ success: true, message: 'No group ID, skipping' });
  }

  // Check if already processed
  const { data: purchases } = await supabaseAdmin
    .from('report_purchases')
    .select('id, status')
    .eq('checkout_group_id', checkoutGroupId);

  const pending = (purchases || []).filter((p) => p.status === 'pending');
  if (pending.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Reports already processed',
      alreadyProcessed: true,
    });
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as any)?.id;

  await supabaseAdmin
    .from('report_purchases')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntentId,
      purchased_at: new Date().toISOString(),
    })
    .eq('checkout_group_id', checkoutGroupId)
    .eq('status', 'pending');

  console.log(`[verify-session] Report purchases completed for group ${checkoutGroupId}`);

  // Ensure a synthetic invoice record exists only if Stripe did NOT create a real one.
  // When invoice_creation.enabled=true (new sessions), Stripe fires invoice.paid
  // which is already handled by the webhook — skip to avoid a duplicate.
  const organizationId = metadata.organizationId;
  const sessionHasInvoice = !!(session as any).invoice;
  if (organizationId && paymentIntentId && !sessionHasInvoice) {
    const count = parseInt(metadata.reportCount || '1', 10);
    const discount = parseInt(metadata.discountPercent || '0', 10);
    let desc = `${count} Intelligence Report${count !== 1 ? 's' : ''}`;
    if (discount > 0) desc += ` (${discount}% bundle discount)`;

    // Fetch the receipt URL from the PaymentIntent's latest charge
    let receiptUrl: string | null = null;
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge'],
      }) as any;
      receiptUrl = pi.latest_charge?.receipt_url || null;
    } catch { /* non-fatal */ }

    await supabaseAdmin.from('invoices').upsert({
      stripe_invoice_id: `pi_invoice_${paymentIntentId}`,
      organization_id: organizationId,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency || 'usd',
      status: 'paid',
      description: desc,
      invoice_pdf_url: null,
      hosted_invoice_url: null,
      receipt_url: receiptUrl,
      period_start: new Date().toISOString(),
      period_end: null,
      paid_at: new Date().toISOString(),
      type: 'report',
      line_items_summary: desc,
      stripe_subscription_id: null,
      invoice_number: null,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_invoice_id',
      ignoreDuplicates: false,
    });

    console.log(`[verify-session] Report invoice record saved for payment ${paymentIntentId}`);
  }

  // Auto-activate monitoring
  if (organizationId) {
    const { data: completedPurchases } = await supabaseAdmin
      .from('report_purchases')
      .select('id, report_type_id')
      .eq('checkout_group_id', checkoutGroupId)
      .eq('status', 'completed');

    if (completedPurchases?.length) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', organizationId)
        .single();

      const reportTypeIds = completedPurchases.map((p) => p.report_type_id);
      const { data: reportTypes } = await supabaseAdmin
        .from('intelligence_report_types')
        .select('id, stripe_price_id_monitoring, monitoring_min_months, display_name')
        .in('id', reportTypeIds);

      const reportTypeMap = new Map((reportTypes || []).map((rt) => [rt.id, rt]));

      for (const purchase of completedPurchases) {
        const rt = reportTypeMap.get(purchase.report_type_id);

        // Check if monitoring already exists
        const { data: existingMon } = await supabaseAdmin
          .from('report_monitoring_subscriptions')
          .select('id')
          .eq('report_purchase_id', purchase.id)
          .in('status', ['active', 'past_due'])
          .limit(1)
          .single();

        if (existingMon) continue;

        const commitEnd = new Date();
        commitEnd.setMonth(commitEnd.getMonth() + (rt?.monitoring_min_months || 6));

        if (rt?.stripe_price_id_monitoring && org?.stripe_customer_id) {
          // Full Stripe monitoring subscription
          try {
            const monSub = await stripe.subscriptions.create({
              customer: org.stripe_customer_id,
              items: [{ price: rt.stripe_price_id_monitoring, quantity: 1 }],
              metadata: {
                type: 'report_monitoring',
                reportPurchaseId: purchase.id,
                reportTypeId: purchase.report_type_id,
                organizationId,
                checkoutGroupId,
              },
            }) as any;

            await supabaseAdmin.from('report_monitoring_subscriptions').upsert({
              organization_id: organizationId,
              report_purchase_id: purchase.id,
              report_type_id: purchase.report_type_id,
              stripe_subscription_id: monSub.id,
              status: 'active',
              current_period_start: new Date(monSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(monSub.current_period_end * 1000).toISOString(),
              commitment_end_date: commitEnd.toISOString(),
            }, { onConflict: 'report_purchase_id', ignoreDuplicates: false });

            console.log(`[verify-session] Stripe monitoring created for purchase ${purchase.id}`);
          } catch (monErr: any) {
            console.error(`[verify-session] Stripe monitoring failed for ${purchase.id}:`, monErr.message);
            // Fall back: create a DB-only monitoring record so the report still unlocks
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            await supabaseAdmin.from('report_monitoring_subscriptions').upsert({
              organization_id: organizationId,
              report_purchase_id: purchase.id,
              report_type_id: purchase.report_type_id,
              stripe_subscription_id: null,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              commitment_end_date: commitEnd.toISOString(),
            }, { onConflict: 'report_purchase_id', ignoreDuplicates: false });
          }
        } else {
          // No Stripe monitoring price configured — create a DB-only record so the report unlocks
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          await supabaseAdmin.from('report_monitoring_subscriptions').upsert({
            organization_id: organizationId,
            report_purchase_id: purchase.id,
            report_type_id: purchase.report_type_id,
            stripe_subscription_id: null,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            commitment_end_date: commitEnd.toISOString(),
          }, { onConflict: 'report_purchase_id', ignoreDuplicates: false });
          console.log(`[verify-session] DB-only monitoring record created for purchase ${purchase.id} (no Stripe price configured)`);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Reports verified and monitoring activated',
    alreadyProcessed: false,
  });
}

async function handleModuleVerification(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>
) {
  const { organizationId, subscriptionId, moduleIds, moduleNames } = metadata;

  if (!organizationId || !moduleIds) {
    return NextResponse.json({ success: true, message: 'Missing module metadata, skipping' });
  }

  const moduleIdList = moduleIds.split(',').filter(Boolean);
  const moduleNameList = (moduleNames || '').split(',').filter(Boolean);

  // Check if already activated (idempotency)
  const { data: existingModules } = await supabaseAdmin
    .from('subscription_modules')
    .select('module_id')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'active')
    .in('module_id', moduleIdList);

  const alreadyActiveIds = new Set((existingModules || []).map((m: any) => m.module_id));
  const toActivate = moduleIdList.filter((id) => !alreadyActiveIds.has(id));

  if (toActivate.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Modules already activated',
      alreadyProcessed: true,
    });
  }

  // Get the Stripe subscription created by this checkout
  const stripeSubId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as any)?.id;

  // Fetch subscription items so we can link each module to its Stripe item
  let stripeItemMap: Record<string, string> = {};
  if (stripeSubId) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId, {
        expand: ['items.data.price'],
      });
      for (const item of stripeSub.items.data) {
        const priceId = (item.price as any)?.id;
        if (priceId) stripeItemMap[priceId] = item.id;
      }
    } catch (e) {
      console.error('[verify-session] Could not fetch stripe subscription items:', e);
    }
  }

  // Fetch module details to get stripe_price_id for mapping
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id, name, stripe_price_id')
    .in('id', toActivate);

  let activated = 0;
  for (const mod of (modules || [])) {
    const stripeItemId = stripeItemMap[mod.stripe_price_id] || null;

    // Use upsert to handle race conditions between webhook and verify-session
    const { error } = await supabaseAdmin
      .from('subscription_modules')
      .upsert({
        subscription_id: subscriptionId,
        module_id: mod.id,
        stripe_subscription_item_id: stripeItemId,
        status: 'active',
        activated_at: new Date().toISOString(),
      }, { onConflict: 'subscription_id,module_id', ignoreDuplicates: false });

    if (!error) activated++;
    else console.error(`[verify-session] Failed to activate module ${mod.name}:`, error);
  }

  console.log(`[verify-session] Activated/confirmed ${activated} module(s) for org ${organizationId}`);

  return NextResponse.json({
    success: true,
    message: activated > 0
      ? `${activated} module${activated !== 1 ? 's' : ''} activated successfully`
      : 'Modules already active',
    alreadyProcessed: activated === 0,
  });
}
