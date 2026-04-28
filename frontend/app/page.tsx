"use client"

import * as React from "react"
import { Sidebar } from "@/components/aegis/sidebar"
import { TopBar } from "@/components/aegis/topbar"
import { MatchHub } from "@/components/aegis/match-hub"
import { TheVault } from "@/components/aegis/the-vault"
import { LiveSentinel } from "@/components/aegis/live-sentinel"
import { IntelligenceFleet } from "@/components/aegis/intelligence-fleet"
import { BroadcasterProvider, useBroadcaster } from "@/lib/broadcaster-context"
import { AegisQueryProvider } from "@/lib/query-client"
import { ThemeProvider } from "@/lib/use-theme"
import type { TabKey } from "@/lib/aegis-data"
import { cn } from "@/lib/utils"

const META: Record<TabKey, { title: string; subtitle: string; eyebrow: string }> = {
  "match-hub": {
    title: "Match Hub",
    subtitle: "Forensic dashboards · contextual deep-dives per broadcast",
    eyebrow: "Aegis Operations",
  },
  vault: {
    title: "The Vault",
    subtitle: "Ground truth library · vector DNA ingestion",
    eyebrow: "Asset Protection",
  },
  sentinel: {
    title: "Live Sentinel",
    subtitle: "Real-time piracy detection · LLM adjudication pipeline",
    eyebrow: "Real-Time Defense",
  },
  fleet: {
    title: "Intelligence Fleet",
    subtitle: "Global ingestion sensors · scraper orchestration",
    eyebrow: "Sensor Network",
  },
}

function Workspace() {
  const [tab, setTab] = React.useState<TabKey>("match-hub")
  const meta = META[tab]
  const { broadcaster } = useBroadcaster()

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Decorative ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px circle at 70% 0%, rgba(234,124,69,0.15), transparent 50%)",
        }}
      />

      <Sidebar active={tab} onChange={setTab} />

      <main className="ml-[18.5rem] mr-4 flex h-screen flex-col">
        <TopBar title={meta.title} subtitle={meta.subtitle} eyebrow={meta.eyebrow} />

        {/* All tabs are mounted simultaneously so Live Sentinel keeps streaming
            in the background even when the user navigates to other tabs.
            Switching broadcasters re-mounts only the broadcaster-scoped tabs
            (Match Hub, The Vault, Live Sentinel) so they pick up fresh data;
            Intelligence Fleet stays mounted and unchanged across switches. */}
        <div className="thin-scroll relative flex-1 overflow-y-auto px-6 pb-8 pt-2">
          <TabPane visible={tab === "match-hub"}>
            <div key={`mh-${broadcaster.id}`}>
              <MatchHub />
            </div>
          </TabPane>
          <TabPane visible={tab === "vault"}>
            <div key={`vault-${broadcaster.id}`}>
              <TheVault />
            </div>
          </TabPane>
          <TabPane visible={tab === "sentinel"}>
            <div key={`sent-${broadcaster.id}`}>
              <LiveSentinel />
            </div>
          </TabPane>
          <TabPane visible={tab === "fleet"}>
            <IntelligenceFleet />
          </TabPane>
        </div>
      </main>
    </div>
  )
}

/**
 * Persistent tab wrapper. We use `hidden` so the inactive tab stays mounted
 * (preserving its state and any active intervals) but is removed from
 * layout / a11y tree.
 */
function TabPane({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(visible ? "block" : "hidden")}
      aria-hidden={!visible}
      // hint to React not to remove this subtree
    >
      {children}
    </div>
  )
}

export default function Page() {
  return (
    <ThemeProvider>
      <AegisQueryProvider>
        <BroadcasterProvider>
          <Workspace />
        </BroadcasterProvider>
      </AegisQueryProvider>
    </ThemeProvider>
  )
}
