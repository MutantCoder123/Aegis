"use client"

import * as React from "react"
import { GlassCard } from "./glass-card"
import { motion, AnimatePresence } from "framer-motion"
import {
  Globe2,
  Radio,
  Users,
  Timer,
  ShieldOff,
  ExternalLink,
  Filter as FilterIcon,
  CheckCircle2,
  Ban,
  Hourglass,
  FileWarning,
} from "lucide-react"
import type { InterceptStream } from "./types"

// Seed of fictional pirate streams
const seedStreams: InterceptStream[] = [
  {
    id: "s1",
    domain: "streamhub-mirror[.]ru",
    url: "/live/ucl-final-2026-cam3.m3u8",
    region: "RU · Moscow",
    viewers: 84231,
    confidence: 98.4,
    status: "dispatched",
    detectedAt: "00:38",
  },
  {
    id: "s2",
    domain: "rojadirecta[.]watch",
    url: "/event/4128/multi.html",
    region: "ES · Madrid",
    viewers: 41280,
    confidence: 96.1,
    status: "nullified",
    detectedAt: "01:12",
  },
  {
    id: "s3",
    domain: "vipboxhd[.]top",
    url: "/match/lakers-vs-bos.m3u8",
    region: "BG · Sofia",
    viewers: 31490,
    confidence: 92.7,
    status: "dmca_filed",
    detectedAt: "01:45",
  },
  {
    id: "s4",
    domain: "sportsurge-cdn[.]net",
    url: "/v3/embed/3994.m3u8",
    region: "US · Reston VA",
    viewers: 22008,
    confidence: 89.3,
    status: "pending",
    detectedAt: "02:08",
  },
  {
    id: "s5",
    domain: "buffstreams-mirror[.]live",
    url: "/games/3219/index.m3u8",
    region: "PA · Panama City",
    viewers: 18742,
    confidence: 95.0,
    status: "dispatched",
    detectedAt: "02:31",
  },
  {
    id: "s6",
    domain: "cricfree[.]cz",
    url: "/cricket/eng-vs-ind.html",
    region: "CZ · Prague",
    viewers: 14620,
    confidence: 88.5,
    status: "pending",
    detectedAt: "03:02",
  },
  {
    id: "s7",
    domain: "footybite-mirror[.]xyz",
    url: "/stream/realmadrid-vs-cf.m3u8",
    region: "VG · Tortola",
    viewers: 12015,
    confidence: 91.8,
    status: "nullified",
    detectedAt: "03:24",
  },
  {
    id: "s8",
    domain: "totalsportek-mirror[.]io",
    url: "/match/3211/c2.m3u8",
    region: "SC · Mahé",
    viewers: 9874,
    confidence: 90.2,
    status: "dispatched",
    detectedAt: "03:51",
  },
]

const FILTERS = ["All", "Pending", "Dispatched", "Nullified", "DMCA"] as const
type FilterKey = (typeof FILTERS)[number]

function statusKeyFromFilter(f: FilterKey): InterceptStream["status"] | null {
  switch (f) {
    case "Pending":
      return "pending"
    case "Dispatched":
      return "dispatched"
    case "Nullified":
      return "nullified"
    case "DMCA":
      return "dmca_filed"
    default:
      return null
  }
}

export function LayerIntercept() {
  const [streams, setStreams] = React.useState<InterceptStream[]>([])
  const [filter, setFilter] = React.useState<FilterKey>("All")
  const [isOffline, setIsOffline] = React.useState(false)
  const [activity, setActivity] = React.useState<string[]>([
    "[02:14:08] Takedown notice → streamhub-mirror.ru/live/ucl-final accepted by host",
    "[02:13:51] Confidence threshold passed for rojadirecta.watch (96.1%)",
    "[02:13:32] DNS sinkhole engaged for buffstreams-mirror.live",
  ])

  React.useEffect(() => {
    fetch("/api/live_streams")
      .then((r) => {
        if (!r.ok) throw new Error(`Stream fetch failed: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setStreams(
          data.map((d: any) => ({
            id: d.id,
            domain: d.domain,
            url: d.stream_url,
            region: d.region,
            viewers: d.concurrent_viewers,
            confidence: d.confidence || 90,
            status: d.status || "Monitoring",
            detectedAt: d.detectedAt || "00:00",
          }))
        )
      })
      .catch((e) => {
        console.error("Backend offline", e)
        setIsOffline(true)
      })
  }, [])

  // Simulate viewer counts ticking & status changes
  React.useEffect(() => {
    const id = setInterval(() => {
      setStreams((prev) =>
        prev.map((s) => {
          const drift = Math.round((Math.random() - 0.4) * 600)
          const next = Math.max(0, s.viewers + drift)
          return { ...s, viewers: next }
        }),
      )
    }, 1800)
    return () => clearInterval(id)
  }, [])

  // Activity log feed
  React.useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await fetch("/api/recent_actions")
        if (!res.ok) {
          console.warn(`Log fetch failed: ${res.status}`)
          return
        }
        const data = await res.json()
        if (data && Array.isArray(data)) {
          setActivity(data)
        }
      } catch (e) {
        console.error("Failed to fetch recent actions log", e)
      }
    }
    fetchLog()
    const id = setInterval(fetchLog, 5000)
    return () => clearInterval(id)
  }, [])

  const filtered = React.useMemo(() => {
    const k = statusKeyFromFilter(filter)
    return k ? streams.filter((s) => s.status === k) : streams
  }, [streams, filter])

  const totalViewers = streams.reduce((acc, s) => acc + s.viewers, 0)
  const nullified = streams.filter((s) => s.status === "nullified").length
  const dispatched = streams.filter((s) => s.status === "dispatched").length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {isOffline && (
        <div className="rounded-md border border-crimson/30 bg-crimson/10 p-4 font-mono text-[11px] uppercase tracking-wider text-crimson-bright">
          System Offline — Connecting to fallback...
        </div>
      )}
      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Kpi
          icon={<Globe2 className="h-4 w-4" />}
          label="Active Pirate Domains"
          value={streams.length.toString()}
          sub="under live observation"
        />
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Concurrent Viewers"
          value={totalViewers.toLocaleString()}
          sub={`${(totalViewers / 1000).toFixed(0)}k diverted in 24h`}
          accent="amber"
        />
        <Kpi
          icon={<ShieldOff className="h-4 w-4" />}
          label="Hosts Nullified"
          value={nullified.toString()}
          sub={`${dispatched} dispatched · pending host ack`}
          accent="emerald"
        />
        <Kpi
          icon={<Timer className="h-4 w-4" />}
          label="Avg Time to Takedown"
          value="04:21"
          sub="minutes · enterprise SLA 06:00"
        />
      </section>

      {/* Table + Activity log */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">
          <GlassCard>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/[0.06] px-7 py-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Live Takedown Queue
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-foreground">
                  Pirate Broadcast Interception
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live
                </span>
                <div className="flex items-center gap-1 rounded-md border border-foreground/[0.08] bg-white/55 p-1">
                  <FilterIcon className="ml-1.5 h-3 w-3 text-muted-foreground" />
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                        filter === f
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            {streams.length === 0 ? (
              <div className="py-20 text-center font-mono text-[12px] uppercase tracking-widest text-muted-foreground">
                SYSTEM IDLE: AWAITING TELEMETRY OR LIVE INGESTION
              </div>
            ) : (
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
                    <th className="px-7 py-3.5 font-medium">Pirate Domain</th>
                    <th className="px-3 py-3.5 font-medium">Stream URL</th>
                    <th className="px-3 py-3.5 font-medium">Region</th>
                    <th className="px-3 py-3.5 font-medium text-right">Viewers</th>
                    <th className="px-3 py-3.5 font-medium text-right">Confidence</th>
                    <th className="px-3 py-3.5 font-medium">Status</th>
                    <th className="px-7 py-3.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filtered.map((s) => (
                      <motion.tr
                        key={s.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-t border-foreground/[0.05] text-[13px] transition-colors hover:bg-white/40"
                      >
                        <td className="px-7 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-foreground/[0.08] bg-white/55">
                              <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                            <span className="font-mono text-[12px] text-foreground">{s.domain}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 font-mono text-[11px] text-muted-foreground">
                          {s.url}
                        </td>
                        <td className="px-3 py-4 font-mono text-[11px] text-muted-foreground">
                          {s.region}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <span className="scoreboard text-[13px] text-foreground">
                            {s.viewers.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <ConfidenceBar value={s.confidence} />
                        </td>
                        <td className="px-3 py-4">
                          <StatusPill status={s.status} />
                        </td>
                        <td className="px-7 py-4 text-right">
                          <button
                            aria-label="Open case"
                            className="soft-edge inline-flex h-7 w-7 items-center justify-center rounded-md border border-foreground/[0.08] bg-white/55 text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            )}

            <div className="flex items-center justify-between border-t border-foreground/[0.06] px-7 py-4 font-mono text-[11px] text-muted-foreground">
              <span>
                Showing {filtered.length} of {streams.length} streams
              </span>
              <span>Auto-refresh · 1.8s</span>
            </div>
          </GlassCard>
        </div>

        {/* Activity log */}
        <div className="col-span-12 xl:col-span-4">
          <GlassCard className="h-full">
            <div className="flex items-center justify-between border-b border-foreground/[0.06] px-6 py-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Enforcement Log
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-foreground">
                  Real-time dispatch activity
                </h3>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {activity.length} events
              </span>
            </div>
            <div className="thin-scroll max-h-[640px] overflow-y-auto px-6 py-4">
              <ul className="space-y-2.5 font-mono text-[11px] leading-relaxed text-foreground/80">
                <AnimatePresence initial={false}>
                  {activity.map((line, i) => (
                    <motion.li
                      key={`${line}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-l border-foreground/[0.08] pl-3"
                    >
                      <span className="text-muted-foreground">{line.slice(0, 10)}</span>
                      <span className="ml-1">{line.slice(10)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: "amber" | "emerald" | "crimson"
}) {
  const valueCls =
    accent === "amber"
      ? "text-gold-bright"
      : accent === "emerald"
        ? "text-emerald-300"
        : accent === "crimson"
          ? "text-crimson-bright"
          : "text-foreground"
  return (
    <GlassCard className="p-7">
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground/70">{icon}</span>
        {label}
      </span>
      <div className={`scoreboard mt-5 text-3xl ${valueCls}`}>{value}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {sub}
      </div>
    </GlassCard>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="ml-auto flex items-center justify-end gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-foreground/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-foreground/70"
        />
      </div>
      <span className="scoreboard min-w-[44px] text-right text-[12px] text-foreground">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const sLower = status.toLowerCase()
  let cls = "border-foreground/15 bg-white/55 text-muted-foreground"
  let icon = <Hourglass className="h-3 w-3" />

  if (sLower.includes("dmca") || sLower.includes("takedown") || sLower.includes("pirac")) {
    cls = "border-crimson/30 bg-crimson/[0.06] text-crimson-bright"
    icon = <Ban className="h-3 w-3" />
  } else if (sLower.includes("monetize") || sLower.includes("dispatch")) {
    cls = "border-gold/30 bg-gold/[0.06] text-gold-bright"
    icon = <FileWarning className="h-3 w-3" />
  } else if (sLower.includes("safe") || sLower.includes("nullified") || sLower.includes("ok")) {
    cls = "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300"
    icon = <CheckCircle2 className="h-3 w-3" />
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {icon}
      {status}
    </span>
  )
}
