"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Flame, Radio, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LayerKey } from "./types"

const items: {
  key: LayerKey
  label: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
  layer: string
}[] = [
  { key: "viral", label: "Viral VOD & Revenue", sub: "Vector Match · Claims", icon: Flame, layer: "01" },
  { key: "intercept", label: "Live Stream Interception", sub: "Real-time Takedowns", icon: Radio, layer: "02" },
  { key: "intelligence", label: "Distribution & Intelligence", sub: "Reach · Bot Network", icon: Network, layer: "03" },
]

export function Sidebar({
  active,
  onChange,
}: {
  active: LayerKey
  onChange: (k: LayerKey) => void
}) {
  return (
    <aside className="glass-strong fixed left-0 top-0 z-40 flex h-screen w-72 flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-7 pt-7 pb-6">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Aegis
          </div>
          <div className="text-sm font-semibold text-foreground">Command Center</div>
        </div>
      </div>

      <div className="mx-7 h-px bg-foreground/[0.06]" />

      {/* Status */}
      <div className="px-7 py-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            System Online
          </span>
        </div>
        <div className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">
          us-east-1 · v4.21.0
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4">
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Modules
        </div>
        <ul className="space-y-1.5">
          {items.map((it) => {
            const Icon = it.icon
            const isActive = active === it.key
            return (
              <li key={it.key}>
                <button
                  onClick={() => onChange(it.key)}
                  className={cn(
                    "soft-edge group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left",
                    isActive
                      ? "border-foreground/[0.08] bg-white/70 text-foreground shadow-[0_4px_20px_-8px_rgba(80,45,20,0.12)]"
                      : "text-muted-foreground hover:bg-white/40 hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-y-2 left-0 w-[2px] rounded-r bg-foreground"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                      isActive
                        ? "border-foreground/[0.08] bg-foreground text-background"
                        : "border-foreground/[0.08] bg-white/50 group-hover:border-foreground/[0.12]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="relative flex-1">
                    <span className="block text-[13px] font-medium">{it.label}</span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {it.layer} · {it.sub}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer — operator card with dark contrast accent */}
      <div className="px-5 pb-6 pt-2">
        <div className="glass-dark rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
              Throughput
            </span>
            <span className="scoreboard text-xs text-white">12.4k/s</span>
          </div>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-white/85"
              animate={{ width: ["20%", "78%", "55%", "84%", "30%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="mt-2 font-mono text-[10px] text-white/50">
            Operator: F. Mercer
          </div>
        </div>
      </div>
    </aside>
  )
}
