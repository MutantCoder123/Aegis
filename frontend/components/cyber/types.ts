export type LayerKey = "viral" | "intercept" | "intelligence"

export type Verdict = "infringement" | "monetize" | "pending"

export interface IngestionItem {
  id: string
  platform: "x" | "reddit" | "tiktok" | "youtube" | "instagram"
  handle: string
  title: string
  views: string
  timeAgo: string
  matchScore: number
  verdict: Verdict
}

export interface InterceptStream {
  id: string
  domain: string
  url: string
  region: string
  viewers: number
  confidence: number
  status: "dispatched" | "nullified" | "pending" | "dmca_filed"
  detectedAt: string
}

export interface BotDeployment {
  id: string
  platform: "telegram" | "reddit" | "discord"
  channel: string
  members: number
  mode: "injecting_ads" | "monitoring"
  status: "active" | "throttled" | "flagged"
  lastActivity: string
}
