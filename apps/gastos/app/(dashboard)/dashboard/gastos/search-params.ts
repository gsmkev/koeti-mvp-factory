// URL = estado: /dashboard/gastos?categoria=software es deep-linkable desde
// cualquier otro MVP o email. Parseo tipado server-side con nuqs.
import { createLoader, parseAsInteger, parseAsStringEnum } from 'nuqs/server';

export const CATEGORIES = ['viaticos', 'materiales', 'software', 'otros'] as const;

export const loadGastosSearchParams = createLoader({
  categoria: parseAsStringEnum([...CATEGORIES]),
  pagina: parseAsInteger.withDefault(1),
});
