"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight, Eye, Globe2, MessageCircle, TrendingUp } from "lucide-react"
import type { IngestionItem } from "./types"

const seed: IngestionItem[] = [
  {
    id: "i1",
    platform: "x",
    handle: "@leak_vault",
    title: "Full leak — Episode 7 montage [reupload]",
    views: "428k",
    timeAgo: "2m",
    matchScore: 96,
    verdict: "infringement",
  },
  {
    id: "i2",
    platform: "tiktok",
    handle: "@clipfarm.gg",
    title: "Best moments compilation 🔥 (no copyright)",
    views: "1.2M",
    timeAgo: "4m",
    matchScore: 88,
    verdict: "monetize",
  },
  {
    id: "i3",
    platform: "reddit",
    handle: "u/streamingHQ",
    title: "Anyone else has a mirror? Original got pulled",
    views: "12.4k",
    timeAgo: "5m",
    matchScore: 71,
    verdict: "pending",
  },
  {
    id: "i4",
    platform: "youtube",
    handle: "@vault_of_clips",
    title: "Reaction: best fight scene of 2026",
    views: "84.1k",
    timeAgo: "7m",
    matchScore: 92,
    verdict: "monetize",
  },
  {
    id: "i5",
    platform: "instagram",
    handle: "@reels.heat",
    title: "Trailer drop — full cut posted in stories",
    views: "203k",
    timeAgo: "9m",
    matchScore: 81,
    verdict: "infringement",
  },
]

const PlatformGlyph = ({ p }: { p: IngestionItem["platform"] }) => {
  const map: Record<IngestionItem["platform"], { label: string; cls: string }> = {
    x: { label: "𝕏", cls: "text-foreground bg-foreground/[0.06]" },
    tiktok: { label: "TT", cls: "text-foreground bg-foreground/[0.06]" },
    reddit: { label: "RD", cls: "text-orange-600 bg-orange-500/10" },
    youtube: { label: "YT", cls: "text-crimson-bright bg-crimson/10" },
    instagram: { label: "IG", cls: "text-pink-600 bg-pink-500/10" },
  }
  const m = map[p]
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-md border border-foreground/[0.08] font-mono text-[10px] font-bold ${m.cls}`}
    >
      {m.label}
    </span>
  )
}

export function IngestionFirehose({ items = [] }: { items?: IngestionItem[] }) {
  const displayItems = items.length > 0 ? items : seed;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Ingestion Firehose
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">Live signals across platforms</div>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-foreground/[0.08] bg-white/55 px-2 py-1 font-mono text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
          STREAMING
        </span>
      </div>

      {/* New: Signal Intake stats card */}
      <SignalIntakeCard />

      <div className="thin-scroll mt-3 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        <AnimatePresence initial={false}>
          {displayItems.map((it) => (
            <FeedCard key={it.id} item={it} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Compact signal-intake summary card with a tiny throughput sparkline. */
function SignalIntakeCard() {
  const [bars, setBars] = React.useState<number[]>(() =>
    Array.from({ length: 24 }, () => 0.3 + Math.random() * 0.7),
  )
  const [count, setCount] = React.useState(1284)

  React.useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => {
        const next = [...prev.slice(1), 0.3 + Math.random() * 0.7]
        return next
      })
      setCount((c) => c + Math.floor(Math.random() * 7) + 2)
    }, 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mx-4 mt-4 rounded-xl border border-foreground/[0.08] bg-white/65 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Globe2 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Signal Intake
            </div>
            <div className="mt-0.5 text-[12px] font-medium text-foreground">
              Last 60 seconds
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded border border-emerald-600/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">
          <TrendingUp className="h-2.5 w-2.5" />
          +12.4%
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-3 flex h-10 items-end gap-[2px]">
        {bars.map((b, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm bg-gold/70"
            animate={{ scaleY: b }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ originY: 1, height: "100%" }}
          />
        ))}
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Captured" value={count.toLocaleString()} />
        <Stat label="Match rate" value="84.2%" />
        <Stat label="Latency" value="312ms" />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/50 px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="scoreboard mt-0.5 text-[12px] text-foreground">{value}</div>
    </div>
  )
}

function FeedCard({ item }: { item: IngestionItem }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0 })

  function onMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ rx: -py * 4, ry: px * 4 })
  }
  function onLeave() {
    setTilt({ rx: 0, ry: 0 })
  }

  const verdictTone =
    item.verdict === "infringement"
      ? "border-crimson/40 bg-crimson/10 text-crimson-bright"
      : item.verdict === "monetize"
      ? "border-gold/40 bg-gold/10 text-gold-bright"
      : "border-foreground/10 bg-foreground/[0.04] text-muted-foreground"

  const verdictLabel =
    item.verdict === "infringement" ? "PIRACY" : item.verdict === "monetize" ? "CLAIM" : "REVIEW"

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, x: -12, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transformStyle: "preserve-3d",
      }}
      className="group relative cursor-pointer rounded-xl border border-foreground/[0.06] bg-white/65 p-3 transition-colors hover:border-foreground/[0.12] hover:bg-white/80"
    >
      <div className="flex items-start gap-3">
        <PlatformGlyph p={item.platform} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[11px] text-foreground/80">{item.handle}</span>
            <span className="font-mono text-[10px] text-muted-foreground">· {item.timeAgo}</span>
            <span
              className={`ml-auto rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wider ${verdictTone}`}
            >
              {verdictLabel}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-foreground/90">{item.title}</p>
          <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {item.views}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> 1.2k
            </span>
            <span className="ml-auto flex items-center gap-1">
              match
              <span className="scoreboard text-foreground">{item.matchScore}%</span>
            </span>
          </div>
          {/* match bar */}
          <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.matchScore}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={
                item.verdict === "monetize"
                  ? "h-full bg-gradient-to-r from-gold/40 to-gold"
                  : item.verdict === "infringement"
                  ? "h-full bg-gradient-to-r from-crimson/40 to-crimson"
                  : "h-full bg-gradient-to-r from-foreground/40 to-foreground"
              }
            />
          </div>
        </div>
      </div>
      <ArrowUpRight className="absolute right-3 top-3 h-3 w-3 text-muted-foreground/0 transition-colors group-hover:text-foreground" />
    </motion.div>
  )
}
