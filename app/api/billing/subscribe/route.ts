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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, organizationId } = await request.json();
    if (!planId || !organizationId) {
      return NextResponse.json({ error: 'planId and organizationId are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only admins can manage subscriptions' }, { status: 403 });
    }

    // Fetch the target plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (!plan.stripe_price_id) {
      return NextResponse.json({ error: 'Plan not yet configured in Stripe. Please contact support.' }, { status: 400 });
    }

    // Get organization + existing subscription
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check for existing active subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, plan_id, status')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'past_due', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If already on this plan, reject
    if (existingSub && existingSub.plan_id === planId) {
      return NextResponse.json({ error: 'Already subscribed to this plan' }, { status: 400 });
    }

    // UPGRADE/DOWNGRADE: modify existing Stripe subscription
    if (existingSub?.stripe_subscription_id) {
      const stripeSubscription = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);
      const mainItem = stripeSubscription.items.data[0];

      await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
        items: [{
          id: mainItem.id,
          price: plan.stripe_price_id,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          planId: plan.id,
          planName: plan.name,
          organizationId,
        },
      });

      // Update local records
      await supabaseAdmin
        .from('subscriptions')
        .update({ plan_id: planId, updated_at: new Date().toISOString() })
        .eq('id', existingSub.id);

      await supabaseAdmin
        .from('organizations')
        .update({ current_plan_id: planId })
        .eq('id', organizationId);

      return NextResponse.json({
        success: true,
        action: 'plan_changed',
        plan: plan.display_name,
      });
    }

    // NEW SUBSCRIPTION: create Stripe Checkout
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: plan.stripe_price_id,
        quantity: 1,
      }],
      success_url: `${baseUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      metadata: {
        type: 'plan_subscription',
        planId: plan.id,
        planName: plan.name,
        organizationId,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          type: 'plan_subscription',
          planId: plan.id,
          planName: plan.name,
          organizationId,
        },
      },
      customer_email: org.stripe_customer_id ? undefined : user.email,
    };

    if (org.stripe_customer_id) {
      sessionParams.customer = org.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      success: true,
      action: 'checkout_created',
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
