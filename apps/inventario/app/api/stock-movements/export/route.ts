// API route (GET) — /api/stock-movements/export.
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key';
import { csvResponse, toCsv } from '@/lib/csv';
import { getStockMovements, getTeamForUser } from '@/lib/db/queries';
import type { MovementType } from '@/lib/db/schema';
import { planLimitsFor } from '@/lib/plan';

export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 });
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  if (!team) return new Response('Unauthorized', { status: 401 });
  if (!planLimitsFor(team).csvExport) {
    return new Response('CSV export requires the Premium or Empresarial plan.', { status: 402 });
  }
  const params = new URL(request.url).searchParams;
  const rows = await getStockMovements(team.id, {
    productId: params.get('productId') ? Number(params.get('productId')) : undefined,
    warehouseId: params.get('warehouseId') ? Number(params.get('warehouseId')) : undefined,
    type: (params.get('type') as MovementType) ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  });
  return csvResponse(
    toCsv(rows, [
      'createdAt',
      'type',
      'productSku',
      'productName',
      'warehouseName',
      'quantity',
      'unitCost',
      'batchNumber',
      'expiresAt',
      'userName',
      'note',
    ]),
    'stock-movements.csv',
  );
}
