---
paths:
  - "turbo.json"
  - "pnpm-workspace.yaml"
  - "**/next.config.ts"
  - "**/proxy.ts"
  - "**/middleware.ts"
  - "**/package.json"
  - "**/.vercel/**"
---

# Deploy pattern (Vercel)

## One Vercel project per app — never reuse another app's project

`vercel link --yes` fuzzy-matches by directory/repo name and will happily link to an
existing, unrelated project (with its own DB, its own prod traffic). For a new app:

```bash
vercel project add <app-name>          # dedicated project, don't reuse an existing one
cd <monorepo-root>                     # not inside the app dir
vercel link --repo --yes               # monorepo-aware link, writes .vercel/repo.json
```

After linking, confirm in the dashboard (no CLI/API equivalent exists for these):
- **Root Directory** → `apps/<app-name>`
- **Include files outside the root directory in the Build Step** → enabled (required for the
  build to see sibling `packages/*` and the root lockfile)
- **Framework Preset** → Next.js (defaults wrong — e.g. expects a `public` output dir — on a
  project created via `vercel project add` instead of a dashboard import)

If `.vercel/repo.json` ends up with two projects mapped to the same `directory`, the CLI
can't disambiguate — remove the stale entry.

## Env vars

- Every env var the build actually reads must be declared in `turbo.json`'s build task
  `"env"` list. Turbo's strict mode silently strips anything undeclared, so a var that's
  set correctly on Vercel still shows up as `undefined` in the build — surfaces as
  confusing runtime errors ("STRIPE_SECRET_KEY not set", "Neither apiKey nor
  config.authenticator provided") that look like missing Vercel config when the var is
  actually there.
- Vars the app doesn't consume but Vercel/an integration injects anyway (e.g. Neon's
  `PGUSER`, `POSTGRES_PRISMA_URL`, ...) go in `globalPassThroughEnv` instead of `env` —
  available to the build, but don't affect the cache key.
- **Preview/Development env scope does not cover Production.** If a GitHub integration is
  connected, pushing to `main` auto-deploys straight to Production — not Preview. Before
  pushing, check `vercel env ls production` covers everything the app needs, or the
  auto-deploy will crash on missing keys.
- Never pull or access production secrets without the user explicitly confirming — ask
  first, don't assume "no deploy yet" scoping extends to a later push.

## pnpm / turbo

- `pnpm` settings (`overrides`, `onlyBuiltDependencies`, etc.) belong in
  `pnpm-workspace.yaml`. pnpm 10 silently ignores a `"pnpm"` key in `package.json` — no
  error, just a warning that's easy to miss, and the setting never applies.
- Never let an app have its own `pnpm-lock.yaml` once it's part of the workspace. A stale
  per-app lockfile (leftover from before `create-mvp` wired it into the workspace) makes
  Next.js warn about an ambiguous workspace root, and — worse — makes a CLI-only deploy
  (no monorepo root uploaded) silently fall back to that stale lockfile's dependency set.
- A shared package with a loose peer range (`"next": ">=15.0.0"`) can resolve a different
  version than what the apps pin exactly. Pin peerDependencies to the exact version apps
  use, don't rely on `overrides` alone to force it.

## Shared package clients (Stripe, etc.) — never construct eagerly

```ts
// bad: crashes the ENTIRE build for every app that imports this package,
// the instant STRIPE_SECRET_KEY is missing in whatever env is building —
// even for routes that never touch Stripe.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... })

// good: only breaks the Stripe-specific route at runtime if the key is missing
let _stripe: Stripe | undefined
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop, receiver) {
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... })
    return Reflect.get(_stripe, prop, receiver)
  },
})
```

## `middleware.ts` → `proxy.ts` (current Next.js canary)

Next.js deprecated `middleware.ts` in favor of `proxy.ts` ahead of its own `>= 16.0.0`
version gate — Vercel's builder only recognizes the rename for Next `>= 16`, so on an
earlier canary you'll see a harmless `WARNING: Unable to find source file for page
middleware` even after renaming correctly. That warning is cosmetic (only matters if
`vercel.json` has a `functions` config referencing middleware).

What is **not** cosmetic: `proxy.ts` requires the handler as a **default export**, not the
named `export const middleware` that `middleware.ts` used. Getting this wrong doesn't fail
the build — it deploys clean and then 500s on every single request in production with
`MIDDLEWARE_INVOCATION_FAILED`. When renaming:

```ts
// middleware.ts (old)
export const middleware = _middleware

// proxy.ts (new)
export default _middleware
```

## After every deploy

- Check build logs (`vercel inspect <url> --logs`), not just the `READY` status — a
  `READY` deployment can still 500 on every request (e.g. the proxy default-export bug
  above deploys clean and fails only at request time).
- Migrate the schema against whichever DB the deploy target actually uses before testing
  it — Preview and Production may point at the same DB or different ones; check
  `vercel env ls` and confirm with the user before running migrations against anything
  that might be shared or already live.
- Preview deployments sit behind Vercel SSO. Use the Vercel plugin's shareable-link tool
  to get a bypass URL for automated/agent browser testing.
- A clean build is not a working app: hit the live URL and check `vercel logs <url>` for
  runtime errors before calling a deploy done.
