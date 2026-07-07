import { createLoader, parseAsInteger } from 'nuqs/server';

export const loadSearchParams = createLoader({
  page: parseAsInteger.withDefault(1),
});
