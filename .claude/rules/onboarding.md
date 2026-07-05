# Onboarding — first-run tenant wizard

Every app ships `/onboarding`: a four-step, server-rendered wizard
(`workspace → locale → team → plan`) that new team owners walk right after
sign-up. The step lives in the URL (`?step=…`, nuqs), each form posts a server
action that saves and redirects to the next step, and the whole thing is
idempotent — revisiting it later just re-saves.

## How the routing works

- `teams.onboarding_completed_at` (base schema) is null until the owner
  finishes. The server layout on the `(dashboard)` group redirects
  un-onboarded **owners** to `/onboarding`; members/admins are never bounced.
  This covers password sign-up, Google OAuth, and post-checkout returns.
- The final step stamps the column, then either goes to `/dashboard` (free) or
  straight into Stripe checkout (paid plan picked; catalog is empty without
  `STRIPE_SECRET_KEY`, so dev/CI only see the free option).
- Seeds set `onboardingCompletedAt` so `verify-app` sessions aren't bounced.
  `e2e-app` walks the wizard for real on every app.

## Tenant localization (set in the locale step)

| Setting  | Lives in                                           | Read it with                                                                    |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| Language | `NEXT_LOCALE` cookie (per user, i18n.md)           | `getLocale()` — already wired                                                   |
| Currency | `teams.currency` (ISO 4217, default USD)           | `new Intl.NumberFormat(locale, { style: 'currency', currency: team.currency })` |
| Units    | `teams.measurementSystem` (`metric` \| `imperial`) | branch in the feature that renders quantities                                   |

Money and units are **per-tenant** (every member sees the same reports);
language is per-user. Use the native `Intl` API for formatting — no library.
The currency list is a curated 9-code array in `app/onboarding/config.ts`;
extend it when a real tenant asks.

## Rules

- New tenant-basics questions go in the existing steps — don't add a step
  unless the data can't live in one of the four.
- Keep every step submittable with defaults: the wizard must never hard-block
  entry into the product (invites optional, free plan preselected).
- Wizard strings live in the **baseline** `onboarding` namespace
  (`@koeti/i18n`), not per-app messages.
