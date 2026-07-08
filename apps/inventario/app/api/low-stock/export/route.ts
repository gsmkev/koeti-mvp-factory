// API route (GET) — /api/low-stock/export.
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key';
import { csvResponse, toCsv } from '@/lib/csv';
import { getLowStockProducts, getTeamForUser } from '@/lib/db/queries';
import { planLimitsFor } from '@/lib/plan';

export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 });
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  if (!team) return new Response('Unauthorized', { status: 401 });
  if (!planLimitsFor(team).csvExport) {
    return new Response('CSV export requires the Premium or Empresarial plan.', { status: 402 });
  }
  const params = new URL(request.url).searchParams;
  const rows = await getLowStockProducts(team.id, {
    warehouseId: params.get('warehouseId') ? Number(params.get('warehouseId')) : undefined,
    category: params.get('category') ?? undefined,
  });
  return csvResponse(
    toCsv(rows, ['sku', 'name', 'category', 'stock', 'minStock', 'unit']),
    'low-stock.csv',
  );
}
