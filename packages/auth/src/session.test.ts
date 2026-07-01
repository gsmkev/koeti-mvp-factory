import { beforeEach, describe, expect, it, vi } from 'vitest'

// session.ts imports next/headers (only used by getSession/setSession, not under test)
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { comparePasswords, hashPassword, signToken, verifyToken } from './session'

describe('password hashing', () => {
  it('round-trips a password', async () => {
    const hashed = await hashPassword('hunter2')
    expect(hashed).not.toBe('hunter2')
    expect(await comparePasswords('hunter2', hashed)).toBe(true)
    expect(await comparePasswords('wrong', hashed)).toBe(false)
  })
})

describe('session tokens', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('signs and verifies a session round-trip', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-0123456789abcdef')
    const token = await signToken({ user: { id: 42 }, expires: new Date().toISOString() })
    const payload = await verifyToken(token)
    expect(payload.user.id).toBe(42)
  })

  it('rejects a tampered token', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-0123456789abcdef')
    const token = await signToken({ user: { id: 42 }, expires: new Date().toISOString() })
    const tampered = token.slice(0, -2) + 'xx'
    await expect(verifyToken(tampered)).rejects.toThrow()
  })
})
