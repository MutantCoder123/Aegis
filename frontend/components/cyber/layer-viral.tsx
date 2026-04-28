"use client"

import { GlassCard } from "./glass-card"
import { TopologyMap } from "./topology-map"
import { IngestionFirehose } from "./ingestion-firehose"
import { ReasoningTerminal } from "./reasoning-terminal"
import { DecisionCard } from "./decision-card"
import {
  Activity,
  DollarSign,
  PlayCircle,
  Timer,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { IngestionItem } from "./types"

const revenueData = [
  { day: "Mon", recovered: 18200, projected: 14000 },
  { day: "Tue", recovered: 22400, projected: 17000 },
  { day: "Wed", recovered: 19100, projected: 18500 },
  { day: "Thu", recovered: 28600, projected: 21000 },
  { day: "Fri", recovered: 34200, projected: 24500 },
  { day: "Sat", recovered: 41800, projected: 30000 },
  { day: "Sun", recovered: 38900, projected: 28200 },
]

import * as React from "react"
export function LayerViral() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisResult, setAnalysisResult] = React.useState<any>(null)
  const [firehoseItems, setFirehoseItems] = React.useState<IngestionItem[]>([])

  React.useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/firehose_feed")
        if (!res.ok) return
        const data = await res.json()
        if (data && data.length > 0) {
          setFirehoseItems(data)
        }
      } catch (e) {}
    }
    fetchFeed()
    const id = setInterval(fetchFeed, 3200)
    return () => clearInterval(id)
  }, [])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/analyze_media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_url: "target_official_asset.jpg",
          username: "live_capture_bot",
          post_text: "Captured stream segment",
        }),
      })
      const data = await res.json()
      setAnalysisResult(data)
    } catch (e) {
      console.error(e)
    }
    setIsAnalyzing(false)
  }

  return (
    <div className="space-y-8 tabular-nums">
      <div className="flex justify-end">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-gold/60 bg-gold/15 px-6 py-2.5 text-sm font-medium text-gold-bright shadow-[0_0_24px_-4px_rgba(234,124,69,0.5)] transition-all hover:bg-gold/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isAnalyzing ? "Analyzing Frame Pipeline..." : "Trigger AI Media Analysis"}
        </button>
      </div>
      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="Revenue Recovered"
          value="$2.4M"
          delta="+18.4%"
          trend="up"
          sub="trailing 30 days"
        />
        <Kpi
          icon={<PlayCircle className="h-4 w-4" />}
          label="Viral Captures"
          value="847"
          delta="+212"
          trend="up"
          sub="last 24 hours"
        />
        <Kpi
          icon={<Timer className="h-4 w-4" />}
          label="Stolen Minutes"
          value="121,284"
          delta="−6.2%"
          trend="down"
          sub="trending down"
        />
        <Kpi
          icon={<Activity className="h-4 w-4" />}
          label="Active Claims"
          value="312"
          delta="+38"
          trend="up"
          sub="enforcement queue"
        />
      </section>

      {/* Vector matching · reasoning · decision */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3">
          <GlassCard className="h-full min-h-[640px]">
            <IngestionFirehose items={firehoseItems} />
          </GlassCard>
        </div>

        <div className="col-span-12 flex flex-col gap-6 lg:col-span-6">
          <GlassCard>
            <TopologyMap latestItem={firehoseItems[0]} />
          </GlassCard>
          <DecisionCard result={analysisResult} />
        </div>

        <div className="col-span-12 lg:col-span-3">
          <GlassCard className="h-full min-h-[640px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  AI Reasoning
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  Live adjudication trace
                </div>
              </div>
              <span className="rounded border border-foreground/[0.08] bg-white/55 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                GEMINI · STREAM
              </span>
            </div>
            <div className="h-[560px]">
              <ReasoningTerminal result={analysisResult} />
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Revenue Vault — beam disabled to prevent any redraw flicker on hover */}
      <section>
        <GlassCard beam={false}>
          <div className="flex flex-wrap items-end justify-between gap-4 px-7 pt-7 pb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Revenue Vault
              </div>
              <h3 className="mt-1.5 text-base font-semibold text-foreground">
                Recovered vs. Projected Revenue
              </h3>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Trailing 7-day window · re-classified viral assets routed to monetization
              </p>
            </div>
            <div className="flex items-center gap-5">
              <Legend swatch="bg-foreground" label="Recovered" value="$203,200" />
              <Legend swatch="bg-foreground/20" label="Projected" value="$153,200" />
              <span className="scoreboard rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm text-gold-bright">
                $2.41M lifetime
              </span>
            </div>
          </div>
          {/* Stable height container prevents Recharts ResponsiveContainer measurement jitter */}
          <div className="relative h-[280px] min-h-[280px] px-3 pb-7">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 8, left: 12, right: 24, bottom: 4 }}>
                <defs>
                  <linearGradient id="recovered-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1c1917" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#1c1917" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projected-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea7c45" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#ea7c45" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(28,25,23,0.06)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  stroke="#78716c"
                  fontSize={11}
                  tickMargin={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#78716c"
                  fontSize={11}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tickMargin={10}
                />
                <Tooltip
                  content={<TooltipBox />}
                  cursor={{ stroke: "rgba(28,25,23,0.18)" }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stroke="#ea7c45"
                  strokeWidth={1.4}
                  strokeDasharray="3 3"
                  fill="url(#projected-fill)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="recovered"
                  stroke="#1c1917"
                  strokeWidth={1.8}
                  fill="url(#recovered-fill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  delta,
  trend,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: string
  trend: "up" | "down"
  sub: string
}) {
  return (
    <GlassCard className="p-7">
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold-bright">
            {icon}
          </span>
          {label}
        </span>
        <span
          className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${
            trend === "up"
              ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-700"
              : "border-crimson/30 bg-crimson/10 text-crimson-bright"
          }`}
        >
          <TrendingUp className={`h-2.5 w-2.5 ${trend === "down" ? "rotate-180" : ""}`} />
          {delta}
        </span>
      </div>
      <div className="scoreboard mt-5 text-3xl text-foreground">{value}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {sub}
      </div>
    </GlassCard>
  )
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-sm ${swatch}`} />
      <div className="leading-tight">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="scoreboard text-xs text-foreground">{value}</div>
      </div>
    </div>
  )
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-foreground/[0.08] bg-white/90 px-3 py-2 font-mono text-[11px] shadow-md backdrop-blur">
      <div className="text-muted-foreground">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="mt-0.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="capitalize text-foreground/80">{p.name}</span>
          <span className="scoreboard ml-auto text-foreground">
            {typeof p.value === "number" ? `$${p.value.toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}
