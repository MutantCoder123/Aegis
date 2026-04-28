"use client"

import * as React from "react"
import {
  Search,
  Command,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Sparkles,
  Check,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TopBarProps {
  title: string
  subtitle: string
  /** Optional eyebrow tag rendered above the title for orientation */
  eyebrow?: string
}

interface Notification {
  id: number
  kind: "alert" | "claim" | "system"
  title: string
  detail: string
  ago: string
  unread: boolean
}

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    kind: "alert",
    title: "New infringement · Cosine 0.962",
    detail: "x.com/streamhub_24 mirroring CELTICS_HEAT_044",
    ago: "12s",
    unread: true,
  },
  {
    id: 2,
    kind: "claim",
    title: "Revenue claimed · $4,820",
    detail: "Auto-monetized YouTube re-upload of Bucks vs Knicks",
    ago: "3m",
    unread: true,
  },
  {
    id: 3,
    kind: "alert",
    title: "Telegram cluster surge",
    detail: "18 new mirrors detected on @courtside_HD",
    ago: "11m",
    unread: true,
  },
  {
    id: 4,
    kind: "system",
    title: "Gemini 2.5 Flash · adjudication latency 412ms",
    detail: "Within target SLO · no action required",
    ago: "24m",
    unread: false,
  },
  {
    id: 5,
    kind: "system",
    title: "Sensor SNS-007 back online",
    detail: "Reddit Crawler · r/NBA live threads resumed",
    ago: "1h",
    unread: false,
  },
]

export function TopBar({ title, subtitle, eyebrow }: TopBarProps) {
  const [query, setQuery] = React.useState("")
  const [focused, setFocused] = React.useState(false)
  const [bellOpen, setBellOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>(SEED_NOTIFICATIONS)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const bellRef = React.useRef<HTMLDivElement | null>(null)

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

  // Click-outside close for the notifications popover
  React.useEffect(() => {
    if (!bellOpen) return
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [bellOpen])

  const unreadCount = notifications.filter((n) => n.unread).length

  const markAllRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })))
  const dismiss = (id: number) =>
    setNotifications((ns) => ns.filter((n) => n.id !== id))

  return (
    <header className="flex items-center gap-6 px-6 pt-6 pb-4">
      {/* Title cluster — refined editorial styling */}
      <div className="min-w-[260px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
            {eyebrow ?? "Aegis Operations"}
          </span>
        </div>
        <h1 className="text-[40px] leading-[0.95] font-normal tracking-[-0.02em] text-foreground font-serif">
          {title}
          <span className="text-highlight font-serif italic">.</span>
        </h1>
        <p className="text-[12px] text-muted-foreground mt-2 tracking-tight max-w-md">
          {subtitle}
        </p>
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

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <div className="glass spotlight spotlight-border rounded-full px-3.5 py-2 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span className="text-[11px] font-medium">Defense Active</span>
          <span className="h-1.5 w-1.5 rounded-full bg-success ok-dot" />
        </div>

        {/* Notifications */}
        <div ref={bellRef} className="relative">
          <button
            type="button"
            onClick={() => setBellOpen((v) => !v)}
            aria-label={`Notifications · ${unreadCount} unread`}
            aria-haspopup="dialog"
            aria-expanded={bellOpen}
            className={cn(
              "glass spotlight relative rounded-full h-10 w-10 grid place-items-center transition-all",
              bellOpen ? "bg-white/80 ring-2 ring-highlight/30" : "hover:bg-white/70",
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-alert text-background text-[9px] font-bold grid place-items-center px-1 leading-none scoreboard live-dot">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className="glass-strong absolute right-0 top-full mt-2 w-[380px] rounded-2xl overflow-hidden z-50"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5" />
                    <span className="text-[13px] font-semibold tracking-tight">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground scoreboard">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllRead}
                    className="text-[10.5px] font-medium text-foreground/70 hover:text-foreground hover:bg-white/60 rounded-md px-2 py-1 transition-colors"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto thin-scroll">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Check className="h-5 w-5 text-success mx-auto mb-2" />
                      <p className="text-[12px] text-muted-foreground">All caught up</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onDismiss={() => dismiss(n.id)}
                      />
                    ))
                  )}
                </div>

                <button
                  type="button"
                  className="w-full text-center text-[11px] font-medium text-foreground/70 hover:text-foreground py-2.5 border-t border-white/60 hover:bg-white/40 transition-colors"
                  onClick={() => setBellOpen(false)}
                >
                  View all activity →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Operator chip — anonymized, no personal name */}
        <button className="glass spotlight spotlight-border flex items-center gap-2.5 rounded-full pl-1 pr-4 py-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-foreground to-foreground/70 grid place-items-center text-background text-[10.5px] font-semibold tracking-wider">
            LA
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[12px] font-semibold">Lead Analyst</span>
            <span className="text-[9.5px] text-muted-foreground">Tier-1 clearance</span>
          </div>
        </button>
      </div>
    </header>
  )
}

function NotificationRow({
  notification,
  onDismiss,
}: {
  notification: Notification
  onDismiss: () => void
}) {
  const tone = notification.kind
  const Icon = tone === "alert" ? ShieldAlert : tone === "claim" ? Coins : Sparkles
  const iconWrap =
    tone === "alert"
      ? "bg-alert/12 text-alert-deep"
      : tone === "claim"
        ? "bg-success/12 text-success-deep"
        : "bg-foreground/[0.06] text-foreground/70"

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 border-b border-white/60 last:border-b-0 hover:bg-white/40 transition-colors",
        notification.unread && "bg-white/30",
      )}
    >
      <div className={cn("h-8 w-8 rounded-lg grid place-items-center shrink-0", iconWrap)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold tracking-tight truncate">
            {notification.title}
          </span>
          {notification.unread && (
            <span className="h-1.5 w-1.5 rounded-full bg-highlight shrink-0" aria-label="Unread" />
          )}
        </div>
        <div className="text-[10.5px] text-muted-foreground mt-0.5 truncate">
          {notification.detail}
        </div>
        <div className="text-[9.5px] text-muted-foreground/80 scoreboard mt-1">
          {notification.ago} ago
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 grid place-items-center rounded-md hover:bg-foreground/10 text-muted-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
