# AGENTS.md — koeti-mvp-factory

Operating manual for Claude Code, Codex, and any autonomous agent working in this repo.
Read this before touching any file.

> **Knowledge graph available.** Before grepping the codebase, tracing call chains, planning a refactor, or answering architecture questions — read `docs/agent/knowledge-graph.md` and use the graph tools instead. It's 5–10x cheaper in tokens than grep+Read.

---

## What this is

A Turborepo monorepo that manufactures SaaS products. Shared infrastructure (auth, DB, billing, email, analytics, UI) lives in `packages/@koeti/*`. Each SaaS app in `apps/` imports those packages and models **only its own business logic**. A new SaaS is fully implementable by an LLM given a spec + plan — no human intervention during implementation.

---

## Creating a new SaaS

```bash
pnpm create-mvp <name>
```

This scaffolds `apps/<name>/` with all wiring done. After that:
1. Define app-specific DB tables in `apps/<name>/lib/db/schema.ts`
2. Implement business routes in `apps/<name>/app/(dashboard)/`
3. Add server actions in `apps/<name>/lib/actions/`
4. Run `pnpm --filter @koeti/<name> db:migrate` after schema changes

---

## Package reference

### `@koeti/auth`
```ts
// Session + password
import { getSession, setSession, hashPassword, comparePasswords } from '@koeti/auth'

// DB-aware helpers (need POSTGRES_URL set)
import { getUser, getTeamForUser } from '@koeti/auth'

// Server action wrappers
import { validatedAction, validatedActionWithUser, withTeam } from '@koeti/auth'
import type { ActionState } from '@koeti/auth'

// Middleware factory
import { createAuthMiddleware } from '@koeti/auth'
```

### `@koeti/db`
```ts
// Base schema object — spread into your drizzle instance
import { baseSchema } from '@koeti/db'

// Base types for foreign key references and type annotations
import type { User, Team, TeamMember, ActivityLog, Invitation } from '@koeti/db'
import type { NewUser, NewTeam } from '@koeti/db'

// Individual tables (for foreign key references in app schema)
import { users, teams, teamMembers } from '@koeti/db'
```

> Do NOT import `db` from `@koeti/db`. Each app creates its own instance (see DB Pattern).

### `@koeti/billing`
```ts
import {
  createCheckoutSession,
  createCustomerPortalSession,
  handleSubscriptionChange,
  getStripePrices,
  getStripeProducts,
} from '@koeti/billing'
```

### `@koeti/ui`
```ts
import { Button } from '@koeti/ui'
import { Input } from '@koeti/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@koeti/ui'
import { Label } from '@koeti/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@koeti/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@koeti/ui'
import { RadioGroup, RadioGroupItem } from '@koeti/ui'
import { cn } from '@koeti/ui'
```

> Never run `npx shadcn add`. All components live here. App-specific components go in `apps/<name>/components/`.

### `@koeti/email`
```ts
import { sendEmail } from '@koeti/email'
import { WelcomeEmail, PasswordResetEmail } from '@koeti/email'

// Usage
await sendEmail({
  to: user.email,
  subject: 'Welcome',
  template: <WelcomeEmail name={user.name} />,
})
```

### `@koeti/analytics`
```ts
// Server-side
import { track, identify } from '@koeti/analytics/server'

// Client-side (use in Client Components)
import { track, identify } from '@koeti/analytics/client'

// Usage
track('subscription_started', { plan: 'pro', userId: user.id })
identify(String(user.id), { email: user.email, name: user.name })
```

### `@koeti/config`
```jsonc
// tsconfig.json in any package or app
{ "extends": "@koeti/config/tsconfig.base" }

// For Next.js apps
{ "extends": "@koeti/config/tsconfig.nextjs" }
```

```js
// tailwind.config.js in any app
import preset from '@koeti/config/tailwind/preset'
export default { presets: [preset], content: ['./app/**/*.tsx', './components/**/*.tsx'] }
```

---

## DB Pattern — always follow this exactly

### `apps/<name>/lib/db/index.ts`
```ts
import { baseSchema } from '@koeti/db'
import * as appSchema from './schema'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.POSTGRES_URL!)
export const db = drizzle(client, { schema: { ...baseSchema, ...appSchema } })
```

### `apps/<name>/drizzle.config.ts`
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: ['../../packages/db/src/schema.ts', './lib/db/schema.ts'],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL! },
})
```

### `apps/<name>/lib/db/schema.ts`
```ts
import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@koeti/db'  // for foreign key references only

// Define ONLY this app's tables. Never redefine users/teams/teamMembers.
export const widgets = pgTable('widgets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Widget = typeof widgets.$inferSelect
export type NewWidget = typeof widgets.$inferInsert
```

---

## Middleware pattern

### `apps/<name>/middleware.ts`
```ts
import { createAuthMiddleware } from '@koeti/auth'

export const { middleware, config } = createAuthMiddleware({
  protectedRoutes: ['/dashboard'],
})
```

---

## Server actions pattern

```ts
'use server'
import { validatedActionWithUser } from '@koeti/auth'
import { db } from '@/lib/db'
import { widgets } from '@/lib/db/schema'
import { z } from 'zod'

const createWidgetSchema = z.object({
  name: z.string().min(1).max(255),
})

export const createWidget = validatedActionWithUser(
  createWidgetSchema,
  async (data, _, user) => {
    await db.insert(widgets).values({ name: data.name, userId: user.id })
    return { success: 'Widget created' }
  }
)
```

---

## File structure (every SaaS app)

```
apps/<name>/
  app/
    (marketing)/            ← public routes (no auth required)
      page.tsx              ← landing page
      pricing/page.tsx
    (dashboard)/            ← auth-protected routes
      layout.tsx            ← auth gate using getUser()
      dashboard/page.tsx
      settings/
        general/page.tsx
        security/page.tsx
    api/
      stripe/
        checkout/route.ts   ← calls createCheckoutSession
        webhook/route.ts    ← calls handleSubscriptionChange
    layout.tsx              ← root layout with fonts, globals
    globals.css
  lib/
    db/
      index.ts              ← drizzle instance (canonical pattern above)
      schema.ts             ← app-specific tables only
      migrations/           ← generated, do not edit manually
      queries.ts            ← db query functions
    actions/                ← server actions grouped by domain
    utils.ts
  components/               ← app-specific UI (import primitives from @koeti/ui)
  middleware.ts             ← uses createAuthMiddleware
  next.config.ts
  drizzle.config.ts
  .env.local.example        ← all required env vars with descriptions
  package.json              ← name must be @koeti/<name>
```

---

## Required env vars (every app)

```bash
# Database
POSTGRES_URL=

# Auth
AUTH_SECRET=                 # random 32+ char string, generate with: openssl rand -base64 32

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BASE_URL=                    # e.g. http://localhost:3000

# Email
RESEND_API_KEY=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_HOST=https://app.posthog.com
```

---

## Commands

```bash
pnpm create-mvp <name>                            # scaffold new SaaS app
pnpm --filter @koeti/<name> dev                   # dev a specific app
pnpm dev                                           # dev all apps simultaneously
pnpm --filter @koeti/<name> db:migrate            # run migrations for one app
pnpm --filter @koeti/<name> db:generate           # generate migration files
pnpm build                                         # build all (Turborepo cached)
pnpm lint                                          # lint all
```

---

## Frontend design — mandatory

**Every UI surface uses the `ui-ux-pro-max` skill.** Before implementing any page, component, dashboard, or landing — invoke the skill. This is not optional. The skill provides style direction, color palettes, font pairings, and UX guidelines tuned for Next.js + shadcn/ui.

Stack context for the skill: **Next.js + shadcn/ui + Tailwind CSS**. Always specify this when invoking.

```
# How to invoke before implementing UI:
Skill(ui-ux-pro-max) → then implement the component/page
```

---

## Rules — never break these

- **No cross-app imports.** Apps import only from `packages/`. Never `import { x } from '../../apps/other-saas'`.
- **No shadcn CLI.** Never `npx shadcn add`. Components live in `@koeti/ui`.
- **No inline auth.** Never implement JWT, bcrypt, or sessions in an app. Use `@koeti/auth`.
- **No inline Stripe.** Never `new Stripe(...)` in an app. Use `@koeti/billing`.
- **No root-level db instance in packages.** `@koeti/db` exports schema + types, not a connected instance.
- **Business logic in `lib/`.** Route components are thin. Server actions call functions in `lib/`.
- **Types exported from schema.** Every table in `lib/db/schema.ts` must export its `$inferSelect` and `$inferInsert` types.

---

## Implementation workflow for a new SaaS

Given a spec + plan (created by superpowers brainstorming + writing-plans):

1. Run `pnpm create-mvp <name>` to scaffold the app
2. Read the spec to understand the business domain
3. Define DB tables in `lib/db/schema.ts` based on the spec's data model
4. Run `pnpm --filter @koeti/<name> db:migrate`
5. Implement server actions in `lib/actions/` using `validatedActionWithUser`
6. Implement routes in `app/(dashboard)/` — thin components that call server actions
7. Implement public routes in `app/(marketing)/`
8. Wire Stripe webhook at `app/api/stripe/webhook/route.ts`
9. Add analytics `track()` calls at key business events
10. Test with `pnpm --filter @koeti/<name> dev`
