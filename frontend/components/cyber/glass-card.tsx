"use client"

import { motion, useMotionTemplate, useMotionValue } from "framer-motion"
import { cn } from "@/lib/utils"
import * as React from "react"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  beam?: boolean
  beamColor?: string
  /** Kept for API compatibility */
  tilt?: boolean
  intensity?: number
}

/**
 * Frosted white glass card. On hover a soft warm spotlight follows the cursor.
 */
export function GlassCard({
  className,
  children,
  beam = true,
  beamColor = "rgba(234, 124, 69, 0.10)",
  tilt: _tilt,
  intensity: _intensity,
  ...props
}: GlassCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(-200)
  const mouseY = useMotionValue(-200)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }
  function onMouseLeave() {
    mouseX.set(-200)
    mouseY.set(-200)
  }

  const beamBg = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, ${beamColor}, transparent 70%)`

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn("glass group relative overflow-hidden rounded-2xl", className)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {beam && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: beamBg }}
        />
      )}
      {/* inner top highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
}
