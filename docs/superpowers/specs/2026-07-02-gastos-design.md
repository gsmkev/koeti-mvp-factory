# gastos — design

Control de gastos de equipo: los miembros registran gastos con monto,
categoría, descripción y fecha; el dashboard muestra la lista y el total
gastado del mes en curso.

## Entities

### expenses (team-scoped)

| column | type | notes |
|---|---|---|
| id | serial PK | |
| teamId | integer FK → teams | scoping |
| amount | numeric(10,2) | positive, form input `number` step 0.01 |
| category | varchar(50) | one of: viaticos, materiales, software, otros |
| description | varchar(255) | required |
| spentAt | date | defaults to today in the form |
| createdAt | timestamp | defaultNow |

CRUD via `crudActions` (create + delete; edit is out of scope). Page via
`ResourcePanel` at `/dashboard/gastos` with a `StatCard` row above showing the
current-month total (custom query `getMonthTotal`).

## Decisions (autonomous defaults)

- **Team-scoped**, not per-user: "los miembros registran" — the whole team
  sees the shared list. Who spent it is out of scope for the MVP.
- **Categories are a fixed select** (viaticos, materiales, software, otros) —
  no categories table; promote to an entity only if custom categories are asked.
- **No currency handling**: amounts are plain decimals, displayed with `$`.
- **Month total = calendar month** in server time, sum over `spentAt`.
- Auth/teams/billing/email/analytics: template as-is, Stripe keyless.
- Landing/pricing: template's, untouched (reword later if the product ships).

## Out of scope

Per-member attribution, receipts/attachments, budgets, monthly reports,
category management, multi-currency, edit-in-place.

## Verification

`pnpm --filter @koeti/gastos typecheck|test|build` + `pnpm verify-app gastos`.
