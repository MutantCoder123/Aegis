"use client"

import * as React from "react"
import { GlassCard } from "./glass-card"
import { motion } from "framer-motion"
import {
  Bot,
  Chrome,
  Send,
  MessageSquare,
  Activity,
  Eye,
  Megaphone,
  TrendingUp,
  Globe,
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
import type { BotDeployment } from "./types"

const initialGrowth = [
  { day: "T-60m", users: 1420 },
  { day: "T-50m", users: 1530 },
  { day: "T-40m", users: 1710 },
  { day: "T-30m", users: 1980 },
  { day: "T-20m", users: 2210 },
  { day: "T-10m", users: 2470 },
  { day: "T-05m", users: 2800 },
  { day: "Live", users: 2800 },
]

const bots: BotDeployment[] = [
  {
    id: "b1",
    platform: "reddit",
    channel: "r/soccerstreams",
    members: 412800,
    mode: "monitoring",
    status: "active",
    lastActivity: "00:42",
  },
  {
    id: "b2",
    platform: "telegram",
    channel: "LiveMatchHD",
    members: 184200,
    mode: "injecting_ads",
    status: "active",
    lastActivity: "00:18",
  },
  {
    id: "b3",
    platform: "reddit",
    channel: "r/nbastreams",
    members: 298100,
    mode: "monitoring",
    status: "active",
    lastActivity: "01:04",
  },
  {
    id: "b4",
    platform: "telegram",
    channel: "FreeSportsTV-EU",
    members: 92400,
    mode: "injecting_ads",
    status: "throttled",
    lastActivity: "02:21",
  },
  {
    id: "b5",
    platform: "discord",
    channel: "PiratePlex · #live-feeds",
    members: 38900,
    mode: "monitoring",
    status: "active",
    lastActivity: "00:31",
  },
  {
    id: "b6",
    platform: "telegram",
    channel: "CricketHD-Mirror",
    members: 71200,
    mode: "injecting_ads",
    status: "flagged",
    lastActivity: "04:55",
  },
  {
    id: "b7",
    platform: "reddit",
    channel: "r/nflstreams",
    members: 224700,
    mode: "monitoring",
    status: "active",
    lastActivity: "00:08",
  },
  {
    id: "b8",
    platform: "discord",
    channel: "MatchVault · #vods",
    members: 14800,
    mode: "monitoring",
    status: "active",
    lastActivity: "01:46",
  },
]

const regions = [
  { code: "EU", label: "Europe", pct: 41, count: "78.7k" },
  { code: "AM", label: "Americas", pct: 28, count: "53.8k" },
  { code: "AS", label: "Asia-Pacific", pct: 22, count: "42.3k" },
  { code: "OT", label: "Other", pct: 9, count: "17.3k" },
]

export function LayerIntelligence() {
  const [dynamicUsers, setDynamicUsers] = React.useState("192,108")
  const [dynamicBots, setDynamicBots] = React.useState(bots)
  const [isOffline, setIsOffline] = React.useState(false)

  const [graphData, setGraphData] = React.useState(initialGrowth)

  React.useEffect(() => {
    const fetchIntel = async () => {
      try {
        const res = await fetch("/api/network_intel")
        if (!res.ok) {
           console.warn(`Intel fetch failed: ${res.status}`)
           return
        }
        const data = await res.json()
        setDynamicUsers(data.extension_users.toLocaleString())
        setDynamicBots(
          data.monitored_groups.map((g: any, idx: number) => ({
            id: g.id || `b${idx}`,
            platform: g.platform.toLowerCase(),
            channel: g.name,
            members: g.members,
            mode: g.action.includes("Inject") ? "injecting_ads" : "monitoring",
            status: "active",
            lastActivity: "00:00",
          }))
        )
        // Push the real count from bots or telemetry into the last slot of the graph
        setGraphData((prev) => {
          const next = [...prev]
          next[next.length - 1] = { day: "Live", users: data.active_bots + 2800 }
          return next
        })
      } catch (e) {
        setIsOffline(true)
      }
    }
    fetchIntel()
    const id = setInterval(fetchIntel, 3000)
    return () => clearInterval(id)
  }, [])
  
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
          icon={<Chrome className="h-4 w-4" />}
          label="Active Extension Users"
          value={dynamicUsers}
          delta="+14.2%"
          sub="Chrome · Edge · Firefox"
        />
        <Kpi
          icon={<Bot className="h-4 w-4" />}
          label="Total Bots Deployed"
          value="1,284"
          delta="+82"
          sub="across 3 platforms"
        />
        <Kpi
          icon={<MessageSquare className="h-4 w-4" />}
          label="Reddit Threads Watched"
          value="3,492"
          delta="+218"
          sub="r/soccerstreams · r/nfl..."
        />
        <Kpi
          icon={<Send className="h-4 w-4" />}
          label="Telegram Channels Tracked"
          value="846"
          delta="+47"
          sub="aggregate 4.2M members"
        />
      </section>

      {/* Bot deployments + extension growth */}
      <section className="grid grid-cols-12 gap-6">
        {/* Bot deployment grid */}
        <div className="col-span-12 xl:col-span-7">
          <GlassCard>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/[0.06] px-7 py-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Bot Network
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-foreground">
                  Active Deployments
                </h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Embedded agents across pirate aggregator communities
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-foreground/[0.08] bg-white/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Activity className="h-3 w-3 text-emerald-400" />
                {dynamicBots.filter((b) => b.status === "active").length} active /{" "}
                {dynamicBots.length} total
              </div>
            </div>

            <div className="thin-scroll overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
                    <th className="px-7 py-3.5 font-medium">Channel</th>
                    <th className="px-3 py-3.5 font-medium">Platform</th>
                    <th className="px-3 py-3.5 font-medium text-right">Members</th>
                    <th className="px-3 py-3.5 font-medium">Mode</th>
                    <th className="px-3 py-3.5 font-medium">Status</th>
                    <th className="px-7 py-3.5 font-medium text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {dynamicBots.map((b) => (
                    <tr
                      key={b.id}
                      className="border-t border-foreground/[0.05] text-[13px] transition-colors hover:bg-white/40"
                    >
                      <td className="px-7 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-foreground/[0.08] bg-white/55">
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                          <span className="font-mono text-[12px] text-foreground">
                            {b.channel}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <PlatformChip p={b.platform} />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className="scoreboard text-[13px] text-foreground">
                          {b.members.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <ModeChip mode={b.mode} />
                      </td>
                      <td className="px-3 py-4">
                        <StatusChip status={b.status} />
                      </td>
                      <td className="px-7 py-4 text-right font-mono text-[11px] text-muted-foreground">
                        {b.lastActivity} ago
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Extension growth + regions */}
        <div className="col-span-12 flex flex-col gap-6 xl:col-span-5">
          <GlassCard>
            <div className="flex items-end justify-between gap-3 px-7 pt-7 pb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Extension Reach
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-foreground">
                  User Growth
                </h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Live telemetry tracking
                </p>
              </div>
              <span className="scoreboard rounded-md border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-1.5 text-sm text-emerald-300">
                ACTIVE
              </span>
            </div>
            <div className="h-[180px] px-3 pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData} margin={{ top: 4, left: 8, right: 16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ext-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea7c45" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#ea7c45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(28,25,23,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    stroke="#78716c"
                    fontSize={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    stroke="#78716c"
                    fontSize={10}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="glass rounded-md px-3 py-2 font-mono text-[11px]">
                          <div className="text-muted-foreground">{label}</div>
                          <div className="scoreboard mt-0.5 text-foreground">
                            {payload[0].value?.toLocaleString()} users
                          </div>
                        </div>
                      )
                    }}
                    cursor={{ stroke: "rgba(28,25,23,0.18)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#1c1917"
                    strokeWidth={1.8}
                    fill="url(#ext-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Regional split */}
          <GlassCard>
            <div className="flex items-end justify-between border-b border-foreground/[0.06] px-7 py-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Geographic Spread
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-foreground">
                  Active Users by Region
                </h3>
              </div>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-4 px-7 py-6">
              {regions.map((r) => (
                <div key={r.code}>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="flex items-center gap-2">
                      <span className="rounded border border-foreground/[0.1] bg-white/55 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {r.code}
                      </span>
                      <span className="text-foreground/85">{r.label}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{r.count}</span>
                      <span className="scoreboard text-foreground">{r.pct}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="h-full bg-foreground/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Threat intelligence feed */}
      <section>
        <GlassCard className="p-7">
          <div className="flex items-end justify-between gap-3 pb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Threat Intelligence
              </div>
              <h3 className="mt-1.5 text-base font-semibold text-foreground">
                Network Posture &amp; Recent Movements
              </h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Updated 32s ago
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Tile
              icon={<Eye className="h-4 w-4" />}
              kicker="Surveillance"
              title="Telegram channel LiveMatchHD opened a new mirror"
              meta="184k members · injecting affiliate ads"
            />
            <Tile
              icon={<Megaphone className="h-4 w-4" />}
              kicker="Counter-narrative"
              title="3 Reddit threads seeded with rights-holder VOD"
              meta="r/soccerstreams · CTR 4.1%"
            />
            <Tile
              icon={<TrendingUp className="h-4 w-4" />}
              kicker="Trend"
              title="Pirate domain churn down 12% week-over-week"
              meta="enforcement compounding"
            />
          </div>
        </GlassCard>
      </section>
    </motion.div>
  )
}

function Kpi({
  icon,
  label,
  value,
  delta,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: string
  sub: string
}) {
  return (
    <GlassCard className="p-7">
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="text-foreground/70">{icon}</span>
          {label}
        </span>
        <span className="flex items-center gap-1 rounded border border-emerald-400/30 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
          <TrendingUp className="h-2.5 w-2.5" />
          {delta}
        </span>
      </div>
      <div className="scoreboard mt-5 text-3xl text-foreground">{value}</div>
      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {sub}
      </div>
    </GlassCard>
  )
}

function PlatformChip({ p }: { p: BotDeployment["platform"] }) {
  const map: Record<BotDeployment["platform"], { label: string; cls: string }> = {
    telegram: { label: "Telegram", cls: "border-foreground/[0.12] bg-white/55 text-foreground/85" },
    reddit: { label: "Reddit", cls: "border-foreground/[0.12] bg-white/55 text-foreground/85" },
    discord: { label: "Discord", cls: "border-foreground/[0.12] bg-white/55 text-foreground/85" },
  }
  const m = map[p]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  )
}

function ModeChip({ mode }: { mode: BotDeployment["mode"] }) {
  const isAds = mode === "injecting_ads"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
        isAds
          ? "border-gold/30 bg-gold/[0.06] text-gold-bright"
          : "border-foreground/[0.1] bg-white/55 text-muted-foreground"
      }`}
    >
      {isAds ? <Megaphone className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      {isAds ? "Injecting Ads" : "Monitoring"}
    </span>
  )
}

function StatusChip({ status }: { status: BotDeployment["status"] }) {
  const map: Record<BotDeployment["status"], { label: string; cls: string }> = {
    active: {
      label: "Active",
      cls: "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300",
    },
    throttled: {
      label: "Throttled",
      cls: "border-foreground/15 bg-white/55 text-muted-foreground",
    },
    flagged: {
      label: "Flagged",
      cls: "border-crimson/30 bg-crimson/[0.06] text-crimson-bright",
    },
  }
  const m = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${m.cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active"
            ? "bg-emerald-400"
            : status === "flagged"
              ? "bg-crimson"
              : "bg-muted-foreground"
        }`}
      />
      {m.label}
    </span>
  )
}

function Tile({
  icon,
  kicker,
  title,
  meta,
}: {
  icon: React.ReactNode
  kicker: string
  title: string
  meta: string
}) {
  return (
    <div className="soft-edge rounded-lg border border-foreground/[0.08] bg-white/55 p-5">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground/70">{icon}</span>
        {kicker}
      </div>
      <div className="mt-3 text-[13px] leading-snug text-foreground">{title}</div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {meta}
      </div>
    </div>
  )
}
