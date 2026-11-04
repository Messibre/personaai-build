import dns from "node:dns/promises"
import net from "node:net"

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_url" | "blocked_host" | "host_not_allowed" | "dns_failed" | "too_many_redirects" | "too_large" | "network",
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = "SafeFetchError"
  }
}

export interface SafeFetchOptions {
  headers?: Record<string, string>
  timeoutMs?: number
  maxRedirects?: number
  isHostAllowed?: (hostname: string) => boolean
}

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_MAX_REDIRECTS = 3

export function isPrivateAddress(address: string): boolean {
  let value = address.toLowerCase().replace(/^\[|\]$/g, "")
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) value = mapped[1]

  if (net.isIPv4(value)) {
    const [a, b] = value.split(".").map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    )
  }

  if (net.isIPv6(value)) {
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")
  }

  return false
}

export function assertPublicHttpUrl(value: string | URL): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch (error) {
    throw new SafeFetchError("Invalid URL.", "invalid_url", { cause: error })
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new SafeFetchError("Only http(s) URLs can be fetched.", "invalid_url")
  if (url.username || url.password) throw new SafeFetchError("URLs with credentials cannot be fetched.", "invalid_url")
  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (hostname === "localhost" || hostname.endsWith(".localhost") || isPrivateAddress(hostname)) {
    throw new SafeFetchError("Private or local addresses cannot be fetched.", "blocked_host")
  }
  return url
}

async function assertResolvesPublic(url: URL): Promise<void> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (net.isIP(hostname)) return
  let addresses: Array<{ address: string }>
  try {
    addresses = await dns.lookup(hostname, { all: true })
  } catch (error) {
    throw new SafeFetchError("The host could not be resolved.", "dns_failed", { cause: error })
  }
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new SafeFetchError("Private or local addresses cannot be fetched.", "blocked_host")
  }
}

/**
 * Fetches a user-influenced URL with SSRF protection: every hop (including redirects)
 * must be a public http(s) address, and redirects are followed manually.
 */
export async function safeFetch(input: string | URL, options: SafeFetchOptions = {}): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  let url = assertPublicHttpUrl(input)

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (options.isHostAllowed && !options.isHostAllowed(url.hostname)) {
      throw new SafeFetchError("This host is not allowed.", "host_not_allowed")
    }
    await assertResolvesPublic(url)

    let response: Response
    try {
      response = await fetch(url, {
        headers: options.headers,
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      })
    } catch (error) {
      throw new SafeFetchError("The URL could not be reached.", "network", { cause: error })
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) return response
      url = assertPublicHttpUrl(new URL(location, url))
      continue
    }
    return response
  }

  throw new SafeFetchError("Too many redirects.", "too_many_redirects")
}

export async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ""
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    total += part.value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new SafeFetchError("The response is too large.", "too_large")
    }
    chunks.push(part.value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}
