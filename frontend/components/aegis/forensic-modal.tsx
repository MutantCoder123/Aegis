"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { Infringement, Match } from "@/lib/aegis-data"
import { useEnforcementAction, type EnforcementAction } from "@/lib/enforcement-api"
import { X, Play, ShieldOff, Coins, Fingerprint, Clock, Hash } from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"
import { resolveAssetUrl } from "@/lib/api"

interface ForensicModalProps {
  infringement: Infringement | null
  match: Match | null
  onClose: () => void
}

export function ForensicModal({ infringement, match, onClose }: ForensicModalProps) {
  const enforcement = useEnforcementAction()

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleAction = (action: EnforcementAction) => {
    if (!infringement) return
    enforcement.mutate(
      { id: infringement.id, action },
      {
        onSuccess: onClose,
      },
    )
  }

  return (
    <AnimatePresence>
      {infringement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 grid place-items-center p-6"
          style={{ backdropFilter: "blur(14px)" }}
        >
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="glass-strong relative z-10 w-full max-w-5xl rounded-[var(--radius)] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forensic-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/60">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-foreground text-background grid place-items-center">
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="forensic-title" className="text-[17px] font-semibold tracking-tight">
                    Forensic Evidence Chamber
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {match ? `${match.id} · ${match.title}` : "Match context"} · {infringement.id}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-foreground/5 grid place-items-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Side-by-side video */}
              <div className="grid grid-cols-2 gap-4">
                <VideoPanel
                  label="Master VOD / HLS"
                  sublabel={infringement.matchedOfficialId || "Verified Ground Truth"}
                  url={infringement.matchedOfficialUrl}
                  timestamp={infringement.matchedTimestamp}
                  tone="success"
                  toneA="#1c1917"
                  toneB="#3d2817"
                />
                <VideoPanel
                  label="Suspect Pirate Feed"
                  sublabel={infringement.url}
                  url={infringement.url}
                  timestamp={infringement.timestamp}
                  tone="alert"
                  toneA="#2a1517"
                  toneB="#3d2817"
                />
              </div>

              {/* Metadata Ledger */}
              <div className="rounded-xl bg-white/40 border border-white/60 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/60 bg-white/40 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                    Metadata Ledger · Mathematical Proof
                  </span>
                  <span className="scoreboard text-[10.5px] text-success-deep flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    INFRINGEMENT_CONFIRMED
                  </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/60">
                  <LedgerCell
                    icon={<Hash className="h-3 w-3" />}
                    label="Cosine Distance"
                    value={infringement.cosineDistance.toFixed(3)}
                    sub={infringement.cosineDistance > 0.85 ? "≥ 0.85 · Auto-Verified" : "Verification Threshold"}
                    accent="text-foreground"
                  />
                  <LedgerCell
                    icon={<Clock className="h-3 w-3" />}
                    label="EXT-X-PROGRAM-DATE-TIME"
                    value={infringement.timestamp}
                    sub="UTC · HLS-aligned"
                    mono
                  />
                  <LedgerCell
                    icon={<Fingerprint className="h-3 w-3" />}
                    label="Vector UUID"
                    value={infringement.vectorUuid}
                    sub={`Reach: ${formatNumber(infringement.reach)} viewers`}
                    mono
                    truncate
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAction("TAKEDOWN")}
                  disabled={enforcement.isPending}
                  className="group relative overflow-hidden rounded-xl border border-alert/30 bg-alert/10 hover:bg-alert/15 px-5 py-4 text-left transition-all"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-alert/15 to-transparent" />
                  <div className="relative flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-alert text-background grid place-items-center">
                      <ShieldOff className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-alert-deep">Dismantle Stream</div>
                      <div className="text-[11px] text-alert-deep/80">
                        Issue DMCA · Notify host · Sever distribution
                      </div>
                    </div>
                    <span className="text-[10px] text-alert-deep/70 scoreboard">Ctrl + D</span>
                  </div>
                </button>

                <button
                  onClick={() => handleAction("MONETIZE")}
                  disabled={enforcement.isPending}
                  className="group relative overflow-hidden rounded-xl border border-success/30 bg-success/10 hover:bg-success/15 px-5 py-4 text-left transition-all"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-success/15 to-transparent" />
                  <div className="relative flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-success text-background grid place-items-center">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-success-deep">Claim Revenue</div>
                      <div className="text-[11px] text-success-deep/80">
                        Monetize · Route ads · Recover {`~$${(infringement.reach * 0.012).toFixed(0)}`}
                      </div>
                    </div>
                    <span className="text-[10px] text-success-deep/70 scoreboard">Ctrl + R</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function VideoPanel({
  label,
  sublabel,
  url,
  tone,
  toneA,
  toneB,
  timestamp,
}: {
  label: string
  sublabel: string
  url?: string
  tone: "success" | "alert"
  toneA: string
  toneB: string
  timestamp?: string
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [error, setError] = React.useState(false)

  return (
    <div className="rounded-xl overflow-hidden border border-white/60 bg-foreground">
      <div className="flex items-center justify-between px-3 py-2 bg-foreground text-background">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              tone === "success"
                ? "bg-success text-background"
                : "bg-alert text-background",
            )}
          >
            <span className="h-1 w-1 rounded-full bg-background" />
            {label}
          </span>
        </div>
        <span className="text-[10px] text-background/60 font-mono truncate max-w-[200px]">
          {sublabel}
        </span>
      </div>
      <div
        className="relative aspect-video overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toneA} 0%, ${toneB} 100%)`,
        }}
      >
        {url && !error ? (
          <video
            ref={videoRef}
            src={resolveAssetUrl(url)}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            {/* Faux frame texture */}
            <div className="absolute inset-0 opacity-40 grid-bg" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Court silhouette stripe */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[40%] w-[70%] border-2 border-background/15 rounded-[40%]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[60%] w-1 bg-background/15" />

            {/* Play button */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-12 w-12 rounded-full bg-background/15 backdrop-blur-md grid place-items-center border border-background/20">
                <Play className="h-5 w-5 text-background fill-background" />
              </div>
            </div>
          </>
        )}

        {/* Scan line for alert tone */}
        {tone === "alert" && (
          <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-alert/60 to-transparent scan-line" />
        )}

        {/* Bottom timestamp HUD */}
        <div className="absolute left-3 bottom-3 right-3 flex items-center justify-between font-mono text-[10px] text-background/80 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
          <span>{timestamp ? new Date(timestamp).toISOString().slice(11, 23) : new Date().toISOString().slice(11, 23)}Z</span>
          <span>Verified Segment</span>
        </div>
      </div>
    </div>
  )
}

function LedgerCell({
  icon,
  label,
  value,
  sub,
  accent,
  mono,
  truncate,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: string
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5",
          mono ? "font-mono text-[12px]" : "scoreboard text-[18px] leading-none",
          truncate && "truncate",
          accent,
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}
