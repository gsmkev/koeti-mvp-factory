# Background jobs — Postgres queue, no Redis

Durable queue on the `jobs` table (`@koeti/db`). Atomic claim via
`FOR UPDATE SKIP LOCKED`, retries with exponential backoff (2/4/8 min), dead
letter (`status = 'failed'`) after `maxAttempts` (default 3). `done` rows are
pruned after 7 days automatically. A Vercel cron sweeps every 5 minutes.

Use it for anything that shouldn't block a request or must survive a flaky
external call: webhook fan-out, report generation, third-party syncs, bulk
imports. **Don't** use it for sub-minute latency needs — the sweep cadence is
the floor; call the external service inline if the user is waiting for it.

## Enqueue (from any action or route)

```ts
import { enqueueJob } from '@koeti/db';
import { db } from '@/lib/db/drizzle';

await enqueueJob(db, 'sync-report', { month: '2026-07' }, { teamId: team.id });
// opts: teamId (scoping), runAt (schedule for later), maxAttempts
```

## Handle (per app, `lib/jobs.ts`)

```ts
export const jobHandlers: Record<string, JobHandler> = {
  'sync-report': async (payload, job) => {
    // throw = retry with backoff; return = done. Make it idempotent —
    // delivery is at-least-once (a crash after work but before the status
    // update replays the job).
  },
};
```

Unknown job types retry and dead-letter like any failure, so a typo'd type
never wedges the queue.

## Ops

- Sweep endpoint: `GET /api/cron/jobs` with `Authorization: Bearer $CRON_SECRET`
  (same auth as the insights cron). Curl it locally to drain the queue in dev.
- Stuck/poisoned jobs are visible in SQL: `select * from jobs where status = 'failed'`.
  Re-run one by setting `status = 'pending', attempts = 0`.
- A job claimed by a sweep that crashed mid-run is reclaimed automatically
  after an hour (counts as a failed attempt, so a crash-looping job still
  dead-letters instead of spinning forever).
