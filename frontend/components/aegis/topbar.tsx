"use client"

import * as React from "react"
import { Search, Command, Bell, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopBarProps {
  title: string
  subtitle: string
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [query, setQuery] = React.useState("")
  const [focused, setFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="flex items-center gap-6 px-6 pt-6 pb-4">
      {/* Title cluster */}
      <div className="min-w-[220px]">
        <h1 className="text-[34px] leading-none font-semibold tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1.5 tracking-tight">{subtitle}</p>
      </div>

      {/* Centered Omnisearch */}
      <div className="flex-1 flex justify-center">
        <div
          className={cn(
            "glass relative w-full max-w-xl rounded-full transition-all duration-300",
            focused && "shadow-[0_0_0_4px_rgba(234,124,69,0.12)]",
          )}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Omnisearch · Match IDs, Suspect URLs, Vector UUIDs…"
            className="w-full bg-transparent pl-11 pr-24 py-3 text-[13px] placeholder:text-muted-foreground focus:outline-none rounded-full"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="flex items-center gap-0.5 rounded-md bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-foreground/10">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Status + User */}
      <div className="flex items-center gap-3">
        <div className="glass spotlight spotlight-border rounded-full px-3.5 py-2 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span className="text-[11px] font-medium">Defense Active</span>
          <span className="h-1.5 w-1.5 rounded-full bg-success ok-dot" />
        </div>

        <button className="glass spotlight relative rounded-full h-10 w-10 grid place-items-center hover:bg-white/70">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-alert live-dot" />
        </button>

        <button className="glass spotlight spotlight-border flex items-center gap-2.5 rounded-full pl-1 pr-4 py-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-foreground to-foreground/70 grid place-items-center text-background text-[11px] font-semibold">
            CS
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[12px] font-semibold">Carla Sanford</span>
            <span className="text-[9.5px] text-muted-foreground">Lead Analyst</span>
          </div>
        </button>
      </div>
    </header>
  )
}
