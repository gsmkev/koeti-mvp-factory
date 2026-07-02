# AFK factory — design

Goal: an LLM turns a paragraph of business logic into a built, tested, PR'd SaaS
without a human in the loop. Two levers: **less code per MVP** (abstraction) and
**machine-checkable correctness** (verification the LLM can run itself).

## Problem

Today an autonomous run of `create-saas` still requires:

- A pre-written spec + plan (the skill stops and asks if they're missing).
- ~60 lines of hand-rolled server actions per CRUD entity, each an opportunity
  to forget team scoping or `revalidatePath`.
- ~50 lines of page JSX per entity.
- No per-app runtime check: `pnpm smoke` tests the *template*, not the app the
  LLM just built. SSR crashes on authenticated pages (the most common LLM
  failure) go undetected until a human clicks around.

## Design

### 1. `crudActions()` — template `lib/crud.ts`

```ts
'use server' files shrink to:

const actions = crudActions(projects, { path: '/projects', schema: z.object({ name: z.string().min(1) }) })
export const createProject = actions.create
export const updateProject = actions.update
export const deleteProject = actions.remove
```

Factory wraps `withTeam`: create inserts `{ ...parsed, teamId }`, update/remove
scope `where` by `and(eq(id), eq(teamId))`. Team scoping becomes impossible to
forget. Lives in the template (not `@koeti/auth`) because it binds to the app's
`db` and `withTeam`, same as the existing middleware convention.

### 2. `ResourcePanel` — `@koeti/ui` composite

Declarative CRUD page section: `fields` config renders the create form
(text/number/textarea/select/date), `columns` + `rows` render the DataTable,
`onDelete` server action adds a per-row delete button, `empty` handled
automatically. A full entity page becomes ~15 lines of config. Built from
existing composites (Card, Input, DataTable, SubmitButton, EmptyState).

### 3. `scripts/verify-app.mjs <name>` — per-app runtime verification

The missing feedback signal for autonomous work:

1. `next build` the app (turbo-cached), `next start` on a free port.
2. Discover routes by globbing `app/**/page.tsx` (skip dynamic segments).
3. Public routes → expect 200.
4. `db:seed` (idempotent), then mint a session JWT (HS256 with the app's
   `AUTH_SECRET`, same shape `@koeti/auth` signs) for the seeded user and GET
   every dashboard route with the cookie → expect 200. This executes each
   page's server component against a real DB and catches SSR crashes.

Exposed as `pnpm verify-app <name>`. JWT minted with `node:crypto` — no deps.

### 4. `/factory` skill — the AFK orchestrator

`.claude/skills/factory/SKILL.md`, invoked as `/factory <name> — <business logic>`:

1. **Spec** — written autonomously from the business logic using stated
   defaults (team-scoped entities, dashboard pages per entity, Stripe wired
   but keys optional). No questions; assumptions recorded in the spec.
2. **Plan** — superpowers:writing-plans conventions, one task per entity/page.
3. **Scaffold** — `pnpm create-mvp <name>`.
4. **Implement** — task by task following `.claude/rules/`, frontend-design
   for custom UI, crud recipe for entities.
5. **Verify** — typecheck, test, db:generate (commit migrations), build,
   `pnpm verify-app <name>`. Loop on failures with systematic-debugging.
6. **Ship** — commit, push, draft PR. Deploy stays manual-gated per
   `.claude/rules/deploy.md` (first-time Vercel linking needs dashboard steps).

`create-saas` remains the "implement from an existing human-written spec" path.

### 5. Docs

`crud.md` rewritten around the new recipe (schema → 4-line actions →
15-line page → nav). CLAUDE.md/README gain `verify-app` and `/factory`.

## Out of scope

- Auto-deploy on first run (Vercel root-directory settings are dashboard-only).
- Codegen/scaffolding of entity files (runtime abstraction beats generated
  code that drifts).
- Moving `withTeam`/queries into packages (bound to per-app db by design).

## Verification

`pnpm typecheck && pnpm test && pnpm build && pnpm smoke` plus
`pnpm verify-app saas-template` proving the authenticated-page check works.
