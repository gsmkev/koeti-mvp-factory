import { beforeEach, describe, expect, it, vi } from 'vitest'

// stripe.ts imports next/navigation for redirect (not under test here)
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const retrieveProduct = vi.fn()
vi.mock('stripe', () => ({
  default: vi.fn(() => ({ products: { retrieve: retrieveProduct } })),
}))

import type Stripe from 'stripe'
import { getStripePrices, getStripeProducts, handleSubscriptionChange } from './stripe'

describe('catalog fetchers without a Stripe key', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
  })

  it('getStripePrices returns an empty catalog', async () => {
    expect(await getStripePrices()).toEqual([])
  })

  it('getStripeProducts returns an empty catalog', async () => {
    expect(await getStripeProducts()).toEqual([])
  })
})

function makeSubscription(
  status: Stripe.Subscription.Status,
  product: unknown = { id: 'prod_123', name: 'Base' }
): Stripe.Subscription {
  return {
    id: 'sub_123',
    customer: 'cus_123',
    status,
    items: { data: [{ plan: { product } }] },
  } as unknown as Stripe.Subscription
}

describe('handleSubscriptionChange', () => {
  const team = { id: 7 } as never

  it('activates the subscription on the team', async () => {
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(team),
      updateTeamSubscription: vi.fn().mockResolvedValue(undefined),
    }
    await handleSubscriptionChange(makeSubscription('active'), deps)
    expect(deps.updateTeamSubscription).toHaveBeenCalledWith(7, {
      stripeSubscriptionId: 'sub_123',
      stripeProductId: 'prod_123',
      planName: 'Base',
      subscriptionStatus: 'active',
    })
  })

  it('clears subscription fields when canceled', async () => {
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(team),
      updateTeamSubscription: vi.fn().mockResolvedValue(undefined),
    }
    await handleSubscriptionChange(makeSubscription('canceled'), deps)
    expect(deps.updateTeamSubscription).toHaveBeenCalledWith(7, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: 'canceled',
    })
  })

  it('resolves the plan name when product is an unexpanded id (real webhook shape)', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy')
    retrieveProduct.mockResolvedValue({ name: 'Base' })
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(team),
      updateTeamSubscription: vi.fn().mockResolvedValue(undefined),
    }
    await handleSubscriptionChange(makeSubscription('trialing', 'prod_123'), deps)
    expect(retrieveProduct).toHaveBeenCalledWith('prod_123')
    expect(deps.updateTeamSubscription).toHaveBeenCalledWith(7, {
      stripeSubscriptionId: 'sub_123',
      stripeProductId: 'prod_123',
      planName: 'Base',
      subscriptionStatus: 'trialing',
    })
  })

  it('does nothing for an unknown customer', async () => {
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(null),
      updateTeamSubscription: vi.fn(),
    }
    await handleSubscriptionChange(makeSubscription('active'), deps)
    expect(deps.updateTeamSubscription).not.toHaveBeenCalled()
  })
})
