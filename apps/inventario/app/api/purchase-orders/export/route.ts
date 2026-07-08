// API route (GET) — /api/purchase-orders/export.
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key';
import { csvResponse, toCsv } from '@/lib/csv';
import { getPurchaseOrders, getTeamForUser } from '@/lib/db/queries';
import type { PurchaseOrderStatus } from '@/lib/db/schema';

export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 });
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  if (!team) return new Response('Unauthorized', { status: 401 });
  const params = new URL(request.url).searchParams;
  const rows = await getPurchaseOrders(team.id, {
    supplierId: params.get('supplierId') ? Number(params.get('supplierId')) : undefined,
    status: (params.get('status') as PurchaseOrderStatus) ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  });
  return csvResponse(
    toCsv(rows, [
      'supplierName',
      'productName',
      'warehouseName',
      'orderedQty',
      'receivedQty',
      'unitCost',
      'expectedDate',
      'status',
      'createdAt',
    ]),
    'purchase-orders.csv',
  );
}
