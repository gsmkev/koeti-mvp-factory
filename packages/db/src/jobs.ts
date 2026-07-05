// @koeti/db — durable background jobs on the jobs table. No Redis: Postgres
// FOR UPDATE SKIP LOCKED gives an atomic claim, so concurrent sweeps (cron
// overlap, multiple instances) never double-run a job. Retries back off
// exponentially; after maxAttempts the job parks as 'failed' (dead letter).
//
// Per app: register handlers in lib/jobs.ts and sweep from
// app/api/cron/jobs/route.ts — see .claude/rules/jobs.md.
import { eq, sql, and, lt } from 'drizzle-orm';
import { jobs, type Job } from './schema';

// ponytail: db typed `any` — same call as seed.ts / rate-limit.ts.
type Db = any;

export type JobHandler = (payload: Record<string, unknown>, job: Job) => Promise<void>;

export async function enqueueJob(
  db: Db,
  type: string,
  payload: Record<string, unknown> = {},
  opts: { teamId?: number; runAt?: Date; maxAttempts?: number } = {},
): Promise<number> {
  const [row] = await db
    .insert(jobs)
    .values({
      type,
      payload: JSON.stringify(payload),
      teamId: opts.teamId,
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 3,
    })
    .returning({ id: jobs.id });
  return row.id;
}

/** Atomically claim up to `batch` due jobs (pending → running). */
export async function claimJobs(db: Db, batch = 10): Promise<Job[]> {
  return (
    db
      .update(jobs)
      // runAt doubles as the claim timestamp while running — runJobs uses it to
      // reclaim jobs whose worker died mid-run.
      .set({ status: 'running', runAt: new Date() })
      .where(
        sql`${jobs.id} in (select id from jobs where status = 'pending' and run_at <= now() order by run_at asc limit ${batch} for update skip locked)`,
      )
      .returning()
  );
}

export function backoffDelayMs(attempts: number): number {
  return 2 ** attempts * 60_000; // 2min, 4min, 8min…
}

/**
 * Claim due jobs and run them through `handlers`. Errors (and unknown types)
 * retry with backoff until maxAttempts, then park as 'failed'. Also prunes
 * 'done' rows older than 7 days so the table never needs external cleanup.
 */
export async function runJobs(
  db: Db,
  handlers: Record<string, JobHandler>,
  batch = 10,
): Promise<{ processed: number; failed: number }> {
  // A worker that died mid-run leaves its jobs 'running' forever. Reclaim
  // anything claimed over an hour ago, counting it as a failed attempt
  // (dead-letters when maxAttempts is exhausted), then sweep as usual.
  await db
    .update(jobs)
    .set({
      status: sql`case when ${jobs.attempts} + 1 >= ${jobs.maxAttempts} then 'failed' else 'pending' end`,
      attempts: sql`${jobs.attempts} + 1`,
      lastError: 'reset: claimed over an hour ago (worker died mid-run)',
    })
    .where(and(eq(jobs.status, 'running'), lt(jobs.runAt, sql`now() - interval '1 hour'`)));

  const claimed = await claimJobs(db, batch);
  let processed = 0;
  let failed = 0;
  for (const job of claimed) {
    try {
      const handler = handlers[job.type];
      if (!handler) throw new Error(`unknown job type: ${job.type}`);
      await handler(JSON.parse(job.payload), job);
      await db.update(jobs).set({ status: 'done' }).where(eq(jobs.id, job.id));
      processed += 1;
    } catch (err) {
      const attempts = job.attempts + 1;
      const dead = attempts >= job.maxAttempts;
      await db
        .update(jobs)
        .set({
          status: dead ? 'failed' : 'pending',
          attempts,
          lastError: err instanceof Error ? err.message : String(err),
          runAt: new Date(Date.now() + backoffDelayMs(attempts)),
        })
        .where(eq(jobs.id, job.id));
      failed += 1;
    }
  }
  await db
    .delete(jobs)
    .where(and(eq(jobs.status, 'done'), lt(jobs.createdAt, sql`now() - interval '7 days'`)));
  return { processed, failed };
}
