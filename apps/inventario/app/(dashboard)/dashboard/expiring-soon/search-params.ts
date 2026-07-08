import { createLoader, parseAsInteger } from 'nuqs/server';

export const loadExpiringSoonSearchParams = createLoader({
  warehouseId: parseAsInteger,
  days: parseAsInteger.withDefault(30),
});
