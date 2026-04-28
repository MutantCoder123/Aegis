import { getAegisTenantHeaders } from "./aegis-auth"

declare const process: {
  env: {
    NEXT_PUBLIC_AEGIS_API_BASE_URL?: string
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_AEGIS_API_BASE_URL ?? "").replace(/\/$/, "")

export class AegisApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "AegisApiError"
    this.status = status
    this.payload = payload
  }
}

export function resolveAssetUrl(input: string | null | undefined) {
  if (!input) return ""
  if (/^https?:\/\//i.test(input)) return input
  return `${API_BASE_URL}${input.startsWith("/") ? input : `/${input}`}`
}

function withTenantHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers)
  const tenantHeaders = getAegisTenantHeaders()

  headers.set("X-Broadcaster-ID", tenantHeaders["X-Broadcaster-ID"])
  headers.set("X-Source-Key", tenantHeaders["X-Source-Key"])

  return {
    ...init,
    headers,
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) return response.json()

  return response.text()
}

export async function aegisFetch<TResponse = unknown>(
  input: string | URL,
  init?: RequestInit,
): Promise<TResponse> {
  const url = input instanceof URL ? input : resolveAssetUrl(input)
  const response = await fetch(url, withTenantHeaders(init))
  const payload = await parseResponse(response)

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "detail" in payload
        ? String(payload.detail)
        : `AEGIS API request failed with ${response.status}`

    throw new AegisApiError(message, response.status, payload)
  }

  return payload as TResponse
}

export function aegisFetchRaw(input: string | URL, init?: RequestInit) {
  const url = input instanceof URL ? input : resolveAssetUrl(input)
  return fetch(url, withTenantHeaders(init))
}
