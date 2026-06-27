# Knowledge Graph — Agent Guide

This monorepo maintains two complementary code graphs updated automatically.
Use them before grepping files — it's 5–10x cheaper in tokens.

---

## Tools available

### code-review-graph (CRG) — MCP tools, use first

CRG gives you ~8 queryable tools via MCP. Prefer these over grep/Read for:

| Question | Tool to use |
|---|---|
| Where is `functionName` defined? | `find_definition` |
| Who calls `functionName`? | `find_callers` |
| What does `file.ts` import/export? | `get_file_context` |
| Blast radius of changing `@koeti/db`? | `get_impact_radius` |
| What does this module do? | `get_community_summary` |
| Find all usages of a pattern | `search_graph` (keyword or semantic) |

CRG covers the full monorepo — packages + apps. One query answers across all of `@koeti/*` and `apps/*`.

### graphify — markdown report, use for architecture overview

`graphify-out/GRAPH_REPORT.md` — community breakdown of the codebase. Read this when you need to understand module boundaries or discover related files before starting a task.

`graphify-out/graph.html` — interactive D3 visualization (open in browser, for human review).

---

## When to use the graph vs. files

**Use graph first:**
- Tracing how auth flows from `@koeti/auth` into an app
- Finding all places where `db.insert` is called
- Checking what a package exports before importing it
- Estimating impact of changing a shared package

**Read the file directly:**
- Implementing new code (you need the full file)
- Debugging a specific function whose location you already know
- Reading a config file

**Never use grep when the graph is available.** CRG `search_graph` is faster and returns structured results without reading whole files.

---

## How graphs stay current

**CRG** — updates automatically after every Claude Code turn (Stop hook, ~0.425s, non-blocking).

**graphify** — updates on every `git commit` via post-commit hook (~10s, runs in background). Do not run `graphify update` manually during a Claude session — it causes process pile-up.

Both graphs use incremental updates: only changed files are reprocessed.

---

## Setup (run once per machine)

```bash
# Install
pip install graphifyy code-review-graph

# Build initial graphs
graphify update .
code-review-graph build

# Register CRG MCP tools with Claude Code + git hooks
code-review-graph install
graphify hook install

# Use focused 8-tool MCP set (reduces schema overhead ~70%)
export CRG_TOOLS=find_definition,find_callers,get_file_context,get_impact_radius,get_community_summary,search_graph,get_architecture_overview,traverse_graph
```

Add `CRG_TOOLS` to your shell profile or `.env.local` so it persists.

---

## Monorepo scope

The graphs are built from the monorepo root and cover everything:

```
packages/auth/      → indexed
packages/db/        → indexed
packages/billing/   → indexed
packages/ui/        → indexed
packages/email/     → indexed
packages/analytics/ → indexed
packages/config/    → indexed
apps/saas-template/ → indexed
apps/<new-saas>/    → indexed after next git commit or CRG Stop hook
```

When a new SaaS is scaffolded with `pnpm create-mvp`, the graph picks it up automatically after the first commit or Claude session turn.

---

## Token budget reference

From the article benchmarks (1,052-file monorepo, 5,780 nodes):

| Query | grep+Read | CRG |
|---|---|---|
| Find a function definition | ~594 tokens | ~115 tokens |
| Who calls X? | ~1,109 tokens | ~80 tokens |
| Impact radius | incomplete | ~70 tokens |

Full 37-lookup session: CRG ~20k tokens vs grep ~110k tokens (5.5x difference).

---

## Files to ignore

The following are generated — never edit manually:

```
graphify-out/
.code-review-graph/
```

Both are in `.gitignore`.
