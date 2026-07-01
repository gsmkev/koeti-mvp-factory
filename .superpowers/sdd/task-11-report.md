# Task 11 Report: Rewrite saas-template landing page

## Frontend-design direction

Invoked `frontend-design:frontend-design` with the brief's exact context string
(content-neutral scaffold landing, must feel real/polished not templated, no
product features to sell yet).

Design plan produced and followed:

- **Subject reframe**: rather than inventing fake product copy, the honest
  subject of this page *is* the scaffold itself — the real infrastructure this
  template ships with (auth, billing, teams). Framing the copy around that
  keeps it content-neutral (no vertical/product assumption) while still being
  specific and true, avoiding generic "Build Your SaaS Faster" filler.
- **Palette**: stayed inside the existing shadcn CSS variables already wired
  in `globals.css` (zinc/white light theme: `--background`, `--foreground`,
  `--border`, `--muted-foreground`, `--primary`) — deliberately no new brand
  hex values, since this is the pre-brand baseline every future app re-themes
  on top of. Kept fully monochrome (no accent hue) so no color choice here
  fights a later app's identity.
- **Type**: kept Manrope (already loaded via `next/font/google` in root
  layout) for display/body — bold/extrabold headline weight for contrast, and
  added a `font-mono` (system monospace stack, no new import) as a third
  "utility" voice for eyebrows/tags, evoking code/schema annotation and tying
  literally to the "scaffold" concept.
- **Layout**: hero (2-col on `lg`, stacked below) → 3-card feature grid →
  centered closing CTA. Exactly hero + features + CTA, per the ponytail note.
- **Signature element**: a small CSS-only "wiring diagram" — three
  monospace-labeled chips (`auth`, `billing`, `teams`) connected by a dashed
  vertical spine that converges into a dark `your app` chip. This is a literal,
  truthful visualization of what the scaffold wires together, not decorative
  chrome. Paired with a faint blueprint/graph-paper grid backdrop and four
  small `+` corner marks in the hero, echoing a technical-drawing register
  that fits a "foundation you build on" story without needing a new color or
  stock photography.
- Self-critique against the skill's three cliché defaults (cream+serif+
  terracotta; near-black+neon; broadsheet newspaper) — this direction matches
  none of them: light background, no serif, no neon accent, no dense columns.

## Implementation

Replaced `apps/saas-template/app/(dashboard)/page.tsx` entirely:
- Server component, no client state, no new data fetching.
- Uses `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle` from
  `@koeti/ui` (all pre-existing) plus `next/link` for internal navigation.
- Hero: eyebrow (`Scaffold // 01`), headline ("Ship the boring part once."),
  subhead, two CTAs (`Get started` → `/sign-up`, `View pricing` → `/pricing`),
  and the schema-diagram signature element.
- Features: 3 `Card`s for `auth` / `billing` / `teams`, each with a
  monospace tag, a plain-language title, and one sentence of user-facing
  copy (active voice, concrete, no marketing fluff).
- Closing CTA: centered headline + `Create your account` button (`/sign-up`)
  + `Sign in` text link (`/sign-in`).
- Deleted `apps/saas-template/app/(dashboard)/terminal.tsx` — it was only
  imported by the old page (fake animated `git clone` terminal) and is now
  dead code with no other references in the app.

All external links to `vercel.com/templates` and `github.com/nextjs/saas-starter`
were removed; internal links point to real routes that already exist in the
scaffold (`/sign-up`, `/sign-in`, `/pricing`).

## Typecheck

```
$ pnpm --filter @koeti/saas-template exec tsc --noEmit
```
Output: no errors (clean exit, no stdout/stderr).

## Local verification

Port 3000 was already occupied by the `apps/pos` dev server (pre-existing,
unrelated to this task), so I ran saas-template on `PORT=3010` instead.

The root layout (`app/layout.tsx`, unrelated to this task) calls
`getUser()`/`getTeamForUser()` at import time via `lib/db/drizzle.ts`, which
throws if `POSTGRES_URL` isn't set — the saas-template app has no `.env`
(only `.env.example`) in this environment. This is a pre-existing local-dev
gap, not something introduced by this change. For verification only, I
pointed `POSTGRES_URL` at the pre-provisioned local `saas_template` Postgres
role/db (`docker/postgres/init.sql` already creates it) and set a throwaway
`AUTH_SECRET` — no files were modified/committed for this, it was passed as
inline env for the one-off `pnpm --filter @koeti/saas-template dev` process.
`getUser()` short-circuits before querying when there's no session cookie, so
no DB schema/migration was needed.

- Navigated to `http://localhost:3010` with Playwright.
- `browser_console_messages`: **0 errors**, 1 pre-existing warning
  (`<link rel=preload> must have a valid 'as' value`, present on both
  localhost:3010 and an unrelated production URL surfaced in the same log —
  a Next.js font-preload warning unrelated to this page's markup).
- Took full-page screenshots at default viewport and at 1440×900. Confirmed:
  hero, schema diagram, 3 feature cards, and closing CTA all render as
  designed; responsive stacking works below the `lg` breakpoint; the small
  black circle with "N" visible in the screenshots is the Next.js dev-mode
  route indicator (a fixed-position dev-only overlay that gets baked into
  full-page screenshot compositing) — not part of the page and absent in
  production builds.
- Stopped the verification dev server afterward and deleted the temporary
  screenshot PNGs from the repo root; the `apps/pos` dev server on port 3000
  was left untouched throughout.

## Files changed

- `apps/saas-template/app/(dashboard)/page.tsx` (rewritten)
- `apps/saas-template/app/(dashboard)/terminal.tsx` (deleted — dead code,
  only consumer was the old page)

## Self-review

- Confirmed no imports from other `apps/*` (rule compliance) — only
  `@koeti/ui` and `next/link`.
- Confirmed no `npx shadcn add` was run; only pre-existing `@koeti/ui`
  exports used.
- Confirmed the page stays a server component (no `'use client'`, no hooks).
- Confirmed accessibility basics: decorative elements (`+` corner marks,
  connector lines, grid backdrop) are marked `aria-hidden`; interactive
  elements are real `<Link>`/`<Button>` elements with visible focus rings
  inherited from `@koeti/ui`'s `Button` (`focus-visible:ring-ring/50`).
- No motion was added, so "respect reduced motion" is trivially satisfied.
- Verified `terminal.tsx` had no other consumers before deleting it.
- One judgment call: used inline `style` for the grid-pattern background
  (arbitrary Tailwind v4 `bg-[...]` class got unwieldy with two stacked
  gradients + `var(--color-border)`); this is a static, one-off decorative
  layer, not a pattern to replicate elsewhere, so a plain `style` prop felt
  more honest than fighting Tailwind's arbitrary-value syntax for it.
