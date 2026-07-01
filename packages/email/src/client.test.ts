import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { sendEmail } from './client'

describe('sendEmail without a Resend key', () => {
  it('skips with a warning instead of throwing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      sendEmail({ to: 'a@b.c', subject: 'Welcome', react: {} as ReactElement })
    ).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
