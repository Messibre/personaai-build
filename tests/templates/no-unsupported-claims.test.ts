import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { BuildInput } from "./helpers"
import { TEMPLATES, renderTemplate, stripScriptsAndStyles, textContent } from "./helpers"

/** Claims the templates used to make without data to back them. See docs/template-audit.md. */
export const UNSUPPORTED_CLAIM_DENYLIST = [
  "Active",
  "Copy email",
  "noreply.github.com",
  "Worldwide",
  "Your University",
  "B.Sc.",
  "Bootcamp",
  "Self-taught",
  "Creative mind with an eye for detail",
  "Building robust, clean, and performant",
  "Missions Completed",
  "Recent Projects",
]

const FROZEN_NOW = new Date("2026-06-15T12:00:00Z")

const MINIMAL: BuildInput = {
  profile: {
    username: "sam-rivera",
    name: "Sam Rivera",
    bio: null,
    avatar_url: "",
    followers: 0,
    following: 0,
    public_repos: 0,
    html_url: "https://github.com/sam-rivera",
    location: null,
    blog: null,
    company: null,
  },
  repos: [
    {
      name: "route-planner",
      description: "Plans delivery routes.",
      language: null,
      stargazers_count: 0,
      forks_count: 0,
      html_url: "https://github.com/sam-rivera/route-planner",
      fork: false,
      topics: [],
      homepage: null,
    },
  ],
  resumeText: null,
  notionContent: null,
  photoUrl: null,
}

/** Numbers that may appear because the date is frozen (footer month/year, copyright). */
const ALLOWED_NUMBERS = new Set(["2026"])

/** Zero-padded section indexes ("01", "02") are layout numbering, not claims. */
const SECTION_INDEX = /^0\d$/

function visibleText(html: string): string {
  return textContent(stripScriptsAndStyles(html).replace(/&#\d+;|&#x[0-9a-f]+;/gi, " "))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

describe("no unsupported claims (minimal data: a name and one project)", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(FROZEN_NOW)
  })
  afterAll(() => {
    vi.useRealTimers()
  })

  for (const template of TEMPLATES) {
    describe(template, () => {
      const html = renderTemplate(MINIMAL, template)
      const visible = visibleText(html)

      it("contains none of the denylisted phrases", () => {
        for (const phrase of UNSUPPORTED_CLAIM_DENYLIST) {
          const asWord = new RegExp(`(^|[^A-Za-z])${escapeRegExp(phrase)}([^A-Za-z]|$)`)
          expect(asWord.test(visible) || html.includes(phrase) && phrase.includes("."), `"${phrase}" found`).toBe(false)
        }
      })

      it("shows no number that is not derived from the data", () => {
        const numbers = visible.match(/\d+/g) ?? []
        const stray = numbers.filter((n) => !ALLOWED_NUMBERS.has(n) && !SECTION_INDEX.test(n))
        expect(stray, `stray numbers: ${stray.join(", ")}`).toEqual([])
      })
    })
  }
})

describe("counters render only when the data supports them", () => {
  const WITH_DATA: BuildInput = {
    ...MINIMAL,
    profile: { ...MINIMAL.profile, followers: 4217, public_repos: 913 },
  }

  for (const template of ["bento-grid", "bold-portrait", "brutalist"] as const) {
    it(`${template} shows the followers count when it is above 0`, () => {
      const visible = visibleText(renderTemplate(WITH_DATA, template))
      expect(visible).toContain("4217")
      expect(visible).toContain("913")
    })
  }

  it("typographic shows the location only when given", () => {
    const withLocation = renderTemplate({ ...MINIMAL, profile: { ...MINIMAL.profile, location: "Lisbon" } }, "typographic")
    expect(visibleText(withLocation)).toContain("Lisbon")
  })
})
