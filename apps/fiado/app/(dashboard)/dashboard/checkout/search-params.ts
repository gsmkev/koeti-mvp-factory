import { createLoader, parseAsString, parseAsStringEnum } from 'nuqs/server';

export const loadSearchParams = createLoader({
  plan: parseAsString,
  error: parseAsStringEnum(['invalid']),
});
