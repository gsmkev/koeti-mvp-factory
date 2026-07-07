# @koeti/fiado

A SaaS app in the koeti-mvp-factory monorepo: Next.js (App Router) + Postgres (Drizzle) + Stripe subscriptions + email/password auth with teams. Business logic lives here; all infrastructure comes from `packages/@koeti/*`.

## Run

```bash
# from the monorepo root
pnpm bootstrap                                  # .env.local + local Postgres (first time)
pnpm --filter @koeti/fiado db:migrate   # apply migrations
pnpm --filter @koeti/fiado db:seed      # test user: test@test.com / admin123
pnpm --filter @koeti/fiado dev          # http://localhost:3000
```

Runs without Stripe/Resend/PostHog keys — pricing is empty, emails are skipped with a warning, analytics is a no-op. Add keys in `.env.local` to enable them.

## Structure

| Path                     | What goes here                                                             |
| ------------------------ | -------------------------------------------------------------------------- |
| `app/(login)/`           | Sign-in / sign-up pages and auth server actions                            |
| `app/(dashboard)/`       | Landing, pricing, dashboard, settings                                      |
| `app/api/stripe/`        | Checkout redirect + webhook                                                |
| `lib/db/schema.ts`       | **This app's tables only** — users/teams/invitations come from `@koeti/db` |
| `lib/db/queries.ts`      | DB reads/writes                                                            |
| `lib/auth/middleware.ts` | `validatedActionWithUser`, `withTeam` action wrappers                      |
| `lib/payments/`          | Thin re-exports + actions over `@koeti/billing`                            |
| `proxy.ts`               | Route protection (`/dashboard`)                                            |

## Change the schema

1. Add tables to `lib/db/schema.ts` (reference base tables from `@koeti/db` for FKs)
2. `pnpm --filter @koeti/fiado db:generate`
3. `pnpm --filter @koeti/fiado db:migrate`
4. Commit the generated migration with your change

## Verify

```bash
pnpm --filter @koeti/fiado typecheck
pnpm --filter @koeti/fiado test        # includes the env contract check
pnpm --filter @koeti/fiado build
```

Conventions: monorepo root `CLAUDE.md` and `.claude/rules/` (db, auth, billing, ui, deploy).
