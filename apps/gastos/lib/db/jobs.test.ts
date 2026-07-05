// Integration test for the durable jobs queue — runs only when a real
// Postgres is reachable (local dev, smoke/e2e CI); the unit-test CI job has a
// dummy POSTGRES_URL and skips.
import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { enqueueJob, runJobs, jobs, backoffDelayMs } from '@koeti/db';

let db: (typeof import('./drizzle'))['db'] | null = null;
try {
  const mod = await import('./drizzle');
  await mod.db.execute(sql`select 1`);
  db = mod.db;
} catch {
  // no reachable DB — covered by the smoke/e2e jobs
}

it('backoff grows exponentially', () => {
  expect(backoffDelayMs(1)).toBe(120_000);
  expect(backoffDelayMs(2)).toBe(240_000);
  expect(backoffDelayMs(3)).toBe(480_000);
});

describe.skipIf(!db)('jobs queue', () => {
  it('processes a job through its handler', async () => {
    const seen: unknown[] = [];
    const type = `test-ok-${crypto.randomUUID()}`;
    const id = await enqueueJob(db, type, { n: 42 });
    const result = await runJobs(db, { [type]: async (payload) => void seen.push(payload) }, 50);
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(seen).toContainEqual({ n: 42 });
    const [row] = await db!.select().from(jobs).where(eq(jobs.id, id));
    expect(row.status).toBe('done');
  });

  it('retries with backoff, then dead-letters after maxAttempts', async () => {
    const type = `test-fail-${crypto.randomUUID()}`;
    const id = await enqueueJob(db, type, {}, { maxAttempts: 2 });
    const boom = async () => {
      throw new Error('boom');
    };
    await runJobs(db, { [type]: boom }, 50);
    let [row] = await db!.select().from(jobs).where(eq(jobs.id, id));
    expect(row.status).toBe('pending');
    expect(row.attempts).toBe(1);
    expect(row.runAt.getTime()).toBeGreaterThan(Date.now()); // backed off

    // Force the retry due now, then exhaust attempts → failed (dead letter).
    await db!.update(jobs).set({ runAt: new Date() }).where(eq(jobs.id, id));
    await runJobs(db, { [type]: boom }, 50);
    [row] = await db!.select().from(jobs).where(eq(jobs.id, id));
    expect(row.status).toBe('failed');
    expect(row.lastError).toBe('boom');
  });
});
