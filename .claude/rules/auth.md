---
paths:
  - "**/middleware.ts"
  - "**/lib/auth/**"
  - "**/lib/actions/**"
  - "**/app/**/actions.ts"
---

# Auth pattern

## `middleware.ts` (every app root)

```ts
import { createAuthMiddleware } from '@koeti/auth'

export const { middleware, config } = createAuthMiddleware({
  protectedRoutes: ['/dashboard'],
})
```

## Server actions — use wrappers from the app's own `lib/auth/middleware.ts`

```ts
'use server'
import { validatedActionWithUser } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
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
