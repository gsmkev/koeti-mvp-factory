import { describe, expect, it, vi } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')

import { identify, track } from './server'

describe('analytics without a PostHog key', () => {
  it('track is a silent no-op', () => {
    expect(() => track('signed_up', { userId: '1', plan: 'base' })).not.toThrow()
  })

  it('identify is a silent no-op', () => {
    expect(() => identify('1', { email: 'a@b.c' })).not.toThrow()
  })
})
