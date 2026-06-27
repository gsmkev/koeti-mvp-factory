# koeti-mvp-factory

SaaS factory. Each `apps/<name>/` models business logic only. Shared infrastructure lives in `packages/@koeti/*`.

## Commands

```bash
pnpm create-mvp <name>                   # scaffold new SaaS
pnpm --filter @koeti/<name> dev          # dev one app
pnpm dev                                  # dev all apps
pnpm --filter @koeti/<name> db:migrate   # run migrations
pnpm build                                # build all (Turbo cached)
```

## Core rules

- Never import from another app (`apps/*`). Apps import only from `packages/`.
- Never run `npx shadcn add`. Components live in `@koeti/ui`.
- Never reimplement auth or Stripe. Use `@koeti/auth` and `@koeti/billing`.
- Business logic in `lib/`, not in route components.
- `validatedActionWithUser` and `withTeam` are in each app's `lib/auth/middleware.ts`, not in `@koeti/auth`.

## Package imports

```ts
import { getSession, setSession, hashPassword, verifyToken, validatedAction, createAuthMiddleware } from '@koeti/auth'
import { baseSchema } from '@koeti/db'
import type { User, Team, TeamMember } from '@koeti/db'
import { createCheckoutSession, handleSubscriptionChange, stripe } from '@koeti/billing'
import { Button, Input, Card, cn } from '@koeti/ui'
import { sendEmail, WelcomeEmail } from '@koeti/email'
import { track, identify } from '@koeti/analytics/server'
```

## Knowledge graph

Before grepping the codebase or tracing call chains, read `docs/agent/knowledge-graph.md` and use CRG tools. 5–10x cheaper than grep.

## Frontend

Before implementing any UI (page, component, dashboard, landing), invoke `design-taste-frontend`. Pass the SaaS spec as context so it infers the right aesthetic.
