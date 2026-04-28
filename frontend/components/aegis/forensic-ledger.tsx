"use client"

import * as React from "react"
import { type Infringement, INFRINGEMENTS } from "@/lib/aegis-data"
import { cn, formatNumber } from "@/lib/utils"
import { ChevronRight, Send } from "lucide-react"

interface ForensicLedgerProps {
  onOpenEvidence: (inf: Infringement) => void
}

export function ForensicLedger({ onOpenEvidence }: ForensicLedgerProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Forensic Match Ledger</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Verified infringements · click any row for evidence chamber
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground scoreboard">
          {INFRINGEMENTS.length} entries
        </span>
      </div>

      <div className="rounded-xl border border-white/60 overflow-hidden bg-white/30">
        <div className="grid grid-cols-[110px_110px_1fr_110px_120px_44px] gap-3 px-4 py-2.5 border-b border-white/60 bg-white/40 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <span>Match ID</span>
          <span>Platform</span>
          <span>Suspect URL</span>
          <span>Cosine Δ</span>
          <span>Status</span>
          <span />
        </div>
        <div>
          {INFRINGEMENTS.map((inf, i) => (
            <button
              key={inf.id}
              onClick={() => onOpenEvidence(inf)}
              className={cn(
                "group w-full grid grid-cols-[110px_110px_1fr_110px_120px_44px] gap-3 px-4 py-3 items-center border-b border-white/40 last:border-b-0 hover:bg-white/50 text-left transition-colors",
              )}
            >
              <span className="scoreboard text-[11px] text-foreground">{inf.id}</span>
              <span className="text-[11.5px] font-medium">{inf.platform}</span>
              <span className="font-mono text-[10.5px] text-muted-foreground truncate">{inf.url}</span>
              <span className="scoreboard text-[12px] text-foreground">
                {inf.cosineDistance.toFixed(3)}
              </span>
              <StatusBadge status={inf.status} />
              <span className="flex items-center gap-1.5">
                <Send className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </span>
              <div className="hidden col-span-6 px-1 mt-1 text-[10px] text-muted-foreground">
                Reach: {formatNumber(inf.reach)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Infringement["status"] }) {
  const cls =
    status === "dismantled"
      ? "bg-alert/12 text-alert-deep border-alert/25"
      : status === "claimed"
        ? "bg-success/15 text-success-deep border-success/25"
        : "bg-foreground/8 text-foreground/70 border-foreground/15"
  const label = status === "dismantled" ? "DISMANTLED" : status === "claimed" ? "CLAIMED" : "PENDING"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-wider border w-fit",
        cls,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "dismantled" ? "bg-alert" : status === "claimed" ? "bg-success" : "bg-muted-foreground",
        )}
      />
      {label}
    </span>
  )
}
