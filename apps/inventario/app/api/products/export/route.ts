// API route (GET) — /api/products/export.
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key';
import { csvResponse, toCsv } from '@/lib/csv';
import { getProducts, getStockByProduct, getTeamForUser } from '@/lib/db/queries';
import { planLimitsFor } from '@/lib/plan';

export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 });
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  if (!team) return new Response('Unauthorized', { status: 401 });
  if (!planLimitsFor(team).csvExport) {
    return new Response('CSV export requires the Premium or Empresarial plan.', { status: 402 });
  }
  const params = new URL(request.url).searchParams;
  const [rows, stockMap] = await Promise.all([
    getProducts(team.id, {
      q: params.get('q') ?? undefined,
      category: params.get('category') ?? undefined,
    }),
    getStockByProduct(team.id),
  ]);
  const withStock = rows.map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }));
  return csvResponse(
    toCsv(withStock, [
      'sku',
      'name',
      'category',
      'unit',
      'barcode',
      'stock',
      'minStock',
      'avgCost',
      'price',
      'active',
    ]),
    'products.csv',
  );
}
