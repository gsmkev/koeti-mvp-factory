# Charts — visual reports on any dashboard

Charts live in `@koeti/ui` as **zero-dependency SVG**. No chart library, no
client bundle cost, and they render in **server components** — pass data
straight from a `teamId`-scoped query, no `'use client'`, no `useEffect`.
Colors come from the theme's `--chart-1..5` tokens, so they track light/dark
automatically. Hover tooltips are native (`<title>`), so accessibility is free.

```tsx
import { BarChart, LineChart, DonutChart, Sparkline } from '@koeti/ui'

// Every chart takes the same shape: { label, value }[]
<LineChart title="Revenue this week" data={rows} valueFormat={(v) => `$${v}`} />
<BarChart title="Signups by plan" data={rows} />
<DonutChart title="Spend by category" data={rows} centerLabel="total" />
```

## Which one

| Data's job                            | Component                                        |
| ------------------------------------- | ------------------------------------------------ |
| A metric over ordered time            | `LineChart` (set `area={false}` for a bare line) |
| Compare magnitudes across categories  | `BarChart`                                       |
| Part-to-whole breakdown               | `DonutChart` (renders its own legend)            |
| Trend inside a `StatCard` / table row | `Sparkline` (takes `number[]`)                   |

`StatCard` takes it further: pass `delta={8}` for a colored ▲/▼ change badge
(`deltaGoodDirection="down"` when less is better, e.g. expenses/churn) and
`trend={[…]}` for an inline sparkline — a full KPI tile in one component.

## Raw rows → chart data (one line)

Don't hand-roll `reduce`. `@koeti/ui` ships pure shapers that return the exact
`{ label, value }[]` charts want:

```ts
import { groupSum, countBy, topN } from '@koeti/ui'

const rows = await getExpenses(team.id)                       // teamId-scoped query
groupSum(rows, r => r.category, r => Number(r.amount))        // sum a metric per group
countBy(rows, r => r.status)                                  // count rows per group
topN(groupSum(rows, …), 5, 'Other')                           // keep top 5, fold the rest
```

`groupSum` keeps first-seen order — for a time series, `.sort()` by the date
label. `topN` folds everything past `n` into one "Other" slice, because a
categorical palette only has ~5 safe colors (never render a 9th series).

## Rules

- **Single series only.** The API is deliberately `{ label, value }[]`. Two
  metrics of different scale → two charts, never a second Y-axis.
- **Feed it real, scoped data.** `const rows = await getThings(team.id)` then
  `data={rows.map(r => ({ label: r.name, value: r.total }))}`.
- **`valueFormat`** formats every number (axis labels, tooltips, legend). Pass a
  currency/percent formatter instead of post-processing.
- Wrap in a `Card` + `CardContent` for the standard dashboard panel look; the
  charts fill their container width (`viewBox`, `height` prop sets the aspect).
- Pair charts with a **CSV export** route (`.claude/rules/crud.md` §6) so every
  visual report is also downloadable — that's the "exportable reports" promise.

## Export the whole dashboard as a PDF

Drop a `<PrintButton />` in the page's `PageHeader actions`. It calls the
browser's native print dialog (→ Save as PDF) — no PDF library. The `@media
print` rules in `globals.css` strip the sidebar/header, force a light
color-exact render (SVG charts stay crisp), and keep cards from splitting
across pages. Add `data-print-hide` to anything else that shouldn't print.

Worked example: `apps/saas-template/app/(dashboard)/dashboard/page.tsx`.
