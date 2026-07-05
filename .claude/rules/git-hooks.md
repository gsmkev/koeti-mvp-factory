# Git hooks — cheap guards before CI

Husky-managed hooks live in `.husky/` (versioned, so every clone gets them).
`pnpm install` runs `prepare: "husky"` and wires them automatically — nothing to
set up on a fresh clone/worktree. They exist to catch the two cheapest CI
failures _before_ they cost a CI minute, not to replicate the whole pipeline.

## What runs

| Hook         | Runs                                                                         | Why here                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged` → `prettier --ignore-unknown --write` on **staged files only** | Formatting is instant and mechanical. lint-staged handles partially-staged files correctly (a hand-rolled hook doesn't) and re-stages the result. |
| `pre-push`   | `pnpm typecheck && pnpm test`                                                | The two fast, Turbo-cached CI gates. Catches broken types/tests before they hit CI. Unchanged workspaces are cache hits, so it's near-instant.    |

`build`, `smoke`, and `e2e` stay **CI-only** — too slow for a hook, and devs
just `--no-verify` around slow hooks, defeating the point.

## Rules

- **Monorepo-root only.** Hooks are one root install; scaffolded apps inherit
  them for free. Never add per-app hooks.
- **Prettier config is the single source of truth.** `.prettierignore` already
  excludes generated migrations/lockfiles; `--ignore-unknown` means the `*` glob
  formats only files Prettier has a parser for. Don't maintain a file-type list.
- **CI is still the real gate**, not the hooks. Hooks are skippable
  (`--no-verify`); `.github/workflows/ci.yml` is not. Keep the two in sync: a new
  fast check belongs in _both_, a slow one in CI _only_.
- **Bypass is legitimate** for WIP commits: `git commit --no-verify`. CI catches
  what you skip.

## Not included (add when the problem shows up)

- **ESLint** — the repo has no linter; `prettier --check` + `tsc --noEmit` _is_
  the lint. Add ESLint + a `lint` script (and a `lint-staged` `*.{ts,tsx}` entry)
  only when a class of bug lands that types/format can't catch.
- **commitlint / conventional-commit enforcement** — commit history already
  follows `type(scope):` cleanly by hand. Add a `commit-msg` hook only if
  messages start drifting or a changelog tool needs the guarantee.
