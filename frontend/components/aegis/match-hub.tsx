"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { REVENUE_SERIES, type Match, type Infringement } from "@/lib/aegis-data"
import { useBroadcaster } from "@/lib/broadcaster-context"
import { MatchCard } from "./match-card"
import { GlowCard } from "./glow-card"
import { TemporalHeatmap } from "./temporal-heatmap"
import { ForensicLedger } from "./forensic-ledger"
import { ForensicModal } from "./forensic-modal"
import { ArrowLeft, ShieldAlert, Coins, Activity, TrendingUp } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export function MatchHub() {
  const { data, broadcaster } = useBroadcaster()
  const matches = data.matches
  const [selected, setSelected] = React.useState<Match | null>(null)
  const [evidence, setEvidence] = React.useState<Infringement | null>(null)

  const totalDetections = matches.reduce((s, m) => s + m.detections, 0)
  const totalRevenue = matches.reduce((s, m) => s + m.revenue, 0)
  const liveCount = matches.filter((m) => m.status === "live").length
  const fmt = (v: number) => formatCurrency(v, broadcaster.currency)

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key="deepdive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="space-y-5"
          >
            {/* Deep dive header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelected(null)}
                className="glass spotlight rounded-full px-3.5 py-1.5 flex items-center gap-2 text-[12px] font-medium hover:bg-white/70"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Match Hub
              </button>
              <div className="flex items-center gap-2">
                <span className="scoreboard text-[11px] text-muted-foreground">{selected.id}</span>
                {selected.status === "live" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-alert text-background px-2 py-0.5 text-[10px] font-semibold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-background live-dot" />
                    Live
                  </span>
                )}
              </div>
            </div>

            <GlowCard className="p-6">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {selected.league}
                  </div>
                  <h2 className="text-[36px] leading-none font-semibold tracking-[-0.025em] mt-2 text-balance">
                    {selected.title}
                  </h2>
                  <p className="text-[12px] text-muted-foreground mt-2">
                    {selected.venue} · {selected.date}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 min-w-[420px]">
                  <StatBlock
                    icon={<ShieldAlert className="h-3.5 w-3.5" />}
                    label="Detections"
                    value={formatNumber(selected.detections)}
                  />
                  <StatBlock
                    icon={<Coins className="h-3.5 w-3.5" />}
                    label="Revenue Claimed"
                    value={fmt(selected.revenue)}
                    accent="text-success-deep"
                  />
                  <StatBlock
                    icon={<Activity className="h-3.5 w-3.5" />}
                    label="Active Sensors"
                    value="08 / 08"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-white/30 border border-white/60 p-5">
                <TemporalHeatmap />
              </div>
            </GlowCard>

            <GlowCard className="p-6">
              <ForensicLedger onOpenEvidence={(inf) => setEvidence(inf)} />
            </GlowCard>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24 }}
            className="space-y-5"
          >
            {/* Summary KPIs row */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard
                label="Total Detections (24h)"
                value={formatNumber(totalDetections)}
                delta="+12.4%"
                positive
              />
              <KpiCard
                label="Revenue Recovered"
                value={fmt(totalRevenue)}
                delta="+8.1%"
                positive
              />
              <KpiCard
                label="Live Operations"
                value={`${liveCount} / ${matches.length}`}
                delta="2 streams"
                isLive
              />
            </div>

            {/* Match grid */}
            <div>
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="text-[15px] font-semibold tracking-tight">Active Matches</h2>
                <span className="text-[11px] text-muted-foreground">
                  Click any match for forensic deep-dive
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                {matches.map((m) => (
                  <MatchCard key={m.id} match={m} onClick={() => setSelected(m)} />
                ))}
              </div>
            </div>

            {/* Revenue chart */}
            <RevenueChart broadcasterId={broadcaster.id} currency={broadcaster.currency} />
          </motion.div>
        )}
      </AnimatePresence>

      <ForensicModal
        infringement={evidence}
        match={selected ?? matches.find((m) => m.id === evidence?.matchId) ?? null}
        onClose={() => setEvidence(null)}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  delta,
  positive,
  isLive,
}: {
  label: string
  value: string
  delta: string
  positive?: boolean
  isLive?: boolean
}) {
  return (
    <GlowCard className="p-5 flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl bg-white/60 border border-white/70 grid place-items-center">
        {isLive ? (
          <span className="h-2.5 w-2.5 rounded-full bg-alert live-dot" />
        ) : positive ? (
          <Coins className="h-5 w-5 text-success-deep" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-foreground/70" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="scoreboard text-[26px] mt-0.5 leading-none">{value}</div>
      </div>
      <div
        className={`scoreboard text-[11px] tabular-nums ${
          isLive ? "text-alert-deep" : positive ? "text-success-deep" : "text-muted-foreground"
        }`}
      >
        {delta}
      </div>
    </GlowCard>
  )
}

function StatBlock({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-xl bg-white/40 border border-white/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`scoreboard text-[20px] mt-1 leading-none ${accent ?? ""}`}>{value}</div>
    </div>
  )
}

// ─── Revenue chart (projected vs recovered) ────────────────────────────────
function RevenueChart({
  broadcasterId,
  currency,
}: {
  broadcasterId: keyof typeof REVENUE_SERIES
  currency: "USD" | "INR"
}) {
  const series = REVENUE_SERIES[broadcasterId]
  const totalProjected = series.reduce((s, p) => s + p.projected, 0)
  const totalRecovered = series.reduce((s, p) => s + p.recovered, 0)
  const recoveryPct = Math.round((totalRecovered / totalProjected) * 100)
  const compact = (v: number) => formatCurrency(v, currency)

  return (
    <GlowCard className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-highlight" />
            <h3 className="text-[15px] font-semibold tracking-tight">
              Revenue · Projected vs Recovered
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Trailing 11-month window · settled monthly
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ChartStat label="Projected" value={compact(totalProjected)} />
          <ChartStat label="Recovered" value={compact(totalRecovered)} accent="text-success-deep" />
          <ChartStat label="Recovery" value={`${recoveryPct}%`} accent="text-highlight-deep" />
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="projGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--highlight)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--highlight)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="recGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.34} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compact}
              width={62}
            />
            <Tooltip content={<RevenueTooltip currency={currency} />} cursor={{ stroke: "var(--border)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              formatter={(v) => <span className="text-foreground/75">{v}</span>}
            />
            <Area
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="var(--highlight)"
              strokeWidth={2}
              fill="url(#projGrad)"
            />
            <Area
              type="monotone"
              dataKey="recovered"
              name="Recovered"
              stroke="var(--success)"
              strokeWidth={2}
              fill="url(#recGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  )
}

function ChartStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg bg-white/40 border border-white/60 px-3 py-1.5 min-w-[110px]">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`scoreboard text-[13px] leading-none mt-1 ${accent ?? ""}`}>{value}</div>
    </div>
  )
}

function RevenueTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  currency: "USD" | "INR"
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-[11px]">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="scoreboard">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  )
}
