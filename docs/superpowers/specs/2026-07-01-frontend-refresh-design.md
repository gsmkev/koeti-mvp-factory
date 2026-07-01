# Frontend Refresh — Design Spec

**Date:** 2026-07-01
**Scope:** `packages/ui`, `apps/saas-template`, `apps/pos`

## Purpose

The factory's shared UI layer and scaffold are both generic-boilerplate quality: `@koeti/ui`
only has Avatar/Button/Card/DropdownMenu/Input/Label/RadioGroup, and `apps/saas-template`'s
landing/pricing/dashboard pages are 100% unmodified Vercel SaaS-starter copy. koeti-pos's own
views (inventory, suppliers, pos, sales) use raw HTML tables/selects and always-open inline
forms instead of proper components.

This pass builds out `@koeti/ui` with the primitives every SaaS in this factory actually
needs, refreshes `apps/saas-template` to a real generic baseline built on them, and redesigns
koeti-pos's in-scope views on top of the same components — so the next `pnpm create-mvp`
starts from something good, not a blank template.

## Architecture

- `packages/ui` gains new primitives, same convention as existing ones: CSS-variable-themed
  (`--primary`, `--border`, etc.), unstyled-opinion-free by default so any app's theme
  overrides apply without component changes.
- `apps/saas-template`'s landing, pricing, and dashboard shell are rewritten using these
  components. This becomes the actual scaffold `pnpm create-mvp` copies — the baseline every
  future app inherits.
- `apps/pos` is redesigned on the same components, keeping its existing till-green/receipt-mono
  theme (IBM Plex Sans/Mono, warm paper background, tabular-mono figures for money — already
  established this session). No route or server-action changes — this is a UI-layer pass.
- Shared base stays neutral/generic; koeti-pos's personality lives entirely in theme tokens
  and its own page copy, not in the components themselves.

## New `@koeti/ui` components

| Component | Purpose |
|---|---|
| `Table` (+ Header/Row/Cell/etc.) | Replaces raw `<table>` in inventory, sales, suppliers, dashboard |
| `Select` | Replaces raw `<select>` (supplier picker in payment-form) |
| `Dialog` | Replaces the always-visible/toggle-open inline edit forms |
| `Tabs` | Settings sub-nav (general/activity/security) |
| `Badge` | Sale status, low-stock indicators |
| `Textarea` | Longer form fields (e.g. supplier contact) |
| `Switch` | Boolean settings (no urgent consumer yet, but a real gap in the primitive set) |
| `Skeleton` | Loading states (e.g. `/pos` product grid while `/api/products` fetches) |
| `Separator` | Replaces ad-hoc `border-t` divs |
| `Sonner` (toast) | Replaces inline "Guardado"/error `<p>` tags scattered through every form |

## Page inventory

**apps/saas-template** (new generic baseline):
- Landing (home)
- Pricing
- Dashboard shell

**apps/pos** (redesigned on the same components + its own theme):
- Landing (home)
- Pricing
- `/pos`
- `/sales`
- `/inventory`
- `/suppliers`
- `/dashboard`
- `/dashboard/general`
- `/dashboard/activity`
- `/dashboard/security`

**Out of scope:** sign-in/sign-up pages, business logic/server actions, route structure,
schema.

## Error / empty / loading states

Standardize once, apply everywhere:
- `Skeleton` while data loads.
- A consistent empty-state pattern (icon + short copy) — already used ad hoc in koeti-pos,
  formalized as the one pattern every list/table uses.
- `Sonner` toasts for action feedback, replacing inline success/error `<p>` tags.

## Verification

Per app, in order: `tsc --noEmit`, local `next build`, then a Playwright screenshot pass
through every changed page (empty-state and populated-state where relevant — e.g. inventory
with 0 products and with products). Same pattern already validated earlier this session for
koeti-pos; no new testing infrastructure.

## Skipped (YAGNI)

- Sign-in/sign-up redesign (explicitly out of scope this round).
- A separate design-tokens/style-guide document — the neutral-base-plus-per-app-theme
  decision and the component list above cover what a style guide would otherwise restate.
- Component playground/showcase page — direct integration into real app pages is the proof.
