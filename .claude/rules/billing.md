---
paths:
  - "**/app/api/stripe/**"
  - "**/lib/payments/**"
  - "**/lib/billing/**"
---

# Billing pattern

## Webhook route — always inject DB deps

```ts
// app/api/stripe/webhook/route.ts
import { stripe, handleSubscriptionChange } from '@koeti/billing'
import { getTeamByStripeCustomerId, updateTeamSubscription } from '@/lib/db/queries'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature') as string
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    await handleSubscriptionChange(event.data.object as Stripe.Subscription, {
      getTeamByStripeCustomerId,
      updateTeamSubscription,
    })
  }
  return NextResponse.json({ received: true })
}
```

## Checkout + portal actions

```ts
// lib/payments/actions.ts
'use server'
import { createCheckoutSession, createCustomerPortalSession } from '@koeti/billing'
import { withTeam } from '@/lib/auth/middleware'
import { getUser } from '@/lib/db/queries'

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string
  await createCheckoutSession({ team, priceId, getUser })
})

export const customerPortalAction = withTeam(async (_, team) => {
  const { redirect } = await import('next/navigation')
  const portal = await createCustomerPortalSession(team)
  redirect(portal.url)
})
```

- Never `new Stripe(...)` in an app. Always use `stripe` from `@koeti/billing`.
- `handleSubscriptionChange` requires DI: pass `getTeamByStripeCustomerId` and `updateTeamSubscription` from `lib/db/queries`.
