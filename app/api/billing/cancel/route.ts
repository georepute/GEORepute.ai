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

    const { organizationId } = await request.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only admins can cancel subscriptions' }, { status: 403 });
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'past_due', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Enforce 6-month commitment
    if (subscription.commitment_end_date) {
      const commitmentEnd = new Date(subscription.commitment_end_date);
      if (commitmentEnd > new Date()) {
        return NextResponse.json({
          error: 'Cannot cancel during commitment period',
          commitment_end_date: subscription.commitment_end_date,
          message: `Your 6-month commitment ends on ${commitmentEnd.toLocaleDateString()}. You can cancel after that date.`,
        }, { status: 400 });
      }
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 });
    }

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period.',
      current_period_end: subscription.current_period_end,
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
