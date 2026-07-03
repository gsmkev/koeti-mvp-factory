---
name: port-template-change
description: Propagate a change made in apps/saas-template or packages/@koeti/* to every existing app (gastos, ...). Use after upgrading the template so live MVPs don't drift. Usage; /port-template-change <what changed>
---

# /port-template-change — keep existing MVPs in sync with the template

The template is the source of truth; existing apps are forks of it. After any
template/packages upgrade, every app under `apps/*` (except `saas-template`)
must receive the same change or the factory drifts.

## 1. Classify the change

- `packages/@koeti/*` only → apps pick it up automatically; skip to step 4.
- Template files (`lib/`, `app/`, config) → each app has its own copy; port them.
- Schema (`packages/db` or template `lib/db/schema.ts`) → migrations per app (step 3).

## 2. Port template files to each app

For each changed template file, check whether the app's copy had diverged
**before** your change:

```bash
diff <(git show "HEAD:apps/saas-template/<path>") "apps/<app>/<path>"
```

- **Identical** → `cp apps/saas-template/<path> apps/<app>/<path>`.
- **Diverged** (translated strings, app-specific tweaks) → apply the same edit
  by hand, preserving the divergence. Translate any new user-facing strings to
  the app's language (gastos is Spanish).
- **New file** → copy it, then translate user-facing strings.
- Nav/registry-style edits (layout `NAV`, enums) are always manual — apps add
  their own entries.

## 3. Migrations (only if schema changed)

```bash
pnpm --filter @koeti/<app> db:generate && pnpm --filter @koeti/<app> db:migrate
```

Commit the generated migration files — CI fails on drift.

## 4. Verify (the same gate as CLAUDE.md's definition of done)

```bash
pnpm typecheck && pnpm test && pnpm build
pnpm smoke                        # template or scripts changed
pnpm verify-app <app> && pnpm e2e-app <app>   # for every ported app
```

## 5. Docs

If the change introduced a new pattern, update the matching `.claude/rules/*.md`
and the CLAUDE.md imports block in the same commit — future /factory runs only
know what the rules tell them.
