import { describe, it, expect, vi } from "vitest"
import { extractPageId, POST as notionPost } from "../../app/api/notion/route"
import { isAllowedUrl, ALLOWED_DOMAINS, POST as aiContentPost } from "../../app/api/ai-content/route"

describe("Host Matching Security (SSRF Defense)", () => {
  describe("Notion Host Validation (extractPageId)", () => {
    it("accepts valid notion.so and notion.site pages", () => {
      const validSo = "https://notion.so/my-workspace/My-Page-1234567890abcdef1234567890abcdef"
      const validSubSo = "https://subdomain.notion.so/My-Page-1234567890abcdef1234567890abcdef"
      const validSite = "https://workspace.notion.site/My-Page-1234567890abcdef1234567890abcdef"
      const validBare = "notion.so/My-Page-1234567890abcdef1234567890abcdef"

      expect(extractPageId(validSo)).toBe("1234567890abcdef1234567890abcdef")
      expect(extractPageId(validSubSo)).toBe("1234567890abcdef1234567890abcdef")
      expect(extractPageId(validSite)).toBe("1234567890abcdef1234567890abcdef")
      expect(extractPageId(validBare)).toBe("1234567890abcdef1234567890abcdef")
    })

    it("rejects deceptive domain tricks and subdomains of attacker hosts", () => {
      // Suffix/prefix attacks that pass string .includes() checks
      expect(extractPageId("https://notion.so.attacker.com/My-Page-1234567890abcdef1234567890abcdef")).toBeNull()
      expect(extractPageId("https://evil-notion.so/My-Page-1234567890abcdef1234567890abcdef")).toBeNull()
      expect(extractPageId("https://notion.site.evil.com/My-Page-1234567890abcdef1234567890abcdef")).toBeNull()
      expect(extractPageId("https://fake-notion.site/My-Page-1234567890abcdef1234567890abcdef")).toBeNull()
      expect(extractPageId("https://notion.so@evil.com/My-Page-1234567890abcdef1234567890abcdef")).toBeNull()
    })

    it("rejects non-https schemes and invalid protocols", () => {
      expect(extractPageId("http://notion.so/My-Page-1234567890abcdef1234567890abcdef")).toBeNull()
      expect(extractPageId("javascript:alert(1)")).toBeNull()
      expect(extractPageId("file:///etc/passwd")).toBeNull()
      expect(extractPageId("data:text/html,evil")).toBeNull()
    })
  })

  describe("AI Content Scraper Host Validation (isAllowedUrl)", () => {
    it("confirms blog. and portfolio. are removed from ALLOWED_DOMAINS", () => {
      expect(ALLOWED_DOMAINS).not.toContain("blog.")
      expect(ALLOWED_DOMAINS).not.toContain("portfolio.")
    })

    it("accepts valid https URLs from allow-listed domains", () => {
      expect(isAllowedUrl("https://github.com/torvalds")).toBe(true)
      expect(isAllowedUrl("https://api.github.com/users")).toBe(true)
      expect(isAllowedUrl("https://linkedin.com/in/someone")).toBe(true)
      expect(isAllowedUrl("https://substack.com/@writer")).toBe(true)
      expect(isAllowedUrl("https://my-blog.substack.com/post")).toBe(true)
      expect(isAllowedUrl("https://notion.so/page")).toBe(true)
      expect(isAllowedUrl("https://team.notion.site/page")).toBe(true)
    })

    it("rejects domains that try to spoof or abuse string matching", () => {
      // Attacker domain ending with or containing allowed domain
      expect(isAllowedUrl("https://github.com.evil.com/payload")).toBe(false)
      expect(isAllowedUrl("https://evil-github.com/payload")).toBe(false)
      expect(isAllowedUrl("https://attacker-linkedin.com")).toBe(false)
      expect(isAllowedUrl("https://linkedin.com.attacker.com")).toBe(false)
      // Blog and portfolio prefixes on arbitrary sites are blocked
      expect(isAllowedUrl("https://blog.evil.com")).toBe(false)
      expect(isAllowedUrl("https://portfolio.attacker.io")).toBe(false)
      // Internal or metadata IP attacks
      expect(isAllowedUrl("https://169.254.169.254/latest/meta-data")).toBe(false)
      expect(isAllowedUrl("https://localhost:3000")).toBe(false)
    })

    it("rejects non-https URLs even if domain is in allow-list", () => {
      expect(isAllowedUrl("http://github.com/torvalds")).toBe(false)
      expect(isAllowedUrl("http://notion.so/page")).toBe(false)
      expect(isAllowedUrl("ftp://github.com/file")).toBe(false)
    })
  })

  describe("Request Body Size Limits (~1 MB)", () => {
    it("rejects bodies over 1 MB in /api/notion with HTTP 413", async () => {
      const largePayload = JSON.stringify({
        url: "https://notion.so/test-1234567890abcdef1234567890abcdef",
        padding: "x".repeat(1_050_000), // > 1 MB
      })

      const req = new Request("http://localhost:3000/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: largePayload,
      })

      const res = await notionPost(req)
      expect(res.status).toBe(413)
      const data = await res.json()
      expect(data.error).toBe("Payload too large")
    })

    it("rejects when Content-Length header exceeds 1 MB in /api/notion", async () => {
      const req = new Request("http://localhost:3000/api/notion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "2000000",
        },
        body: JSON.stringify({ url: "https://notion.so/test" }),
      })

      const res = await notionPost(req)
      expect(res.status).toBe(413)
    })

    it("rejects bodies over 1 MB in /api/ai-content with HTTP 413", async () => {
      const largePayload = JSON.stringify({
        targetRole: "Engineer",
        padding: "x".repeat(1_050_000),
      })

      const req = new Request("http://localhost:3000/api/ai-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: largePayload,
      })

      const res = await aiContentPost(req)
      expect(res.status).toBe(413)
      const data = await res.json()
      expect(data.error).toBe("Payload too large")
    })
  })

  describe("Error Sanitization & Trace ID Generation", () => {
    it("returns generic error and traceId with HTTP 500 when an unhandled error occurs in /api/notion", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      // Send a request where reading or parsing throws unexpectedly
      const brokenReq = {
        headers: { get: () => null },
        text: () => Promise.reject(new Error("Sensitive internal database connection error: password=secret123")),
      } as unknown as Request

      const res = await notionPost(brokenReq)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe("Something went wrong")
      expect(typeof data.traceId).toBe("string")
      expect(data.traceId.length).toBeGreaterThan(10)
      // Verify raw error was NOT leaked to the client
      expect(JSON.stringify(data)).not.toContain("Sensitive internal database")
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it("returns generic error and traceId with HTTP 500 when an unhandled error occurs in /api/ai-content", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const brokenReq = {
        headers: { get: () => null },
        text: () => Promise.reject(new Error("Critical Gemini API key leaked: AIzaSyD... in memory")),
      } as unknown as Request

      const res = await aiContentPost(brokenReq)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe("Something went wrong")
      expect(typeof data.traceId).toBe("string")
      expect(data.traceId.length).toBeGreaterThan(10)
      expect(JSON.stringify(data)).not.toContain("AIzaSyD")
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
