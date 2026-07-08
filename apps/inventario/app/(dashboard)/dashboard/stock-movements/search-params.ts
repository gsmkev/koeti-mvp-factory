// URL = estado: /dashboard/stock-movements?warehouseId=...&type=... is deep-linkable.
import { createLoader, parseAsInteger, parseAsString, parseAsStringEnum } from 'nuqs/server';
import { MOVEMENT_TYPES } from '@/lib/db/schema';

export const loadMovementsSearchParams = createLoader({
  productId: parseAsInteger,
  warehouseId: parseAsInteger,
  type: parseAsStringEnum([...MOVEMENT_TYPES]),
  from: parseAsString,
  to: parseAsString,
  page: parseAsInteger.withDefault(1),
});
