"use client"

import * as React from "react"
import { GlowCard } from "./glow-card"
import type { Match } from "@/lib/aegis-data"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { ArrowUpRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: Match
  onClick: () => void
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  const statusColor =
    match.status === "live"
      ? "bg-alert text-background"
      : match.status === "monitoring"
        ? "bg-highlight text-background"
        : "bg-foreground/10 text-foreground"

  return (
    <GlowCard
      onClick={onClick}
      className="cursor-pointer p-5 hover:translate-y-[-1px] transition-transform"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              statusColor,
            )}
          >
            {match.status === "live" && (
              <span className="h-1.5 w-1.5 rounded-full bg-background live-dot" />
            )}
            {match.status}
          </span>
          <span className="text-[10px] text-muted-foreground scoreboard tracking-wider">
            {match.id}
          </span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground" />
      </div>

      <h3 className="text-[18px] font-semibold tracking-tight text-balance leading-tight">
        {match.title}
      </h3>
      <p className="text-[11.5px] text-muted-foreground mt-1">{match.league}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/40 border border-white/60 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Detections</div>
          <div className="scoreboard text-[18px] mt-0.5">{formatNumber(match.detections)}</div>
        </div>
        <div className="rounded-lg bg-white/40 border border-white/60 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Claimed</div>
          <div className="scoreboard text-[18px] mt-0.5 text-success-deep">
            {formatCurrency(match.revenue)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[10.5px] text-muted-foreground border-t border-white/50 pt-3">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {match.venue}
        </span>
        <span className="ml-auto">{match.date}</span>
      </div>
    </GlowCard>
  )
}
