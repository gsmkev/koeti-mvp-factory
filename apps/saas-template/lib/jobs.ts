// Background job handlers for this SaaS. Register one per job type — the
// /api/cron/jobs sweep claims due jobs (atomic, multi-instance safe) and runs
// them here with retries + backoff. See .claude/rules/jobs.md.
//
// Enqueue from any action/route:
//   import { enqueueJob } from '@koeti/db';
//   await enqueueJob(db, 'sync-report', { month }, { teamId: team.id });
import type { JobHandler } from '@koeti/db';

export const jobHandlers: Record<string, JobHandler> = {
  // 'sync-report': async (payload, job) => { … },
};
