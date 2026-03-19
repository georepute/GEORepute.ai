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
 * POST /api/billing/modules/subscribe
 *
 * Accepts: { moduleIds: string[], organizationId: string }
 *
 * Creates a Stripe Checkout session for the selected modules.
 * Each module is $199/month, billed as individual subscription line items.
 * Returns { url } — the client redirects to Stripe Checkout.
 *
 * On success, Stripe redirects back to /dashboard/modules?module_success=true&session_id=xxx
 * verify-session then activates the modules in Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const moduleIds: string[] = body.moduleIds || (body.moduleId ? [body.moduleId] : []);
    const organizationId: string = body.organizationId;

    if (!moduleIds.length || !organizationId) {
      return NextResponse.json(
        { error: 'moduleIds (array) and organizationId are required' },
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
      return NextResponse.json({ error: 'Only admins can manage modules' }, { status: 403 });
    }

    // Require an active plan subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, stripe_customer_id')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'An active plan subscription is required before adding modules' },
        { status: 400 }
      );
    }

    // Fetch all requested modules
    const { data: modules, error: modError } = await supabaseAdmin
      .from('modules')
      .select('*')
      .in('id', moduleIds)
      .eq('is_active', true);

    if (modError || !modules?.length) {
      return NextResponse.json({ error: 'No valid modules found' }, { status: 404 });
    }

    // Check Stripe price IDs are configured
    const unconfigured = modules.filter((m) => !m.stripe_price_id);
    if (unconfigured.length > 0) {
      return NextResponse.json({
        error: `Modules not yet configured in Stripe: ${unconfigured.map((m) => m.display_name).join(', ')}. Please set up Stripe prices first.`,
      }, { status: 400 });
    }

    // Skip modules already active
    const { data: existingModules } = await supabaseAdmin
      .from('subscription_modules')
      .select('module_id')
      .eq('subscription_id', subscription.id)
      .eq('status', 'active')
      .in('module_id', moduleIds);

    const alreadyActiveIds = new Set((existingModules || []).map((em: any) => em.module_id));
    const newModules = modules.filter((m) => !alreadyActiveIds.has(m.id));

    if (newModules.length === 0) {
      return NextResponse.json(
        { error: 'All selected modules are already active' },
        { status: 400 }
      );
    }

    // Get or resolve Stripe customer ID
    const stripeCustomerId = subscription.stripe_customer_id || (() => {
      const { data: org } = supabaseAdmin
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', organizationId)
        .single() as any;
      return org?.stripe_customer_id;
    })();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build line items — one per module (recurring $199/month)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = newModules.map((mod) => ({
      price: mod.stripe_price_id,
      quantity: 1,
    }));

    // Create Stripe Checkout session (subscription mode)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId || undefined,
      line_items: lineItems,
      success_url: `${baseUrl}/dashboard/modules?module_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/modules?module_cancelled=true`,
      metadata: {
        type: 'module_purchase',
        organizationId,
        subscriptionId: subscription.id,
        moduleIds: newModules.map((m) => m.id).join(','),
        moduleNames: newModules.map((m) => m.name).join(','),
      },
      subscription_data: {
        metadata: {
          type: 'module_purchase',
          organizationId,
          subscriptionId: subscription.id,
          moduleIds: newModules.map((m) => m.id).join(','),
          moduleNames: newModules.map((m) => m.name).join(','),
        },
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('Error creating module checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
