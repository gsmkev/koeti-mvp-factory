// URL = estado: /dashboard/products?q=...&category=...&active=... is deep-linkable.
import { createLoader, parseAsString, parseAsStringEnum } from 'nuqs/server';

export const STOCK_STATUSES = ['low', 'normal', 'excess'] as const;

export const loadProductsSearchParams = createLoader({
  q: parseAsString,
  category: parseAsString,
  active: parseAsStringEnum(['true', 'false']),
  stockStatus: parseAsStringEnum([...STOCK_STATUSES]),
});
