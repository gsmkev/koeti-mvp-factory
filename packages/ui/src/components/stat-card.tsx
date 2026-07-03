import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { cn } from "../utils"
import { Card, CardContent } from "./card"
import { Sparkline } from "./chart"

function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  deltaGoodDirection = "up",
  trend,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  /** Signed change; drives the arrow direction and good/bad color. */
  delta?: number
  /** What to show for the delta (default: `+8%` / `-3%`). */
  deltaLabel?: React.ReactNode
  /** Which direction is "good" — expenses/churn set this to "down". */
  deltaGoodDirection?: "up" | "down"
  /** Recent values → a mini trend line to the right of the number. */
  trend?: number[]
  className?: string
}) {
  const up = delta != null && delta > 0
  const down = delta != null && delta < 0
  const good =
    delta == null || delta === 0
      ? null
      : (up && deltaGoodDirection === "up") || (down && deltaGoodDirection === "down")

  return (
    <Card data-slot="stat-card" className={cn("py-4", className)}>
      <CardContent className="px-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {trend && trend.length > 1 && (
            <Sparkline data={trend} className="mb-1" />
          )}
        </div>
        {delta != null && (
          <p
            className={cn(
              "mt-1 flex items-center gap-0.5 text-xs font-medium tabular-nums",
              good === true && "text-success",
              good === false && "text-destructive",
              good === null && "text-muted-foreground",
            )}
          >
            {up && <ArrowUpRight className="size-3.5" />}
            {down && <ArrowDownRight className="size-3.5" />}
            {deltaLabel ?? `${delta > 0 ? "+" : ""}${delta}%`}
            {hint && <span className="ml-1 text-muted-foreground">{hint}</span>}
          </p>
        )}
        {delta == null && hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}

export { StatCard }
