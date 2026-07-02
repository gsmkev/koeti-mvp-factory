# koeti-mvp-factory

SaaS factory. Each `apps/<name>/` models business logic only. Shared infrastructure lives in `packages/@koeti/*`.

## Commands

```bash
pnpm bootstrap                           # fresh clone/worktree: env files + local Postgres
pnpm create-mvp <name>                   # scaffold new SaaS (also provisions DB + installs)
pnpm --filter @koeti/<name> dev          # dev one app
pnpm dev                                  # dev all apps
pnpm --filter @koeti/<name> db:migrate   # run migrations
pnpm build                                # build all (Turbo cached)
pnpm typecheck                            # tsc --noEmit, all workspaces
pnpm test                                 # vitest, all workspaces with tests
pnpm smoke                                # full factory loop: scaffold→migrate→build→serve
```

## Definition of done

Before claiming any change works: `pnpm typecheck && pnpm test && pnpm build` must pass.
If you touched `apps/saas-template/` or `scripts/create-mvp.mjs`, also run `pnpm smoke`.
Working in a fresh worktree? Run `pnpm bootstrap` first — `.env.local` files don't follow git.

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
import { PageHeader, DataTable, EmptyState, StatCard, SubmitButton } from '@koeti/ui' // dashboard composites
import { sendEmail, WelcomeEmail } from '@koeti/email'
import { track, identify } from '@koeti/analytics/server'
```

## Knowledge graph

If CRG MCP tools are available in your session, prefer them over grep for tracing call chains (see `docs/agent/knowledge-graph.md`). If they're not available, use normal search tools — don't go looking for them.

## Frontend

Before implementing any UI (page, component, dashboard, landing), invoke the `frontend-design` skill. Pass the SaaS spec as context so it infers the right aesthetic.

For team-scoped CRUD features, follow `.claude/rules/crud.md` — schema → queries → actions → page → nav, using the `@koeti/ui` composites.
