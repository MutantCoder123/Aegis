"use client"

import * as React from "react"
import { GlowCard } from "./glow-card"
import { ForensicModal } from "./forensic-modal"
import { useBroadcaster } from "@/lib/broadcaster-context"
import type { Infringement, Match } from "@/lib/aegis-data"
import { useEnforcementAction } from "@/lib/enforcement-api"
import { useFirehoseStream, type FirehoseActionEvent, type FirehoseTargetEvent } from "@/lib/sentinel-api"
import { Activity, Brain, Eye, ShieldOff, Coins, Cpu, TrendingUp, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from "lucide-react"
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
  verdict: "INFRINGEMENT_CONFIRMED" | "BORDERLINE" | "BENIGN" | "PENDING"
  // Phase 5 Fields
  ingestionMode: "LIVE" | "POST_MATCH"
  priority: number
  velocity?: {
    vph: number
  }
  isEscalated: boolean
  aiVerdict?: "MALICIOUS" | "WHITELISTED" | "PENDING"
  aiReasoning?: string
}

export function LiveSentinel() {
  const { data } = useBroadcaster()
  const matches = data.matches
  const infringements = data.infringements
  const enforcement = useEnforcementAction()

  const [systemLogs, setSystemLogs] = React.useState<FirehoseTargetEvent[]>([])
  const [adjudications, setAdjudications] = React.useState<ActionCard[]>([])
  const [evidenceTarget, setEvidenceTarget] = React.useState<{
    infringement: Infringement
    match: Match | null
  } | null>(null)
  const feedRef = React.useRef<HTMLDivElement | null>(null)

  const handleTarget = React.useCallback((entry: FirehoseTargetEvent) => {
    setSystemLogs((prev) => [...prev, entry].slice(-100))
  }, [])

  const handleAction = React.useCallback((event: FirehoseActionEvent) => {
    setAdjudications((prev) => {
      const existingIdx = prev.findIndex((a) => a.url === event.url || a.id === event.id)
      if (existingIdx !== -1) {
        const next = [...prev]
        next[existingIdx] = {
          id: event.id,
          ts: event.ts,
          matchId: event.matchId,
          cosine: event.cosine,
          platform: event.platform,
          url: event.url,
          reasoning: event.reasoning,
          verdict: event.verdict,
          ingestionMode: event.ingestion_mode,
          priority: event.priority_score,
          velocity: event.velocity_metrics ? { vph: event.velocity_metrics.views_per_hour } : undefined,
          isEscalated: event.tier_3_escalation,
          aiVerdict: event.ai_verdict,
          aiReasoning: event.ai_reasoning,
        }
        return next
      }
      return [
        {
          id: event.id,
          ts: event.ts,
          matchId: event.matchId,
          cosine: event.cosine,
          platform: event.platform,
          url: event.url,
          reasoning: event.reasoning,
          verdict: event.verdict,
          ingestionMode: event.ingestion_mode,
          priority: event.priority_score,
          velocity: event.velocity_metrics ? { vph: event.velocity_metrics.views_per_hour } : undefined,
          isEscalated: event.tier_3_escalation,
          aiVerdict: event.ai_verdict,
          aiReasoning: event.ai_reasoning,
        },
        ...prev,
      ].slice(0, 10)
    })
  }, [])

  useFirehoseStream({
    onLog: (l) => console.log("System Log:", l.text),
    onAction: handleAction,
    onTarget: handleTarget,
  })

  // Auto-scroll log feed
  React.useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [systemLogs])

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

  const handleEnforce = (a: ActionCard, action: "TAKEDOWN" | "MONETIZE" | "WHITELIST") => {
    enforcement.mutate({ id: `LIVE-${a.id}`, action })
    setAdjudications((prev) => prev.filter((item) => item.id !== a.id))
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
                  Live System Log
                </h3>
                <p className="text-[10.5px] text-stone-100/55">
                  Raw radar telemetry · Targeted Intel Pipeline
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-stone-100/70">
              <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />
              <span className="scoreboard">{systemLogs.length} targets buffered</span>
            </div>
          </div>

          <div
            ref={feedRef}
            className="thin-scroll flex-1 overflow-y-auto px-5 py-4 space-y-2.5"
          >
            {systemLogs.map((l) => (
              <div key={l.id} className="flex items-center justify-between group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-stone-100/40 scoreboard">{l.ts}</span>
                    <span className="px-1.5 rounded bg-stone-100/10 text-stone-100/70 text-[9px] font-bold uppercase tracking-wider">
                      {l.platform}
                    </span>
                    <span className="text-highlight text-[9px] font-bold uppercase tracking-wider">
                      {l.velocity.toLocaleString()} VPH
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-100/80 truncate font-mono">
                    {l.url}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                   <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[9px] font-bold uppercase animate-pulse">
                     {l.status}
                   </span>
                </div>
              </div>
            ))}
            {systemLogs.length === 0 && (
              <div className="term text-stone-100/40 text-[11px]">Awaiting radar telemetry…</div>
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
              {adjudications.length} pending
            </span>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto space-y-3 pr-1">
            <AnimatePresence initial={false}>
              {adjudications.map((a) => (
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
                        {/* Status Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
                            a.verdict === "INFRINGEMENT_CONFIRMED"
                              ? "bg-alert text-background"
                              : a.verdict === "PENDING"
                              ? "bg-stone-500 text-background"
                              : "bg-highlight text-background",
                          )}
                        >
                          {a.verdict === "INFRINGEMENT_CONFIRMED"
                            ? "Confirmed"
                            : a.verdict === "PENDING"
                            ? "Investigating"
                            : "Borderline"}
                        </span>
                        {/* Mode Badge */}
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border",
                          a.ingestionMode === "LIVE" 
                            ? "bg-alert/10 text-alert border-alert/20" 
                            : "bg-highlight/10 text-highlight border-highlight/20"
                        )}>
                          {a.ingestionMode === "LIVE" ? "Live Stream" : "Post-Match"}
                        </span>
                        <span className="scoreboard text-[10.5px] text-muted-foreground">
                          {a.matchId}
                        </span>
                      </div>
                      <span className="scoreboard text-[10.5px] text-muted-foreground">{a.ts}</span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] text-muted-foreground">Suspect feed</div>
                        <div className="font-mono text-[11.5px] truncate pr-4">{a.url}</div>
                        {a.ingestionMode === "POST_MATCH" && a.velocity && (
                          <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-highlight font-medium">
                            <TrendingUp className="h-3 w-3" />
                            Trending: {a.velocity.vph.toLocaleString()} views/hr
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Similarity
                        </div>
                        <div className={cn(
                          "scoreboard text-[18px] leading-none",
                          a.cosine > 0.9 ? "text-alert" : a.cosine > 0.7 ? "text-highlight" : "text-muted-foreground"
                        )}>
                          {(a.cosine * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* AI Arbiter Section */}
                    {a.isEscalated && (
                      <div className={cn(
                        "rounded-lg border p-3 mb-3 transition-all",
                        a.aiVerdict === "MALICIOUS" 
                          ? "bg-alert/5 border-alert/20" 
                          : a.aiVerdict === "WHITELISTED"
                          ? "bg-success/5 border-success/20"
                          : "bg-foreground/[0.04] border-foreground/10"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                            <Sparkles className="h-3 w-3 text-highlight" />
                            <span className="text-muted-foreground">Gemini AI Arbiter</span>
                            {a.aiVerdict && (
                              <span className={cn(
                                "ml-1.5 px-1.5 rounded",
                                a.aiVerdict === "MALICIOUS" ? "text-alert" : "text-success"
                              )}>
                                {a.aiVerdict}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-highlight font-bold uppercase tracking-tighter">
                            <AlertTriangle className="h-3 w-3" />
                            Gray Zone
                          </div>
                        </div>
                        
                        {a.aiReasoning ? (
                          <div className="text-[11px] leading-relaxed text-foreground/80 italic border-l-2 border-highlight/30 pl-2.5 py-0.5">
                            "{a.aiReasoning}"
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground animate-pulse">
                            <Brain className="h-3 w-3" />
                            Adjudicating semantic context...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reasoning Trace (Optional/Manual override) */}
                    {!a.isEscalated && (
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
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewEvidence(a)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-foreground/15 bg-white/40 hover:bg-white/70 px-3 py-2 text-[11.5px] font-medium transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Evidence
                      </button>
                      {a.verdict === "INFRINGEMENT_CONFIRMED" ? (
                        <button
                          onClick={() => handleEnforce(a, "TAKEDOWN")}
                          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-alert text-background hover:bg-alert-deep px-3 py-2 text-[11.5px] font-semibold transition-colors"
                        >
                          <ShieldOff className="h-3 w-3" />
                          Dismantle
                        </button>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEnforce(a, "MONETIZE")}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-success text-background hover:bg-success-deep px-3 py-2 text-[11.5px] font-semibold transition-colors"
                          >
                            <Coins className="h-3 w-3" />
                            Claim
                          </button>
                          <button
                            onClick={() => handleEnforce(a, "WHITELIST")}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-foreground/15 bg-white/40 hover:bg-white/70 px-3 py-2 text-[11.5px] font-medium transition-colors"
                          >
                            Allow
                          </button>
                        </div>
                      )}
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </AnimatePresence>

            {adjudications.length === 0 && (
              <GlowCard className="p-8 text-center border-dashed">
                <div className="text-[12px] text-muted-foreground">
                  Waiting for match adjudication…
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
    case "SCRAPE":
    case "SCAN":
      return "text-stone-100/70"
    case "VECTOR":
      return "text-highlight"
    case "MATCH":
      return "text-alert"
    case "ARB":
    case "ARBITER":
      return "text-success"
    default:
      return "text-stone-100/60"
  }
}
