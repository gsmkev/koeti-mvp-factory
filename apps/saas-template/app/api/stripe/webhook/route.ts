// API route (POST) — /api/stripe/webhook.
import { stripe, handleSubscriptionChange } from '@koeti/billing';
import { stripeEvents } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
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

  // Idempotency: record the event id first. An empty insert means Stripe already
  // delivered this event — ack and skip so no handler runs twice on a retry.
  const firstDelivery = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (firstDelivery.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
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
