import { describe, expect, it, vi, afterEach } from 'vitest'
import { rateLimit } from './rate-limit'

afterEach(() => vi.useRealTimers())

describe('rateLimit', () => {
  it('allows up to the limit, then blocks', () => {
    const key = `k-${Math.random()}`
    for (let i = 0; i < 3; i++) expect(rateLimit(key, { limit: 3 })).toBe(true)
    expect(rateLimit(key, { limit: 3 })).toBe(false)
  })

  it('resets after the window elapses', () => {
    vi.useFakeTimers()
    const key = `k-${Math.random()}`
    expect(rateLimit(key, { limit: 1, windowMs: 1000 })).toBe(true)
    expect(rateLimit(key, { limit: 1, windowMs: 1000 })).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit(key, { limit: 1, windowMs: 1000 })).toBe(true)
  })

  it('tracks keys independently', () => {
    const a = `a-${Math.random()}`
    const b = `b-${Math.random()}`
    expect(rateLimit(a, { limit: 1 })).toBe(true)
    expect(rateLimit(a, { limit: 1 })).toBe(false)
    expect(rateLimit(b, { limit: 1 })).toBe(true)
  })
})
