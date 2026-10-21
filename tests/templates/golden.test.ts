import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { buildPortfolioHtml } from "../../lib/templates"
import { personas, type PersonaId } from "../../fixtures/personas"
import type { PortfolioConfig, SectionId, TemplateStyle } from "../../lib/types"

const GOLDEN_PATH = path.join(import.meta.dirname, "golden.json")
const UPDATE = process.env.UPDATE_GOLDEN === "1"

// Footers render "Updated <Month Year>" and "© <year>"; freeze the clock so hashes are stable.
// Mid-month at noon UTC keeps the rendered month identical in every timezone.
const FROZEN_NOW = new Date("2026-06-15T12:00:00Z")

const TEMPLATES: TemplateStyle[] = [
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

const ALL_SECTIONS: SectionId[] = [
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

const PERSONA_IDS = Object.keys(personas) as PersonaId[]

function render(personaId: PersonaId, template: TemplateStyle): string {
  const persona = personas[personaId]
  const config: PortfolioConfig = {
    template,
    colorScheme: "ocean",
    sections: ALL_SECTIONS,
    socialLinks: {},
  }
  return buildPortfolioHtml({
    profile: persona.github.profile,
    repos: persona.github.repos,
    resumeText: persona.resumeText,
    notionContent: persona.notionContent,
    config,
    photoUrl: persona.github.profile.avatar_url,
    aiBio: null,
    socialLinks: {},
  })
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function readGolden(): Record<string, string> {
  if (!fs.existsSync(GOLDEN_PATH)) return {}
  return JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8")) as Record<string, string>
}

describe("template golden output", () => {
  const golden = readGolden()
  const computed: Record<string, string> = {}

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(FROZEN_NOW)
  })

  afterAll(() => {
    vi.useRealTimers()
    if (UPDATE) {
      const sorted = Object.fromEntries(Object.entries(computed).sort(([a], [b]) => a.localeCompare(b)))
      fs.writeFileSync(GOLDEN_PATH, `${JSON.stringify(sorted, null, 2)}\n`)
    }
  })

  for (const personaId of PERSONA_IDS) {
    for (const template of TEMPLATES) {
      const key = `${personaId}/${template}`
      it(key, () => {
        const hash = sha256(render(personaId, template))
        computed[key] = hash
        if (!UPDATE) expect(hash, `golden hash for ${key}`).toBe(golden[key])
      })
    }
  }
})
