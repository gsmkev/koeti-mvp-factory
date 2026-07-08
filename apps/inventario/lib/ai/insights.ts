// What the daily insights cron computes for a team — Empresarial-only
// feature (see spec: AI/suggestions are gated to the top plan tier). The
// cron route only calls this for Empresarial teams; keep it that way rather
// than re-checking the plan here.
// messageKey is relative to this app's `insightMessages` i18n namespace.
import { aiJson, AiError } from '@koeti/ai';
import type { NewInsight, Team } from '@koeti/db';
import { getLowStockProducts } from '@/lib/db/queries';
import { consumeAiQuota } from '@/lib/ai/quota';

export async function generateInsights(team: Team): Promise<NewInsight[]> {
  const teamId = team.id;
  const lowStock = await getLowStockProducts(teamId);
  if (lowStock.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const out: NewInsight[] = [];

  // Deterministic, free: one alert per product that crossed its threshold.
  for (const p of lowStock.slice(0, 10)) {
    out.push({
      teamId,
      kind: 'anomaly',
      severity: 'warning',
      messageKey: 'lowStockAlert',
      params: JSON.stringify({ name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock }),
      dedupeKey: `lowStockAlert:${today}:${p.id}`,
    });
  }

  // AI, one call per team per day: a prioritized restock suggestion in plain
  // language. Skips quietly if the quota is spent or the model is unreachable
  // — the deterministic alerts above still land either way.
  const quota = await consumeAiQuota(team);
  if (quota.ok) {
    try {
      const { summary } = await aiJson<{ summary: string }>({
        tier: 'balanced',
        system:
          'You are an inventory assistant for a small Paraguayan retail business. ' +
          'Given a JSON list of low-stock products (sku, name, stock, minStock), write ONE ' +
          'short, actionable restock suggestion in Spanish (max 2 sentences), prioritizing ' +
          'the most urgent items. Respond as JSON: {"summary": "..."}.',
        prompt: JSON.stringify(
          lowStock
            .slice(0, 10)
            .map((p) => ({ sku: p.sku, name: p.name, stock: p.stock, minStock: p.minStock })),
        ),
        maxTokens: 200,
        json: true,
      });
      out.push({
        teamId,
        kind: 'suggestion',
        severity: 'info',
        messageKey: 'aiRestockSuggestion',
        params: JSON.stringify({ summary }),
        dedupeKey: `aiRestockSuggestion:${today}`,
      });
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      // No MISTRAL_API_KEY / model unreachable — deterministic alerts stand alone.
    }
  }

  return out;
}
