# URL state (nuqs) — every screen is an integration surface

`nuqs` is pre-wired in the template (`NuqsAdapter` in `app/layout.tsx`). The rule:
**page state that survives a reload lives in the URL** — filters, tabs, selected
period, search. That makes every dashboard screen deep-linkable, shareable, and
consumable from another MVP by plain link.

## Server pattern (default — filters on server-rendered pages)

`app/(dashboard)/dashboard/<entity>/search-params.ts`:

```ts
import { createLoader, parseAsStringEnum, parseAsString } from 'nuqs/server'

export const loadSearchParams = createLoader({
  category: parseAsStringEnum(['a', 'b', 'c']),
  q: parseAsString,
})
```

Page reads typed params and passes them to the query (which must still scope by
`teamId`):

```tsx
import type { SearchParams } from 'nuqs/server'
import { loadSearchParams } from './search-params'

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { category } = await loadSearchParams(searchParams)
  const rows = await getThings(team.id, category ?? undefined)
  // filter UI = plain <Link href="?category=a"> badges — no client JS needed
}
```

Worked example: `apps/gastos/app/(dashboard)/dashboard/gastos/`.

## Client pattern (interactive widgets only)

```tsx
'use client'
import { useQueryState, parseAsString } from 'nuqs'
const [q, setQ] = useQueryState('q', parseAsString.withDefault(''))
```

Wrap the component in `<Suspense>` when the page is otherwise static. Import
parsers from `nuqs/server` in shared/server files, from `nuqs` in client files.

## Integrating one MVP with another

- **Features / navigation**: link into the other MVP's URLs with query params
  (`https://gastos.example.com/dashboard/gastos?categoria=software`). URL state
  makes the target land exactly on the right view. Prefill create forms the same
  way if the page opts in (`field.defaultValue` from a search param).
- **Data**: consume the other MVP's `app/api/*` route handlers over HTTP.
  Never import from another app (`apps/*`) — that rule still holds. If an MVP
  needs to expose data, add a route handler; the caller authenticates with a
  team API key minted at `/dashboard/api-keys` (`Authorization: Bearer koeti_…`)
  — see the API keys section of `.claude/rules/auth.md`. Worked example:
  `apps/gastos/app/api/gastos/export/route.ts`.
