import { describe, expect, it } from 'vitest'
import en from '../messages/en.json'
import es from '../messages/es.json'
import pt from '../messages/pt.json'

// Every business-message file must carry the same keys, so a forgotten
// translation fails here instead of rendering the raw key in production.
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' && !Array.isArray(v)
      ? keyPaths(v as Record<string, unknown>, path)
      : [path]
  })
}

describe('app message parity', () => {
  const base = keyPaths(en).sort()
  it.each([
    ['es', es],
    ['pt', pt],
  ])('%s has exactly the same keys as en', (_name, msgs) => {
    expect(keyPaths(msgs as Record<string, unknown>).sort()).toEqual(base)
  })
})
