// What the daily insights cron computes per team. Deliberately statistical,
// not AI — deterministic, free, explainable. The template ships one generic
// detector (activity volume anomaly) as the worked example; MVPs replace or
// extend this with business detectors (see apps/gastos/lib/ai/insights.ts).
// messageKey is relative to the app's `insightMessages` i18n namespace.
import { detectAnomalies } from '@koeti/ai';
import { activityLogs, type NewInsight } from '@koeti/db';
import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

export async function generateInsights(teamId: number): Promise<NewInsight[]> {
  const day = sql<string>`to_char(${activityLogs.timestamp}, 'YYYY-MM-DD')`;
  const rows = await db
    .select({ day, count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.teamId, teamId),
        gte(activityLogs.timestamp, sql`now() - interval '30 days'`),
      ),
    )
    .groupBy(day)
    .orderBy(asc(day));

  return detectAnomalies(rows.map((r) => ({ label: r.day, value: r.count })))
    .filter((a) => a.zScore > 0) // quiet days aren't worth an alert
    .map((a) => ({
      teamId,
      kind: 'anomaly',
      severity: 'warning',
      messageKey: 'activitySpike',
      params: JSON.stringify({ day: a.label, count: a.value, avg: Math.round(a.mean) }),
      dedupeKey: `activitySpike:${a.label}`,
    }));
}
