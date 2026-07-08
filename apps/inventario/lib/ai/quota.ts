// AI quota for this SaaS. Limits resolve tenant override > plan > default
// (resolveAiLimits): perMinute is an in-memory burst guard, perDay a durable
// counter in ai_usage. Call consumeAiQuota(team) before every AI request.
import { rateLimit } from '@koeti/auth';
import { resolveAiLimits, type AiLimitConfig } from '@koeti/ai';
import { isSubscribed } from '@koeti/billing';
import { aiUsage, type Team } from '@koeti/db';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

// Per-SaaS knob. Plan keys match teams.planName (Stripe product name),
// lowercased. AI is an Empresarial-only feature (see lib/plan.ts) — this only
// throttles usage once a request is already gated in by isEnterprise().
export const aiLimitConfig: AiLimitConfig = {
  perMinute: 5,
  perDay: 20, // no active subscription
  plans: {
    empresarial: { perMinute: 20, perDay: 1000 },
  },
};

export type AiQuotaResult = { ok: true } | { ok: false; reason: 'perMinute' | 'perDay' };

export async function consumeAiQuota(team: Team): Promise<AiQuotaResult> {
  const limits = resolveAiLimits(
    // A lapsed subscription falls back to the free allowance.
    { planName: isSubscribed(team) ? team.planName : null, aiDailyLimit: team.aiDailyLimit },
    aiLimitConfig,
  );
  if (!rateLimit(`ai:${team.id}`, { limit: limits.perMinute })) {
    return { ok: false, reason: 'perMinute' };
  }
  const day = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .insert(aiUsage)
    .values({ teamId: team.id, day, requests: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.teamId, aiUsage.day],
      set: { requests: sql`${aiUsage.requests} + 1` },
    })
    .returning({ requests: aiUsage.requests });
  if (row.requests > limits.perDay) return { ok: false, reason: 'perDay' };
  return { ok: true };
}
