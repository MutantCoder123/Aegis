"use client"

export interface AegisIdentity {
  broadcasterId: string
  sourceKey: string
}

export type AegisTenantHeaders = {
  "X-Broadcaster-ID": string
  "X-Source-Key": string
}

const STORAGE_KEY = "aegis.activeIdentity"

const FALLBACK_SOURCE_KEYS: Record<string, string> = {
  nba: "nba_live_source_key",
  ufc: "ufc_live_source_key",
  fifa: "fifa_live_source_key",
}

let activeIdentity: AegisIdentity = {
  broadcasterId: "nba",
  sourceKey: FALLBACK_SOURCE_KEYS.nba,
}

const listeners = new Set<(identity: AegisIdentity) => void>()

export function resolveBroadcasterSourceKey(broadcaster: { id: string; sourceKey?: string }) {
  return broadcaster.sourceKey ?? FALLBACK_SOURCE_KEYS[broadcaster.id] ?? `${broadcaster.id}_source_key`
}

export function readStoredAegisIdentity() {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<AegisIdentity>
    if (!parsed.broadcasterId || !parsed.sourceKey) return null

    return {
      broadcasterId: parsed.broadcasterId,
      sourceKey: parsed.sourceKey,
    }
  } catch {
    return null
  }
}

export function getAegisIdentity() {
  return activeIdentity
}

export function getAegisTenantHeaders(identity = activeIdentity): AegisTenantHeaders {
  return {
    "X-Broadcaster-ID": identity.broadcasterId,
    "X-Source-Key": identity.sourceKey,
  }
}

export function setAegisIdentity(identity: AegisIdentity) {
  activeIdentity = identity

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  }

  listeners.forEach((listener) => listener(identity))
}

export function subscribeToAegisIdentity(listener: (identity: AegisIdentity) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
