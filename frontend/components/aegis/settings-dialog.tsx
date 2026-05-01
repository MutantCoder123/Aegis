"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  X,
  Sparkles,
  Eye,
  EyeOff,
  Youtube,
  Instagram,
  Twitter,
  Send,
  MessageCircle,
  Hash,
  KeyRound,
  Save,
  Check,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { aegisFetch } from "@/lib/api"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

type SectionKey =
  | "gemini"
  | "youtube"
  | "instagram"
  | "twitter"
  | "reddit"
  | "telegram"
  | "discord"

interface Section {
  key: SectionKey
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTIONS: Section[] = [
  { key: "gemini", label: "Gemini Arbiter", description: "LLM adjudication engine", icon: Sparkles },
  { key: "youtube", label: "YouTube", description: "Data API · Content ID firehose", icon: Youtube },
  { key: "instagram", label: "Instagram", description: "Graph API · Reels & Lives", icon: Instagram },
  { key: "twitter", label: "X / Twitter", description: "v2 stream rules · Live Spaces", icon: Twitter },
  { key: "reddit", label: "Reddit", description: "OAuth crawler · live threads", icon: Hash },
  { key: "telegram", label: "Telegram", description: "Bot API · channel sentinel", icon: Send },
  { key: "discord", label: "Discord", description: "Bot token · server sentry", icon: MessageCircle },
]

const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast · low-latency adjudication" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Deep multi-frame reasoning" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Bulk classification" },
]

interface ConfigState {
  gemini: { apiKey: string; model: string }
  youtube: { apiKey: string }
  instagram: { apiKey: string }
  twitter: { apiKey: string }
  reddit: { clientId: string; clientSecret: string; userAgent: string }
  telegram: { botToken: string }
  discord: { botToken: string }
}

const DEFAULT_CONFIG: ConfigState = {
  gemini: { apiKey: "", model: "gemini-2.5-flash" },
  youtube: { apiKey: "" },
  instagram: { apiKey: "" },
  twitter: { apiKey: "" },
  reddit: { clientId: "", clientSecret: "", userAgent: "AegisBot/1.0 (+https://aegis.app)" },
  telegram: { botToken: "" },
  discord: { botToken: "" },
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [active, setActive] = React.useState<SectionKey>("gemini")
  const [config, setConfig] = React.useState<ConfigState>(DEFAULT_CONFIG)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  React.useEffect(() => {
    if (open) {
      aegisFetch<ConfigState>("/api/config")
        .then((data) => setConfig(data))
        .catch((err) => console.error("Failed to load config:", err))
    }
  }, [open])

  const handleSave = async () => {
    try {
      await aegisFetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      console.error("Failed to save config:", err)
      alert("Failed to save configuration. Check console for details.")
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] grid place-items-center p-6"
          style={{ backdropFilter: "blur(14px)" }}
        >
          <div className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="glass-strong relative z-10 w-full max-w-4xl h-[640px] rounded-[var(--radius)] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/60">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-foreground text-background grid place-items-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="settings-title" className="text-[17px] font-semibold tracking-tight">
                    Integration Credentials
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Configure firehose API keys · stored encrypted at rest
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-foreground/5 grid place-items-center"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar nav */}
              <aside className="w-60 border-r border-white/60 p-3 overflow-y-auto thin-scroll bg-white/30">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 mb-2">
                  Sections
                </div>
                <div className="flex flex-col gap-0.5">
                  {SECTIONS.map((s) => {
                    const Icon = s.icon
                    const isActive = s.key === active
                    return (
                      <button
                        key={s.key}
                        onClick={() => setActive(s.key)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
                          isActive
                            ? "bg-foreground text-background"
                            : "text-foreground/75 hover:bg-white/60",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium leading-tight truncate">
                            {s.label}
                          </div>
                          <div
                            className={cn(
                              "text-[9.5px] leading-tight mt-0.5 truncate",
                              isActive ? "text-background/70" : "text-muted-foreground",
                            )}
                          >
                            {s.description}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </aside>

              {/* Form area */}
              <div className="flex-1 overflow-y-auto thin-scroll p-6">
                {active === "gemini" && (
                  <SectionForm title="Gemini Arbiter" subtitle="Tier-2 LLM verdict pipeline">
                    <SecretInput
                      label="API Key"
                      placeholder="AIza…"
                      value={config.gemini.apiKey}
                      onChange={(v) =>
                        setConfig({ ...config, gemini: { ...config.gemini, apiKey: v } })
                      }
                    />
                    <Field label="Model">
                      <div className="grid grid-cols-1 gap-1.5">
                        {GEMINI_MODELS.map((m) => {
                          const isActive = config.gemini.model === m.id
                          return (
                            <button
                              key={m.id}
                              onClick={() =>
                                setConfig({
                                  ...config,
                                  gemini: { ...config.gemini, model: m.id },
                                })
                              }
                              className={cn(
                                "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-all",
                                isActive
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-white/70 bg-white/50 hover:bg-white/70",
                              )}
                            >
                              <div>
                                <div className="text-[12.5px] font-semibold leading-tight">
                                  {m.label}
                                </div>
                                <div
                                  className={cn(
                                    "text-[10.5px] leading-tight mt-0.5",
                                    isActive ? "text-background/70" : "text-muted-foreground",
                                  )}
                                >
                                  {m.note}
                                </div>
                              </div>
                              {isActive && <Check className="h-4 w-4" />}
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                  </SectionForm>
                )}

                {active === "youtube" && (
                  <SectionForm title="YouTube" subtitle="Data API v3 · scan endpoint for content matches">
                    <SecretInput
                      label="API Key"
                      placeholder="AIza…"
                      value={config.youtube.apiKey}
                      onChange={(v) => setConfig({ ...config, youtube: { apiKey: v } })}
                    />
                  </SectionForm>
                )}

                {active === "instagram" && (
                  <SectionForm title="Instagram" subtitle="Graph API · Reels and Live broadcasts">
                    <SecretInput
                      label="Access Token"
                      placeholder="EAA…"
                      value={config.instagram.apiKey}
                      onChange={(v) => setConfig({ ...config, instagram: { apiKey: v } })}
                    />
                  </SectionForm>
                )}

                {active === "twitter" && (
                  <SectionForm title="X / Twitter" subtitle="v2 filtered-stream rules · Live Spaces hooks">
                    <SecretInput
                      label="Bearer Token"
                      placeholder="AAAA…"
                      value={config.twitter.apiKey}
                      onChange={(v) => setConfig({ ...config, twitter: { apiKey: v } })}
                    />
                  </SectionForm>
                )}

                {active === "reddit" && (
                  <SectionForm title="Reddit" subtitle="OAuth · script-app credentials">
                    <Field label="Client ID">
                      <input
                        value={config.reddit.clientId}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            reddit: { ...config.reddit, clientId: e.target.value },
                          })
                        }
                        placeholder="xxxxxxxxxxxx"
                        className="w-full bg-white/50 border border-white/70 rounded-lg px-3.5 py-2.5 text-[13px] font-mono focus:outline-none focus:border-highlight/50 focus:bg-white/70 transition-colors"
                      />
                    </Field>
                    <SecretInput
                      label="Client Secret"
                      placeholder="••••••••"
                      value={config.reddit.clientSecret}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          reddit: { ...config.reddit, clientSecret: v },
                        })
                      }
                    />
                    <Field label="User Agent">
                      <input
                        value={config.reddit.userAgent}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            reddit: { ...config.reddit, userAgent: e.target.value },
                          })
                        }
                        placeholder="AegisBot/1.0 (+https://aegis.app)"
                        className="w-full bg-white/50 border border-white/70 rounded-lg px-3.5 py-2.5 text-[13px] font-mono focus:outline-none focus:border-highlight/50 focus:bg-white/70 transition-colors"
                      />
                    </Field>
                  </SectionForm>
                )}

                {active === "telegram" && (
                  <SectionForm title="Telegram" subtitle="Bot API · channel & group sentinel">
                    <SecretInput
                      label="Bot Token"
                      placeholder="123456789:AAH…"
                      value={config.telegram.botToken}
                      onChange={(v) => setConfig({ ...config, telegram: { botToken: v } })}
                    />
                  </SectionForm>
                )}

                {active === "discord" && (
                  <SectionForm title="Discord" subtitle="Bot token · server sentry & voice listener">
                    <SecretInput
                      label="Bot Token"
                      placeholder="MTA…"
                      value={config.discord.botToken}
                      onChange={(v) => setConfig({ ...config, discord: { botToken: v } })}
                    />
                  </SectionForm>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/60 bg-white/30">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                AES-256 encrypted · scoped to active tenant
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-[12px] font-medium hover:bg-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className={cn(
                    "rounded-lg px-4 py-2 text-[12px] font-semibold flex items-center gap-2 transition-all",
                    saved
                      ? "bg-success text-background"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {saved ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Credentials
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SectionForm({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-5">
        <h3 className="text-[20px] font-semibold tracking-tight">{title}</h3>
        <p className="text-[12px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  )
}

function SecretInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = React.useState(false)
  return (
    <Field label={label}>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/50 border border-white/70 rounded-lg pl-9 pr-10 py-2.5 text-[13px] font-mono tracking-wider focus:outline-none focus:border-highlight/50 focus:bg-white/70 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md hover:bg-foreground/5"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </Field>
  )
}
