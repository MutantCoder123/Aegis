"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Ban, Coins, Gauge, ShieldAlert, Sparkles } from "lucide-react"

type Mode = "monetize" | "takedown"

export function DecisionCard({ result }: { result?: any }) {
  const [mode, setMode] = React.useState<Mode>("monetize")
  const [progress, setProgress] = React.useState(0)
  const isMonetize = mode === "monetize"

  React.useEffect(() => {
    if (result) {
      if (result.classification && (result.classification.toLowerCase().includes("monetize") || result.classification.toLowerCase().includes("viral"))) {
         setMode("monetize")
      } else {
         setMode("takedown")
      }
      setProgress((result.confidence || 0) * 100)
    }
  }, [result])

  // simulate confidence "thinking"
  React.useEffect(() => {
    if (result) return; // stop looping if we have a real result
    let raf = 0
    const start = performance.now()
    const tick = () => {
      const t = (performance.now() - start) / 1000
      const v = 0.5 + 0.5 * Math.sin(t * 0.7)
      setProgress(70 + v * 28)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const accent = isMonetize ? "var(--gold-bright)" : "var(--crimson-bright)"
  const accentSoft = isMonetize ? "rgba(234,124,69,0.14)" : "rgba(225,29,72,0.12)"

  return (
    <motion.div
      animate={{
        boxShadow: isMonetize
          ? "0 0 0 1px rgba(234,124,69,0.25), 0 24px 50px -22px rgba(234,124,69,0.25)"
          : "0 0 0 1px rgba(225,29,72,0.25), 0 24px 50px -22px rgba(225,29,72,0.22)",
      }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-foreground/[0.08]"
      style={{
        background: `linear-gradient(135deg, ${accentSoft} 0%, rgba(255,255,255,0.7) 60%, rgba(255,255,255,0.55) 100%)`,
        backdropFilter: "blur(28px) saturate(180%)",
      }}
    >
      <motion.div
        aria-hidden
        animate={{ background: `radial-gradient(60% 60% at 50% 0%, ${accentSoft}, transparent 70%)` }}
        className="absolute inset-0"
      />
      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: accent }}
            >
              Decision
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">case #4128-A</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-foreground/[0.08] bg-white/65 px-2 py-0.5">
            <Gauge className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              confidence
            </span>
            <span className="scoreboard text-xs" style={{ color: accent }}>
              {progress.toFixed(1)}%
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-4 flex items-start gap-4"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: accent, background: accentSoft }}
            >
              {isMonetize ? (
                <Coins className="h-6 w-6" style={{ color: accent }} />
              ) : (
                <ShieldAlert className="h-6 w-6" style={{ color: accent }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Adjudicator Verdict
              </div>
              <div
                className="scoreboard mt-0.5 text-2xl leading-tight"
                style={{ color: accent }}
              >
                {result?.classification || (isMonetize ? "MONETIZE" : "TAKEDOWN")}
              </div>
              <p className="mt-1 text-[12px] text-foreground/75">
                {isMonetize
                  ? "Viral asset detected. Re-routing to revenue claim — projected recovery $4,820 over 30d."
                  : "Malicious leak with low audience overlap. Issuing DMCA + platform takedown packet."}
              </p>
            </div>
            <div className="hidden text-right md:block">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                est. impact
              </div>
              <div className="scoreboard mt-0.5 text-lg" style={{ color: accent }}>
                {isMonetize ? "+$4.8k" : "−2.1M views"}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* progress bar */}
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ background: `linear-gradient(90deg, ${accent}40, ${accent})` }}
            className="h-full"
          />
        </div>

        {/* actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("takedown")}
            className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "takedown"
                ? "border-crimson/50 bg-crimson/15 text-crimson-bright shadow-[0_0_24px_-4px_rgba(225,29,72,0.4)]"
                : "border-foreground/[0.08] bg-white/55 text-foreground/70 hover:border-crimson/40 hover:text-crimson-bright"
            }`}
          >
            <Ban className="h-4 w-4" />
            Takedown
            <span className="font-mono text-[10px] opacity-60">⌘ T</span>
          </button>
          <button
            onClick={() => setMode("monetize")}
            className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "monetize"
                ? "border-gold/60 bg-gold/15 text-gold-bright shadow-[0_0_24px_-4px_rgba(234,124,69,0.5)]"
                : "border-foreground/[0.08] bg-white/55 text-foreground/70 hover:border-gold/40 hover:text-gold-bright"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Claim Revenue
            <span className="font-mono text-[10px] opacity-60">⌘ M</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
