# koeti-mvp-factory

SaaS factory monorepo. Each `apps/<name>/` is a full SaaS (Next.js + Postgres + Stripe + auth + teams) containing only its own business logic; everything shared lives in `packages/@koeti/*`.

## Quickstart

```bash
pnpm install
pnpm bootstrap                # env files for all apps + local Postgres via docker compose
pnpm create-mvp my-saas       # scaffold apps/my-saas with its own DB, env, and deps installed
pnpm --filter @koeti/my-saas db:migrate
pnpm --filter @koeti/my-saas dev
```

`create-mvp` pre-fills `.env.local` with a working `POSTGRES_URL` and a generated `AUTH_SECRET`. Add Stripe/Resend/PostHog keys when you need those features — the app builds and runs without them.

## Commands

```bash
pnpm build        # build all apps (Turbo cached)
pnpm typecheck    # tsc --noEmit across all apps and packages
pnpm test         # vitest across all workspaces with tests
pnpm smoke        # full factory loop: scaffold → migrate → build → serve → HTTP 200 → cleanup
pnpm verify-app <name>  # boot one app and render every page with a real session (SSR crash check)
pnpm e2e-app <name>     # E2E in headless Chromium: sign-up + create/delete through the real forms
pnpm dev          # dev all apps
pnpm --filter @koeti/<name> db:generate   # generate migration from schema changes
pnpm --filter @koeti/<name> db:migrate    # apply migrations
```

## Layout

| Path                                                 | Purpose                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `apps/saas-template/`                                | The template every new SaaS is cloned from                     |
| `apps/<name>/`                                       | One SaaS per directory, owns `lib/db/schema.ts` for its tables |
| `packages/auth,db,billing,ui,email,analytics,config` | Shared infrastructure (`@koeti/*`)                             |
| `scripts/create-mvp.mjs`                             | Scaffolder                                                     |
| `scripts/verify-app.mjs`                             | Per-app runtime verification (public + authenticated pages)    |
| `scripts/e2e-app.mjs`                                | Per-app browser E2E (sign-up + CRUD via ResourcePanel forms)   |

## AFK mode

With Claude Code: `/factory <name> — <business logic>` runs spec → plan →
scaffold → implement → verify → draft PR autonomously. See
`.claude/skills/factory/SKILL.md`.

Conventions and agent rules: see `CLAUDE.md` and `.claude/rules/`.
