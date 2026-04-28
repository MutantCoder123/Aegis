"use client"

import * as React from "react"
import { GlowCard } from "./glow-card"
import { ForensicModal } from "./forensic-modal"
import { useBroadcaster } from "@/lib/broadcaster-context"
import type { Infringement, Match } from "@/lib/aegis-data"
import { Activity, Brain, Eye, ShieldOff, Coins, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface LogEntry {
  id: number
  ts: string
  lvl: string
  text: string
}

interface ActionCard {
  id: number
  ts: string
  matchId: string
  cosine: number
  platform: string
  url: string
  reasoning: string[]
  verdict: "INFRINGEMENT_CONFIRMED" | "BORDERLINE" | "BENIGN"
}

const REASONING_TEMPLATES: ActionCard["reasoning"][] = [
  [
    "→ Frame analysis: jersey color match, court geometry aligned",
    "→ Audio fingerprint: commentator timbre matches broadcast master",
    "→ Cosine 0.943 vs Master HLS · Δ < 0.06 threshold",
    "→ EXT-X-PROGRAM-DATE-TIME drift: +480ms (within window)",
    "→ Conclusion: VERIFIED INFRINGEMENT · DMCA-eligible",
  ],
  [
    "→ Scoreboard OCR matches frame-aligned scoreline",
    "→ Embedding similarity: 0.962 (top 0.5%)",
    "→ Source IP geolocates to known piracy hub",
    "→ Gemini 2.5 Flash verdict: HIGH_CONFIDENCE_INFRINGEMENT",
  ],
  [
    "→ Vector match weak (0.871) but logos legible",
    "→ Background crowd noise matches game ambience",
    "→ Escalating to Tier-2 LLM adjudication",
    "→ Pending verdict… 1.2s",
  ],
]

function nowTs() {
  const d = new Date()
  return d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0").slice(0, 3)
}

export function LiveSentinel() {
  const { data } = useBroadcaster()
  const FIREHOSE_LOGS = data.firehose
  const liveMatchIds = data.liveMatchIds
  const matches = data.matches
  const infringements = data.infringements

  const [logs, setLogs] = React.useState<LogEntry[]>([])
  const [actions, setActions] = React.useState<ActionCard[]>([])
  const [evidenceTarget, setEvidenceTarget] = React.useState<{
    infringement: Infringement
    match: Match | null
  } | null>(null)
  const counterRef = React.useRef(0)
  const feedRef = React.useRef<HTMLDivElement | null>(null)

  // Stream logs
  React.useEffect(() => {
    let mounted = true
    const tick = () => {
      if (!mounted) return
      const tpl = FIREHOSE_LOGS[Math.floor(Math.random() * FIREHOSE_LOGS.length)]
      counterRef.current += 1
      const entry: LogEntry = {
        id: counterRef.current,
        ts: nowTs(),
        lvl: tpl.lvl,
        text: tpl.text,
      }
      setLogs((prev) => [...prev.slice(-80), entry])

      // Occasionally promote to an action card
      if (tpl.lvl === "MATCH" && Math.random() > 0.55) {
        const cosine = 0.85 + Math.random() * 0.13
        const isHigh = cosine > 0.92
        const platforms = ["Telegram", "Reddit", "Discord", "X / Twitter", "TikTok"]
        const platform = platforms[Math.floor(Math.random() * platforms.length)]
        const matchId =
          liveMatchIds[Math.floor(Math.random() * liveMatchIds.length)] ?? liveMatchIds[0]
        const action: ActionCard = {
          id: counterRef.current,
          ts: nowTs(),
          matchId,
          cosine: Number(cosine.toFixed(3)),
          platform,
          url: `${platform.toLowerCase().replace(/[^a-z]/g, "")}.com/${Math.random()
            .toString(36)
            .slice(2, 10)}`,
          reasoning:
            REASONING_TEMPLATES[isHigh ? 0 : Math.random() > 0.5 ? 1 : 2],
          verdict: isHigh ? "INFRINGEMENT_CONFIRMED" : "BORDERLINE",
        }
        setActions((prev) => [action, ...prev].slice(0, 4))
      }
    }
    const id = setInterval(tick, 600)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [FIREHOSE_LOGS, liveMatchIds])

  // Auto-scroll log feed
  React.useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [logs])

  // Open the Forensic Evidence Chamber for a given live action card. We
  // synthesize a real Infringement record from the action so the modal can
  // render its full forensic breakdown, and we link to the matching ledger
  // entry whenever one exists for this matchId.
  const handleViewEvidence = (a: ActionCard) => {
    const ledgerHit = infringements.find((i) => i.matchId === a.matchId)
    const infringement: Infringement = ledgerHit
      ? {
          ...ledgerHit,
          // Override volatile fields with what the live card actually shows so
          // the evidence panel reflects this specific adjudication event.
          platform: a.platform,
          url: a.url,
          cosineDistance: a.cosine,
          status:
            a.verdict === "INFRINGEMENT_CONFIRMED" ? "dismantled" : "pending",
        }
      : {
          id: `LIVE-${a.id}`,
          matchId: a.matchId,
          platform: a.platform,
          url: a.url,
          cosineDistance: a.cosine,
          status:
            a.verdict === "INFRINGEMENT_CONFIRMED" ? "dismantled" : "pending",
          reach: Math.round(5_000 + Math.random() * 40_000),
          timestamp: a.ts,
          vectorUuid: `v_live_${a.id.toString(36).padStart(6, "0")}`,
        }
    const match = matches.find((m) => m.id === a.matchId) ?? null
    setEvidenceTarget({ infringement, match })
  }

  return (
    <>
      <div className="grid grid-cols-[1.1fr_1fr] gap-5 h-[calc(100vh-200px)]">
        {/* Firehose */}
        <GlowCard className="flex flex-col overflow-hidden p-0" variant="glass-dark">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/15 grid place-items-center">
                <Activity className="h-4 w-4 text-success" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-tight text-stone-100">
                  The Firehose
                </h3>
                <p className="text-[10.5px] text-stone-100/55">
                  Raw scraper telemetry · 1.2k events/min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-stone-100/70">
              <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />
              <span className="scoreboard">{logs.length} events buffered</span>
            </div>
          </div>

          <div
            ref={feedRef}
            className="thin-scroll flex-1 overflow-y-auto px-5 py-4 space-y-1"
          >
            {logs.map((l) => (
              <div key={l.id} className="term flex gap-2.5 text-stone-100/85 leading-snug">
                <span className="text-stone-100/40 shrink-0">{l.ts}</span>
                <span className={cn("shrink-0 font-bold", levelColor(l.lvl))}>
                  [{l.lvl.padEnd(7, " ")}]
                </span>
                <span className="text-stone-100/85 truncate">{l.text}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="term text-stone-100/40">Awaiting telemetry…</div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-stone-100/55 scoreboard">
              <span>CPU: 38%</span>
              <span>RAM: 6.2/16 GB</span>
              <span>Vector ops/s: 1,420</span>
            </div>
            <Cpu className="h-3.5 w-3.5 text-stone-100/40" />
          </div>
        </GlowCard>

        {/* Active Adjudication */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-foreground text-background grid place-items-center">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-tight">Active Adjudication</h3>
                <p className="text-[10.5px] text-muted-foreground">
                  Gemini 2.5 Flash · Tier-2 verdict pipeline
                </p>
              </div>
            </div>
            <span className="text-[10.5px] text-muted-foreground scoreboard">
              {actions.length} pending
            </span>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto space-y-3 pr-1">
            <AnimatePresence initial={false}>
              {actions.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.24 }}
                >
                  <GlowCard className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
                            a.verdict === "INFRINGEMENT_CONFIRMED"
                              ? "bg-alert text-background"
                              : "bg-highlight text-background",
                          )}
                        >
                          {a.verdict === "INFRINGEMENT_CONFIRMED" ? "Confirmed" : "Borderline"}
                        </span>
                        <span className="scoreboard text-[10.5px] text-muted-foreground">
                          {a.matchId}
                        </span>
                      </div>
                      <span className="scoreboard text-[10.5px] text-muted-foreground">{a.ts}</span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11.5px] text-muted-foreground">Suspect feed</div>
                        <div className="font-mono text-[11.5px] truncate max-w-[280px]">{a.url}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Cosine
                        </div>
                        <div className="scoreboard text-[18px] leading-none">{a.cosine.toFixed(3)}</div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-foreground/[0.04] border border-foreground/10 p-3 mb-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                        <Brain className="h-3 w-3" />
                        AI Reasoning Trace
                      </div>
                      <div className="space-y-0.5">
                        {a.reasoning.map((r, i) => (
                          <div
                            key={i}
                            className="term text-foreground/85 leading-snug"
                            style={{
                              opacity: 0.6 + (i / a.reasoning.length) * 0.4,
                            }}
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewEvidence(a)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-foreground/15 bg-white/40 hover:bg-white/70 px-3 py-2 text-[11.5px] font-medium transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        View Evidence
                      </button>
                      {a.verdict === "INFRINGEMENT_CONFIRMED" ? (
                        <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-alert text-background hover:bg-alert-deep px-3 py-2 text-[11.5px] font-semibold transition-colors">
                          <ShieldOff className="h-3 w-3" />
                          Dismantle
                        </button>
                      ) : (
                        <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-success text-background hover:bg-success-deep px-3 py-2 text-[11.5px] font-semibold transition-colors">
                          <Coins className="h-3 w-3" />
                          Claim
                        </button>
                      )}
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </AnimatePresence>

            {actions.length === 0 && (
              <GlowCard className="p-8 text-center">
                <div className="text-[12px] text-muted-foreground">
                  Waiting for next match event…
                </div>
              </GlowCard>
            )}
          </div>
        </div>
      </div>

      <ForensicModal
        infringement={evidenceTarget?.infringement ?? null}
        match={evidenceTarget?.match ?? null}
        onClose={() => setEvidenceTarget(null)}
      />
    </>
  )
}

function levelColor(lvl: string) {
  switch (lvl) {
    case "SCAN":
      return "text-stone-100/70"
    case "VECTOR":
      return "text-highlight"
    case "MATCH":
      return "text-alert"
    case "ARBITER":
      return "text-success"
    default:
      return "text-stone-100/60"
  }
}
