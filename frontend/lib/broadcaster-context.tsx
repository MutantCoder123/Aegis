"use client"

import * as React from "react"
import {
  BROADCASTERS,
  BROADCASTER_DATA,
  type Broadcaster,
  type BroadcasterId,
} from "./aegis-data"

interface BroadcasterContextValue {
  broadcaster: Broadcaster
  data: (typeof BROADCASTER_DATA)[BroadcasterId]
  setBroadcasterId: (id: BroadcasterId) => void
  all: Broadcaster[]
}

const BroadcasterContext = React.createContext<BroadcasterContextValue | null>(null)

export function BroadcasterProvider({
  children,
  initialId = "nba",
}: {
  children: React.ReactNode
  initialId?: BroadcasterId
}) {
  const [id, setId] = React.useState<BroadcasterId>(initialId)
  const broadcaster = React.useMemo(
    () => BROADCASTERS.find((b) => b.id === id) ?? BROADCASTERS[0],
    [id],
  )
  const data = BROADCASTER_DATA[broadcaster.id]

  const value = React.useMemo<BroadcasterContextValue>(
    () => ({
      broadcaster,
      data,
      setBroadcasterId: setId,
      all: BROADCASTERS,
    }),
    [broadcaster, data],
  )

  return <BroadcasterContext.Provider value={value}>{children}</BroadcasterContext.Provider>
}

export function useBroadcaster() {
  const ctx = React.useContext(BroadcasterContext)
  if (!ctx) throw new Error("useBroadcaster must be used within BroadcasterProvider")
  return ctx
}
