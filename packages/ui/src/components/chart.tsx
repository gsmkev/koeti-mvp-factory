import * as React from "react"

import { cn } from "../utils"

/*
 * Zero-dependency, server-renderable SVG charts for factory dashboards.
 * No 'use client', no charting lib — plain SVG so they work in RSC pages
 * and cost nothing in the client bundle. Hover tooltips use native <title>
 * (free, accessible). Colors come from the theme's --chart-1..5 tokens, so
 * they follow light/dark automatically.
 *
 * ponytail: single-series API — {label, value}[] covers the common
 * "one metric over time / one breakdown" dashboard case. Need multiple
 * series on one axis? Add a `series` prop then; don't reach for a dual axis.
 */

export type ChartDatum = { label: string; value: number }

const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]
const color = (i: number) => SERIES[i % SERIES.length]

const defaultFormat = (v: number) => v.toLocaleString()

function Figure({
  title,
  caption,
  className,
  children,
}: {
  title?: string
  caption?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <figure className={cn("w-full", className)}>
      {title && (
        <figcaption className="mb-3 text-sm font-medium text-foreground">
          {title}
        </figcaption>
      )}
      {children}
      {caption && (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function Legend({
  data,
  format,
}: {
  data: ChartDatum[]
  format: (v: number) => string
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {data.map((d, i) => (
        <li key={d.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: color(i) }}
            aria-hidden
          />
          <span className="text-muted-foreground">{d.label}</span>
          <span className="font-medium tabular-nums text-foreground">
            {format(d.value)}
          </span>
        </li>
      ))}
    </ul>
  )
}

type ChartProps = {
  data: ChartDatum[]
  title?: string
  caption?: string
  height?: number
  valueFormat?: (v: number) => string
  className?: string
}

/** Vertical bars for comparing magnitudes across categories (single series). */
function BarChart({
  data,
  title,
  caption,
  height = 240,
  valueFormat = defaultFormat,
  className,
}: ChartProps) {
  const W = 640
  const H = height
  const padX = 8
  const padTop = 24
  const padBottom = 28
  const max = Math.max(0, ...data.map((d) => d.value))
  const plotH = H - padTop - padBottom
  const slot = (W - padX * 2) / Math.max(1, data.length)
  const barW = Math.min(slot * 0.62, 72)

  return (
    <Figure title={title} caption={caption} className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={title ?? "bar chart"}
        className="overflow-visible"
      >
        <line
          x1={padX}
          y1={H - padBottom}
          x2={W - padX}
          y2={H - padBottom}
          className="stroke-border"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * plotH : 0
          const x = padX + slot * i + (slot - barW) / 2
          const y = H - padBottom - h
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 0)}
                rx={4}
                style={{ fill: color(0) }}
              >
                <title>{`${d.label}: ${valueFormat(d.value)}`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-foreground text-[13px] font-medium tabular-nums"
              >
                {valueFormat(d.value)}
              </text>
              <text
                x={x + barW / 2}
                y={H - padBottom + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[12px]"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </Figure>
  )
}

function linePoints(data: ChartDatum[], W: number, H: number, pad: { x: number; top: number; bottom: number }) {
  const max = Math.max(0, ...data.map((d) => d.value))
  const min = Math.min(0, ...data.map((d) => d.value))
  const range = max - min || 1
  const plotH = H - pad.top - pad.bottom
  const step = data.length > 1 ? (W - pad.x * 2) / (data.length - 1) : 0
  return data.map((d, i) => ({
    ...d,
    x: pad.x + step * i,
    y: pad.top + plotH - ((d.value - min) / range) * plotH,
  }))
}

/** Trend of a single metric over ordered categories (time). */
function LineChart({
  data,
  title,
  caption,
  height = 240,
  valueFormat = defaultFormat,
  area = true,
  className,
}: ChartProps & { area?: boolean }) {
  const W = 640
  const H = height
  const pad = { x: 12, top: 20, bottom: 28 }
  const pts = linePoints(data, W, H, pad)
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const baseline = H - pad.bottom
  const areaPath =
    pts.length > 0
      ? `${path} L${pts[pts.length - 1].x},${baseline} L${pts[0].x},${baseline} Z`
      : ""

  return (
    <Figure title={title} caption={caption} className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={title ?? "line chart"}
        className="overflow-visible"
      >
        <line
          x1={pad.x}
          y1={baseline}
          x2={W - pad.x}
          y2={baseline}
          className="stroke-border"
          strokeWidth={1}
        />
        {area && areaPath && (
          <path d={areaPath} style={{ fill: color(0), opacity: 0.12 }} />
        )}
        <path
          d={path}
          fill="none"
          style={{ stroke: color(0) }}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p) => (
          <g key={p.label}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              style={{ fill: color(0) }}
              className="stroke-card"
              strokeWidth={2}
            >
              <title>{`${p.label}: ${valueFormat(p.value)}`}</title>
            </circle>
            <text
              x={p.x}
              y={baseline + 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[12px]"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </Figure>
  )
}

/** Part-to-whole breakdown. Each slice is a categorical color + legend. */
function DonutChart({
  data,
  title,
  caption,
  height = 240,
  valueFormat = defaultFormat,
  centerLabel,
  className,
}: ChartProps & { centerLabel?: string }) {
  const size = height
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4
  const inner = r * 0.62
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0)

  let angle = -Math.PI / 2
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? Math.max(0, d.value) / total : 0
    const start = angle
    const end = angle + frac * Math.PI * 2
    angle = end
    const large = end - start > Math.PI ? 1 : 0
    const p = (rad: number, a: number) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]
    const [x1, y1] = p(r, start)
    const [x2, y2] = p(r, end)
    const [x3, y3] = p(inner, end)
    const [x4, y4] = p(inner, start)
    const d3 =
      frac === 0
        ? ""
        : `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`
    return { datum: d, d: d3, i }
  })

  return (
    <Figure title={title} caption={caption} className={className}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={title ?? "donut chart"}
          className="max-w-full shrink-0"
        >
          {arcs.map(({ datum, d, i }) => (
            <path
              key={datum.label}
              d={d}
              style={{ fill: color(i) }}
              className="stroke-card"
              strokeWidth={2}
            >
              <title>{`${datum.label}: ${valueFormat(datum.value)}`}</title>
            </path>
          ))}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-foreground text-[20px] font-semibold tabular-nums"
          >
            {valueFormat(total)}
          </text>
          {centerLabel && (
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              className="fill-muted-foreground text-[12px]"
            >
              {centerLabel}
            </text>
          )}
        </svg>
        <div className="w-full">
          <Legend data={data} format={valueFormat} />
        </div>
      </div>
    </Figure>
  )
}

/** Tiny inline trend line for stat rows — no axes, no labels. */
function Sparkline({
  data,
  width = 96,
  height = 28,
  className,
}: {
  data: number[]
  width?: number
  height?: number
  className?: string
}) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const path = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${height - ((v - min) / range) * height}`)
    .join(" ")
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        style={{ stroke: color(0) }}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export { BarChart, LineChart, DonutChart, Sparkline }
