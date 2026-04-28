"use client"

import { Bell, Command, Search, Settings, Radio } from "lucide-react"
import * as React from "react"
import { motion } from "framer-motion"

export function Header({
  title,
  subtitle,
  onOpenSettings,
}: {
  title: string
  subtitle: string
  onOpenSettings: () => void
}) {
  const [time, setTime] = React.useState<string>("")
  React.useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="glass-strong sticky top-0 z-30 flex h-20 items-center gap-5 px-8">
      <div className="min-w-0 flex-1">
        <motion.div
          key={title}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {subtitle}
          </div>
        </motion.div>
      </div>

      {/* Ground Truth Ingestion */}
      <form
        className="hidden md:block"
        onSubmit={async (e) => {
          e.preventDefault()
          const form = e.currentTarget
          const input = form.elements.namedItem("url") as HTMLInputElement
          if (!input.value) return
          try {
            await fetch("/api/admin/simulate_live", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ video_path: input.value, match_id: "demo" })
            })
            input.value = "Ingestion Started..."
            setTimeout(() => { input.value = "" }, 2000)
          } catch (err) {
            console.error(err)
            input.value = "Failed."
            setTimeout(() => { input.value = "" }, 2000)
          }
        }}
      >
        <div className="soft-edge group relative flex h-10 w-96 items-center gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-3.5 transition-colors focus-within:border-emerald-400/60">
          <Radio className="h-3.5 w-3.5 text-emerald-300" />
          <input
            name="url"
            placeholder="Enter official ground-truth streaming link..."
            className="flex-1 bg-transparent font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/[0.1] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-400/[0.2]"
          >
            Start Ingest
          </button>
        </div>
      </form>

      <div className="hidden font-mono text-[11px] tabular-nums text-muted-foreground lg:block">
        UTC <span className="text-foreground/80">{time}</span>
      </div>

      <button
        onClick={onOpenSettings}
        className="soft-edge relative flex h-10 items-center gap-2 rounded-xl border border-foreground/[0.08] bg-white/55 px-3 text-sm text-foreground/80 hover:text-foreground"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden text-[12px] font-medium md:inline">Settings</span>
      </button>

      <button
        className="soft-edge relative flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/[0.08] bg-white/55 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] font-bold text-background">
          3
        </span>
      </button>
    </header>
  )
}
