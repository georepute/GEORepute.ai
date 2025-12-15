import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Create Supabase client with service role for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * POST /api/stripe/create-checkout
 * Creates a Stripe checkout session for purchasing team seats
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const { organizationId, seats } = await request.json();

    // Validate input
    if (!organizationId || !seats || seats < 1) {
      return NextResponse.json(
        { error: 'Invalid request. organizationId and seats (minimum 1) are required.' },
        { status: 400 }
      );
    }

    // Verify user is admin of the organization
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select(`
        id,
        role:roles(name)
      `)
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (orgUserError || !orgUser) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Check if user is admin
    const role = Array.isArray(orgUser.role) ? orgUser.role[0] : orgUser.role;
    if (!role || role.name !== 'Admin') {
      return NextResponse.json(
        { error: 'Only organization admins can purchase seats' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Calculate amount (in cents): $1 per seat
    const amountCents = seats * 100; // $1 = 100 cents

    // Create a payment record (pending status) using service role
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('seat_payments')
      .insert({
        organization_id: organizationId,
        amount_cents: amountCents,
        seats_purchased: seats,
        currency: 'usd',
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Failed to create payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record', details: paymentError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Team Seats',
              description: `${seats} additional team member seat${seats > 1 ? 's' : ''} for ${organization.name}`,
              images: [`${baseUrl}/logo.png`],
            },
            unit_amount: 100, // $1 in cents
          },
          quantity: seats,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard/team?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/dashboard/team?canceled=true`,
      metadata: {
        organizationId: organizationId,
        paymentId: payment.id,
        seats: seats.toString(),
        userId: user.id,
      },
      customer_email: user.email,
    });

    // Update payment record with Stripe session ID (using service role)
    await supabaseAdmin
      .from('seat_payments')
      .update({ stripe_session_id: session.id })
      .eq('id', payment.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/create-checkout?session_id=xxx
 * Verify a checkout session status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      success: true,
      status: session.payment_status,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      },
    });

  } catch (error: any) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

