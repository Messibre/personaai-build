import { NextResponse } from "next/server"

const MAX_BODY_BYTES = 1_048_576 // ~1 MB

export function extractPageId(url: string): string | null {
  try {
    let raw = url.trim()
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = "https://" + raw
    const parsed = new URL(raw)
    if (parsed.protocol !== "https:") return null
    const host = parsed.hostname.toLowerCase()
    const isNotionHost =
      host === "notion.so" ||
      host.endsWith(".notion.so") ||
      host === "notion.site" ||
      host.endsWith(".notion.site")
    if (!isNotionHost) {
      return null
    }
    const pathParts = parsed.pathname.split("/").filter(Boolean)
    const lastPart = pathParts[pathParts.length - 1] || ""
    const match = lastPart.match(/([a-f0-9]{32})$/i) || lastPart.match(/([a-f0-9-]{36})$/i)
    if (match) return match[1].replace(/-/g, "")
    const dashMatch = lastPart.match(/-([a-f0-9]{32})$/i)
    if (dashMatch) return dashMatch[1]
    return null
  } catch {
    return null
  }
}

function formatPageId(raw: string): string {
  const clean = raw.replace(/-/g, "")
  if (clean.length !== 32) return clean
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length")
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }

    const rawBody = await request.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { url } = (body && typeof body === "object" ? body : {}) as { url?: unknown }

    if (!url || typeof url !== "string") {
      return NextResponse.json({ content: null, error: "URL is required" }, { status: 400 })
    }

    const pageId = extractPageId(url)
    if (!pageId) {
      return NextResponse.json(
        { content: null, error: "Could not parse a Notion page ID from this URL. Make sure you copied the full link." },
        { status: 400 }
      )
    }

    const formattedId = formatPageId(pageId)

    // Approach 1: Try the unofficial Notion API (notion.so/api/v3)
    let textParts: string[] = []

    try {
      const apiRes = await fetch("https://www.notion.so/api/v3/loadPageChunk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; PersonaAI/1.0)",
        },
        body: JSON.stringify({
          pageId: formattedId,
          limit: 100,
          cursor: { stack: [] },
          chunkNumber: 0,
          verticalColumns: false,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (apiRes.ok) {
        const data = await apiRes.json()
        const blocks = data?.recordMap?.block || {}

        for (const [, block] of Object.entries(blocks)) {
          const value = (block as { value?: { properties?: { title?: unknown[][] } } })?.value
          if (!value) continue
          const props = value.properties
          if (props?.title && Array.isArray(props.title)) {
            const text = props.title
              .map((seg: unknown[]) => (typeof seg[0] === "string" ? seg[0] : ""))
              .join("")
              .trim()
            if (text) textParts.push(text)
          }
        }
      }
    } catch {
      // API approach failed, try scraping
    }

    // Approach 2: If API approach returned nothing, try fetching the public HTML page
    if (textParts.length === 0) {
      try {
        const htmlRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PersonaAI/1.0)",
            "Accept": "text/html",
          },
          signal: AbortSignal.timeout(10000),
        })

        if (htmlRes.ok) {
          const html = await htmlRes.text()

          // Extract text from meta tags (most reliable for public pages)
          const descMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description|twitter:description)["']\s+content=["']([^"']+)["']/i)
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)

          // Extract text content from the page body
          // Remove script and style tags, then strip HTML
          let bodyText = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .trim()

          if (titleMatch) textParts.push(titleMatch[1].trim())
          if (descMatch) textParts.push(descMatch[1].trim())

          // Get meaningful text chunks (skip very short fragments)
          const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 20)
          textParts.push(...sentences.slice(0, 30).map((s) => s.trim()))
        }
      } catch {
        // HTML scrape also failed
      }
    }

    // Approach 3: Try notion.site URL format
    if (textParts.length === 0) {
      try {
        const siteUrl = `https://${pageId}.notion.site`
        const siteRes = await fetch(siteUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonaAI/1.0)", "Accept": "text/html" },
          signal: AbortSignal.timeout(8000),
          redirect: "follow",
        })

        if (siteRes.ok) {
          const html = await siteRes.text()
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
          if (titleMatch) textParts.push(titleMatch[1].trim())

          const bodyText = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()

          const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 20)
          textParts.push(...sentences.slice(0, 20).map((s) => s.trim()))
        }
      } catch {
        // All approaches failed
      }
    }

    // Deduplicate and clean
    const uniqueParts = [...new Set(textParts)].filter(
      (t) => t.length > 5 && !t.includes("notion.so") && !t.includes("Notion") && !t.includes("Log in")
    )
    const content = uniqueParts.join("\n\n").trim()

    if (!content) {
      return NextResponse.json({
        content: null,
        error: "Could not extract content from this page. Make sure the page is published publicly (Share > Publish to web).",
      })
    }

    return NextResponse.json({
      content,
      title: uniqueParts[0]?.substring(0, 100) || "Notion Page",
    })
  } catch (err) {
    const traceId = crypto.randomUUID()
    console.error(`[notion] error [${traceId}]:`, err)
    return NextResponse.json(
      { error: "Something went wrong", traceId },
      { status: 500 }
    )
  }
}
