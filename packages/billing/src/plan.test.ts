import { describe, expect, it } from 'vitest'
import { isSubscribed } from './plan'

describe('isSubscribed', () => {
  it('grants access for active and trialing', () => {
    expect(isSubscribed({ subscriptionStatus: 'active' })).toBe(true)
    expect(isSubscribed({ subscriptionStatus: 'trialing' })).toBe(true)
  })

  it('denies everything else', () => {
    for (const status of ['canceled', 'unpaid', 'past_due', 'incomplete', '', null]) {
      expect(isSubscribed({ subscriptionStatus: status })).toBe(false)
    }
  })
})
