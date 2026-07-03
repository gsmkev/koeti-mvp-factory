---
paths:
  - "**/proxy.ts"
  - "**/middleware.ts"
  - "**/lib/auth/**"
  - "**/lib/actions/**"
  - "**/app/**/actions.ts"
---

# Auth pattern

## `proxy.ts` (every app root — Next.js renamed the `middleware.ts` convention to `proxy.ts`)

`proxy.ts` requires a **default export** for the handler (unlike the old `middleware.ts`,
which used a named `export const middleware`). `config` stays a named export.

```ts
import { createAuthMiddleware } from '@koeti/auth'

const { middleware, config: authConfig } = createAuthMiddleware({
  protectedRoutes: ['/dashboard'],
})

export default middleware
export const config = authConfig
```

## Server actions — use wrappers from the app's own `lib/auth/middleware.ts`

```ts
'use server'
import { validatedActionWithUser } from '@/lib/auth/middleware'
import { db } from '@/lib/db/drizzle'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1) })

export const myAction = validatedActionWithUser(schema, async (data, _, user) => {
  await db.insert(myTable).values({ name: data.name, userId: user.id })
  return { success: 'Done' }
})
```

## RBAC — one ordered role list, one line per surface

Tenant roles: `viewer < member < admin < owner` (`TEAM_ROLES` in `@koeti/auth`).
Global superadmin (the factory owner): set `SUPERADMIN_EMAIL` in the app's env —
that account passes every team check as owner and unlocks `/dashboard/admin`.

```ts
// Page (server component) — redirects to /dashboard if below the minimum:
const { user, team, role } = await requireRole('viewer')       // from '@/lib/auth/middleware'

// Server action:
export const dangerousThing = withTeam(async (formData, team) => { ... }, 'admin')

// crudActions (default minRole 'member' — viewers are read-only):
crudActions(things, { path: '/things', schema, minRole: 'member' })

// Conditional UI / custom checks:
import { roleAtLeast, isSuperadmin } from '@koeti/auth'
roleAtLeast(role, 'admin') && <DangerButton />
```

Pick the minimum role per screen: `viewer` for read-only pages, `member` for
normal mutations, `admin` for settings/invites/API keys/destructive bulk ops.
UI hiding is cosmetic — the action/page check is the enforcement.

## API keys — how other MVPs and scripts authenticate

Teams mint keys at `/dashboard/api-keys` (admin+). Only the SHA-256 hash is
stored. A route handler that exposes data accepts session OR key:

```ts
// app/api/<thing>/route.ts
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key'
import { getTeamForUser } from '@/lib/db/queries'

export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 })
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser())
  if (!team) return new Response('Unauthorized', { status: 401 })
  // ...queries scoped by team.id, as always
}
```

Caller side: `fetch(url, { headers: { authorization: 'Bearer koeti_...' } })`.
`apiRateLimitOk` only throttles Bearer callers (per-IP, 60/min), so session/
dashboard traffic to the same route is never limited.

## What comes from `@koeti/auth` vs per-app `lib/auth/middleware.ts`

| Function | Import from |
|---|---|
| `getSession`, `setSession` | `@koeti/auth` |
| `hashPassword`, `comparePasswords` | `@koeti/auth` |
| `signToken`, `verifyToken` | `@koeti/auth` |
| `validatedAction` | `@koeti/auth` |
| `createAuthMiddleware` | `@koeti/auth` |
| `roleAtLeast`, `isSuperadmin`, `TEAM_ROLES`, `TeamRole` | `@koeti/auth` |
| `generateApiKey`, `hashApiKey`, `apiKeyPrefix` | `@koeti/auth` |
| `validatedActionWithUser` | `@/lib/auth/middleware` |
| `withTeam` (optional `minRole` 2nd arg) | `@/lib/auth/middleware` |
| `requireRole`, `teamRoleFor` | `@/lib/auth/middleware` |
| `getTeamFromApiKey` | `@/lib/auth/api-key` |
| `getUser` | `@/lib/db/queries` |
| `getTeamForUser` | `@/lib/db/queries` |
