import { SafeFetchError, assertPublicHttpUrl, readLimitedText, safeFetch } from "@/lib/security/safe-fetch"

const MAX_TEXT = 15000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const BLOCKED_HOSTS = /(^|\.)linkedin\.com$|(^|\.)indeed\.com$|(^|\.)glassdoor\./i
const PASTE_FALLBACK = "That URL cannot be fetched. Please paste the job description instead."
const BLOCKS_READING = "This site blocks automatic reading. Paste the job description instead."

export function validateJobUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch (error) {
    throw new Error("Please provide a valid job URL.", { cause: error })
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Please provide a valid job URL.")
  try {
    return assertPublicHttpUrl(url)
  } catch (error) {
    throw new Error(PASTE_FALLBACK, { cause: error })
  }
}

function toUserError(error: unknown): Error {
  if (!(error instanceof SafeFetchError)) return error instanceof Error ? error : new Error(PASTE_FALLBACK)
  switch (error.code) {
    case "host_not_allowed":
      return new Error(BLOCKS_READING, { cause: error })
    case "too_many_redirects":
      return new Error("The job page redirected too many times. Please paste the job description instead.", { cause: error })
    case "too_large":
      return new Error("The job page is too large. Please paste the job description instead.", { cause: error })
    case "network":
      return new Error("We could not fetch that job page. Please paste the job description instead.", { cause: error })
    default:
      return new Error(PASTE_FALLBACK, { cause: error })
  }
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
  const response = await safeFetch(url, { headers: { Accept: "application/json", "User-Agent": "PersonaAI-Job-Match/1.0" }, maxRedirects: 0 })
  if (!response.ok) throw new Error("ATS endpoint unavailable")
  const data = JSON.parse(await readLimitedText(response, MAX_BYTES)) as Record<string, unknown>
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
  const url = validateJobUrl(value)
  if (BLOCKED_HOSTS.test(url.hostname)) throw new Error(BLOCKS_READING)
  const ats = await knownAts(url).catch(() => "")
  if (ats.length >= 300) return ats.slice(0, MAX_TEXT)

  let html: string
  try {
    const response = await safeFetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml,text/plain", "User-Agent": "Mozilla/5.0 (compatible; PersonaAI-Job-Match/1.0)" },
      maxRedirects: MAX_REDIRECTS,
      isHostAllowed: (hostname) => !BLOCKED_HOSTS.test(hostname),
    })
    if (!response.ok) throw new SafeFetchError("Unexpected status", "network")
    html = (await readLimitedText(response, MAX_BYTES)).slice(0, MAX_TEXT)
  } catch (error) {
    throw toUserError(error)
  }

  const text = jsonLdText(html) || htmlText(html)
  if (text.length < 300) throw new Error(BLOCKS_READING)
  return text
}
