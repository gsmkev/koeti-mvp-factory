import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import type { Team } from '@koeti/db'

// Lazy: constructing eagerly at module load crashes the build for any app
// importing this package in an environment without STRIPE_SECRET_KEY set,
// even on routes that never touch Stripe.
let _stripe: Stripe | undefined
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-08-27.basil',
      })
    }
    return Reflect.get(_stripe, prop, receiver)
  },
})

export async function createCheckoutSession({
  team,
  priceId,
  getUser,
}: {
  team: Team | null
  priceId: string
  getUser: () => Promise<{ id: number } | null>
}) {
  const user = await getUser()
  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`)
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: team.stripeCustomerId || undefined,
    client_reference_id: String(user.id),
    allow_promotion_codes: true,
    subscription_data: { trial_period_days: 14 },
  })
  redirect(session.url!)
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing')
  }
  let configuration: Stripe.BillingPortal.Configuration
  const configurations = await stripe.billingPortal.configurations.list()
  if (configurations.data.length > 0) {
    configuration = configurations.data[0]
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId)
    if (!product.active) throw new Error("Team's product is not active in Stripe")
    const prices = await stripe.prices.list({ product: product.id, active: true })
    if (prices.data.length === 0) throw new Error('No active prices found')
    configuration = await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Manage your subscription' },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [{ product: product.id, prices: prices.data.map((p) => p.id) }],
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        payment_method_update: { enabled: true },
      },
    })
  }
  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id,
  })
}

type BillingDeps = {
  getTeamByStripeCustomerId: (customerId: string) => Promise<Team | null>
  updateTeamSubscription: (
    teamId: number,
    data: {
      stripeSubscriptionId: string | null
      stripeProductId: string | null
      planName: string | null
      subscriptionStatus: string
    }
  ) => Promise<void>
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  deps: BillingDeps
) {
  const customerId = subscription.customer as string
  const team = await deps.getTeamByStripeCustomerId(customerId)
  if (!team) {
    console.error('Team not found for Stripe customer:', customerId)
    return
  }
  const status = subscription.status
  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan
    await deps.updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscription.id,
      stripeProductId: plan?.product as string,
      planName: (plan?.product as Stripe.Product).name,
      subscriptionStatus: status,
    })
  } else if (status === 'canceled' || status === 'unpaid') {
    await deps.updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status,
    })
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({ expand: ['data.product'], active: true, type: 'recurring' })
  return prices.data.map((price) => ({
    id: price.id,
    productId: typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }))
}

export async function getStripeProducts() {
  const products = await stripe.products.list({ active: true, expand: ['data.default_price'] })
  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string' ? product.default_price : product.default_price?.id,
  }))
}
