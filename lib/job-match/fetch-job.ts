const MAX_JOB_TEXT = 15000
const MAX_REDIRECTS = 3

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "local" ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) return true

  if (host === "0.0.0.0" || host === "255.255.255.255" || /^(10|127)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true
  const private172 = host.match(/^172\.(\d+)\./)
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true
  return false
}

export function validateJobUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("Please provide a valid job URL.")
  }
  if (!["http:", "https:"].includes(url.protocol) || isPrivateHostname(url.hostname)) {
    throw new Error("That URL cannot be fetched. Please paste the job description instead.")
  }
  return url
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_JOB_TEXT)
}

export async function fetchJobPosting(value: string): Promise<string> {
  let url = validateJobUrl(value)
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { Accept: "text/html, text/plain", "User-Agent": "PersonaAI-Job-Match/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      throw new Error("We could not fetch that job page. Please paste the job description instead.")
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location || attempt === MAX_REDIRECTS) throw new Error("The job page redirected too many times. Please paste the job description instead.")
      url = validateJobUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) throw new Error("We could not fetch that job page. Please paste the job description instead.")
    const text = extractText(await response.text())
    if (text.length < 120) throw new Error("That page did not contain enough job posting text. Please paste the job description instead.")
    return text
  }
  throw new Error("We could not fetch that job page. Please paste the job description instead.")
}
