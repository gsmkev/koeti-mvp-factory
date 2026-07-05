// Tests for config.
import { describe, expect, it } from 'vitest';
import { resolveLocale, locales } from './config';
import en from '../messages/en.json';
import es from '../messages/es.json';
import pt from '../messages/pt.json';

// Recursive key set (namespace.key) so a missing/typo'd translation fails CI
// instead of silently falling back to the key at runtime.
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? keyPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe('baseline message parity', () => {
  const base = keyPaths(en).sort();
  it.each([
    ['es', es],
    ['pt', pt],
  ])('%s has exactly the same keys as en', (_name, msgs) => {
    expect(keyPaths(msgs as Record<string, unknown>).sort()).toEqual(base);
  });
});

describe('resolveLocale', () => {
  it('prefers a valid cookie', () => {
    expect(resolveLocale('pt', 'en-US,en')).toBe('pt');
  });
  it('ignores an unknown cookie and falls back to Accept-Language', () => {
    expect(resolveLocale('fr', 'es-AR,es;q=0.9,en;q=0.8')).toBe('es');
  });
  it('falls back to the default when nothing matches', () => {
    expect(resolveLocale(undefined, 'fr-FR,fr')).toBe('en');
    expect(resolveLocale(null, null)).toBe('en');
  });
  it('only ever returns a supported locale', () => {
    expect(locales).toContain(resolveLocale('zz', 'zz'));
  });
});
