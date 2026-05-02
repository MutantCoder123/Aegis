import { useMutation, useQueryClient } from "@tanstack/react-query"
import { aegisFetch } from "./api"

export type EnforcementAction = "TAKEDOWN" | "MONETIZE" | "WHITELIST"

export interface EnforcementResult {
  id: string
  status: "dismantled" | "claimed" | "pending"
  action: EnforcementAction
  revenueRecovered: number
  audit: string
}

export function useEnforcementAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: EnforcementAction }) =>
      aegisFetch<EnforcementResult>(`/api/enforcement/${encodeURIComponent(id)}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] })
    },
  })
}
