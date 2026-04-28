"use client"

import * as React from "react"
import {
  BROADCASTERS,
  BROADCASTER_DATA,
  type Broadcaster,
  type BroadcasterId,
} from "./aegis-data"
import {
  getAegisTenantHeaders,
  readStoredAegisIdentity,
  resolveBroadcasterSourceKey,
  setAegisIdentity,
  type AegisTenantHeaders,
} from "./aegis-auth"

interface BroadcasterContextValue {
  broadcaster: Broadcaster
  data: (typeof BROADCASTER_DATA)[BroadcasterId]
  sourceKey: string
  tenantHeaders: AegisTenantHeaders
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
  const [hasHydrated, setHasHydrated] = React.useState(false)

  React.useEffect(() => {
    const stored = readStoredAegisIdentity()
    if (stored && BROADCASTERS.some((b) => b.id === stored.broadcasterId)) {
      setId(stored.broadcasterId as BroadcasterId)
    }
    setHasHydrated(true)
  }, [])
  const broadcaster = React.useMemo(
    () => BROADCASTERS.find((b) => b.id === id) ?? BROADCASTERS[0],
    [id],
  )
  const data = BROADCASTER_DATA[broadcaster.id]
  const sourceKey = resolveBroadcasterSourceKey(broadcaster)

  React.useEffect(() => {
    setAegisIdentity({
      broadcasterId: broadcaster.id,
      sourceKey,
    })
  }, [broadcaster.id, sourceKey])

  const tenantHeaders = React.useMemo(
    () =>
      getAegisTenantHeaders({
        broadcasterId: broadcaster.id,
        sourceKey,
      }),
    [broadcaster.id, sourceKey],
  )

  const value = React.useMemo<BroadcasterContextValue>(
    () => ({
      broadcaster,
      data,
      sourceKey,
      tenantHeaders,
      setBroadcasterId: setId,
      all: BROADCASTERS,
    }),
    [broadcaster, data, sourceKey, tenantHeaders],
  )

  return <BroadcasterContext.Provider value={value}>{children}</BroadcasterContext.Provider>
}

export function useBroadcaster() {
  const ctx = React.useContext(BroadcasterContext)
  if (!ctx) throw new Error("useBroadcaster must be used within BroadcasterProvider")
  return ctx
}
