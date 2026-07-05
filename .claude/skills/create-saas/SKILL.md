---
name: create-saas
description: Implement a new SaaS app in this monorepo from a spec + plan. Run this after pnpm create-mvp has scaffolded the app and the spec/plan are written.
argument-hint: <saas-name>
---

# Implementing @koeti/$ARGUMENTS

## Step 1 — Locate the spec and plan

Read:

- `docs/superpowers/specs/` — find the spec for `$ARGUMENTS`
- `docs/superpowers/plans/` — find the implementation plan for `$ARGUMENTS`

If neither exists, stop and ask the user to create them with superpowers brainstorming + writing-plans first.

## Step 2 — Scaffold (if not done)

```bash
pnpm create-mvp $ARGUMENTS
```

If `apps/$ARGUMENTS/` already exists, skip this step.

## Step 3 — Execute the plan

Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement the plan task by task.

**At every task:**

- Check the relevant `.claude/rules/` file for the pattern before writing code
- DB work → `.claude/rules/db.md`
- Auth/actions → `.claude/rules/auth.md`
- Billing/Stripe → `.claude/rules/billing.md`
- Any UI → invoke the `ui-ux-pro-max` skill first (fallback: `frontend-design`), then `.claude/rules/ui.md`
- URL-persistent page state (filters, tabs) → `.claude/rules/url-state.md`
- Team-scoped entity (list/create/delete) → follow `.claude/rules/crud.md` step by step
- Overview/dashboard page → make it a visual report: KPI `StatCard`s + a chart over
  the main entity + `<PrintButton>`, data shaped with `groupSum`/`topN`. See
  `.claude/rules/charts.md` (worked example: `apps/gastos`)

## Step 4 — Verify

```bash
pnpm --filter @koeti/$ARGUMENTS typecheck
pnpm --filter @koeti/$ARGUMENTS test
pnpm --filter @koeti/$ARGUMENTS db:generate   # then COMMIT any new migration files
pnpm --filter @koeti/$ARGUMENTS db:migrate
pnpm --filter @koeti/$ARGUMENTS build
pnpm verify-app $ARGUMENTS                    # renders every page with a real session
pnpm e2e-app $ARGUMENTS                       # real browser: sign-up + CRUD through the UI
```

All seven must pass before reporting done. CI also fails if `db:generate`
produces uncommitted migration files, so never edit `lib/db/schema.ts`
without generating and committing the migration.

To see it running: `pnpm --filter @koeti/$ARGUMENTS dev`, then
`pnpm --filter @koeti/$ARGUMENTS db:seed` for a test login
(test@test.com / admin123).

## What this app should NOT contain

- Auth implementation (use `@koeti/auth`)
- Stripe client creation (use `@koeti/billing`)
- shadcn component copies (use `@koeti/ui`)
- Imports from other apps (`apps/*`)
