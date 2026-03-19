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
 * POST /api/billing/sync-invoices
 *
 * Fetches all invoices from Stripe for the organization's Stripe customer
 * and upserts them into the local `invoices` table.
 *
 * Called:
 *  - On billing page load
 *  - After a successful checkout verification
 *  - After plan change or module add/remove
 */
export async function POST(request: NextRequest) {
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

    // Get org's Stripe customer ID
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No Stripe customer found, nothing to sync',
      });
    }

    // Fetch invoices with charge expansion so we can access receipt_url on report invoices
    const stripeInvoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 100,
      expand: ['data.subscription', 'data.charge'],
    });

    let synced = 0;

    for (const inv of stripeInvoices.data) {
      // Build a human-readable summary from line items
      const lineItemParts: string[] = [];
      for (const line of (inv.lines?.data || [])) {
        const l = line as any;
        const desc = l.description || l.price?.nickname || l.price?.product || 'Item';
        lineItemParts.push(desc);
      }
      const lineItemsSummary = lineItemParts.slice(0, 3).join(' · ') +
        (lineItemParts.length > 3 ? ` +${lineItemParts.length - 3} more` : '');

      // Determine invoice type from metadata
      let invoiceType: 'subscription' | 'report' | 'module' | 'other' = 'subscription';
      const invAny = inv as any;
      const invMeta = invAny.metadata || {};
      const subMeta = invAny.subscription?.metadata || {};
      if (invMeta.type === 'report_purchase' || subMeta.type === 'report_monitoring') {
        invoiceType = 'report';
      } else if (subMeta.type === 'module') {
        invoiceType = 'module';
      } else if ((inv.lines?.data || []).some((l: any) => l.description?.toLowerCase().includes('report'))) {
        invoiceType = 'report';
      }

      const stripeSubId = typeof invAny.subscription === 'string'
        ? invAny.subscription
        : invAny.subscription?.id || null;

      // receipt_url is on the expanded charge object
      const receiptUrl: string | null = invAny.charge?.receipt_url || null;

      await supabaseAdmin.from('invoices').upsert({
        stripe_invoice_id: inv.id,
        organization_id: orgId,
        amount_cents: inv.amount_paid ?? inv.amount_due ?? 0,
        currency: inv.currency || 'usd',
        status: inv.status || 'open',
        description: lineItemsSummary || inv.description || 'Invoice',
        invoice_pdf_url: inv.invoice_pdf || null,
        hosted_invoice_url: inv.hosted_invoice_url || null,
        receipt_url: receiptUrl,
        period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        paid_at: inv.status === 'paid' && inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
          : null,
        type: invoiceType,
        line_items_summary: lineItemsSummary || null,
        stripe_subscription_id: stripeSubId,
        invoice_number: inv.number || null,
        created_at: new Date(inv.created * 1000).toISOString(),
      }, {
        onConflict: 'stripe_invoice_id',
        ignoreDuplicates: false,
      });

      synced++;
    }

    // Also pull one-time Checkout Sessions (payment mode) for report purchases.
    // New sessions have invoice_creation.enabled=true so Stripe generates a real Invoice —
    // those are already captured above via stripe.invoices.list.
    // This loop only handles older sessions that predate invoice_creation being enabled.
    const checkoutSessions = await stripe.checkout.sessions.list({
      customer: org.stripe_customer_id,
      limit: 100,
      expand: ['data.payment_intent'],
    });

    for (const sess of checkoutSessions.data) {
      // Only care about completed, paid, payment-mode sessions flagged as report_purchase
      if (sess.mode !== 'payment') continue;
      if (sess.payment_status !== 'paid') continue;
      if (sess.metadata?.type !== 'report_purchase') continue;

      const sessAny = sess as any;

      // If Stripe created a real Invoice for this session (invoice_creation.enabled),
      // it's already synced above — skip to avoid a duplicate synthetic record.
      if (sessAny.invoice) continue;

      const piId = typeof sess.payment_intent === 'string'
        ? sess.payment_intent
        : sessAny.payment_intent?.id;

      if (!piId) continue;

      // receipt_url lives on the Charge, accessible via expanded payment_intent
      const receiptUrl: string | null =
        sessAny.payment_intent?.latest_charge?.receipt_url ||
        sessAny.payment_intent?.charges?.data?.[0]?.receipt_url ||
        null;

      const count = parseInt(sess.metadata?.reportCount || '1', 10);
      const discount = parseInt(sess.metadata?.discountPercent || '0', 10);
      let description = `${count} Intelligence Report${count !== 1 ? 's' : ''}`;
      if (discount > 0) description += ` (${discount}% bundle discount)`;

      const syntheticId = `pi_invoice_${piId}`;

      await supabaseAdmin.from('invoices').upsert({
        stripe_invoice_id: syntheticId,
        organization_id: orgId,
        amount_cents: sess.amount_total ?? 0,
        currency: sess.currency || 'usd',
        status: 'paid',
        description,
        invoice_pdf_url: null,
        hosted_invoice_url: null,
        receipt_url: receiptUrl,
        period_start: new Date(sess.created * 1000).toISOString(),
        period_end: null,
        paid_at: new Date(sess.created * 1000).toISOString(),
        type: 'report',
        line_items_summary: description,
        stripe_subscription_id: null,
        invoice_number: null,
        created_at: new Date(sess.created * 1000).toISOString(),
      }, {
        onConflict: 'stripe_invoice_id',
        ignoreDuplicates: false,
      });

      synced++;
    }

    console.log(`[sync-invoices] Synced ${synced} invoices for org ${orgId}`);

    return NextResponse.json({
      success: true,
      synced,
      message: `Synced ${synced} invoice${synced !== 1 ? 's' : ''} from Stripe`,
    });
  } catch (error: any) {
    console.error('Error syncing invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
