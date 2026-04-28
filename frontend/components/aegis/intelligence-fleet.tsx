"use client"

import * as React from "react"
import { GlowCard } from "./glow-card"
import { SENSORS, type Sensor } from "@/lib/aegis-data"
import { cn } from "@/lib/utils"
import {
  Bot,
  Globe,
  Chrome,
  MessagesSquare,
  Twitter,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Plus,
} from "lucide-react"

const ICONS: Record<Sensor["type"], React.ComponentType<{ className?: string }>> = {
  "Telegram Bot": Bot,
  "Reddit Crawler": Globe,
  "Chrome Extension Node": Chrome,
  "Discord Sentry": MessagesSquare,
  "X / Twitter Hook": Twitter,
}

export function IntelligenceFleet() {
  const [filter, setFilter] = React.useState<"All" | Sensor["status"]>("All")
  const filtered = filter === "All" ? SENSORS : SENSORS.filter((s) => s.status === filter)

  const totalThroughput = SENSORS.reduce((s, x) => s + x.throughput, 0)
  const activeCount = SENSORS.filter((s) => s.status === "Active").length

  return (
    <div className="space-y-5">
      {/* Top KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <KpiTile label="Total Sensors" value={String(SENSORS.length)} sub="Across 4 regions" />
        <KpiTile
          label="Active"
          value={`${activeCount} / ${SENSORS.length}`}
          sub="98.7% uptime · 30d"
          tone="success"
        />
        <KpiTile
          label="Combined Throughput"
          value={`${totalThroughput.toFixed(1)}`}
          sub="Frames per second"
          tone="highlight"
        />
        <KpiTile label="Targets Watched" value="142" sub="Channels · subreddits · groups" />
      </div>

      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">Sensor Fleet</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Global ingestion network · real-time orchestration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white/40 border border-white/60 rounded-lg">
              {(["All", "Active", "Throttled", "Offline"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                    filter === f
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:bg-white/60",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <button className="rounded-lg bg-foreground text-background px-3.5 py-2 text-[11.5px] font-semibold flex items-center gap-1.5 hover:bg-foreground/90">
              <Plus className="h-3.5 w-3.5" />
              Deploy Sensor
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/60 overflow-hidden bg-white/30">
          <div className="grid grid-cols-[44px_1.2fr_1.4fr_120px_120px_140px_44px] gap-3 px-4 py-2.5 border-b border-white/60 bg-white/40 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            <span />
            <span>Sensor Type</span>
            <span>Target Group</span>
            <span>Region</span>
            <span>Status</span>
            <span>Throughput</span>
            <span />
          </div>
          {filtered.map((s) => {
            const Icon = ICONS[s.type]
            return (
              <div
                key={s.id}
                className="group grid grid-cols-[44px_1.2fr_1.4fr_120px_120px_140px_44px] gap-3 px-4 py-3 items-center border-b border-white/40 last:border-b-0 hover:bg-white/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-white/60 border border-white/70 grid place-items-center">
                  <Icon className="h-3.5 w-3.5 text-foreground/70" />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold tracking-tight">{s.type}</div>
                  <div className="scoreboard text-[10px] text-muted-foreground">{s.id}</div>
                </div>
                <div className="font-mono text-[11.5px] text-foreground/80 truncate">{s.target}</div>
                <div className="text-[11px] text-foreground/70">{s.region}</div>
                <StatusPill status={s.status} />
                <ThroughputBar value={s.throughput} status={s.status} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.status === "Active" ? (
                    <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-foreground/5">
                      <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ) : (
                    <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-foreground/5">
                      <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button className="h-7 w-7 grid place-items-center rounded-md hover:bg-foreground/5">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </GlowCard>
    </div>
  )
}

function KpiTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: "success" | "highlight"
}) {
  return (
    <GlowCard className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "scoreboard text-[26px] mt-1.5 leading-none",
          tone === "success" && "text-success-deep",
          tone === "highlight" && "text-highlight-deep",
        )}
      >
        {value}
      </div>
      <div className="text-[10.5px] text-muted-foreground mt-1.5">{sub}</div>
    </GlowCard>
  )
}

function StatusPill({ status }: { status: Sensor["status"] }) {
  const styles =
    status === "Active"
      ? { bg: "bg-success/15", text: "text-success-deep", dot: "bg-success", border: "border-success/25" }
      : status === "Throttled"
        ? { bg: "bg-highlight/15", text: "text-highlight-deep", dot: "bg-highlight", border: "border-highlight/25" }
        : {
            bg: "bg-foreground/8",
            text: "text-foreground/60",
            dot: "bg-muted-foreground",
            border: "border-foreground/15",
          }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider border w-fit",
        styles.bg,
        styles.text,
        styles.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot, status === "Active" && "ok-dot")} />
      {status}
    </span>
  )
}

function ThroughputBar({ value, status }: { value: number; status: Sensor["status"] }) {
  const max = 50
  const pct = Math.min(100, (value / max) * 100)
  const color = status === "Offline" ? "bg-muted-foreground/40" : "bg-highlight"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="scoreboard text-[10.5px] text-foreground w-14 text-right">
        {value.toFixed(1)} f/s
      </span>
    </div>
  )
}
