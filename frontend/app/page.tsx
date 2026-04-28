"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sidebar } from "@/components/cyber/sidebar"
import { Header } from "@/components/cyber/header"
import { LayerViral } from "@/components/cyber/layer-viral"
import { LayerIntercept } from "@/components/cyber/layer-intercept"
import { LayerIntelligence } from "@/components/cyber/layer-intelligence"
import { SettingsDialog } from "@/components/cyber/settings-dialog"
import type { LayerKey } from "@/components/cyber/types"

const META: Record<LayerKey, { title: string; subtitle: string }> = {
  viral: { title: "Viral VOD & Revenue", subtitle: "Module 01 · Vector Matching & Claim Pipeline" },
  intercept: { title: "Live Stream Interception", subtitle: "Module 02 · Real-time Pirate Broadcast Takedowns" },
  intelligence: { title: "Distribution & Intelligence", subtitle: "Module 03 · Reach · Extension · Bot Network" },
}

export default function Page() {
  const [layer, setLayer] = React.useState<LayerKey>("viral")
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const meta = META[layer]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar active={layer} onChange={setLayer} />

      <main className="ml-72 flex h-screen flex-1 flex-col">
        <Header title={meta.title} subtitle={meta.subtitle} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="thin-scroll relative flex-1 overflow-y-auto px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={layer}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {layer === "viral" && <LayerViral />}
              {layer === "intercept" && <LayerIntercept />}
              {layer === "intelligence" && <LayerIntelligence />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
