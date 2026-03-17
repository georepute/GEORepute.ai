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

    const { subscriptionModuleId, organizationId } = await request.json();
    if (!subscriptionModuleId || !organizationId) {
      return NextResponse.json({ error: 'subscriptionModuleId and organizationId are required' }, { status: 400 });
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

    // Get subscription module
    const { data: subModule } = await supabaseAdmin
      .from('subscription_modules')
      .select('*, subscription:subscriptions(*), module:modules(*)')
      .eq('id', subscriptionModuleId)
      .eq('status', 'active')
      .single();

    if (!subModule) {
      return NextResponse.json({ error: 'Active module not found' }, { status: 404 });
    }

    // Verify it belongs to this org
    if (subModule.subscription?.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Module does not belong to this organization' }, { status: 403 });
    }

    // Remove from Stripe subscription
    if (subModule.stripe_subscription_item_id) {
      await stripe.subscriptionItems.del(subModule.stripe_subscription_item_id, {
        proration_behavior: 'create_prorations',
      });
    }

    // Update local record
    await supabaseAdmin
      .from('subscription_modules')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionModuleId);

    return NextResponse.json({
      success: true,
      message: `Module "${subModule.module?.display_name}" has been canceled.`,
    });
  } catch (error: any) {
    console.error('Error canceling module:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
