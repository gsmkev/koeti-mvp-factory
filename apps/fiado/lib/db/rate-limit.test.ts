// Integration test for the durable rate limit — runs only when a real
// Postgres is reachable (local dev, smoke/e2e CI); the unit-test CI job has a
// dummy POSTGRES_URL and skips.
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { consumeRateLimit, cleanupRateLimits } from '@koeti/db';

let db: (typeof import('./drizzle'))['db'] | null = null;
try {
  const mod = await import('./drizzle');
  await mod.db.execute(sql`select 1`);
  db = mod.db;
} catch {
  // no reachable DB — covered by the smoke/e2e jobs
}

describe.skipIf(!db)('consumeRateLimit', () => {
  it('allows up to the limit, then blocks', async () => {
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      expect(await consumeRateLimit(db, key, { limit: 3 })).toBe(true);
    }
    expect(await consumeRateLimit(db, key, { limit: 3 })).toBe(false);
  });

  it('resets after the window expires', async () => {
    const key = `test:${crypto.randomUUID()}`;
    expect(await consumeRateLimit(db, key, { limit: 1, windowMs: 100 })).toBe(true);
    expect(await consumeRateLimit(db, key, { limit: 1, windowMs: 100 })).toBe(false);
    await new Promise((r) => setTimeout(r, 150));
    expect(await consumeRateLimit(db, key, { limit: 1, windowMs: 100 })).toBe(true);
  });

  it('cleanup runs without error', async () => {
    await cleanupRateLimits(db);
  });
});
