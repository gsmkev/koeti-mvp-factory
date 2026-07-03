import { describe, expect, it } from 'vitest'
import { apiRateLimitOk } from './api-rate-limit'

// The interesting branch: only Bearer callers are throttled, and only their IP.
describe('apiRateLimitOk', () => {
  it('never throttles requests without an Authorization header (session/dashboard)', () => {
    const req = () => new Request('http://x/api/team')
    for (let i = 0; i < 200; i++) expect(apiRateLimitOk(req())).toBe(true)
  })

  it('throttles a Bearer caller past the limit, keyed by IP', () => {
    const ip = '203.0.113.7'
    const req = () =>
      new Request('http://x/api/team', {
        headers: { authorization: 'Bearer koeti_x', 'x-forwarded-for': ip },
      })
    const limit = 3
    const results = Array.from({ length: 5 }, () => apiRateLimitOk(req(), limit))
    expect(results.slice(0, limit)).toEqual([true, true, true])
    expect(results.slice(limit)).toEqual([false, false])

    // A different IP has its own window.
    const other = new Request('http://x/api/team', {
      headers: { authorization: 'Bearer koeti_x', 'x-forwarded-for': '198.51.100.9' },
    })
    expect(apiRateLimitOk(other, limit)).toBe(true)
  })
})
