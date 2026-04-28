"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Terminal } from "lucide-react"

type Line = { tag: string; text: string; tone: "info" | "ok" | "warn" | "crit" }

const STREAM: Line[] = [
  { tag: "INGEST", text: "Captured stream from X · @leak_vault · 1080p / 60fps", tone: "info" },
  { tag: "FRAME", text: "Sampled 1,360 frames (perceptual hash · pHash-128)", tone: "info" },
  { tag: "VISION", text: "OCR + scene text matched against asset #STD-2287", tone: "ok" },
  { tag: "EMBED", text: "Computed CLIP-L embedding · cosine = 0.943", tone: "ok" },
  { tag: "MATCH", text: "Scene 04:12 → Asset 00:00:00 (94.2% confidence)", tone: "ok" },
  { tag: "POLICY", text: "Rights config = MONETIZE (revenue split 70/30)", tone: "warn" },
  { tag: "CTX", text: "Audience overlap with rights-holder = 11.4% (low)", tone: "info" },
  { tag: "ROUTE", text: "Decision branch: VIRAL → reroute to CLAIM_REVENUE()", tone: "warn" },
  { tag: "VERDICT", text: "Adjudicator: MONETIZE · est. recovery $4,820", tone: "ok" },
  { tag: "DISPATCH", text: "Queueing claim packet to Content-ID gateway...", tone: "info" },
]

export function ReasoningTerminal({ result }: { result?: any }) {
  const [lines, setLines] = React.useState<Line[]>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (result) {
      setLines((prev) => [
        ...prev,
        { tag: "STAGE", text: `Pipeline Stage: ${result.stage_triggered}`, tone: "info" },
        { tag: "VERDICT", text: `Classification: ${result.classification}`, tone: "ok" },
        { tag: "REASONING", text: result.reasoning, tone: result.status === "Safe" ? "ok" : "warn" },
      ])
      return
    }

    let i = 0
    const tick = () => {
      setLines((prev) => {
        const next = [...prev, STREAM[i % STREAM.length]]
        if (next.length > 14) next.shift()
        return next
      })
      i++
    }
    tick()
    const id = setInterval(tick, 1400)
    return () => clearInterval(id)
  }, [result])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [lines])

  const toneCls = (t: Line["tone"]) =>
    t === "ok"
      ? "text-emerald-700"
      : t === "warn"
      ? "text-gold-bright"
      : t === "crit"
      ? "text-crimson-bright"
      : "text-foreground/80"

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-foreground/[0.08] bg-white/55">
      {/* terminal chrome */}
      <div className="flex items-center justify-between border-b border-foreground/[0.06] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-crimson/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <Terminal className="h-3 w-3" />
          aegis://adjudicator/reasoning.log
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">PID 4128</div>
      </div>

      {/* body */}
      <div
        ref={scrollRef}
        className="thin-scroll relative flex-1 overflow-y-auto px-3 py-3 font-mono text-[12px] leading-relaxed"
      >
        {lines.map((l, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-2"
          >
            <span className="select-none text-muted-foreground/60">
              {String(idx).padStart(3, "0")}
            </span>
            <span className={`w-20 shrink-0 ${toneCls(l.tone)}`}>[{l.tag}]</span>
            <span className="text-foreground/85">{l.text}</span>
          </motion.div>
        ))}
        <div className="flex gap-2 pt-1">
          <span className="text-muted-foreground/60">{String(lines.length).padStart(3, "0")}</span>
          <span className="text-foreground">$&gt;</span>
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block h-3.5 w-1.5 translate-y-0.5 bg-foreground"
          />
        </div>
      </div>
    </div>
  )
}
