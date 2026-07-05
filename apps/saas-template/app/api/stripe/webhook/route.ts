// API route (POST) — /api/stripe/webhook.
import { stripe, handleSubscriptionChange } from '@koeti/billing';
import { getTeamByStripeCustomerId, updateTeamSubscription } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription, {
        getTeamByStripeCustomerId,
        updateTeamSubscription,
      });
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  return NextResponse.json({ received: true });
}
