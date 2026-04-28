"use client"

import * as React from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("light")

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = (localStorage.getItem("aegis-theme") as Theme | null) ?? "light"
      setTheme(stored)
      document.documentElement.classList.toggle("dark", stored === "dark")
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light"
      try {
        localStorage.setItem("aegis-theme", next)
      } catch {
        /* noop */
      }
      document.documentElement.classList.toggle("dark", next === "dark")
      return next
    })
  }, [])

  const value = React.useMemo(() => ({ theme, toggle }), [theme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
