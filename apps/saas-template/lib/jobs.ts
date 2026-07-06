// Background job handlers for this SaaS. Register one per job type — the
// /api/cron/jobs sweep claims due jobs (atomic, multi-instance safe) and runs
// them here with retries + backoff. See .claude/rules/jobs.md.
//
// Enqueue from any action/route:
//   import { enqueueJob } from '@koeti/db';
//   await enqueueJob(db, 'sync-report', { month }, { teamId: team.id });
import { and, eq } from 'drizzle-orm';
import { invoices, teamMembers, teams, users, type JobHandler } from '@koeti/db';
import { emitSifenInvoice, sifenEnabled } from '@koeti/billing';
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

  // Emit the legal factura electrónica (SIFEN, via FacturaSend) for a paid
  // Pagopar order. Enqueued by /api/pagopar/webhook. Idempotent two ways:
  // the early lookup skips re-runs, and invoices.order_ref is UNIQUE so even
  // a race can't double-invoice. A FacturaSend error throws → retry/backoff →
  // dead-letter, visible in the jobs table.
  'sifen-invoice': async (payload) => {
    if (!sifenEnabled()) return;
    const { teamId, order, amount } = payload as { teamId: number; order: string; amount: number };
    if (!amount) throw new Error(`sifen-invoice ${order}: missing amount`);
    const existing = await db.select().from(invoices).where(eq(invoices.orderRef, order)).limit(1);
    if (existing.length) return;
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return;
    const [owner] = await db
      .select({ email: users.email })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, 'owner')))
      .limit(1);
    const emitted = await emitSifenInvoice({
      buyer: {
        taxDocumentType: team.taxDocumentType,
        taxId: team.taxId,
        businessName: team.businessName ?? team.name,
        email: owner?.email ?? '',
      },
      // Legal document for Paraguay — deliberately Spanish, not t().
      item: { description: `Suscripción ${team.planName ?? 'mensual'}`, amount },
    });
    await db
      .insert(invoices)
      .values({
        teamId,
        orderRef: order,
        cdc: emitted.cdc || null,
        number: emitted.numero || null,
        status: emitted.estado,
        amount,
      })
      .onConflictDoNothing();
  },
};
