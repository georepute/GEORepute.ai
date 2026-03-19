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

    // Verify membership
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('id, role:roles(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const role = Array.isArray(orgUser?.role) ? orgUser.role[0] : orgUser?.role;
    if (!role || role.name !== 'Admin') {
      return NextResponse.json({ error: 'Only admins can manage payment methods' }, { status: 403 });
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found. Please subscribe to a plan first.' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/billing`,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
