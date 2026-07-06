---
paths:
  - '**/app/api/stripe/**'
  - '**/lib/payments/**'
  - '**/lib/billing/**'
---

# Billing pattern

## Webhook route — always inject DB deps

```ts
// app/api/stripe/webhook/route.ts
import { stripe, handleSubscriptionChange } from '@koeti/billing';
import { getTeamByStripeCustomerId, updateTeamSubscription } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await handleSubscriptionChange(event.data.object as Stripe.Subscription, {
      getTeamByStripeCustomerId,
      updateTeamSubscription,
    });
  }
  return NextResponse.json({ received: true });
}
```

## Checkout + portal actions

```ts
// lib/payments/actions.ts
'use server';
import { createCheckoutSession, createCustomerPortalSession } from '@koeti/billing';
import { withTeam } from '@/lib/auth/middleware';
import { getUser } from '@/lib/db/queries';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ team, priceId, getUser });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const { redirect } = await import('next/navigation');
  const portal = await createCustomerPortalSession(team);
  redirect(portal.url);
});
```

- Never `new Stripe(...)` in an app. Always use `stripe` from `@koeti/billing`.
- `handleSubscriptionChange` requires DI: pass `getTeamByStripeCustomerId` and `updateTeamSubscription` from `lib/db/queries`.

## Plan gating

```ts
import { isSubscribed } from '@koeti/billing'   // true for active | trialing

// Server page / action
if (!isSubscribed(team)) redirect('/pricing')

// UI
{isSubscribed(team) ? <Feature /> : <UpgradeNudge />}
```

Gate whole premium screens in the page (redirect) and premium mutations in
their hand-written action (return `{ error: 'Upgrade required' }`). Free-tier
limits (e.g. max N records) are one count query + `isSubscribed` in the action.

## Pagopar — the Stripe alternative (Paraguay)

Active when `PAGOPAR_PUBLIC_TOKEN` + `PAGOPAR_PRIVATE_TOKEN` are set and
`STRIPE_SECRET_KEY` is not. Same graceful degradation as Stripe: no keys →
empty catalog, checkout no-ops. Everything already ships in the template —
apps configure env, they don't write Pagopar code.

- **Catalog**: `getPagoparPlans()` reads `PAGOPAR_PLANS="Base:60000,Plus:90000"`
  (₲/month — Pagopar has no product API). `/pricing` renders it when Stripe is
  keyless and posts the plan `name` to `checkoutAction`.
- **Checkout is two steps** because invoicing is mandatory in Paraguay: the
  pricing card posts to `checkoutAction`, which sends the buyer to
  `/dashboard/checkout?plan=…` to capture the team's tax identity
  (`teams.taxDocumentType` 'CI'|'RUC', `taxId`, `businessName` — prefilled on
  renewals). `pagoparCheckoutAction` validates it, saves it, calls
  `createPagoparOrder({ team, user, plan, billing })` and redirects to the
  returned hosted-checkout `url`. Before redirecting it stores
  `stripeCustomerId = 'pagopar:<hash>'` and `stripeProductId = 'pagopar:<plan>'`
  on the team — that's the whole hash→team mapping (a team pays through exactly
  one processor, so the Stripe columns are free). The buyer's RUC/CI + razón
  social go in the order's `comprador`, so every Pagopar order carries the data
  the factura needs.
- **Webhook**: `/api/pagopar/webhook` (set as the "respuesta" URL in the
  Pagopar dashboard) verifies the `sha1(private + hash_pedido)` signature via
  `verifyPagoparWebhook`, applies it with `handlePagoparPayment` (same DI as
  Stripe), and must echo `[payment]` back as the 200 body or Pagopar retries
  every 10 minutes.
- **No subscriptions**: one paid order = `PAGOPAR_PERIOD_DAYS` (30) of
  `subscriptionStatus='active'`. The webhook enqueues a `pagopar-expire` job
  that downgrades unless a renewal replaced the subscription id. `isSubscribed`
  works unchanged; there is no customer portal — renewals go through `/pricing`.
