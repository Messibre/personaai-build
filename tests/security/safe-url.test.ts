import { describe, it, expect } from "vitest"
import { safeUrl, safeImageSrc, safeColor, getColorScheme, e } from "../../lib/templates"

describe("safeUrl", () => {
  it("blocks javascript: URLs regardless of case", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("#")
    expect(safeUrl("JaVaScRiPt:alert(1)")).toBe("#")
    expect(safeUrl("JAVASCRIPT:alert(1)")).toBe("#")
  })

  it("blocks data: URLs for links", () => {
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("#")
    expect(safeUrl("data:image/svg+xml;base64,PHN2Zw==")).toBe("#")
  })

  it("blocks non-https schemes (http:, file:, ftp:)", () => {
    expect(safeUrl("http://insecure.com")).toBe("#")
    expect(safeUrl("file:///etc/passwd")).toBe("#")
    expect(safeUrl("ftp://ftp.example.com")).toBe("#")
  })

  it("prevents attribute breakouts by escaping quotes and special characters", () => {
    const malicious = 'https://example.com/"onmouseover="alert(1)'
    const sanitized = safeUrl(malicious)
    expect(sanitized).not.toContain('"')
    expect(sanitized).not.toContain("'")
    expect(sanitized).not.toContain("<")
    expect(sanitized).not.toContain(">")
  })

  it("auto-prepends https:// to bare domains", () => {
    expect(safeUrl("mysite.com")).toBe("https://mysite.com/")
    expect(safeUrl("sub.domain.co.uk/path")).toBe("https://sub.domain.co.uk/path")
  })

  it("handles empty, invalid, and non-string inputs safely", () => {
    expect(safeUrl(undefined)).toBe("#")
    expect(safeUrl(null)).toBe("#")
    expect(safeUrl("")).toBe("#")
    expect(safeUrl("   ")).toBe("#")
    expect(safeUrl(12345)).toBe("#")
    expect(safeUrl({})).toBe("#")
  })

  it("preserves valid https URLs", () => {
    expect(safeUrl("https://github.com/developer/repo")).toBe("https://github.com/developer/repo")
    expect(safeUrl("https://example.com/profile?ref=dev#intro")).toBe("https://example.com/profile?ref=dev#intro")
  })
})

describe("safeImageSrc", () => {
  it("blocks SVG data URIs to prevent embedded script execution", () => {
    expect(safeImageSrc("data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+")).toBe("")
  })

  it("allows valid raster base64 data URIs under 3MB", () => {
    const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    expect(safeImageSrc(pngBase64)).toBe(pngBase64)
  })

  it("allows valid https image URLs", () => {
    expect(safeImageSrc("https://avatars.githubusercontent.com/u/10293847?v=4")).toBe(
      "https://avatars.githubusercontent.com/u/10293847?v=4"
    )
  })

  it("rejects malicious javascript: image sources", () => {
    expect(safeImageSrc("javascript:alert(1)")).toBe("")
  })

  it("handles non-string and empty inputs", () => {
    expect(safeImageSrc(undefined)).toBe("")
    expect(safeImageSrc(null)).toBe("")
    expect(safeImageSrc("")).toBe("")
  })
})

describe("safeColor and getColorScheme", () => {
  it("allows valid hex colors", () => {
    expect(safeColor("#0ea5e9")).toBe("#0ea5e9")
    expect(safeColor("#fff")).toBe("#fff")
    expect(safeColor("#11223344")).toBe("#11223344")
  })

  it("falls back to safe default on CSS injection attempt", () => {
    expect(safeColor("red; background: url(evil.com)")).toBe("#0ea5e9")
    expect(safeColor('"><script>alert(1)</script>')).toBe("#0ea5e9")
    expect(safeColor(null)).toBe("#0ea5e9")
  })

  it("resolves valid named color schemes safely", () => {
    const scheme = getColorScheme("midnight")
    expect(scheme.label).toBe("Midnight")
    expect(scheme.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it("falls back to default scheme on invalid scheme name", () => {
    const scheme = getColorScheme("malicious-custom-scheme")
    expect(scheme.label).toBe("Ocean")
    expect(scheme.accent).toBe("#38bdf8")
  })
})

describe("e (HTML escaping)", () => {
  it("escapes all HTML special characters including quotes", () => {
    expect(e('<script>alert("xss") & \'quote\'</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;quote&#39;&lt;/script&gt;"
    )
  })

  it("safely handles non-string inputs", () => {
    expect(e(null)).toBe("")
    expect(e(undefined)).toBe("")
    expect(e(123)).toBe("")
  })
})
