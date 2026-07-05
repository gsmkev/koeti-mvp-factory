// What the daily insights cron computes per team. Deliberately statistical,
// not AI — deterministic, free, explainable. Three detectors on expenses:
// daily-spend anomaly, category concentration, possible duplicates.
// messageKey is relative to this app's `insightMessages` i18n namespace.
import { detectAnomalies } from '@koeti/ai';
import type { NewInsight } from '@koeti/db';
import { and, asc, eq, gt, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { expenses } from '@/lib/db/schema';

const money = (n: number) =>
  `$${n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function generateInsights(teamId: number): Promise<NewInsight[]> {
  const out: NewInsight[] = [];
  const last30 = gte(expenses.spentAt, sql`(now() - interval '30 days')::date`);

  // 1. Daily spend anomaly: z-score over the last 30 days of daily totals.
  const daily = await db
    .select({ day: expenses.spentAt, total: sql<number>`sum(${expenses.amount})::float` })
    .from(expenses)
    .where(and(eq(expenses.teamId, teamId), last30))
    .groupBy(expenses.spentAt)
    .orderBy(asc(expenses.spentAt));
  for (const a of detectAnomalies(daily.map((d) => ({ label: d.day, value: d.total }))).filter(
    (a) => a.zScore > 0, // cheap days aren't worth an alert
  )) {
    out.push({
      teamId,
      kind: 'anomaly',
      severity: 'warning',
      messageKey: 'spendSpike',
      params: JSON.stringify({ day: a.label, total: money(a.value), avg: money(a.mean) }),
      dedupeKey: `spendSpike:${a.label}`,
    });
  }

  // 2. Category concentration: one category holding ≥50% of 30-day spend.
  const byCat = await db
    .select({ category: expenses.category, total: sql<number>`sum(${expenses.amount})::float` })
    .from(expenses)
    .where(and(eq(expenses.teamId, teamId), last30))
    .groupBy(expenses.category);
  const total = byCat.reduce((s, c) => s + c.total, 0);
  const top = byCat.reduce((a, b) => (b.total > a.total ? b : a), { category: '', total: 0 });
  const share = total > 0 ? Math.round((top.total / total) * 100) : 0;
  if (byCat.length > 1 && share >= 50) {
    out.push({
      teamId,
      kind: 'suggestion',
      severity: 'info',
      messageKey: 'topCategoryShare',
      params: JSON.stringify({ category: top.category, share }),
      // one nudge per category per month
      dedupeKey: `topCategoryShare:${new Date().toISOString().slice(0, 7)}:${top.category}`,
    });
  }

  // 3. Possible duplicates: same description+amount+date in the last 7 days.
  const dupes = await db
    .select({
      description: expenses.description,
      amount: expenses.amount,
      day: expenses.spentAt,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.teamId, teamId),
        gte(expenses.spentAt, sql`(now() - interval '7 days')::date`),
      ),
    )
    .groupBy(expenses.description, expenses.amount, expenses.spentAt)
    .having(({ count }) => gt(count, 1));
  for (const d of dupes) {
    out.push({
      teamId,
      kind: 'suggestion',
      severity: 'warning',
      messageKey: 'possibleDuplicate',
      params: JSON.stringify({
        description: d.description,
        total: money(Number(d.amount)),
        day: d.day,
      }),
      dedupeKey: `possibleDuplicate:${d.day}:${d.description}:${d.amount}`,
    });
  }

  return out;
}
