# koeti-mvp-factory — Monorepo SaaS Factory Design

**Date:** 2026-06-27  
**Status:** Approved

---

## Overview

`koeti-mvp-factory` is a Turborepo-based monorepo that acts as a factory for shipping multiple independent SaaS products. Each SaaS lives in `apps/` and models only its own business logic, while all infrastructure concerns (auth, database, billing, email, analytics) are extracted into shared `packages/` consumed via workspace linking.

A CLI generator (`pnpm create-mvp <name>`) scaffolds a new SaaS in seconds, wired to the full core suite from day one. SaaS apps can eject from the monorepo and run independently if they outgrow it.

---

## Architecture

### Repository Structure

```
koeti-mvp-factory/
├── apps/
│   ├── saas-template/          # nextjs/saas-starter adapted — reference app and first SaaS
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
│   └── create-mvp.ts           # SaaS generator
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Deployment Model

All SaaS apps share the same infrastructure (single Postgres instance, single Stripe account, shared auth system) but are independently deployable. Each app has its own Vercel project / deployment target.

---

## Core Packages

### `@koeti/db`
- Drizzle ORM instance and connection
- Base schema: `users`, `teams`, `team_members`, `subscriptions`
- Migration runner and helpers
- Each SaaS extends the schema by defining its own tables in `apps/<name>/lib/db/schema.ts` and merging them at migration time

### `@koeti/auth`
- JWT session management
- Next.js middleware for route protection
- Helper functions: `getUser()`, `getTeam()`, `requireAuth()`
- SaaS apps consume these helpers — they do not implement auth themselves

### `@koeti/billing`
- Pre-configured Stripe client
- Webhook handler (shared across apps via routing)
- Functions: `createCheckoutSession()`, `createCustomerPortal()`, `getSubscription()`
- Each SaaS defines its own plan config locally but delegates all Stripe logic to this package

### `@koeti/ui`
- shadcn/ui component library built on Radix UI primitives
- Tailwind-based theming
- SaaS apps extend with their own components without modifying this package

### `@koeti/email`
- React Email templates for transactional emails (welcome, password reset, receipts)
- Resend (or similar) client configured once
- SaaS apps add their own templates without modifying the package

### `@koeti/analytics`
- PostHog wrapper (or similar provider)
- Simple API: `track(event, props)`, `identify(userId, traits)`
- Provider-agnostic interface — swap the underlying service without touching SaaS code

### `@koeti/config`
- `tsconfig.base.json` — extended by all packages and apps
- Tailwind preset — imported by all apps
- ESLint config — shared ruleset
- No runtime logic, configuration only

---

## SaaS App Conventions

Each app in `apps/<name>/` follows these conventions:

- **Business routes:** `app/(dashboard)/` for authenticated routes, `app/(marketing)/` for public
- **Business logic:** `lib/` directory — server actions, domain functions, business rules
- **Own DB schema:** `lib/db/schema.ts` — merged with base schema at migration time
- **Own Stripe plans:** `lib/billing/plans.ts` — config object consumed by `@koeti/billing`
- **No cross-app imports:** Apps consume only `packages/` — never import from another app

---

## `create-mvp` Generator

**Invocation:**
```bash
pnpm create-mvp <saas-name>
```

**What it does:**
1. Creates `apps/<saas-name>/` by copying the minimal structure from `saas-template`
2. Generates `package.json` with name `@koeti/<saas-name>` and `workspace:*` deps on all core packages
3. Creates base routes: `/` (landing), `/dashboard`, `/settings`
4. Generates `.env.local.example` with all required env vars
5. Creates a minimal `README.md` with startup instructions

**What it does NOT do (left to the developer):**
- Define the SaaS-specific DB schema
- Implement business routes and components
- Configure Stripe plans specific to that SaaS

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

**Common commands:**

```bash
# Create a new SaaS
pnpm create-mvp crm-tool

# Dev a specific SaaS
pnpm --filter @koeti/crm-tool dev

# Dev all apps simultaneously
pnpm dev

# Run migrations for a specific app
pnpm --filter @koeti/crm-tool db:migrate

# Build everything (Turbo caches unchanged packages)
pnpm build
```

---

## Eject Path

If a SaaS grows beyond the monorepo:

1. Copy `apps/<name>/` to a new standalone repository
2. Publish `@koeti/*` packages to npm or a private registry
3. Replace all `workspace:*` references with pinned versions
4. The app runs independently with no monorepo dependency

---

## Base Template

The `apps/saas-template/` app is the `nextjs/saas-starter` template adapted to consume `@koeti/*` packages instead of inlining the infrastructure. It serves as:

- The first working SaaS in the monorepo
- The reference implementation for how apps should be structured
- The source from which `create-mvp` copies its scaffold

---

## Out of Scope

- Multi-tenant routing (subdomain per tenant) — each SaaS is its own app
- Cross-SaaS shared data or APIs
- CI/CD configuration — left to the user's platform (Vercel, GitHub Actions)
- Internationalization (i18n)
