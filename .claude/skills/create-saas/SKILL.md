---
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
- Any UI → invoke `design-taste-frontend` first, then `.claude/rules/ui.md`

## Step 4 — Verify

```bash
pnpm --filter @koeti/$ARGUMENTS exec tsc --noEmit
pnpm --filter @koeti/$ARGUMENTS db:migrate
pnpm --filter @koeti/$ARGUMENTS dev
```

Fix any TypeScript errors before reporting done.

## What this app should NOT contain

- Auth implementation (use `@koeti/auth`)
- Stripe client creation (use `@koeti/billing`)
- shadcn component copies (use `@koeti/ui`)
- Imports from other apps (`apps/*`)
