"use client"

import * as React from "react"
import { GlowCard } from "./glow-card"
import { ASSETS, type Asset, type AssetType } from "@/lib/aegis-data"
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
  Camera,
  Layers,
} from "lucide-react"
import { cn, formatNumber } from "@/lib/utils"

type FilterKey = "all" | "video" | "image"

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { value: "Live HLS", label: "Live HLS", icon: Tv },
    { value: "Master VOD", label: "Master VOD", icon: Film },
    { value: "Highlight Reel", label: "Highlight", icon: Layers },
    { value: "Press Photo", label: "Press Photo", icon: Camera },
    { value: "Key Frame", label: "Key Frame", icon: ImageIcon },
  ]

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
  const [type, setType] = React.useState<AssetType>("Live HLS")
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
          <div className="flex flex-wrap gap-1.5 p-1 bg-white/40 border border-white/60 rounded-lg">
            {ASSET_TYPE_OPTIONS.map((t) => {
              const Icon = t.icon
              const isActive = type === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "rounded-md px-2.5 py-2 text-[11.5px] font-medium flex items-center justify-center gap-1.5 transition-all",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-foreground/70 hover:bg-white/60",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </button>
              )
            })}
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
  const [filter, setFilter] = React.useState<FilterKey>("all")

  const counts = React.useMemo(
    () => ({
      all: ASSETS.length,
      video: ASSETS.filter((a) => a.media === "video").length,
      image: ASSETS.filter((a) => a.media === "image").length,
    }),
    [],
  )

  const filtered = ASSETS.filter((a) => filter === "all" || a.media === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Asset Library · Ground Truth</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Mixed-media protected sources · video streams, masters & still imagery
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/50 border border-white/60 rounded-lg">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={counts.all}
          />
          <FilterPill
            active={filter === "video"}
            onClick={() => setFilter("video")}
            label="Video"
            count={counts.video}
            icon={<Film className="h-3 w-3" />}
          />
          <FilterPill
            active={filter === "image"}
            onClick={() => setFilter("image")}
            label="Image"
            count={counts.image}
            icon={<ImageIcon className="h-3 w-3" />}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <AssetThumb key={a.id} asset={a} />
        ))}
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-foreground/70 hover:bg-white/60",
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "scoreboard text-[9.5px]",
          active ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function typeIcon(type: AssetType) {
  switch (type) {
    case "Live HLS":
      return Tv
    case "Master VOD":
      return Film
    case "Highlight Reel":
      return Layers
    case "Press Photo":
      return Camera
    case "Key Frame":
      return ImageIcon
  }
}

function AssetThumb({ asset }: { asset: Asset }) {
  const Icon = typeIcon(asset.type)
  const isVideo = asset.media === "video"

  return (
    <GlowCard className="overflow-hidden p-0">
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${asset.toneA} 0%, ${asset.toneB} 100%)`,
        }}
      >
        {isVideo ? <VideoVisual /> : <ImageVisual asset={asset} />}

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
            <ShieldCheck className="h-2.5 w-2.5" />
            Protected
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-background/15 backdrop-blur-md px-1.5 py-0.5 text-[9.5px] font-medium text-background border border-background/15">
            <Icon className="h-2.5 w-2.5" />
            {asset.type}
          </span>
        </div>

        {/* Live indicator on Live HLS */}
        {asset.type === "Live HLS" && (
          <div className="absolute top-12 left-3 inline-flex items-center gap-1 rounded-full bg-alert/90 backdrop-blur-md px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-background">
            <span className="h-1 w-1 rounded-full bg-background live-dot" />
            Live
          </div>
        )}

        {/* Bottom HUD */}
        <div className="absolute left-3 bottom-3 right-3 flex items-center justify-between font-mono text-[10px] text-background/85">
          <span>{asset.id}</span>
          <span className="text-right truncate ml-2 max-w-[60%]">{asset.meta}</span>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight truncate">
            {asset.matchName}
          </div>
          <div className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span className="scoreboard">{formatNumber(asset.vectorCount)}</span>
            vectors · {asset.ingestedAt}
          </div>
        </div>
        <button className="text-[11px] font-medium text-foreground/70 hover:text-foreground rounded-md px-2.5 py-1.5 hover:bg-white/60 transition-colors shrink-0">
          Re-index
        </button>
      </div>
    </GlowCard>
  )
}

/** Video thumbnail visual: court silhouette + play overlay */
function VideoVisual() {
  return (
    <>
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[55%] w-[75%] border-2 border-background/15 rounded-[35%]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[80%] w-[1px] bg-background/15" />

      <div className="absolute inset-0 grid place-items-center">
        <div className="h-11 w-11 rounded-full bg-background/15 backdrop-blur-md grid place-items-center border border-background/25">
          <Play className="h-4 w-4 text-background fill-background" />
        </div>
      </div>
    </>
  )
}

/** Image thumbnail visual: photographic still with vignette + grain */
function ImageVisual({ asset }: { asset: Asset }) {
  // Synthesize a photographic feel: soft radial highlights + film grain
  return (
    <>
      {/* Atmospheric photo blobs — light glints simulating arena lighting */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 22% 28%, rgba(255,236,210,0.55) 0%, transparent 32%),
            radial-gradient(circle at 78% 18%, rgba(255,200,150,0.40) 0%, transparent 28%),
            radial-gradient(circle at 60% 75%, rgba(0,0,0,0.35) 0%, transparent 45%)
          `,
        }}
      />
      {/* Subject silhouette — abstract player/object */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 56"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id={`silhouette-${asset.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </linearGradient>
        </defs>
        {/* Soft athletic silhouette */}
        <path
          d="M 38 56 C 38 40 36 32 40 26 C 42 22 42 18 44 16 C 46 13 50 12 52 14 C 55 16 56 20 56 24 C 56 28 58 30 60 34 C 62 38 62 46 60 52 L 60 56 Z"
          fill={`url(#silhouette-${asset.id})`}
        />
        {/* Crowd haze at the bottom */}
        <rect
          x="0"
          y="48"
          width="100"
          height="8"
          fill="rgba(0,0,0,0.35)"
          style={{ filter: "blur(2px)" }}
        />
      </svg>

      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.18) 0.5px, transparent 0.6px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* Soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Image-type marker (no play button) */}
      <div className="absolute right-3 bottom-9 inline-flex items-center gap-1 rounded-md bg-background/15 backdrop-blur-md border border-background/20 px-1.5 py-0.5 text-[9px] font-medium text-background">
        <Camera className="h-2.5 w-2.5" />
        STILL
      </div>
    </>
  )
}
