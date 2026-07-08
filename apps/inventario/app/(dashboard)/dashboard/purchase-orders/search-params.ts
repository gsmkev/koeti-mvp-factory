// URL = estado: /dashboard/purchase-orders?status=... is deep-linkable.
import { createLoader, parseAsInteger, parseAsString, parseAsStringEnum } from 'nuqs/server';
import { PURCHASE_ORDER_STATUSES } from '@/lib/db/schema';

export const loadPurchaseOrdersSearchParams = createLoader({
  supplierId: parseAsInteger,
  status: parseAsStringEnum([...PURCHASE_ORDER_STATUSES]),
  from: parseAsString,
  to: parseAsString,
});
