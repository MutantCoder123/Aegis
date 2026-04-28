"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "glass-strong" | "glass-dark"
  withBorder?: boolean
  children: React.ReactNode
}

/**
 * GlowCard — a glassmorphic surface that tracks the mouse position and
 * casts a soft radial spotlight + animated border glow on hover.
 */
export function GlowCard({
  className,
  variant = "glass",
  withBorder = true,
  children,
  ...props
}: GlowCardProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    el.style.setProperty("--mx", `${x}%`)
    el.style.setProperty("--my", `${y}%`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn(
        "relative rounded-[var(--radius)] spotlight",
        withBorder && "spotlight-border",
        variant,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
