// What the daily insights cron computes per team — Premium-only (see
// /pricing and api/cron/insights/route.ts, which skips non-Premium teams
// before ever calling this). Two real, business-specific detectors instead
// of the template's generic activity-anomaly stub: low stock and clients
// over their credit limit. Deterministic, no AI. messageKey is relative to
// the app's `insightMessages` i18n namespace. dedupeKey is day-scoped so
// the same product/client can re-alert once a day, not once ever.
import { type NewInsight } from '@koeti/db';
import { getLowStockProductos, getClientesOverLimit } from '@/lib/db/queries';

const money = (n: number) => `₲${n.toLocaleString('es-PY')}`;

export async function generateInsights(teamId: number): Promise<NewInsight[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [lowStock, overLimit] = await Promise.all([
    getLowStockProductos(teamId),
    getClientesOverLimit(teamId),
  ]);

  const stockInsights: NewInsight[] = lowStock.map((p) => ({
    teamId,
    kind: 'suggestion',
    severity: p.stock <= 0 ? 'warning' : 'info',
    messageKey: 'lowStock',
    params: JSON.stringify({ producto: p.name, stock: p.stock }),
    dedupeKey: `lowStock:${p.id}:${today}`,
  }));

  const creditInsights: NewInsight[] = overLimit.map((c) => ({
    teamId,
    kind: 'anomaly',
    severity: 'warning',
    messageKey: 'overCreditLimit',
    params: JSON.stringify({
      cliente: c.name,
      balance: money(Number(c.balance)),
      limit: money(Number(c.creditLimit)),
    }),
    dedupeKey: `overCreditLimit:${c.id}:${today}`,
  }));

  return [...stockInsights, ...creditInsights];
}
