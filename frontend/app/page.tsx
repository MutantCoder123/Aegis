"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sidebar } from "@/components/aegis/sidebar"
import { TopBar } from "@/components/aegis/topbar"
import { MatchHub } from "@/components/aegis/match-hub"
import { TheVault } from "@/components/aegis/the-vault"
import { LiveSentinel } from "@/components/aegis/live-sentinel"
import { IntelligenceFleet } from "@/components/aegis/intelligence-fleet"
import type { TabKey } from "@/lib/aegis-data"

const META: Record<TabKey, { title: string; subtitle: string }> = {
  "match-hub": {
    title: "Match Hub",
    subtitle: "Forensic dashboards · contextual deep-dives per broadcast",
  },
  vault: {
    title: "The Vault",
    subtitle: "Ground truth library · vector DNA ingestion",
  },
  sentinel: {
    title: "Live Sentinel",
    subtitle: "Real-time piracy detection · LLM adjudication pipeline",
  },
  fleet: {
    title: "Intelligence Fleet",
    subtitle: "Global ingestion sensors · scraper orchestration",
  },
}

export default function Page() {
  const [tab, setTab] = React.useState<TabKey>("match-hub")
  const meta = META[tab]

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
        <TopBar title={meta.title} subtitle={meta.subtitle} />

        <div className="thin-scroll relative flex-1 overflow-y-auto px-6 pb-8 pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {tab === "match-hub" && <MatchHub />}
              {tab === "vault" && <TheVault />}
              {tab === "sentinel" && <LiveSentinel />}
              {tab === "fleet" && <IntelligenceFleet />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
