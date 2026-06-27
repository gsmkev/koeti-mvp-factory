# koeti-mvp-factory — Monorepo SaaS Factory Design

**Date:** 2026-06-27  
**Status:** Approved (v2 — schema pattern + autonomous LLM codegen)

---

## Overview

`koeti-mvp-factory` is a Turborepo-based monorepo that acts as a factory for shipping multiple independent SaaS products. Each SaaS lives in `apps/` and models only its own business logic, while all infrastructure concerns (auth, database, billing, email, analytics, ui) are extracted into shared `packages/@koeti/*` consumed via workspace linking.

A CLI generator (`pnpm create-mvp <name>`) scaffolds a new SaaS in seconds, wired to the full core suite from day one. SaaS apps can eject from the monorepo and run independently if they outgrow it.

**Design constraint:** Every SaaS must be 100% autonomously implementable by an LLM (Claude Code, Codex) given only a spec + plan created with superpowers. No human intervention during implementation. This drives all structural decisions: imports must be consistent and predictable, patterns must be explicit and replicable, and the `AGENTS.md` at the root must give a fresh LLM full context to operate correctly.

---

## Architecture

### Repository Structure

```
koeti-mvp-factory/
├── apps/
│   ├── saas-template/          # nextjs/saas-starter adapted — reference app and scaffold source
│   └── <future-saas>/          # Generated with pnpm create-mvp <name>
│
├── packages/
│   ├── auth/                   # @koeti/auth
│   ├── db/                     # @koeti/db
│   ├── ui/                     # @koeti/ui
│   ├── billing/                # @koeti/billing
│   ├── email/                  # @koeti/email
│   ├── analytics/              # @koeti/analytics
│   └── config/                 # @koeti/config
│
├── scripts/
│   └── create-mvp.mjs          # SaaS generator (Node ESM, no build step)
│
├── AGENTS.md                   # LLM operating manual — read first
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Why 7 packages

For autonomous LLM codegen, consistency beats minimalism. An LLM implementing SaaS #3 needs the same import surface as SaaS #1:

- `@koeti/ui` — pre-populated with all shadcn components. LLMs never run `npx shadcn add` (unreliable in autonomous mode). All UI primitives always at `import { Button } from '@koeti/ui'`.
- `@koeti/config` — `"extends": "@koeti/config/tsconfig.base"` is more robust than counting `../../` from any app depth.
- `@koeti/email` + `@koeti/analytics` — confirmed present from day one so the first LLM-generated SaaS can use them without detecting whether they exist.

### Deployment Model

All SaaS apps share the same infrastructure (single Postgres instance, single Stripe account, shared auth system) but are independently deployable. Each app has its own Vercel project / deployment target.

---

## Core Packages

### `@koeti/db`
- Drizzle base schema: `users`, `teams`, `team_members`, `activity_logs`, `invitations`
- Exported base schema object: `baseSchema` (used by apps to compose their drizzle instance)
- Exported types: `User`, `Team`, `TeamMember`, `ActivityLog`, `Invitation`, and their `New*` variants
- Does NOT export a `db` instance — each app creates its own (see DB Pattern below)

### `@koeti/auth`
- JWT session management: `signToken`, `verifyToken`, `getSession`, `setSession`
- Password helpers: `hashPassword`, `comparePasswords`
- DB-aware helpers (require app's db): `getUser`, `getTeamForUser`
- Action wrappers: `validatedAction`, `validatedActionWithUser`, `withTeam`
- Middleware factory: `createAuthMiddleware(protectedRoutes)`

### `@koeti/billing`
- Stripe client (pre-configured from `STRIPE_SECRET_KEY`)
- `createCheckoutSession({ team, priceId })`
- `createCustomerPortalSession(team)`
- `handleSubscriptionChange(subscription)`
- `getStripePrices()`, `getStripeProducts()`

### `@koeti/ui`
- All shadcn/ui components pre-populated (Button, Input, Card, Label, Avatar, DropdownMenu, RadioGroup, etc.)
- `cn()` utility re-exported
- Tailwind CSS required as peer dependency (configured via `@koeti/config`)

### `@koeti/email`
- Resend client (configured from `RESEND_API_KEY`)
- Base templates: `WelcomeEmail`, `PasswordResetEmail`
- `sendEmail({ to, subject, template })` — provider-agnostic send function
- Apps add their own templates by creating React Email components locally

### `@koeti/analytics`
- PostHog client (configured from `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`)
- `track(event: string, props?: Record<string, unknown>)`
- `identify(userId: string, traits?: Record<string, unknown>)`
- Server-side and client-side variants exported separately

### `@koeti/config`
- `tsconfig.base.json` — base TypeScript config for all packages and apps
- `tsconfig.nextjs.json` — extends base, adds Next.js specifics
- `eslint/index.js` — shared ESLint ruleset
- `tailwind/preset.js` — shared Tailwind preset (colors, fonts, animations)

---

## DB Pattern (canonical — LLMs must follow this exactly)

The base schema lives in `@koeti/db`. Each app composes its own Drizzle instance by spreading the base schema with its own tables.

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

### `apps/<name>/lib/db/schema.ts` (app-specific tables only)
```ts
import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@koeti/db'

// Only define THIS app's tables here. Never redefine users/teams/etc.
export const myTable = pgTable('my_table', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  // ...app-specific columns
})
```

---

## SaaS App Conventions

```
apps/<name>/
  app/
    (marketing)/            ← public routes
      page.tsx              ← landing page
      pricing/page.tsx
    (dashboard)/            ← auth-protected routes
      layout.tsx            ← auth gate (uses getUser/getTeam)
      dashboard/page.tsx
      settings/
        general/page.tsx
        security/page.tsx
    api/
      stripe/
        checkout/route.ts
        webhook/route.ts
    layout.tsx
    globals.css
  lib/
    db/
      index.ts              ← drizzle instance (always the canonical pattern)
      schema.ts             ← app-specific tables only
      migrations/           ← generated by drizzle-kit
    actions/                ← server actions (use validatedActionWithUser)
    utils.ts
  components/               ← app-specific components (not in @koeti/ui)
  middleware.ts             ← uses createAuthMiddleware from @koeti/auth
  next.config.ts
  drizzle.config.ts
  .env.local.example
  package.json              ← name: @koeti/<name>
```

**Rules:**
- Never import from another app (`apps/*`)
- Never run `npx shadcn add` — all components are in `@koeti/ui`
- Never reimplement auth — use `@koeti/auth`
- Never create a new Stripe client — use `@koeti/billing`
- Always use `validatedActionWithUser` for authenticated server actions
- Always put business logic in `lib/`, not in route components

---

## `create-mvp` Generator

**Invocation:**
```bash
pnpm create-mvp <saas-name>
```

**What it does:**
1. Copies the minimal structure from `apps/saas-template/` into `apps/<saas-name>/`
2. Replaces all occurrences of `saas-template` / `@koeti/saas-template` with the new name
3. Generates `package.json` with `name: "@koeti/<saas-name>"` and `workspace:*` deps on all core packages
4. Generates `drizzle.config.ts` using the canonical pattern
5. Generates `lib/db/index.ts` using the canonical pattern
6. Generates `lib/db/schema.ts` as an empty app schema file
7. Generates `.env.local.example` with all required env vars
8. Outputs next steps to stdout

**Implementation:** `scripts/create-mvp.mjs` — Node ESM, no TypeScript compilation needed.

---

## AGENTS.md

A root-level `AGENTS.md` is a first-class deliverable of this setup. It is the LLM operating manual for this monorepo. It must contain:

1. **What this repo is** — one paragraph, no fluff
2. **How to create a new SaaS** — exact commands
3. **Package reference** — what each `@koeti/*` exports and the exact import syntax
4. **DB pattern** — the canonical code verbatim (LLMs copy-paste from here)
5. **File structure** — annotated tree for a SaaS app
6. **Rules** — what to never do
7. **Commands** — dev, build, migrate, create

The file lives at the repo root so Claude Code and Codex auto-detect it. It is updated whenever the monorepo structure changes.

---

## Turborepo Pipelines

```json
{
  "pipeline": {
    "build":      { "dependsOn": ["^build"], "outputs": [".next/**"] },
    "dev":        { "cache": false, "persistent": true },
    "lint":       { "dependsOn": ["^lint"] },
    "test":       { "dependsOn": ["^build"] },
    "db:migrate": { "cache": false }
  }
}
```

```bash
pnpm create-mvp crm-tool                          # scaffold new SaaS
pnpm --filter @koeti/crm-tool dev                 # dev specific app
pnpm dev                                           # dev all apps
pnpm --filter @koeti/crm-tool db:migrate          # run migrations
pnpm build                                         # build all (Turbo cached)
```

---

## Eject Path

If a SaaS grows beyond the monorepo:
1. Copy `apps/<name>/` to a new repository
2. Publish `@koeti/*` packages to npm or private registry
3. Replace `workspace:*` references with pinned versions

---

## Out of Scope

- Multi-tenant routing (subdomain per tenant)
- Cross-SaaS shared data or APIs
- CI/CD configuration
- Internationalization (i18n)
