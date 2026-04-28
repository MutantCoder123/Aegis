"use client"

import * as React from "react"
import { Flame, Activity } from "lucide-react"
import { useBroadcaster } from "@/lib/broadcaster-context"

/**
 * Smooth Catmull-Rom → cubic Bezier path generator.
 * Produces a soft, gradual curve through every data point.
 */
function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return ""
  const tension = 0.5
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export function TemporalHeatmap() {
  const { data } = useBroadcaster()
  const HEATMAP_DATA = data.heatmap
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)
  const max = Math.max(...HEATMAP_DATA.map((d) => d.detections))

  const W = 1000
  const H = 240
  const padX = 28
  const padY = 32
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  const points = HEATMAP_DATA.map((d, i) => {
    const x = padX + (i / (HEATMAP_DATA.length - 1)) * innerW
    const y = padY + innerH - (d.detections / max) * innerH
    return { x, y, ...d, idx: i }
  })

  const linePath = buildSmoothPath(points)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${
    padY + innerH
  } Z`

  // Average and peak intensity (0-1) for the temperature meter
  const avgIntensity =
    HEATMAP_DATA.reduce((s, d) => s + d.detections, 0) / HEATMAP_DATA.length / max
  const peakMinute = HEATMAP_DATA.reduce((peak, d) => (d.detections > peak.detections ? d : peak))

  const hovered = hoverIdx !== null ? points[hoverIdx] : null

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-highlight" />
            <h3 className="text-[15px] font-semibold tracking-tight">
              Temporal Engagement Heatmap
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Piracy demand across the 90-minute broadcast — warmer fill = higher detection density
          </p>
        </div>

        {/* Compact temperature scale legend */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Cool
          </span>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #fdf1e4 0%, #fbdfc6 25%, #f8c69e 55%, #f0a06d 80%, #e07a3c 100%)",
              boxShadow: "inset 0 0 0 1px rgba(28,25,23,0.06)",
            }}
            aria-hidden
          />
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Hot
          </span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]" preserveAspectRatio="none">
          <defs>
            {/*
              Vertical heat gradient — bottom is nearly transparent cream,
              top progressively warms through soft peach to a light coral.
              Peaks reach the warmest stops, valleys only show pale tones.
            */}
            <linearGradient id="heatArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e07a3c" stopOpacity="0.55" />
              <stop offset="22%" stopColor="#f0a06d" stopOpacity="0.42" />
              <stop offset="48%" stopColor="#f8c69e" stopOpacity="0.28" />
              <stop offset="75%" stopColor="#fbdfc6" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fdf1e4" stopOpacity="0" />
            </linearGradient>

            {/* Subtle line stroke that follows the area */}
            <linearGradient id="heatLine" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d97743" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f0a06d" stopOpacity="0.45" />
            </linearGradient>

            {/* Soft glow for the area path itself (gives the "warm haze" feel) */}
            <filter id="warmGlow" x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Faint horizontal guide lines */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={padX}
              x2={W - padX}
              y1={padY + innerH * p}
              y2={padY + innerH * p}
              stroke="rgba(28,25,23,0.05)"
              strokeDasharray="2 5"
            />
          ))}

          {/* Soft warm haze layer — same area but blurred for ambient temperature feel */}
          <path d={areaPath} fill="url(#heatArea)" filter="url(#warmGlow)" opacity="0.6" />

          {/* Crisp area on top */}
          <path d={areaPath} fill="url(#heatArea)" />

          {/* Smooth contour line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#heatLine)"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover targets */}
          {points.map((p) => (
            <rect
              key={p.idx}
              x={p.x - innerW / HEATMAP_DATA.length / 2}
              y={padY}
              width={innerW / HEATMAP_DATA.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(p.idx)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}

          {/* Hover indicator — subtle vertical line + dot */}
          {hovered && (
            <>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={padY}
                y2={padY + innerH}
                stroke="rgba(28,25,23,0.22)"
                strokeDasharray="2 3"
              />
              <circle cx={hovered.x} cy={hovered.y} r={4.5} fill="#ffffff" />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r={4.5}
                fill="none"
                stroke="#d97743"
                strokeWidth={1.5}
              />
            </>
          )}

          {/* X-axis labels */}
          {[0, 15, 30, 45, 60, 75, 90].map((m) => {
            const x = padX + ((m - 1) / 89) * innerW
            return (
              <text
                key={m}
                x={x}
                y={H - 6}
                fontSize={9}
                textAnchor="middle"
                fill="#a8a29e"
                fontFamily="var(--font-mono)"
              >
                {m === 0 ? "0m" : `${m}m`}
              </text>
            )
          })}
        </svg>

        {hovered && (
          <div
            className="glass-strong absolute pointer-events-none rounded-lg px-3 py-2 text-[11px] z-10 min-w-[160px]"
            style={{
              left: `min(calc(${(hovered.x / W) * 100}% + 8px), calc(100% - 180px))`,
              top: `${(hovered.y / H) * 100}%`,
              transform: "translateY(-110%)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="h-3 w-3 text-highlight" />
              <span className="font-semibold text-[11px]">Minute {hovered.minute}</span>
            </div>
            <div className="scoreboard text-[14px] text-foreground leading-none">
              {hovered.detections}
              <span className="text-[10.5px] text-muted-foreground font-medium ml-1.5 tracking-normal">
                detections
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Heat index ·{" "}
              <span className="scoreboard text-foreground/80">
                {Math.round((hovered.detections / max) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/60">
        <SummaryStat label="Avg heat" value={`${Math.round(avgIntensity * 100)}%`} />
        <SummaryStat
          label="Peak minute"
          value={`Min ${peakMinute.minute}`}
          sub={`${peakMinute.detections} detections`}
        />
        <SummaryStat
          label="Total in window"
          value={HEATMAP_DATA.reduce((s, d) => s + d.detections, 0).toLocaleString()}
        />
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="scoreboard text-[16px] mt-1 leading-none">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}
