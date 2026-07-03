import { describe, expect, it } from 'vitest'
import { apiKeyPrefix, generateApiKey, hashApiKey } from './api-key'

describe('api keys', () => {
  it('generates unique koeti_-prefixed keys', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a).toMatch(/^koeti_[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('hashes deterministically and distinctly', async () => {
    const key = generateApiKey()
    expect(await hashApiKey(key)).toBe(await hashApiKey(key))
    expect(await hashApiKey(key)).not.toBe(await hashApiKey(generateApiKey()))
    expect(await hashApiKey(key)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('prefix identifies without revealing', () => {
    const key = generateApiKey()
    expect(apiKeyPrefix(key)).toHaveLength(14)
    expect(key.startsWith(apiKeyPrefix(key))).toBe(true)
  })
})
