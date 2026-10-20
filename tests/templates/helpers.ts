import { buildPortfolioHtml } from "../../lib/templates"
import type { TemplateData } from "../../lib/templates/shared/types"
import type { GitHubProfile, GitHubRepo, SectionId, TemplateStyle } from "../../lib/types"

export const TEMPLATES: TemplateStyle[] = [
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

export const ALL_SECTIONS: SectionId[] = [
  "about",
  "skills",
  "projects",
  "experience",
  "github-stats",
  "testimonials",
  "contact",
  "now",
  "education",
  "writing",
]

export type BuildInput = {
  profile: GitHubProfile
  repos: GitHubRepo[]
  resumeText: string | null
  notionContent: string | null
  photoUrl: string | null
}

export function renderTemplate(input: BuildInput, template: TemplateStyle): string {
  const data: TemplateData = {
    ...input,
    config: { template, colorScheme: "ocean", sections: ALL_SECTIONS, socialLinks: {} },
    aiBio: null,
    socialLinks: {},
  }
  return buildPortfolioHtml(data)
}

export function stripScriptsAndStyles(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "")
}

/** Visible-text approximation: drops tags and decodes the few entities the escaper emits. */
export function textContent(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/** Phrases from Section 4 of the spec that must never reach generated output. */
export const FORBIDDEN_PHRASES = [
  "Lorem",
  "placeholder",
  "Replace these",
  "Update this section",
  "Available for hire",
  "Open to relocation",
  "Team Lead",
  "John Doe",
  "Jane Doe",
  "[object Object]",
]

/** Leaked JS values; matched as whole words so real words like "nullable" don't trip them. */
export const FORBIDDEN_TOKENS = [/\bundefined\b/, /\bnull\b/, /\bNaN\b/]
