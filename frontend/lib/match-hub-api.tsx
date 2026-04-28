import { useQuery } from "@tanstack/react-query"
import { aegisFetch } from "./api"
import type { BroadcasterId, HeatmapPoint, Infringement, Match } from "./aegis-data"

export interface MatchSummary {
  totalDetections: number
  revenueRecovered: number
  liveOperations: number
  totalOperations: number
  matches: Match[]
  revenueSeries?: Array<{ month: string; projected: number; recovered: number }>
}

export function useMatchSummary(broadcasterId: BroadcasterId) {
  return useQuery({
    queryKey: ["matches", "summary", broadcasterId],
    queryFn: () => aegisFetch<MatchSummary>("/api/matches/summary"),
  })
}

export function useMatchHeatmap(matchId: string | null, broadcasterId: BroadcasterId) {
  return useQuery({
    queryKey: ["matches", matchId, "heatmap", broadcasterId],
    queryFn: () => aegisFetch<HeatmapPoint[]>(`/api/matches/${encodeURIComponent(matchId ?? "")}/heatmap`),
    enabled: Boolean(matchId),
  })
}

export function useMatchThreats(matchId: string | null, broadcasterId: BroadcasterId) {
  return useQuery({
    queryKey: ["matches", matchId, "threats", broadcasterId],
    queryFn: () => aegisFetch<Infringement[]>(`/api/matches/${encodeURIComponent(matchId ?? "")}/threats`),
    enabled: Boolean(matchId),
  })
}
