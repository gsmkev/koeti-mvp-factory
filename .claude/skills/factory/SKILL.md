---
name: factory
description: AFK SaaS factory — turn a paragraph of business logic into a built, verified, PR'd MVP with zero questions. Usage; /factory <name> — <business logic>
argument-hint: <name> — <business logic description>
---

# /factory — autonomous MVP loop

Input: an app name plus a plain-language description of the business logic.
Output: a working app in `apps/<name>/`, fully verified, committed on a branch
with a draft PR. **Never stop to ask a question** — make the standard choice,
record it in the spec, and keep moving. The human reviews the PR, not you.

## Phase 0 — Isolate

Work in a git worktree (EnterWorktree or `superpowers:using-git-worktrees`)
unless already in one. Run `pnpm bootstrap` if `.env.local` files are missing.

## Phase 1 — Spec (autonomous brainstorm)

Write `docs/superpowers/specs/<date>-<name>-design.md` directly from the
business logic. Do NOT ask clarifying questions; resolve every open point with
these defaults and record each assumption in a "Decisions" section:

- Every domain entity is **team-scoped** (carries `teamId`) unless the logic
  clearly says per-user.
- Each entity gets: table, queries, `crudActions`, one dashboard page via
  `ResourcePanel`, one nav entry. Entities with workflow beyond CRUD
  (state transitions, computed totals, external calls) get hand-written
  actions next to the generated ones.
- Auth, teams, billing, email, analytics, RBAC, API keys come from the template —
  never respec them. Stripe stays wired but keyless (app must build and run
  without keys).
- Per screen, record the minimum role (`viewer` read-only, `member` mutations,
  `admin` settings/destructive) — enforcement is `requireRole()` +
  `crudActions minRole`, see `.claude/rules/auth.md`.
- Entities users report on (lists with amounts/dates) get the CSV export route
  from `.claude/rules/crud.md` step 6. Premium features gate with
  `isSubscribed(team)` (`.claude/rules/billing.md`).
- The overview page (`dashboard/page.tsx`) is a **visual report**, not a bare
  list: KPI `StatCard`s (add `delta`/`trend` when there's a prior period) plus a
  `LineChart`/`BarChart`/`DonutChart` over the main entity, and a `<PrintButton>`
  in its `PageHeader`. Shape rows with `groupSum`/`countBy`/`topN` — one line
  each. Full recipe: `.claude/rules/charts.md`. `apps/gastos` is the worked example.
- Landing + pricing pages: keep the template's, reworded for the product.
- Cut scope aggressively: an MVP is 2–5 entities and 1–3 custom pages. Park
  everything else in an "Out of scope" section.

## Phase 2 — Plan

Use `superpowers:writing-plans` conventions: one task per entity (schema →
queries → actions → page → nav is ONE task — the recipe in
`.claude/rules/crud.md` is mechanical), one task per custom page/flow, one
final verification task. Save to `docs/superpowers/plans/`.

## Phase 3 — Scaffold

```bash
pnpm create-mvp <name>
```

Skip if `apps/<name>/` exists. Commit the scaffold before implementing, so
diffs stay reviewable.

## Phase 4 — Implement

Execute the plan task by task (`superpowers:executing-plans` or
`superpowers:subagent-driven-development` for independent tasks):

- CRUD entity → follow `.claude/rules/crud.md` exactly (crudActions +
  ResourcePanel — an entity is ~40 lines total).
- Custom UI → invoke `ui-ux-pro-max` with the spec (fallback: `frontend-design`),
  then `.claude/rules/ui.md`. URL-persistent state → `.claude/rules/url-state.md`.
- DB / auth / billing → the matching `.claude/rules/*.md`.
- After every schema change: `db:generate` + `db:migrate` and **commit the
  migration files** (CI fails on drift).
- Commit after each completed task.

## Phase 5 — Verify (the gate)

```bash
pnpm --filter @koeti/<name> typecheck
pnpm --filter @koeti/<name> test
pnpm --filter @koeti/<name> build
pnpm verify-app <name>          # boots the app, renders every page authenticated
pnpm e2e-app <name>             # real browser: sign-up + create/delete through every ResourcePanel
```

All five must pass. On failure use `superpowers:systematic-debugging` — fix,
re-run, repeat. Never weaken a check to get past it. If you touched anything
under `packages/` or `scripts/`, also run the root `pnpm typecheck && pnpm test
&& pnpm build && pnpm smoke`.

## Phase 6 — Ship

Husky's `pre-push` runs `typecheck && test` on `git push` (`.claude/rules/git-hooks.md`) —
it should pass since Phase 5 already did. Commit remaining work, push the branch,
`gh pr create --draft` with a summary
of the spec decisions and verification evidence. Do NOT deploy — first-time
Vercel setup has dashboard-only steps; leave a "to deploy" note in the PR body
pointing at `.claude/rules/deploy.md`.

## Failure protocol

Blocked >3 attempts on the same error: commit what passes, open the draft PR
anyway, and list the failure honestly in the PR body under "Known broken".
A reviewable partial beats an abandoned branch.
