import { createLoader, parseAsInteger, parseAsString } from 'nuqs/server';

export const loadLowStockSearchParams = createLoader({
  warehouseId: parseAsInteger,
  category: parseAsString,
});
