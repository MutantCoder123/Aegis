"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { HEATMAP_DATA } from "@/lib/aegis-data"

const HIGHLIGHT_LABELS: Record<number, string> = {
  12: "First Tip-off · Auto-Tagged Highlight",
  27: "Buzzer-Beater · 3pt · Curry",
  42: "End of Q2 · Clip Surge",
  61: "Slam Dunk · Auto-Tagged Highlight",
  78: "Final Minutes · Peak Distribution",
}

export function TemporalHeatmap() {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)
  const max = Math.max(...HEATMAP_DATA.map((d) => d.detections))

  // SVG dimensions
  const W = 1000
  const H = 220
  const padX = 24
  const padY = 30
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  const points = HEATMAP_DATA.map((d, i) => {
    const x = padX + (i / (HEATMAP_DATA.length - 1)) * innerW
    const y = padY + innerH - (d.detections / max) * innerH
    return { x, y, ...d, idx: i }
  })

  // Build smooth path
  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ")
  const areaPath = `${path} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`

  const hovered = hoverIdx !== null ? points[hoverIdx] : null

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Temporal Engagement Heatmap</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Piracy spikes · 90-minute timeline · gold stars are auto-tagged highlights
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-highlight" />
            Detections
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3 w-3 fill-highlight text-highlight" />
            Highlights
          </span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ea7c45" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ea7c45" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#c25a25" />
              <stop offset="50%" stopColor="#ea7c45" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>

          {/* grid */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={padX}
              x2={W - padX}
              y1={padY + innerH * p}
              y2={padY + innerH * p}
              stroke="rgba(28,25,23,0.06)"
              strokeDasharray="3 4"
            />
          ))}

          {/* area */}
          <path d={areaPath} fill="url(#areaGrad)" />
          {/* line */}
          <path d={path} fill="none" stroke="url(#lineGrad)" strokeWidth={2} strokeLinecap="round" />

          {/* hover targets */}
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

          {/* hover cursor */}
          {hovered && (
            <>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={padY}
                y2={padY + innerH}
                stroke="rgba(28,25,23,0.25)"
                strokeDasharray="2 3"
              />
              <circle cx={hovered.x} cy={hovered.y} r={5} fill="#ea7c45" stroke="white" strokeWidth={2} />
            </>
          )}

          {/* highlight stars */}
          {points
            .filter((p) => p.isHighlight)
            .map((p) => (
              <g key={`star-${p.idx}`} transform={`translate(${p.x}, ${p.y - 14})`}>
                <circle r={11} fill="white" stroke="#ea7c45" strokeWidth={1.5} />
                <g transform="translate(-6, -6) scale(0.5)" className="star-twinkle">
                  <path
                    d="M12 2 L14.6 8.6 L22 9.3 L16.5 14.2 L18.2 21.5 L12 17.8 L5.8 21.5 L7.5 14.2 L2 9.3 L9.4 8.6 Z"
                    fill="#ea7c45"
                  />
                </g>
              </g>
            ))}

          {/* x-axis labels */}
          {[0, 15, 30, 45, 60, 75, 90].map((m) => {
            const x = padX + ((m - 1) / 89) * innerW
            return (
              <text key={m} x={x} y={H - 6} fontSize={9} textAnchor="middle" fill="#78716c">
                {m}m
              </text>
            )
          })}
        </svg>

        {hovered && (
          <div
            className="glass-strong absolute pointer-events-none rounded-lg px-3 py-2 text-[11px] z-10 min-w-[180px]"
            style={{
              left: `min(calc(${(hovered.x / W) * 100}% + 8px), calc(100% - 200px))`,
              top: `${(hovered.y / H) * 100}%`,
              transform: "translateY(-110%)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {hovered.isHighlight && <Star className="h-3 w-3 fill-highlight text-highlight" />}
              <span className="font-semibold text-[11px]">Minute {hovered.minute}</span>
            </div>
            <div className="scoreboard text-[14px] text-foreground">
              {hovered.detections} detections
            </div>
            {hovered.isHighlight && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {HIGHLIGHT_LABELS[hovered.minute]}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
