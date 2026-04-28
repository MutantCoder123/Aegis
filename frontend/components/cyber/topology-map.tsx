"use client"

import * as React from "react"
import { Brain, Film, Tv, Waves } from "lucide-react"
import type { IngestionItem } from "./types"

export function TopologyMap({ latestItem }: { latestItem?: IngestionItem }) {
  const [hovered, setHovered] = React.useState(false)
  const [pulseActive, setPulseActive] = React.useState(false)
  const [simScore, setSimScore] = React.useState<number>(94.2)
  const prevItemId = React.useRef(latestItem?.id)

  React.useEffect(() => {
    if (latestItem && latestItem.id !== prevItemId.current) {
      prevItemId.current = latestItem.id
      setPulseActive(true)
      
      const fluc = setInterval(() => {
        setSimScore(Math.floor(Math.random() * 14) + 85) // 85-98
      }, 50)
      
      const timeout = setTimeout(() => {
        setPulseActive(false)
        clearInterval(fluc)
        setSimScore(latestItem.matchScore)
      }, 800)

      return () => {
        clearInterval(fluc)
        clearTimeout(timeout)
      }
    }
  }, [latestItem])

  const lineColor = hovered ? "var(--gold-bright)" : "rgba(28,25,23,0.45)"
  const lineGlow = hovered
    ? "rgba(234,124,69,0.32)"
    : "rgba(28,25,23,0.10)"

  return (
    <div
      className="relative h-[420px] w-full overflow-hidden rounded-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* grid backdrop */}
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, transparent 65%)",
        }}
        aria-hidden
      />

      {/* Header strip */}
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/80">
            Match Topology
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            session #A4F-29C
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            data flow
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            verdict ready
          </span>
        </div>
      </div>

      {/* SVG topology — static, no node or path animations */}
      <svg
        viewBox="0 0 800 420"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="50%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="brain-glow">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft halo around the central node */}
        <circle cx="400" cy="210" r="100" fill="url(#brain-glow)" />

        {/* Curve paths: left → brain, brain → right (no marching, no travelling dots) */}
        <path
          d="M 140 210 C 240 130, 320 130, 400 210"
          fill="none"
          stroke={lineColor}
          strokeOpacity="0.18"
          strokeWidth={hovered ? 6 : 4}
          style={{ filter: `drop-shadow(0 0 8px ${lineGlow})` }}
        />
        <path
          d="M 140 210 C 240 130, 320 130, 400 210"
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth={hovered ? 2.4 : 1.8}
        />
        <path
          d="M 400 210 C 480 290, 560 290, 660 210"
          fill="none"
          stroke={lineColor}
          strokeOpacity="0.18"
          strokeWidth={hovered ? 6 : 4}
          style={{ filter: `drop-shadow(0 0 8px ${lineGlow})` }}
        />
        <path
          d="M 400 210 C 480 290, 560 290, 660 210"
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth={hovered ? 2.4 : 1.8}
        />

        {pulseActive && (
          <circle r="4" fill="#e11d48">
            <animateMotion dur="0.8s" repeatCount="1" path="M 140 210 C 240 130, 320 130, 400 210" calcMode="linear" fill="remove" />
          </circle>
        )}

        {/* Connecting echo path on bottom */}
        <path
          d="M 140 210 C 280 380, 520 380, 660 210"
          fill="none"
          stroke={lineColor}
          strokeOpacity="0.10"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* LEFT NODE — Suspect Stream */}
        <g>
          <circle cx="140" cy="210" r="48" fill={pulseActive ? "rgba(225,29,72,0.15)" : "rgba(225,29,72,0.06)"} stroke="rgba(225,29,72,0.4)" strokeWidth={pulseActive ? "3" : "1.5"} style={pulseActive ? { filter: `drop-shadow(0 0 12px rgba(225,29,72,0.6))` } : {}} />
          <circle cx="140" cy="210" r="36" fill="rgba(255,255,255,0.85)" stroke="rgba(225,29,72,0.55)" strokeWidth="1" />
        </g>
        <foreignObject x="92" y="160" width="96" height="96">
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Tv className="h-6 w-6 text-crimson" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-crimson-bright">
              {latestItem ? `Src: ${latestItem.platform}` : "Suspect"}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">{latestItem ? latestItem.handle : "@pirate_42"}</span>
          </div>
        </foreignObject>

        {/* CENTER NODE — Adjudicator */}
        <g>
          <circle
            cx="400"
            cy="210"
            r="60"
            fill="rgba(255,255,255,0.92)"
            stroke={lineColor}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 16px ${lineGlow})` }}
          />
          <circle
            cx="400"
            cy="210"
            r="42"
            fill="none"
            stroke={lineColor}
            strokeOpacity="0.4"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
        </g>
        <foreignObject x="350" y="165" width="100" height="90">
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Brain className={`h-7 w-7 ${hovered || pulseActive ? "text-gold-bright" : "text-foreground/80"}`} />
            <span className={`font-mono text-[9px] uppercase tracking-wider ${hovered || pulseActive ? "text-gold-bright" : "text-foreground"}`}>
              {pulseActive ? "ADJUDICATING" : "Adjudicator"}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">gemini-pro</span>
          </div>
        </foreignObject>

        {/* RIGHT NODE — Official Asset */}
        <g>
          <circle cx="660" cy="210" r="48" fill="rgba(234,124,69,0.08)" stroke="rgba(234,124,69,0.45)" strokeWidth="1.5" />
          <circle cx="660" cy="210" r="36" fill="rgba(255,255,255,0.85)" stroke="rgba(234,124,69,0.6)" strokeWidth="1" />
        </g>
        <foreignObject x="612" y="160" width="96" height="96">
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Film className="h-6 w-6 text-gold-bright" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-gold-bright">
              Official
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">@studio_co</span>
          </div>
        </foreignObject>

        {/* labels */}
        <text x="240" y="120" fill="rgba(28,25,23,0.45)" fontSize="9" fontFamily="ui-monospace" letterSpacing="2">
          INGEST →
        </text>
        <text x="490" y="120" fill={pulseActive ? "#d97706" : "rgba(28,25,23,0.45)"} fontSize="9" fontFamily="ui-monospace" letterSpacing="2">
          {pulseActive ? `SIMILARITY: ${simScore}%` : "← MATCH"}
        </text>
      </svg>

      {/* metrics chip */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center gap-3">
        <Chip icon={<Waves className="h-3 w-3" />} label="Similarity" value={`${simScore.toFixed(1)}%`} tone="cobalt" />
        <Chip label="Frames matched" value="1,284 / 1,360" tone="muted" />
        <Chip label="Visual embedding" value="cos 0.943" tone={hovered ? "gold" : "cobalt"} />
        <Chip label="Latency" value="312ms" tone="muted" />
      </div>
    </div>
  )
}

function Chip({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  tone: "cobalt" | "gold" | "crimson" | "muted"
}) {
  const toneCls =
    tone === "cobalt"
      ? "border-foreground/10 text-foreground bg-white/55"
      : tone === "gold"
      ? "border-gold/40 text-gold-bright bg-gold/10"
      : tone === "crimson"
      ? "border-crimson/40 text-crimson-bright bg-crimson/10"
      : "border-foreground/10 text-muted-foreground bg-white/45"

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2.5 py-1 backdrop-blur ${toneCls}`}
    >
      {icon}
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="scoreboard text-xs">{value}</span>
    </div>
  )
}
