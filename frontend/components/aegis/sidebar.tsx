"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { TabKey } from "@/lib/aegis-data"
import {
  Hexagon,
  ChevronsUpDown,
  Radar,
  Vault,
  Activity,
  Satellite,
  Check,
  Circle,
  Settings,
} from "lucide-react"
import { SettingsDialog } from "./settings-dialog"

interface SidebarProps {
  active: TabKey
  onChange: (k: TabKey) => void
}

const NAV: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "match-hub", label: "Match Hub", icon: Radar },
  { key: "vault", label: "The Vault", icon: Vault },
  { key: "sentinel", label: "Live Sentinel", icon: Activity },
  { key: "fleet", label: "Intelligence Fleet", icon: Satellite },
]

const ORGS = [
  { id: "nba", name: "NBA Global Security", tag: "Tier-1 League" },
  { id: "uefa", name: "UEFA Anti-Piracy", tag: "EU Operations" },
  { id: "f1", name: "Formula 1 Media Rights", tag: "Global" },
  { id: "ufc", name: "UFC Broadcast Defense", tag: "PPV" },
]

export function Sidebar({ active, onChange }: SidebarProps) {
  const [orgOpen, setOrgOpen] = React.useState(false)
  const [orgIdx, setOrgIdx] = React.useState(0)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const org = ORGS[orgIdx]

  return (
    <aside className="fixed left-4 top-4 bottom-4 z-30 w-64 flex flex-col gap-4">
      {/* Logo */}
      <div className="px-2 pt-2 flex items-center gap-2.5">
        <div className="relative h-9 w-9 grid place-items-center rounded-lg bg-foreground text-background">
          <Hexagon className="h-4.5 w-4.5" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-lg ring-1 ring-foreground/20" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-tight">AEGIS</span>
          <span className="text-[10px] text-muted-foreground tracking-[0.18em] uppercase">Command Center</span>
        </div>
      </div>

      {/* Org Switcher */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOrgOpen((v) => !v)}
          className="glass spotlight spotlight-border w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/70"
        >
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-highlight to-highlight-deep grid place-items-center text-background text-[10px] font-bold">
            {org.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold leading-tight truncate">{org.name}</div>
            <div className="text-[10px] text-muted-foreground truncate">{org.tag}</div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {orgOpen && (
          <div className="glass-strong absolute left-0 right-0 top-full mt-2 z-40 rounded-xl p-1.5">
            {ORGS.map((o, i) => (
              <button
                key={o.id}
                onClick={() => {
                  setOrgIdx(i)
                  setOrgOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/60 text-left"
              >
                <div className="h-6 w-6 rounded bg-foreground/90 text-background grid place-items-center text-[9px] font-bold">
                  {o.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-medium truncate">{o.name}</div>
                  <div className="text-[9.5px] text-muted-foreground">{o.tag}</div>
                </div>
                {i === orgIdx && <Check className="h-3.5 w-3.5 text-success" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 flex flex-col gap-1 mt-1">
        <div className="px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-1">
          Operations
        </div>
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = item.key === active
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                isActive
                  ? "glass-strong text-foreground shadow-sm"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/40",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-foreground" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/80",
                )}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span className="text-[13px] font-medium tracking-tight flex-1">{item.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-success ok-dot" />
              )}
            </button>
          )
        })}
      </div>

      {/* System Health */}
      <div className="glass rounded-xl p-3 spotlight spotlight-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            System Health
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-success ok-dot" />
        </div>
        <div className="space-y-1.5">
          <HealthRow label="HLS Sync" value="Active" tone="ok" />
          <HealthRow label="Vector DB" value="< 15 ms" tone="ok" />
          <HealthRow label="Arbiter LLM" value="Gemini 2.5 Flash" tone="neutral" />
          <HealthRow label="Sensors" value="08 / 08" tone="ok" />
        </div>
      </div>

      {/* Settings — opens credential vault */}
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="glass spotlight spotlight-border w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/70 group"
      >
        <div className="h-8 w-8 rounded-md bg-foreground/[0.04] border border-white/70 grid place-items-center text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
          <Settings className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-tight">Settings</div>
          <div className="text-[10px] text-muted-foreground truncate">
            API keys · firehose credentials
          </div>
        </div>
        <kbd className="text-[9px] font-mono tracking-wider text-muted-foreground bg-foreground/5 border border-foreground/10 rounded px-1 py-0.5">
          ⌘,
        </kbd>
      </button>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  )
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: "ok" | "neutral" }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <Circle
          className={cn(
            "h-1.5 w-1.5 fill-current",
            tone === "ok" ? "text-success" : "text-muted-foreground/50",
          )}
          strokeWidth={0}
        />
        {label}
      </span>
      <span className="scoreboard text-[10.5px] text-foreground">{value}</span>
    </div>
  )
}
