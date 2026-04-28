export type BroadcasterId = "nba" | "ufc" | "fifa"
export type TabKey = "match-hub" | "vault" | "sentinel" | "fleet"

export interface Broadcaster {
  id: BroadcasterId
  name: string
  shortName: string
  tag: string
  currency: "USD" | "INR"
  sourceKey: string
}

export type MatchStatus = "live" | "monitoring" | "resolved"

export interface Match {
  id: string
  title: string
  league: string
  venue: string
  date: string
  status: MatchStatus
  detections: number
  revenue: number
}

export interface HeatmapPoint {
  minute: number
  detections: number
}

export type InfringementStatus = "pending" | "claimed" | "dismantled"

export interface Infringement {
  id: string
  matchId: string
  platform: string
  url: string
  cosineDistance: number
  status: InfringementStatus
  reach: number
  timestamp: string
  vectorUuid: string
}

export type AssetType = "Live HLS" | "Master VOD" | "Highlight Reel" | "Press Photo" | "Key Frame"

export interface Asset {
  id: string
  matchName: string
  type: AssetType
  media: "video" | "image"
  meta: string
  vectorCount: number
  ingestedAt: string
  videoUrl?: string
  imageUrl?: string
}

export interface FirehoseTemplate {
  lvl: "SCRAPE" | "VECTOR" | "MATCH" | "ARB" | "SYSTEM"
  text: string
}

export interface Sensor {
  id: string
  type:
    | "Telegram Bot"
    | "Chrome Extension Node"
    | "Reddit Crawler"
    | "Discord Sentry"
    | "X / Twitter Hook"
  target: string
  region: string
  status: "Active" | "Throttled" | "Offline"
  throughput: number
}

export const BROADCASTERS: Broadcaster[] = [
  {
    id: "nba",
    name: "NBA Media Ventures",
    shortName: "NBA",
    tag: "Basketball live rights",
    currency: "USD",
    sourceKey: "nba_live_source_key",
  },
  {
    id: "ufc",
    name: "UFC Fight Pass",
    shortName: "UFC",
    tag: "Combat sports PPV",
    currency: "USD",
    sourceKey: "ufc_live_source_key",
  },
  {
    id: "fifa",
    name: "FIFA Broadcast",
    shortName: "FIFA",
    tag: "Global football rights",
    currency: "INR",
    sourceKey: "fifa_live_source_key",
  },
]

const heatmap = [0, 8, 15, 22, 30, 38, 45, 52, 60, 68, 75, 82, 90].map((minute, i) => ({
  minute,
  detections: [18, 42, 64, 51, 86, 112, 96, 138, 121, 165, 144, 118, 72][i],
}))

export const REVENUE_SERIES: Record<BroadcasterId, Array<{ month: string; projected: number; recovered: number }>> = {
  nba: [
    ["Jun", 92000, 52000],
    ["Jul", 108000, 69000],
    ["Aug", 116000, 76000],
    ["Sep", 131000, 88000],
    ["Oct", 149000, 112000],
    ["Nov", 162000, 126000],
  ].map(([month, projected, recovered]) => ({ month, projected, recovered }) as { month: string; projected: number; recovered: number }),
  ufc: [
    ["Jun", 122000, 71000],
    ["Jul", 136000, 84000],
    ["Aug", 158000, 99000],
    ["Sep", 176000, 121000],
    ["Oct", 184000, 139000],
    ["Nov", 205000, 156000],
  ].map(([month, projected, recovered]) => ({ month, projected, recovered }) as { month: string; projected: number; recovered: number }),
  fifa: [
    ["Jun", 8100000, 3900000],
    ["Jul", 9400000, 5200000],
    ["Aug", 11200000, 6800000],
    ["Sep", 12400000, 7600000],
    ["Oct", 13900000, 9100000],
    ["Nov", 15100000, 10300000],
  ].map(([month, projected, recovered]) => ({ month, projected, recovered }) as { month: string; projected: number; recovered: number }),
}

export const BROADCASTER_DATA: Record<BroadcasterId, {
  matches: Match[]
  heatmap: HeatmapPoint[]
  infringements: Infringement[]
  assets: Asset[]
  firehose: FirehoseTemplate[]
  liveMatchIds: string[]
}> = {
  nba: makeBroadcasterData("NBA", "LAKERS_WARRIORS_001"),
  ufc: makeBroadcasterData("UFC", "UFC_301_MAIN_001"),
  fifa: makeBroadcasterData("FIFA", "FIFA_FINAL_001"),
}

function makeBroadcasterData(prefix: string, primaryId: string): {
  matches: Match[]
  heatmap: HeatmapPoint[]
  infringements: Infringement[]
  assets: Asset[]
  firehose: FirehoseTemplate[]
  liveMatchIds: string[]
} {
  const matches: Match[] = [
    {
      id: primaryId,
      title: prefix === "NBA" ? "Lakers vs Warriors" : prefix === "UFC" ? "Title Fight Main Card" : "Final Matchday Live",
      league: prefix === "FIFA" ? "World Football" : prefix,
      venue: prefix === "NBA" ? "Crypto.com Arena" : prefix === "UFC" ? "T-Mobile Arena" : "Lusail Stadium",
      date: "Live now",
      status: "live",
      detections: 1248,
      revenue: prefix === "FIFA" ? 10300000 : 156000,
    },
    {
      id: `${prefix}_ARCHIVE_044`,
      title: prefix === "NBA" ? "Celtics vs Heat" : prefix === "UFC" ? "Prelims Live" : "Group Stage Replay",
      league: prefix,
      venue: "Broadcast Zone A",
      date: "Today",
      status: "monitoring",
      detections: 684,
      revenue: prefix === "FIFA" ? 4100000 : 82400,
    },
    {
      id: `${prefix}_NIGHTCAP_088`,
      title: prefix === "NBA" ? "Bucks vs Knicks" : prefix === "UFC" ? "Post Fight Show" : "Highlights World Feed",
      league: prefix,
      venue: "Remote Production",
      date: "Tonight",
      status: "resolved",
      detections: 392,
      revenue: prefix === "FIFA" ? 2200000 : 43800,
    },
  ]

  return {
    matches,
    heatmap,
    infringements: [
      {
        id: "THR-9041",
        matchId: primaryId,
        platform: "Telegram",
        url: "https://t.me/courtside_hd/live",
        cosineDistance: 0.963,
        status: "pending" as const,
        reach: 38200,
        timestamp: "2026-04-28T13:41:08Z",
        vectorUuid: "vec_7f4c1c0a9d82",
      },
      {
        id: "THR-9040",
        matchId: primaryId,
        platform: "X",
        url: "https://x.com/streamhub_24",
        cosineDistance: 0.918,
        status: "claimed" as const,
        reach: 21100,
        timestamp: "2026-04-28T13:39:21Z",
        vectorUuid: "vec_a18e81d0234b",
      },
      {
        id: "THR-9038",
        matchId: matches[1].id,
        platform: "Discord",
        url: "https://discord.gg/livepass",
        cosineDistance: 0.887,
        status: "dismantled" as const,
        reach: 14600,
        timestamp: "2026-04-28T13:31:44Z",
        vectorUuid: "vec_faa92291bb02",
      },
    ],
    assets: [
      {
        id: `VAULT-${prefix}-001`,
        matchName: matches[0].title,
        type: "Live HLS" as const,
        media: "video" as const,
        meta: "1080p HLS ladder",
        vectorCount: 18420,
        ingestedAt: "12m ago",
      },
      {
        id: `VAULT-${prefix}-002`,
        matchName: matches[1].title,
        type: "Master VOD" as const,
        media: "video" as const,
        meta: "Archive master",
        vectorCount: 42600,
        ingestedAt: "2h ago",
      },
      {
        id: `VAULT-${prefix}-003`,
        matchName: "Official key frame set",
        type: "Key Frame" as const,
        media: "image" as const,
        meta: "Static references",
        vectorCount: 512,
        ingestedAt: "Today",
        imageUrl: "/placeholder.svg",
      },
    ],
    firehose: [
      { lvl: "SCRAPE" as const, text: "Telegram bot sampled live mirror candidate" },
      { lvl: "VECTOR" as const, text: "CLIP embedding generated · 512 dimensions" },
      { lvl: "MATCH" as const, text: "pgvector HNSW match exceeded Tier 1 threshold" },
      { lvl: "ARB" as const, text: "Gemini arbiter produced enforcement verdict" },
    ],
    liveMatchIds: [primaryId, matches[1].id],
  }
}

export const SENSORS: Sensor[] = [
  { id: "SNS-001", type: "Telegram Bot", target: "@courtside_HD", region: "US-East", status: "Active", throughput: 8.4 },
  { id: "SNS-002", type: "Chrome Extension Node", target: "Watch-party reports", region: "Global", status: "Active", throughput: 6.1 },
  { id: "SNS-003", type: "Reddit Crawler", target: "Live threads", region: "US-West", status: "Throttled", throughput: 2.8 },
  { id: "SNS-004", type: "Discord Sentry", target: "Invite graph", region: "EU", status: "Active", throughput: 4.9 },
]

export const FLEET_GROWTH = [
  { month: "Jun", extensionUsers: 1800, bots: 12 },
  { month: "Jul", extensionUsers: 2600, bots: 18 },
  { month: "Aug", extensionUsers: 3900, bots: 26 },
  { month: "Sep", extensionUsers: 5400, bots: 34 },
  { month: "Oct", extensionUsers: 7200, bots: 43 },
  { month: "Nov", extensionUsers: 9400, bots: 56 },
]
