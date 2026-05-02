import * as React from "react"
import { aegisFetchRaw } from "./api"
import type { Infringement } from "./aegis-data"

export interface FirehoseLogEvent {
  id: number
  ts: string
  lvl: string
  text: string
}

export interface FirehoseActionEvent {
  id: number
  ts: string
  matchId: string
  cosine: number
  platform: string
  url: string
  reasoning: string[]
  verdict: "INFRINGEMENT_CONFIRMED" | "BORDERLINE" | "BENIGN" | "PENDING"
  // New Targeted Intelligence Pipeline fields
  ingestion_mode: "LIVE" | "POST_MATCH"
  priority_score: number
  velocity_metrics?: {
    views_per_hour: number
    uptime_minutes?: number
  }
  similarity_score: number
  tier_3_escalation: boolean
  ai_verdict?: "MALICIOUS" | "WHITELISTED" | "PENDING"
  ai_reasoning?: string
  infringement?: Infringement
}

export interface FirehoseTargetEvent {
  id: string
  ts: string
  url: string
  platform: string
  velocity: number
  status: string
}

export function useFirehoseStream({
  onLog,
  onAction,
  onTarget,
}: {
  onLog: (event: FirehoseLogEvent) => void
  onAction: (event: FirehoseActionEvent) => void
  onTarget?: (event: FirehoseTargetEvent) => void
}) {
  React.useEffect(() => {
    const controller = new AbortController()

    async function connect() {
      const response = await aegisFetchRaw("/api/streams/firehose", {
        signal: controller.signal,
        headers: {
          Accept: "text/event-stream",
        },
      })
      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (!controller.signal.aborted) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() ?? ""

        for (const chunk of chunks) {
          const event = chunk
            .split("\n")
            .find((line) => line.startsWith("event: "))
            ?.slice(7)
          const data = chunk
            .split("\n")
            .find((line) => line.startsWith("data: "))
            ?.slice(6)
          if (!event || !data) continue

          const payload = JSON.parse(data)
          if (event === "log") onLog(payload)
          if (event === "action") onAction(payload)
          if (event === "target" && onTarget) onTarget(payload)
        }
      }
    }

    connect().catch(() => {
      if (!controller.signal.aborted) controller.abort()
    })

    return () => controller.abort()
  }, [onAction, onLog, onTarget])
}
