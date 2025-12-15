import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Create Supabase client with service role for webhook operations
const supabase = createClient(
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
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for payment processing
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  console.log(`Received webhook event: ${event.type}`);

  try {
    switch (event.type) {
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

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
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

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const { organizationId, paymentId, seats } = session.metadata || {};

  if (!organizationId || !paymentId || !seats) {
    console.error('Missing required metadata in session:', session.metadata);
    return;
  }

  const seatsNumber = parseInt(seats, 10);

  try {
    // Update payment record
    const { error: paymentError } = await supabase
      .from('seat_payments')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (paymentError) {
      console.error('Failed to update payment record:', paymentError);
      throw paymentError;
    }

    // Get current organization seats
    const { data: org, error: orgFetchError } = await supabase
      .from('organizations')
      .select('seats')
      .eq('id', organizationId)
      .single();

    if (orgFetchError || !org) {
      console.error('Failed to fetch organization:', orgFetchError);
      throw orgFetchError;
    }

    // Add purchased seats to organization
    const newSeatsTotal = (org.seats || 1) + seatsNumber;
    
    const { error: orgUpdateError } = await supabase
      .from('organizations')
      .update({ seats: newSeatsTotal })
      .eq('id', organizationId);

    if (orgUpdateError) {
      console.error('Failed to update organization seats:', orgUpdateError);
      throw orgUpdateError;
    }

    console.log(`✅ Successfully added ${seatsNumber} seats to organization ${organizationId}. New total: ${newSeatsTotal}`);

  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error);
    throw error;
  }
}

/**
 * Handle expired checkout session
 */
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.expired:', session.id);

  // Update payment record to failed
  const { error } = await supabase
    .from('seat_payments')
    .update({ status: 'failed' })
    .eq('stripe_session_id', session.id);

  if (error) {
    console.error('Failed to update expired payment:', error);
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);

  // Update payment record with payment intent ID
  const { error } = await supabase
    .from('seat_payments')
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update payment with payment intent:', error);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.payment_failed:', paymentIntent.id);

  // Update payment record to failed
  const { error } = await supabase
    .from('seat_payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  if (error) {
    console.error('Failed to update failed payment:', error);
  }
}

// Disable body parsing for webhook routes
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

