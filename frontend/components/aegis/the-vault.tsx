"use client"

import * as React from "react"
import { GlowCard } from "./glow-card"
import { ASSETS, type Asset } from "@/lib/aegis-data"
import {
  Vault,
  Sparkles,
  Eye,
  EyeOff,
  Tv,
  Film,
  ImageIcon,
  ShieldCheck,
  Play,
  Lock,
} from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"

export function TheVault() {
  return (
    <div className="space-y-5">
      <Ingestor />
      <AssetLibrary />
    </div>
  )
}

function Ingestor() {
  const [showKey, setShowKey] = React.useState(false)
  const [type, setType] = React.useState<Asset["type"]>("Live HLS")
  const [matchId, setMatchId] = React.useState("LAKERS_WARRIORS_001")
  const [displayName, setDisplayName] = React.useState("Lakers vs Warriors · Court Side HD")
  const [sourceKey, setSourceKey] = React.useState("hls_a4e8b2c19f3d7e0a8b6c2f1d")
  const [indexing, setIndexing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const handleIndex = () => {
    if (indexing) return
    setIndexing(true)
    setProgress(0)
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id)
          setIndexing(false)
          return 100
        }
        return p + 5
      })
    }, 80)
  }

  return (
    <GlowCard className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-foreground text-background grid place-items-center">
            <Vault className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">Protect New Asset</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Ingest broadcast source into Vector DNA · CLIP-ViT-B-32 · 512d
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          The Ingestor
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Match ID">
          <input
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="w-full bg-white/50 border border-white/70 rounded-lg px-3.5 py-2.5 text-[13px] font-mono focus:outline-none focus:border-highlight/50 focus:bg-white/70 transition-colors"
          />
        </Field>
        <Field label="Display Name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/50 border border-white/70 rounded-lg px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-highlight/50 focus:bg-white/70 transition-colors"
          />
        </Field>

        <Field label="Asset Type">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/40 border border-white/60 rounded-lg">
            {(["Live HLS", "Master VOD", "Static JPEG"] as Asset["type"][]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-md px-2.5 py-2 text-[11.5px] font-medium flex items-center justify-center gap-1.5 transition-all",
                  type === t
                    ? "bg-foreground text-background shadow-sm"
                    : "text-foreground/70 hover:bg-white/60",
                )}
              >
                {t === "Live HLS" && <Tv className="h-3 w-3" />}
                {t === "Master VOD" && <Film className="h-3 w-3" />}
                {t === "Static JPEG" && <ImageIcon className="h-3 w-3" />}
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="X-Source-Key (masked)">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type={showKey ? "text" : "password"}
              value={sourceKey}
              onChange={(e) => setSourceKey(e.target.value)}
              className="w-full bg-white/50 border border-white/70 rounded-lg pl-9 pr-10 py-2.5 text-[13px] font-mono tracking-wider focus:outline-none focus:border-highlight/50 focus:bg-white/70 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md hover:bg-foreground/5"
            >
              {showKey ? (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </Field>
      </div>

      <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/60">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          End-to-end encrypted · Tenant-scoped
        </div>
        <button
          onClick={handleIndex}
          disabled={indexing}
          className={cn(
            "relative overflow-hidden rounded-lg px-5 py-2.5 text-[12.5px] font-semibold flex items-center gap-2 transition-all",
            indexing
              ? "bg-foreground/40 text-background cursor-wait"
              : "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          {indexing ? (
            <>
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{ width: `${progress}%`, transition: "width 0.08s linear" }}
              />
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Indexing… {progress}%
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Index Vector DNA
            </>
          )}
        </button>
      </div>
    </GlowCard>
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

function AssetLibrary() {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="text-[15px] font-semibold tracking-tight">Asset Library · Ground Truth</h2>
        <span className="text-[11px] text-muted-foreground scoreboard">{ASSETS.length} protected</span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {ASSETS.map((a) => (
          <AssetThumb key={a.id} asset={a} />
        ))}
      </div>
    </div>
  )
}

function AssetThumb({ asset }: { asset: Asset }) {
  const Icon = asset.type === "Live HLS" ? Tv : asset.type === "Master VOD" ? Film : ImageIcon
  return (
    <GlowCard className="overflow-hidden p-0">
      <div
        className="relative aspect-[16/8] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${asset.toneA} 0%, ${asset.toneB} 100%)`,
        }}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Court/field silhouette */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[55%] w-[75%] border-2 border-background/15 rounded-[35%]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[80%] w-[1px] bg-background/15" />

        {/* Play overlay */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-10 w-10 rounded-full bg-background/15 backdrop-blur-md grid place-items-center border border-background/20">
            <Play className="h-4 w-4 text-background fill-background" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
            <ShieldCheck className="h-2.5 w-2.5" />
            Protected
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-background/15 backdrop-blur-md px-1.5 py-0.5 text-[9.5px] font-medium text-background">
            <Icon className="h-2.5 w-2.5" />
            {asset.type}
          </span>
        </div>

        {/* Bottom HUD */}
        <div className="absolute left-3 bottom-3 right-3 flex items-center justify-between font-mono text-[10px] text-background/80">
          <span>{asset.id}</span>
          <span>{asset.ingestedAt}</span>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold tracking-tight">{asset.matchName}</div>
          <div className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span className="scoreboard">{formatNumber(asset.vectorCount)}</span>
            vectors indexed
          </div>
        </div>
        <button className="text-[11px] font-medium text-foreground/70 hover:text-foreground rounded-md px-2.5 py-1.5 hover:bg-white/60 transition-colors">
          Re-index
        </button>
      </div>
    </GlowCard>
  )
}
