# koeti-mvp-factory

SaaS factory monorepo. Each `apps/<name>/` is a full SaaS (Next.js + Postgres + Stripe + auth + teams) containing only its own business logic; everything shared lives in `packages/@koeti/*`.

## Quickstart

```bash
pnpm install
docker compose up -d          # local Postgres (databases auto-created from docker/postgres/init.sql)
pnpm create-mvp my-saas       # scaffold apps/my-saas with its own DB, env, and migrations dir
pnpm --filter @koeti/my-saas db:migrate
pnpm --filter @koeti/my-saas dev
```

`create-mvp` pre-fills `.env.local` with a working `POSTGRES_URL` and a generated `AUTH_SECRET`. Add Stripe/Resend/PostHog keys when you need those features — the app builds and runs without them.

## Commands

```bash
pnpm build        # build all apps (Turbo cached)
pnpm typecheck    # tsc --noEmit across all apps and packages
pnpm dev          # dev all apps
pnpm --filter @koeti/<name> db:generate   # generate migration from schema changes
pnpm --filter @koeti/<name> db:migrate    # apply migrations
```

## Layout

| Path | Purpose |
|---|---|
| `apps/saas-template/` | The template every new SaaS is cloned from |
| `apps/<name>/` | One SaaS per directory, owns `lib/db/schema.ts` for its tables |
| `packages/auth,db,billing,ui,email,analytics,config` | Shared infrastructure (`@koeti/*`) |
| `scripts/create-mvp.mjs` | Scaffolder |

Conventions and agent rules: see `CLAUDE.md` and `.claude/rules/`.
