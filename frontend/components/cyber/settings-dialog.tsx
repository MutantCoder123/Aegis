"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye,
  EyeOff,
  Key,
  Save,
  Settings2,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "keys" | "pipeline" | "policy"

const STORAGE_KEY = "aegis.settings.v1"

type SettingsState = {
  geminiKey: string
  modelId: string
  openaiKey: string
  webhookUrl: string
  ingestionRate: number
  takedownThreshold: number
  monetizeThreshold: number
  region: "us-east-1" | "us-west-2" | "eu-central-1" | "ap-southeast-1"
  autoDispatch: boolean
  shadowBan: boolean
}

const DEFAULTS: SettingsState = {
  geminiKey: "",
  modelId: "gemini-2.5-pro",
  openaiKey: "",
  webhookUrl: "",
  ingestionRate: 1200,
  takedownThreshold: 88,
  monetizeThreshold: 72,
  region: "us-east-1",
  autoDispatch: true,
  shadowBan: false,
}

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = React.useState<Tab>("keys")
  const [state, setState] = React.useState<SettingsState>(DEFAULTS)
  const [revealKey, setRevealKey] = React.useState<Record<string, boolean>>({})
  const [savedAt, setSavedAt] = React.useState<number | null>(null)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setState({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  function update<K extends keyof SettingsState>(k: K, v: SettingsState[K]) {
    setState((prev) => ({ ...prev, [k]: v }))
    setDirty(true)
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
    setSavedAt(Date.now())
    setDirty(false)
    setTimeout(() => setSavedAt(null), 2200)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-foreground/10 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="glass-strong relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-foreground/[0.06] px-7 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
                <Settings2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 id="settings-title" className="text-base font-semibold text-foreground">
                  Settings
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Workspace · API keys · pipeline · policy
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="soft-edge flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/[0.08] bg-white/40 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-foreground/[0.06] px-5 pb-3 pt-3">
              <TabBtn active={tab === "keys"} onClick={() => setTab("keys")} icon={<Key className="h-3.5 w-3.5" />}>
                API Keys
              </TabBtn>
              <TabBtn active={tab === "pipeline"} onClick={() => setTab("pipeline")} icon={<Zap className="h-3.5 w-3.5" />}>
                Pipeline
              </TabBtn>
              <TabBtn active={tab === "policy"} onClick={() => setTab("policy")} icon={<Shield className="h-3.5 w-3.5" />}>
                Policy
              </TabBtn>
            </div>

            {/* Body */}
            <div className="thin-scroll flex-1 overflow-y-auto px-7 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  {tab === "keys" && (
                    <>
                      <SectionLabel
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                        title="Gemini Adjudicator"
                        sub="Powers the live reasoning trace and verdict engine."
                      />

                      <Field label="Gemini API key" hint="Stored locally · never logged">
                        <SecretInput
                          id="gemini-key"
                          value={state.geminiKey}
                          onChange={(v) => update("geminiKey", v)}
                          placeholder="AIza..."
                          revealed={!!revealKey.gemini}
                          onToggle={() =>
                            setRevealKey((r) => ({ ...r, gemini: !r.gemini }))
                          }
                        />
                      </Field>

                      <Field label="Model" hint="Override per-request via header">
                        <Select
                          value={state.modelId}
                          onChange={(v) => update("modelId", v)}
                          options={[
                            { value: "gemini-2.5-pro", label: "gemini-2.5-pro · best reasoning" },
                            { value: "gemini-2.5-flash", label: "gemini-2.5-flash · low latency" },
                            { value: "gemini-2.0-flash", label: "gemini-2.0-flash · legacy" },
                          ]}
                        />
                      </Field>

                      <div className="my-4 h-px bg-foreground/[0.06]" />

                      <SectionLabel
                        icon={<Key className="h-3.5 w-3.5" />}
                        title="Other providers"
                        sub="Optional fallbacks and integration credentials."
                      />

                      <Field label="OpenAI API key" hint="Used as fallback for embedding ops">
                        <SecretInput
                          id="openai-key"
                          value={state.openaiKey}
                          onChange={(v) => update("openaiKey", v)}
                          placeholder="sk-..."
                          revealed={!!revealKey.openai}
                          onToggle={() =>
                            setRevealKey((r) => ({ ...r, openai: !r.openai }))
                          }
                        />
                      </Field>

                      <Field label="Outbound webhook" hint="Verdict notifications endpoint">
                        <input
                          type="url"
                          value={state.webhookUrl}
                          onChange={(e) => update("webhookUrl", e.target.value)}
                          placeholder="https://hooks.example.com/aegis"
                          className="h-10 w-full rounded-lg border border-foreground/[0.08] bg-white/55 px-3 font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none"
                        />
                      </Field>
                    </>
                  )}

                  {tab === "pipeline" && (
                    <>
                      <SectionLabel
                        icon={<Zap className="h-3.5 w-3.5" />}
                        title="Ingestion & dispatch"
                        sub="Tune throughput and automation thresholds."
                      />

                      <Field
                        label="Ingestion rate"
                        hint={`${state.ingestionRate.toLocaleString()} signals/min`}
                      >
                        <Slider
                          min={120}
                          max={4000}
                          step={20}
                          value={state.ingestionRate}
                          onChange={(v) => update("ingestionRate", v)}
                        />
                      </Field>

                      <Field label="Region">
                        <Select
                          value={state.region}
                          onChange={(v) => update("region", v as SettingsState["region"])}
                          options={[
                            { value: "us-east-1", label: "us-east-1 · Virginia" },
                            { value: "us-west-2", label: "us-west-2 · Oregon" },
                            { value: "eu-central-1", label: "eu-central-1 · Frankfurt" },
                            { value: "ap-southeast-1", label: "ap-southeast-1 · Singapore" },
                          ]}
                        />
                      </Field>

                      <Field label="Auto-dispatch verdicts" hint="Skip manual review when confidence ≥ threshold">
                        <Toggle checked={state.autoDispatch} onChange={(v) => update("autoDispatch", v)} />
                      </Field>
                    </>
                  )}

                  {tab === "policy" && (
                    <>
                      <SectionLabel
                        icon={<Shield className="h-3.5 w-3.5" />}
                        title="Decision thresholds"
                        sub="Confidence cutoffs that route a signal to action."
                      />

                      <Field
                        label="Takedown threshold"
                        hint={`${state.takedownThreshold}% confidence required`}
                      >
                        <Slider
                          min={50}
                          max={99}
                          step={1}
                          value={state.takedownThreshold}
                          onChange={(v) => update("takedownThreshold", v)}
                        />
                      </Field>

                      <Field
                        label="Monetize threshold"
                        hint={`${state.monetizeThreshold}% confidence required`}
                      >
                        <Slider
                          min={50}
                          max={99}
                          step={1}
                          value={state.monetizeThreshold}
                          onChange={(v) => update("monetizeThreshold", v)}
                        />
                      </Field>

                      <Field label="Shadow ban repeat offenders" hint="Throttle reach instead of full takedown">
                        <Toggle checked={state.shadowBan} onChange={(v) => update("shadowBan", v)} />
                      </Field>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-foreground/[0.06] bg-white/40 px-7 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {savedAt
                  ? "Saved locally"
                  : dirty
                    ? "Unsaved changes"
                    : "All changes saved"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="soft-edge rounded-lg border border-foreground/[0.08] bg-white/55 px-4 py-2 text-[13px] font-medium text-foreground/80 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save changes
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- subcomponents ---------- */

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-white/55 hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function SectionLabel({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground/70">{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-[12px] text-foreground/70">{sub}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        {hint && (
          <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </label>
  )
}

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  revealed,
  onToggle,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  revealed: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full rounded-lg border border-foreground/[0.08] bg-white/55 px-3 pr-11 font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={revealed ? "Hide value" : "Reveal value"}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-foreground/[0.08] bg-white/55 px-3 text-[12px] text-foreground focus:border-foreground/30 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-background">
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="relative h-10 select-none">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/[0.08]">
        <div
          className="h-full rounded-full bg-foreground/80"
          style={{ width: `${pct}%` }}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-foreground"
      />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-foreground" : "bg-foreground/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  )
}
