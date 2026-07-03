import type { ChartDatum } from "./chart"

/*
 * Turn raw DB rows into chart data ({ label, value }[]) in one line.
 * Pure functions, no deps — call them in a server component after a
 * teamId-scoped query, then pass the result straight to a chart.
 *
 *   const rows = await getExpenses(team.id)
 *   <DonutChart data={groupSum(rows, r => r.category, r => Number(r.amount))} />
 */

/** Sum `value` per `label`. Groups keep first-seen order (stable for time series). */
export function groupSum<T>(
  rows: readonly T[],
  label: (row: T) => string,
  value: (row: T) => number,
): ChartDatum[] {
  const acc = new Map<string, number>()
  for (const row of rows) {
    const k = label(row)
    acc.set(k, (acc.get(k) ?? 0) + value(row))
  }
  return [...acc].map(([label, value]) => ({ label, value }))
}

/** Count rows per `label`. */
export function countBy<T>(rows: readonly T[], label: (row: T) => string): ChartDatum[] {
  return groupSum(rows, label, () => 1)
}

/**
 * Keep the `n` largest slices; fold the rest into one "Other" bucket.
 * Categorical palettes only have ~5 safe hues — never render a 9th series,
 * fold it. Returns at most `n + 1` data points, sorted largest-first.
 */
export function topN(
  data: ChartDatum[],
  n: number,
  otherLabel = "Other",
): ChartDatum[] {
  if (data.length <= n) return [...data].sort((a, b) => b.value - a.value)
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const rest = sorted.slice(n).reduce((s, d) => s + d.value, 0)
  const top = sorted.slice(0, n)
  return rest > 0 ? [...top, { label: otherLabel, value: rest }] : top
}
