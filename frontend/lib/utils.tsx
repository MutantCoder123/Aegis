import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100_000 ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatCurrency(value: number, currency: "USD" | "INR" = "USD") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    notation: Math.abs(value) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100_000 ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(value)
}
