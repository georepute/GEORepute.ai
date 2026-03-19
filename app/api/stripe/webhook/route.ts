import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  console.log(`Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
      // ── Checkout completed (seats, plans, reports, bundles) ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionExpired(session);
        break;
      }

      // ── Subscription lifecycle ──
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(sub);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      // ── Invoices ──
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'invoice.finalized': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFinalized(invoice);
        break;
      }

      // ── Payment intents (legacy seat purchases) ──
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(pi);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(pi);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────
// Checkout Session Completed
// ────────────────────────────────────────────────────
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);
  const metadata = session.metadata || {};
  const type = metadata.type;

  // Ensure organization has stripe_customer_id stored
  if (session.customer && metadata.organizationId) {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', metadata.organizationId);
  }

  switch (type) {
    case 'plan_subscription':
      await handlePlanCheckoutCompleted(session, metadata);
      break;
    case 'report_purchase':
      await handleReportCheckoutCompleted(session, metadata);
      break;
    case 'module_purchase':
      await handleModuleCheckoutCompleted(session, metadata);
      break;
    default:
      // Legacy seat purchase flow
      await handleSeatCheckoutCompleted(session);
      break;
  }
}

async function handlePlanCheckoutCompleted(session: Stripe.Checkout.Session, metadata: Record<string, string>) {
  const { planId, organizationId } = metadata;
  if (!planId || !organizationId) return;

  const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id;
  const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id;

  // Commitment end = 6 months from now
  const commitmentEnd = new Date();
  commitmentEnd.setMonth(commitmentEnd.getMonth() + 6);

  // Create subscription record
  await supabase.from('subscriptions').insert({
    organization_id: organizationId,
    plan_id: planId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: customerId,
    status: 'active',
    current_period_start: new Date().toISOString(),
    commitment_end_date: commitmentEnd.toISOString(),
  });

  // Update organization
  await supabase
    .from('organizations')
    .update({ current_plan_id: planId, stripe_customer_id: customerId })
    .eq('id', organizationId);

  console.log(`Plan subscription activated for org ${organizationId}, plan ${planId}`);
}

async function handleModuleCheckoutCompleted(session: Stripe.Checkout.Session, metadata: Record<string, string>) {
  const { organizationId, subscriptionId, moduleIds } = metadata;
  if (!organizationId || !subscriptionId || !moduleIds) return;

  const moduleIdList = moduleIds.split(',').filter(Boolean);
  console.log(`[webhook] Activating ${moduleIdList.length} module(s) for org ${organizationId}`);

  // Get Stripe subscription items to link each module to its item ID
  const stripeSubId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as any)?.id;

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
      console.error('[webhook] Could not fetch stripe subscription items:', e);
    }
  }

  const { data: modules } = await supabase
    .from('modules')
    .select('id, name, stripe_price_id')
    .in('id', moduleIdList);

  for (const mod of (modules || [])) {
    // Skip if already active (idempotent)
    const { data: existing } = await supabase
      .from('subscription_modules')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('module_id', mod.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existing) continue;

    const stripeItemId = stripeItemMap[mod.stripe_price_id] || null;

    await supabase.from('subscription_modules').upsert({
      subscription_id: subscriptionId,
      module_id: mod.id,
      stripe_subscription_item_id: stripeItemId,
      status: 'active',
      activated_at: new Date().toISOString(),
    }, { onConflict: 'subscription_id,module_id', ignoreDuplicates: false });

    console.log(`[webhook] Module ${mod.name} activated for org ${organizationId}`);
  }
}

async function handleReportCheckoutCompleted(session: Stripe.Checkout.Session, metadata: Record<string, string>) {
  const { checkoutGroupId, organizationId } = metadata;

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as any)?.id;

  if (checkoutGroupId) {
    // New multi-report purchase flow
    await supabase
      .from('report_purchases')
      .update({
        status: 'completed',
        stripe_payment_intent_id: paymentIntentId,
        purchased_at: new Date().toISOString(),
      })
      .eq('checkout_group_id', checkoutGroupId)
      .eq('status', 'pending');

    console.log(`Report purchases completed for group ${checkoutGroupId}`);

    // Auto-activate monitoring for each completed purchase
    if (organizationId) {
      await autoActivateMonitoring(checkoutGroupId, organizationId);
    }

    // Save a synthetic invoice record only if Stripe did NOT create a real one.
    // When invoice_creation.enabled=true (new sessions), Stripe fires invoice.paid
    // which is already handled above — skip to avoid a duplicate.
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

      await supabase.from('invoices').upsert({
        stripe_invoice_id: `pi_invoice_${paymentIntentId}`,
        organization_id: organizationId,
        amount_cents: session.amount_total ?? 0,
        currency: session.currency || 'usd',
        status: 'paid',
        description: desc,
        invoice_pdf_url: null,
        hosted_invoice_url: receiptUrl,
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

      console.log(`[webhook] Report invoice record saved for payment ${paymentIntentId}`);
    }
  } else if (metadata.purchaseId) {
    // Legacy single-report fallback
    await supabase
      .from('report_purchases')
      .update({
        status: 'completed',
        stripe_payment_intent_id: paymentIntentId,
        purchased_at: new Date().toISOString(),
      })
      .eq('id', metadata.purchaseId);

    console.log(`Report purchase ${metadata.purchaseId} completed`);
  }
}

/**
 * Auto-create monitoring subscriptions for all reports in a checkout group.
 * Each report gets a $50/month monitoring subscription with 6-month commitment.
 */
async function autoActivateMonitoring(checkoutGroupId: string, organizationId: string) {
  // Fetch completed purchases in this group
  const { data: purchases } = await supabase
    .from('report_purchases')
    .select('id, report_type_id')
    .eq('checkout_group_id', checkoutGroupId)
    .eq('status', 'completed');

  if (!purchases?.length) return;

  // Get org's stripe customer
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single();

  if (!org?.stripe_customer_id) {
    console.log('No Stripe customer for auto-monitoring; skipping');
    return;
  }

  // Fetch report types to get monitoring price IDs
  const reportTypeIds = purchases.map((p) => p.report_type_id);
  const { data: reportTypes } = await supabase
    .from('intelligence_report_types')
    .select('id, stripe_price_id_monitoring, monitoring_min_months, display_name')
    .in('id', reportTypeIds);

  if (!reportTypes?.length) return;

  const reportTypeMap = new Map(reportTypes.map((rt) => [rt.id, rt]));

  for (const purchase of purchases) {
    const reportType = reportTypeMap.get(purchase.report_type_id);
    if (!reportType?.stripe_price_id_monitoring) {
      console.log(`No monitoring price for report type ${purchase.report_type_id}; skipping`);
      continue;
    }

    // Idempotency check before hitting Stripe
    const { data: existingMon } = await supabase
      .from('report_monitoring_subscriptions')
      .select('id')
      .eq('report_purchase_id', purchase.id)
      .in('status', ['active', 'past_due'])
      .limit(1)
      .single();

    if (existingMon) {
      console.log(`Monitoring already exists for purchase ${purchase.id}; skipping`);
      continue;
    }

    try {
      // Create monitoring subscription in Stripe
      const stripeMonSub = await stripe.subscriptions.create({
        customer: org.stripe_customer_id,
        items: [{ price: reportType.stripe_price_id_monitoring, quantity: 1 }],
        metadata: {
          type: 'report_monitoring',
          reportPurchaseId: purchase.id,
          reportTypeId: purchase.report_type_id,
          organizationId,
          checkoutGroupId,
        },
      });

      const commitmentEnd = new Date();
      commitmentEnd.setMonth(commitmentEnd.getMonth() + (reportType.monitoring_min_months || 6));

      await supabase.from('report_monitoring_subscriptions').upsert({
        organization_id: organizationId,
        report_purchase_id: purchase.id,
        report_type_id: purchase.report_type_id,
        stripe_subscription_id: stripeMonSub.id,
        status: 'active',
        current_period_start: new Date((stripeMonSub as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((stripeMonSub as any).current_period_end * 1000).toISOString(),
        commitment_end_date: commitmentEnd.toISOString(),
      }, { onConflict: 'report_purchase_id', ignoreDuplicates: false });

      console.log(`Auto-monitoring activated for purchase ${purchase.id} (${reportType.display_name})`);
    } catch (monError: any) {
      console.error(`Failed to auto-activate monitoring for purchase ${purchase.id}:`, monError.message);
    }
  }
}

async function handleSeatCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { organizationId, paymentId, seats } = session.metadata || {};
  if (!organizationId || !paymentId || !seats) return;

  const seatsNumber = parseInt(seats, 10);

  const { error: paymentError } = await supabase
    .from('seat_payments')
    .update({
      status: 'completed',
      stripe_payment_intent_id: session.payment_intent as string,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (paymentError) {
    console.error('Failed to update seat payment record:', paymentError);
    throw paymentError;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('seats')
    .eq('id', organizationId)
    .single();

  if (!org) throw new Error('Organization not found');

  const newSeatsTotal = (org.seats || 1) + seatsNumber;
  await supabase
    .from('organizations')
    .update({ seats: newSeatsTotal })
    .eq('id', organizationId);

  console.log(`Added ${seatsNumber} seats to org ${organizationId}. New total: ${newSeatsTotal}`);
}

// ────────────────────────────────────────────────────
// Checkout Session Expired
// ────────────────────────────────────────────────────
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.expired:', session.id);
  const metadata = session.metadata || {};

  if (metadata.type === 'report_purchase' && metadata.purchaseId) {
    await supabase
      .from('report_purchases')
      .update({ status: 'failed' })
      .eq('id', metadata.purchaseId);
  }

  // Legacy seat flow
  await supabase
    .from('seat_payments')
    .update({ status: 'failed' })
    .eq('stripe_session_id', session.id);
}

// ────────────────────────────────────────────────────
// Subscription Created
// ────────────────────────────────────────────────────
async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  console.log('Processing customer.subscription.created:', sub.id);
  const metadata = sub.metadata || {};
  const subAny = sub as any;

  if (metadata.type === 'plan_subscription') {
    // Already handled in checkout.session.completed; update period dates
    const periodStart = subAny.current_period_start ?? sub.items?.data?.[0]?.current_period_start;
    const periodEnd = subAny.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
    await supabase
      .from('subscriptions')
      .update({
        ...(periodStart && { current_period_start: new Date(periodStart * 1000).toISOString() }),
        ...(periodEnd && { current_period_end: new Date(periodEnd * 1000).toISOString() }),
        status: sub.status,
      })
      .eq('stripe_subscription_id', sub.id);
  }
}

// ────────────────────────────────────────────────────
// Subscription Updated
// ────────────────────────────────────────────────────
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  console.log('Processing customer.subscription.updated:', sub.id);
  const subAny = sub as any;
  const periodStart = subAny.current_period_start ?? sub.items?.data?.[0]?.current_period_start;
  const periodEnd = subAny.current_period_end ?? sub.items?.data?.[0]?.current_period_end;

  const updateData: Record<string, any> = {
    status: sub.status,
    ...(periodStart && { current_period_start: new Date(periodStart * 1000).toISOString() }),
    ...(periodEnd && { current_period_end: new Date(periodEnd * 1000).toISOString() }),
    cancel_at_period_end: sub.cancel_at_period_end,
  };

  if (sub.canceled_at) {
    updateData.canceled_at = new Date(sub.canceled_at * 1000).toISOString();
  }

  // Update plan subscription
  const { data: updated } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', sub.id)
    .select('id')
    .single();

  // Also check report monitoring subscriptions
  if (!updated && periodStart && periodEnd) {
    await supabase
      .from('report_monitoring_subscriptions')
      .update({
        status: sub.status,
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', sub.id);
  }
}

// ────────────────────────────────────────────────────
// Subscription Deleted
// ────────────────────────────────────────────────────
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted:', sub.id);

  // Check plan subscription
  const { data: planSub } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id)
    .select('id, organization_id')
    .single();

  if (planSub) {
    await supabase
      .from('organizations')
      .update({ current_plan_id: null })
      .eq('id', planSub.organization_id);

    // Cancel all modules on this subscription
    await supabase
      .from('subscription_modules')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('subscription_id', planSub.id)
      .eq('status', 'active');
  }

  // Check report monitoring
  await supabase
    .from('report_monitoring_subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', sub.id);
}

// ────────────────────────────────────────────────────
// Invoice Paid
// ────────────────────────────────────────────────────
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Processing invoice.paid:', invoice.id);

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id;

  // Find organization by stripe_customer_id
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.log('No org found for customer', customerId);
    return;
  }

  const lineItemsSummary = (invoice.lines?.data || [])
    .slice(0, 3)
    .map(l => l.description || 'Item')
    .join(' · ');

  const invAny = invoice as any;
  const invSubId = typeof invAny.subscription === 'string'
    ? invAny.subscription
    : invAny.subscription?.id || null;

  // Determine invoice type
  const invMeta = invAny.metadata || {};
  const subMeta = invAny.subscription?.metadata || {};
  let invoiceType: 'subscription' | 'report' | 'module' | 'other' = 'subscription';
  if (invMeta.type === 'report_purchase' || subMeta.type === 'report_monitoring') {
    invoiceType = 'report';
  } else if (subMeta.type === 'module') {
    invoiceType = 'module';
  }

  // For report invoices, fetch the receipt URL from the charge
  let receiptUrl: string | null = null;
  if (invoiceType === 'report') {
    const chargeId = typeof invAny.charge === 'string' ? invAny.charge : invAny.charge?.id;
    if (chargeId) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        receiptUrl = (charge as any).receipt_url || null;
      } catch { /* non-fatal */ }
    }
  }

  await supabase.from('invoices').upsert({
    stripe_invoice_id: invoice.id,
    organization_id: org.id,
    amount_cents: invoice.amount_paid || 0,
    currency: invoice.currency || 'usd',
    status: 'paid',
    description: lineItemsSummary || invoice.lines?.data?.[0]?.description || 'Payment',
    invoice_pdf_url: invoice.invoice_pdf || null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    receipt_url: receiptUrl,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    paid_at: new Date().toISOString(),
    invoice_number: invAny.number || null,
    stripe_subscription_id: invSubId,
    line_items_summary: lineItemsSummary || null,
    type: invoiceType,
  }, { onConflict: 'stripe_invoice_id' });

  if (invAny.subscription) {
    const subId = typeof invAny.subscription === 'string' ? invAny.subscription : invAny.subscription?.id;
    try {
      const stripeSub = await stripe.subscriptions.retrieve(subId) as any;
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          status: stripeSub.status,
        })
        .eq('stripe_subscription_id', subId);
    } catch (e) {
      console.error('Error updating subscription periods from invoice:', e);
    }
  }
}

// ────────────────────────────────────────────────────
// Invoice Payment Failed
// ────────────────────────────────────────────────────
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
  const invAny = invoice as any;
  if (invAny.subscription) {
    const subId = typeof invAny.subscription === 'string' ? invAny.subscription : invAny.subscription?.id;
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subId);

    await supabase
      .from('report_monitoring_subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subId);
  }
}

// ────────────────────────────────────────────────────
// Invoice Finalized
// ────────────────────────────────────────────────────
async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  console.log('Processing invoice.finalized:', invoice.id);

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id;
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) return;

  const finalLineItems = (invoice.lines?.data || [])
    .slice(0, 3)
    .map(l => l.description || 'Item')
    .join(' · ');

  const invAny = invoice as any;
  const finalSubId = typeof invAny.subscription === 'string'
    ? invAny.subscription
    : invAny.subscription?.id || null;

  await supabase.from('invoices').upsert({
    stripe_invoice_id: invoice.id,
    organization_id: org.id,
    amount_cents: invoice.amount_due || 0,
    currency: invoice.currency || 'usd',
    status: invoice.status || 'open',
    description: finalLineItems || invoice.lines?.data?.[0]?.description || 'Invoice',
    invoice_pdf_url: invoice.invoice_pdf || null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    invoice_number: (invoice as any).number || null,
    stripe_subscription_id: finalSubId,
    line_items_summary: finalLineItems || null,
  }, { onConflict: 'stripe_invoice_id' });
}

// ────────────────────────────────────────────────────
// Legacy: Payment Intent Succeeded (seat purchases)
// ────────────────────────────────────────────────────
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);
  await supabase
    .from('seat_payments')
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

// ────────────────────────────────────────────────────
// Legacy: Payment Intent Failed
// ────────────────────────────────────────────────────
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);
  await supabase
    .from('seat_payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
