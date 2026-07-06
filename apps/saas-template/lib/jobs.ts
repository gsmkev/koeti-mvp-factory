// Background job handlers for this SaaS. Register one per job type — the
// /api/cron/jobs sweep claims due jobs (atomic, multi-instance safe) and runs
// them here with retries + backoff. See .claude/rules/jobs.md.
//
// Enqueue from any action/route:
//   import { enqueueJob } from '@koeti/db';
//   await enqueueJob(db, 'sync-report', { month }, { teamId: team.id });
import { eq } from 'drizzle-orm';
import { teams, type JobHandler } from '@koeti/db';
import { db } from '@/lib/db/drizzle';

export const jobHandlers: Record<string, JobHandler> = {
  // Pagopar has no subscriptions: each paid order buys one period (enqueued by
  // /api/pagopar/webhook). Downgrade when it lapses — unless a renewal already
  // replaced the subscription id, in which case this job is stale and no-ops.
  'pagopar-expire': async (payload) => {
    const { teamId, order } = payload as { teamId: number; order: string };
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (team?.stripeSubscriptionId !== order) return;
    await db
      .update(teams)
      .set({
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  },
};
