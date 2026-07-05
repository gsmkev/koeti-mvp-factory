// @koeti/db — durable fixed-window rate limit backed by the rate_limits table.
// Use for auth-sensitive actions (sign-in, sign-up, password reset) where the
// in-memory limiter's per-instance window is not enough: this one holds across
// every instance because Postgres is the shared store.
import { sql, lt } from 'drizzle-orm';
import { rateLimits } from './schema';

// ponytail: db typed `any` — same call as seed.ts; threading drizzle generics
// through every app isn't worth it. Runtime shape is all we use.
type Db = any;

/**
 * Atomically consume one hit from the fixed window for `key`.
 * Returns true while the window has budget left. A single upsert: expired
 * window → reset to 1, live window → increment. No read-modify-write race.
 */
export async function consumeRateLimit(
  db: Db,
  key: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): Promise<boolean> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: new Date(Date.now() + windowMs) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= now() then excluded.reset_at else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

/** Drop windows that expired more than a day ago. Piggyback on a daily cron. */
export async function cleanupRateLimits(db: Db) {
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, sql`now() - interval '1 day'`));
}
