export function e(str: unknown): string {
  if (typeof str !== "string") return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export const DATA_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/

export function safeUrl(input: unknown): string {
  if (typeof input !== "string") return "#"
  let raw = input.trim()
  if (!raw) return "#"
  // blog fields often come without a scheme ("mysite.com")
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = "https://" + raw
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") return "#" // blocks javascript:, data:, file:, http:
    return e(url.href) // escape again for safety
  } catch {
    return "#"
  }
}

export function safeImageSrc(input: unknown): string {
  if (typeof input !== "string") return ""
  const v = input.trim()
  if (v.length < 3_000_000 && DATA_IMAGE.test(v)) return e(v) // uploaded photo
  const u = safeUrl(v)
  return u === "#" ? "" : u // GitHub avatar etc.
}

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/

export function safeColor(color: unknown, fallback = "#0ea5e9"): string {
  if (typeof color === "string" && HEX_COLOR_REGEX.test(color.trim())) {
    return color.trim()
  }
  return fallback
}

/** Strip common markdown syntax so raw README text renders cleanly as plain text */
export function stripMd(text: string): string {
  if (!text) return text
  return text
    .replace(/^#{1,6}\s+/gm, "")          // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")       // bold
    .replace(/\*(.+?)\*/g, "$1")           // italic
    .replace(/__(.+?)__/g, "$1")           // bold alt
    .replace(/_(.+?)_/g, "$1")             // italic alt
    .replace(/`{1,3}[^`]*`{1,3}/g, "")    // inline code / code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label only
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // images
    .replace(/^[-*+]\s+/gm, "")           // unordered list bullets
    .replace(/^\d+\.\s+/gm, "")           // ordered list numbers
    .replace(/^>\s+/gm, "")               // blockquotes
    .replace(/^-{3,}$/gm, "")             // horizontal rules
    .replace(/\n{3,}/g, "\n\n")           // excess blank lines
    .trim()
    .split("\n")[0]                        // keep only the first meaningful line
    .trim()
}
