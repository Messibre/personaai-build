import { describe, it, expect } from "vitest"
import { buildPortfolioHtml } from "../lib/templates"
import { maliciousPersona, alexChenPersona } from "../fixtures/personas"
import type { PortfolioConfig, TemplateStyle } from "../lib/types"

describe("Template Security against Malicious Persona", () => {
  const baseConfig: PortfolioConfig = {
    template: "bold-portrait",
    colorScheme: "ocean",
    sections: ["about", "skills", "projects", "experience", "github-stats", "contact"],
    socialLinks: {
      linkedin: "javascript:alert('linkedin-xss')",
      twitter: "https://twitter.com/valid",
      blog: "javascript:alert('blog-xss')",
    },
  }

  const templatesToTest: TemplateStyle[] = [
    "bold-portrait",
    "typographic",
    "split-editorial",
    "pastel-creative",
    "designer-coder",
    "minimal-clean",
    "brutalist",
    "glassmorphism",
    "terminal",
    "liquid-glass",
    "cyberpunk-noir",
    "bento-grid",
    "spotlight-dark",
    "swiss-editorial",
    "gradient-aurora",
  ]

  for (const template of templatesToTest) {
    it(`generates safe HTML without executing injected scripts in ${template}`, () => {
      const html = buildPortfolioHtml({
        profile: maliciousPersona.github.profile,
        repos: maliciousPersona.github.repos,
        resumeText: maliciousPersona.resumeText,
        notionContent: maliciousPersona.notionContent,
        config: { ...baseConfig, template },
        photoUrl: 'https://evil.example.com/avatar.jpg" onerror="alert(1)',
        aiBio: "Injected bio <script>alert(1)</script>",
        socialLinks: baseConfig.socialLinks,
      })

      // 1. Must not contain executable javascript: scheme in any attribute
      expect(html).not.toMatch(/href\s*=\s*["']\s*javascript:/i)
      expect(html).not.toMatch(/src\s*=\s*["']\s*javascript:/i)

      // 2. Must not contain unescaped onerror or onload handlers from injected attribute breakouts
      expect(html).not.toContain('onerror="alert(1)')
      expect(html).not.toContain('onerror="alert(\'xss-company\')')
      expect(html).not.toContain('onerror="alert(\'xss-avatar\')')
      expect(html).not.toContain("onload=alert('xss-location')")

      // 3. Script tags in data must be HTML-escaped, not raw
      expect(html).not.toContain("<script>alert('xss-name')</script>")
      expect(html).not.toContain("<script>alert('repo-desc')</script>")

      // 4. Injected project URL (javascript:alert(1)) must be sanitized to #
      expect(html).not.toContain('href="javascript:alert(1)"')

      // 5. Injected social links (javascript:alert('linkedin-xss')) must be sanitized to # or omitted
      expect(html).not.toContain('href="javascript:alert(\'linkedin-xss\')"')
    })
  }

  it("renders benign persona safely with proper links intact", () => {
    const html = buildPortfolioHtml({
      profile: alexChenPersona.github.profile,
      repos: alexChenPersona.github.repos,
      resumeText: alexChenPersona.resumeText,
      notionContent: alexChenPersona.notionContent,
      config: {
        template: "bold-portrait",
        colorScheme: "midnight",
        sections: ["about", "skills", "projects", "contact"],
        socialLinks: {
          blog: "https://alexchen.dev",
        },
      },
      photoUrl: alexChenPersona.github.profile.avatar_url,
      aiBio: "Creative technologist and frontend engineer.",
    })

    expect(html).toContain("https://github.com/alexchen-ui")
    expect(html).toContain("https://alexchen.dev")
    expect(html).toContain("Alex Chen")
    expect(html).toContain('id="main-content"')
  })
})
