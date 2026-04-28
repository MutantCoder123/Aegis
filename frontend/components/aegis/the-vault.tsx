"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { GlowCard } from "./glow-card"
import { type Asset, type AssetType } from "@/lib/aegis-data"
import { useBroadcaster } from "@/lib/broadcaster-context"
import { useVaultAssets, useVaultIngest } from "@/lib/vault-api"
import { resolveAssetUrl } from "@/lib/api"
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
  X,
  Upload,
  FileUp,
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
  const { broadcaster } = useBroadcaster()
  const ingest = useVaultIngest(broadcaster.id)
  const [showKey, setShowKey] = React.useState(false)
  const [type, setType] = React.useState<AssetType>("Live HLS")
  const [matchId, setMatchId] = React.useState("LAKERS_WARRIORS_001")
  const [displayName, setDisplayName] = React.useState("Lakers vs Warriors · Court Side HD")
  const [sourceKey, setSourceKey] = React.useState("hls_a4e8b2c19f3d7e0a8b6c2f1d")
  const [assetSource, setAssetSource] = React.useState<File | string | null>(null)
  const [indexing, setIndexing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleIndex = async () => {
    if (indexing || !assetSource) return
    setIndexing(true)
    setProgress(0)

    const formData = new FormData()
    formData.append("match_id", matchId)
    formData.append("display_name", displayName)
    formData.append("asset_type", type)
    formData.append("file_type", type === "Press Photo" || type === "Key Frame" ? "image" : "video")
    
    if (typeof assetSource === "string") {
      formData.append("source_url", assetSource)
    } else {
      formData.append("file", assetSource)
    }

    ingest.mutate(formData as any) // We'll update the hook type next

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
      </div>

      <div className="mt-4">
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
      </div>

      {/* Asset Source Dropzone */}
      <Field label="ASSET SOURCE (UPLOAD FILE OR STREAM URL)" className="mt-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const file = e.dataTransfer.files?.[0]
            if (file) setAssetSource(file)
          }}
          className={cn(
            "glass spotlight spotlight-border relative w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group focus-within:ring-2 focus-within:ring-highlight/30",
            assetSource ? "border-success/50 bg-success/5" : "border-foreground/10 hover:border-highlight/40 hover:bg-white/40",
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setAssetSource(file)
            }}
          />
          <div className="h-12 w-12 rounded-full bg-foreground/5 grid place-items-center group-hover:scale-110 transition-transform">
            <Upload className={cn("h-6 w-6", assetSource ? "text-success" : "text-muted-foreground")} />
          </div>
          <div className="text-center px-4">
            {assetSource instanceof File ? (
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-semibold text-foreground truncate max-w-[300px]">{assetSource.name}</span>
                <span className="text-[10px] text-muted-foreground scoreboard mt-0.5">
                  {(assetSource.size / (1024 * 1024)).toFixed(2)} MB · File Ready
                </span>
              </div>
            ) : typeof assetSource === "string" && assetSource.length > 0 ? (
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-semibold text-foreground truncate max-w-[300px]">
                  {assetSource}
                </span>
                <span className="text-[10px] text-muted-foreground scoreboard mt-0.5">Stream URL Active</span>
              </div>
            ) : (
              <>
                <span className="text-[14px] font-semibold text-foreground block">
                  Click to choose or drag & drop files
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Or paste a live stream link here
                </span>
              </>
            )}
          </div>
          
          <input
            placeholder="Paste URL (e.g. https://.../stream.m3u8)"
            onClick={(e) => e.stopPropagation()}
            value={typeof assetSource === "string" ? assetSource : ""}
            onChange={(e) => setAssetSource(e.target.value)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[80%] bg-white/60 border border-white/80 rounded-md px-3 py-1.5 text-[11px] font-mono text-center focus:outline-none focus:border-highlight/40 focus:bg-white/80 transition-all opacity-0 group-hover:opacity-100"
          />
        </div>
        <p className="text-[9.5px] font-mono text-muted-foreground mt-2 uppercase tracking-wider text-center">
          Accepted formats: .mp4, .mkv, .mov, .m3u8, .jpeg, .png
        </p>
      </Field>

      <div className="mt-4">
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
              : "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {indexing && (
            <div className="absolute inset-0 bg-highlight/10 animate-pulse pointer-events-none" />
          )}
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  )
}

function AssetLibrary() {
  const { data, broadcaster } = useBroadcaster()
  const assetsQuery = useVaultAssets(broadcaster.id)
  const ASSETS = assetsQuery.data?.length ? assetsQuery.data : data.assets
  const [filter, setFilter] = React.useState<FilterKey>("all")
  const [active, setActive] = React.useState<Asset | null>(null)

  const counts = React.useMemo(
    () => ({
      all: ASSETS.length,
      video: ASSETS.filter((a) => a.media === "video").length,
      image: ASSETS.filter((a) => a.media === "image").length,
    }),
    [ASSETS],
  )

  const filtered = ASSETS.filter((a) => filter === "all" || a.media === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Asset Library · Ground Truth</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Mixed-media protected sources · click any asset to play or view
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
          <AssetCard key={a.id} asset={a} onOpen={() => setActive(a)} />
        ))}
      </div>

      <AssetViewer asset={active} onClose={() => setActive(null)} />
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

/**
 * Card-style asset entry — info-first, no synthesized preview. Backend can
 * supply `videoUrl` / `imageUrl`; the AssetViewer renders the real media on
 * demand when the card is clicked.
 */
function AssetCard({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const Icon = typeIcon(asset.type)
  const isVideo = asset.media === "video"

  return (
    <GlowCard className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${asset.matchName}`}
        className="w-full text-left flex flex-col"
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success-deep border border-success/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
            <ShieldCheck className="h-2.5 w-2.5" />
            Protected
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.04] border border-foreground/10 px-1.5 py-0.5 text-[9.5px] font-medium text-foreground/70">
            <Icon className="h-2.5 w-2.5" />
            {asset.type}
          </span>
        </div>

        <div className="px-4 pt-3 pb-4 flex items-start gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl grid place-items-center shrink-0 transition-colors",
              isVideo
                ? "bg-foreground text-background"
                : "bg-highlight/15 text-highlight-deep border border-highlight/25",
            )}
          >
            {isVideo ? (
              <Play className="h-5 w-5 fill-current" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold tracking-tight leading-snug truncate">
              {asset.matchName}
            </div>
            <div className="scoreboard text-[10px] text-muted-foreground mt-0.5 truncate">
              {asset.id} · {asset.meta}
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-white/60 bg-white/30 flex items-center justify-between">
          <div className="text-[10.5px] text-muted-foreground flex items-center gap-1.5">
            <span className="scoreboard text-foreground/80">{formatNumber(asset.vectorCount)}</span>
            vectors · {asset.ingestedAt}
          </div>
          <span
            className={cn(
              "text-[10.5px] font-semibold uppercase tracking-wider",
              isVideo ? "text-foreground" : "text-highlight-deep",
            )}
          >
            {isVideo ? "Play →" : "View →"}
          </span>
        </div>
      </button>
    </GlowCard>
  )
}

/**
 * Functional viewer modal. Plays `asset.videoUrl` or shows `asset.imageUrl`
 * (both populated by the backend). When the URL is missing we render an
 * inline notice so the operator knows the asset is awaiting backend payload
 * — but the player UI itself stays fully wired.
 */
function AssetViewer({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!asset) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [asset, onClose])

  return (
    <AnimatePresence>
      {asset && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 grid place-items-center p-6"
          style={{ backdropFilter: "blur(14px)" }}
        >
          <div className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="glass-strong relative z-10 w-full max-w-4xl rounded-[var(--radius)] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`Asset viewer · ${asset.matchName}`}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-foreground text-background grid place-items-center shrink-0">
                  {asset.media === "video" ? (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold tracking-tight truncate">
                    {asset.matchName}
                  </h2>
                  <p className="scoreboard text-[10px] text-muted-foreground truncate">
                    {asset.id} · {asset.type} · {asset.meta}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-foreground/5 grid place-items-center"
                aria-label="Close viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-foreground">
              <AssetMedia asset={asset} />
            </div>

            <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/60 bg-white/30">
              <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-success-deep">
                  <ShieldCheck className="h-3 w-3" />
                  Protected
                </span>
                <span>
                  <span className="scoreboard text-foreground/80">{formatNumber(asset.vectorCount)}</span>{" "}
                  vectors · ingested {asset.ingestedAt}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground scoreboard">Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AssetMedia({ asset }: { asset: Asset }) {
  if (asset.media === "video") {
    if (!asset.videoUrl) {
      return <PendingMedia label="Awaiting video stream from backend" kind="video" />
    }
    return (
      <video
        key={asset.videoUrl}
        src={resolveAssetUrl(asset.videoUrl)}
        controls
        autoPlay
        playsInline
        className="w-full aspect-video bg-black"
      />
    )
  }
  if (!asset.imageUrl) {
    return <PendingMedia label="Awaiting image payload from backend" kind="image" />
  }
  return (
    <img
      src={resolveAssetUrl(asset.imageUrl) || "/placeholder.svg"}
      alt={asset.matchName}
      className="w-full aspect-video object-contain bg-black"
    />
  )
}

function PendingMedia({ label, kind }: { label: string; kind: "video" | "image" }) {
  const Icon = kind === "video" ? Play : Camera
  return (
    <div className="aspect-video w-full grid place-items-center text-background/80">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="h-14 w-14 rounded-full bg-background/10 border border-background/20 grid place-items-center">
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-[12.5px] font-medium tracking-tight">{label}</div>
        <div className="scoreboard text-[10px] text-background/60 max-w-[420px]">
          {kind === "video"
            ? "Backend will set asset.videoUrl. The <video> player is wired and ready."
            : "Backend will set asset.imageUrl. The <img> renderer is wired and ready."}
        </div>
      </div>
    </div>
  )
}
