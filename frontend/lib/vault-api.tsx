import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { aegisFetch } from "./api"
import type { Asset, AssetType, BroadcasterId } from "./aegis-data"

export interface VaultIngestPayload {
  matchId: string
  displayName: string
  sourceUrl: string
  assetType: AssetType
  fileType: "video" | "image"
}

function toFileType(assetType: AssetType): "video" | "image" {
  return assetType === "Press Photo" || assetType === "Key Frame" ? "image" : "video"
}

export function useVaultAssets(broadcasterId: BroadcasterId) {
  return useQuery({
    queryKey: ["vault", "assets", broadcasterId],
    queryFn: () => aegisFetch<Asset[]>("/api/vault/assets"),
  })
}

export function useVaultIngest(broadcasterId: BroadcasterId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) =>
      aegisFetch("/api/vault/ingest", {
        method: "POST",
        body: formData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", "assets", broadcasterId] })
    },
  })
}
