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
pnpm verify-app <name>                    # boot the app + render EVERY page with a real session
pnpm e2e-app <name>                       # E2E in headless Chromium: sign-up + CRUD via ResourcePanel forms
```

## AFK loop

`/factory <name> — <business logic>` runs the whole loop autonomously:
spec → plan → scaffold → implement → verify → draft PR, no questions asked.
See `.claude/skills/factory/SKILL.md`. `/create-saas` is the variant for a
spec/plan a human already wrote.

## Definition of done

Before claiming any change works: `pnpm typecheck && pnpm test && pnpm build` must pass.
If you touched an app's pages/actions/schema, also run `pnpm verify-app <name>` and `pnpm e2e-app <name>`.
If you touched `apps/saas-template/` or `scripts/create-mvp.mjs`, also run `pnpm smoke`.
Working in a fresh worktree? Run `pnpm bootstrap` first — `.env.local` files don't follow git.
Husky hooks enforce a cheap subset automatically (`pre-commit`: format staged files;
`pre-push`: `typecheck && test`) — see `.claude/rules/git-hooks.md`. They're a safety net,
not a replacement for the full checks above.

## Core rules

- Never import from another app (`apps/*`). Apps import only from `packages/`.
- Never run `npx shadcn add`. Components live in `@koeti/ui`.
- Never reimplement auth or Stripe. Use `@koeti/auth` and `@koeti/billing`.
- Business logic in `lib/`, not in route components.
- `validatedActionWithUser` and `withTeam` are in each app's `lib/auth/middleware.ts`, not in `@koeti/auth`.

## Package imports

```ts
import {
  getSession,
  setSession,
  hashPassword,
  verifyToken,
  validatedAction,
  createAuthMiddleware,
} from '@koeti/auth';
import { rateLimit, signOneTimeToken, verifyOneTimeToken } from '@koeti/auth'; // brute-force guard + purpose-scoped tokens (password reset)
import { roleAtLeast, isSuperadmin, type TeamRole } from '@koeti/auth'; // RBAC: viewer<member<admin<owner + SUPERADMIN_EMAIL — see .claude/rules/auth.md
import { generateApiKey, hashApiKey, apiKeyPrefix } from '@koeti/auth'; // team API keys for MVP-to-MVP auth
import { baseSchema } from '@koeti/db';
import type { User, Team, TeamMember, ApiKey } from '@koeti/db';
import {
  createCheckoutSession,
  handleSubscriptionChange,
  stripe,
  isSubscribed,
} from '@koeti/billing'; // isSubscribed = plan gating
import { Button, Input, Card, cn } from '@koeti/ui';
import {
  PageHeader,
  DataTable,
  EmptyState,
  StatCard,
  SubmitButton,
  ResourcePanel,
} from '@koeti/ui'; // dashboard composites
import { BarChart, LineChart, DonutChart, Sparkline, type ChartDatum } from '@koeti/ui'; // zero-dep SVG charts (RSC-safe) — see .claude/rules/charts.md
import { groupSum, countBy, topN } from '@koeti/ui'; // rows → {label,value}[] for charts (topN folds extras into "Other")
import { PrintButton } from '@koeti/ui'; // one-click dashboard → PDF via native print (styled by @media print)
import { createLoader, parseAsStringEnum } from 'nuqs/server'; // typed URL state — see .claude/rules/url-state.md
import { LocaleSwitcher, locales, defaultLocale, type Locale } from '@koeti/i18n'; // en/es/pt via cookie — see .claude/rules/i18n.md
import { createRequestConfig } from '@koeti/i18n/server'; // for each app's i18n/request.ts
import { getTranslations, getLocale } from 'next-intl/server'; // server: t() in RSC/actions; useTranslations() in client components
import { crudActions } from '@/lib/crud'; // team-scoped CRUD actions factory (per app; optional minRole)
import { requireRole, withTeam, teamRoleFor } from '@/lib/auth/middleware'; // per-app RBAC: requireRole('viewer') in pages, withTeam(fn, 'admin') in actions
import { getTeamFromApiKey } from '@/lib/auth/api-key'; // Bearer koeti_… auth for app/api routes (per app)
import { toCsv, csvResponse } from '@/lib/csv'; // CSV export helper (per app)
import { sendEmail, WelcomeEmail, PasswordResetEmail, InvitationEmail } from '@koeti/email';
import { track, identify } from '@koeti/analytics/server';
```

## Knowledge graph

If CRG MCP tools are available in your session, prefer them over grep for tracing call chains (see `docs/agent/knowledge-graph.md`). If they're not available, use normal search tools — don't go looking for them.

## Frontend

Before implementing any UI (page, component, dashboard, landing), invoke the `ui-ux-pro-max` skill (primary design skill — pass the SaaS spec as context so it picks the right style, palette, and UX patterns). If it's not available in the session, fall back to `frontend-design`.

For team-scoped CRUD features, follow `.claude/rules/crud.md` — schema → queries → actions → page → nav, using the `@koeti/ui` composites.

Page state that survives a reload (filters, tabs, search) lives in the URL via nuqs — see `.claude/rules/url-state.md`. This is also how MVPs integrate with each other: deep links for features, `app/api/*` route handlers over HTTP for data.

Every user-facing string goes through `t()` — the factory ships en/es/pt via a
`NEXT_LOCALE` cookie (next-intl, no URL prefix). Shared chrome is translated once in
`@koeti/i18n`; each app adds only its business messages. See `.claude/rules/i18n.md`.

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
