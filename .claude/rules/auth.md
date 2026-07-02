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

## What comes from `@koeti/auth` vs per-app `lib/auth/middleware.ts`

| Function | Import from |
|---|---|
| `getSession`, `setSession` | `@koeti/auth` |
| `hashPassword`, `comparePasswords` | `@koeti/auth` |
| `signToken`, `verifyToken` | `@koeti/auth` |
| `validatedAction` | `@koeti/auth` |
| `createAuthMiddleware` | `@koeti/auth` |
| `validatedActionWithUser` | `@/lib/auth/middleware` |
| `withTeam` | `@/lib/auth/middleware` |
| `getUser` | `@/lib/db/queries` |
| `getTeamForUser` | `@/lib/db/queries` |
