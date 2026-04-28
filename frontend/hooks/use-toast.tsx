"use client"

import * as React from "react"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

type Toast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const listeners = new Set<(toasts: Toast[]) => void>()
let memoryState: Toast[] = []

function emit() {
  listeners.forEach((listener) => listener(memoryState))
}

export function toast(toast: Omit<Toast, "id">) {
  const id = crypto.randomUUID()
  memoryState = [{ ...toast, id, open: true }, ...memoryState].slice(0, 5)
  emit()
  return {
    id,
    dismiss: () => dismiss(id),
  }
}

export function dismiss(id: string) {
  memoryState = memoryState.filter((toast) => toast.id !== id)
  emit()
}

export function useToast() {
  const [toasts, setToasts] = React.useState(memoryState)

  React.useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  return {
    toasts,
    toast,
    dismiss,
  }
}
