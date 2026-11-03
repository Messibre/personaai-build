import dns from "node:dns/promises"

const MAX_TEXT = 15000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const BLOCKED_HOSTS = /(^|\.)linkedin\.com$|(^|\.)indeed\.com$|(^|\.)glassdoor\./i

function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase()
  if (value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return true
  if (/^(10|127)\./.test(value) || /^192\.168\./.test(value) || /^169\.254\./.test(value) || value === "0.0.0.0") return true
  const match = value.match(/^172\.(\d+)\./)
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
}

async function validateResolved(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("That URL cannot be fetched. Please paste the job description instead.")
  if (BLOCKED_HOSTS.test(url.hostname)) throw new Error("This site blocks automatic reading. Paste the job description instead.")
  const addresses = await dns.lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("That URL cannot be fetched. Please paste the job description instead.")
}

export function validateJobUrl(value: string): URL {
  const url = new URL(value)
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Please provide a valid job URL.")
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1" || /^10\.|^192\.168\.|^169\.254\./.test(url.hostname)) {
    throw new Error("That URL cannot be fetched. Please paste the job description instead.")
  }
  return url
}

async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return (await response.text()).slice(0, MAX_TEXT)
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    total += part.value.byteLength
    if (total > MAX_BYTES) throw new Error("The job page is too large. Please paste the job description instead.")
    chunks.push(part.value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, MAX_TEXT)
}

function jsonLdText(html: string): string {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const values: string[] = []
  for (const match of matches) {
    try {
      const value = JSON.parse(match[1])
      const nodes = Array.isArray(value) ? value : [value, ...(value?.["@graph"] || [])]
      for (const node of nodes) {
        if (node?.["@type"] === "JobPosting" || node?.["@type"]?.includes?.("JobPosting")) {
          values.push([node.title, node.description, node.skills, node.qualifications, node.responsibilities, node.employmentType].filter(Boolean).join("\n"))
        }
      }
    } catch { /* malformed JSON-LD is handled by the HTML fallback */ }
  }
  return values.join("\n").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function htmlText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<li[^>]*>/gi, "\n- ").replace(/<h[1-6][^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ").trim()
}

async function fetchJson(url: string): Promise<string> {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "PersonaAI-Job-Match/1.0" }, signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error("ATS endpoint unavailable")
  const data = await response.json() as Record<string, unknown>
  return String(data.content || data.description || data.text || "")
}

async function knownAts(url: URL): Promise<string> {
  const greenhouse = url.hostname.match(/(?:boards|job-boards)\.greenhouse\.io$/i)
  const pathMatch = url.pathname.match(/\/([^/]+)\/jobs\/(\d+)/i)
  const gh: [string, string] | null = pathMatch ? [pathMatch[1], pathMatch[2]] : (url.searchParams.get("gh_jid") ? [url.pathname.split("/").filter(Boolean)[0] || "", url.searchParams.get("gh_jid") || ""] : null)
  if (greenhouse && gh) return fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(gh[0])}/jobs/${encodeURIComponent(gh[1])}`)
  const lever = url.hostname === "jobs.lever.co" ? url.pathname.split("/").filter(Boolean) : []
  if (lever.length >= 2) return fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(lever[0])}/${encodeURIComponent(lever[1])}`)
  return ""
}

export async function fetchJobPosting(value: string): Promise<string> {
  let url = validateJobUrl(value)
  await validateResolved(url)
  const ats = await knownAts(url).catch(() => "")
  if (ats.length >= 300) return ats.slice(0, MAX_TEXT)
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    const response = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml,text/plain", "User-Agent": "Mozilla/5.0 (compatible; PersonaAI-Job-Match/1.0)" }, redirect: "manual", signal: AbortSignal.timeout(8000) })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location || attempt === MAX_REDIRECTS) throw new Error("The job page redirected too many times. Please paste the job description instead.")
      url = validateJobUrl(new URL(location, url).toString())
      await validateResolved(url)
      continue
    }
    if (!response.ok) throw new Error("We could not fetch that job page. Please paste the job description instead.")
    const html = await readBody(response)
    const text = jsonLdText(html) || htmlText(html)
    if (text.length < 300) throw new Error("This site blocks automatic reading. Paste the job description instead.")
    return text
  }
  throw new Error("We could not fetch that job page. Please paste the job description instead.")
}
