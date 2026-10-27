import { it, expect } from "vitest"
import { buildPortfolioHtml } from "../lib/templates"
import { ALL_SECTIONS } from "./templates/helpers"

const BASE = "http://localhost:3000"

it("github -> ai-content -> render -> deploy", async () => {
  const gh = await fetch(`${BASE}/api/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Messibre" }),
  })
  const github = await gh.json()
  console.log("github", gh.status, github.profile?.username, github.repos?.length)
  expect(gh.status).toBe(200)

  const ai = await fetch(`${BASE}/api/ai-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetRole: "Full Stack Developer", github }),
  })
  const content = await ai.json()
  console.log("ai-content", ai.status, "projects:", content.projects?.length, "| tagline:", content.heroTagline)
  console.log("aboutMe:", String(content.aboutMe).slice(0, 220))
  expect(ai.status).toBe(200)

  const html = buildPortfolioHtml({
    profile: github.profile,
    repos: github.repos,
    resumeText: null,
    notionContent: null,
    photoUrl: null,
    aiBio: content.aboutMe,
    aiProjects: content.projects,
    aiHeroTagline: content.heroTagline,
    socialLinks: {},
    config: { template: "bold-portrait", colorScheme: "ocean", sections: ALL_SECTIONS, socialLinks: {} },
  } as never)
  for (const fake of ["Stripe", "Shopify", "John Doe", "Jane Doe", "Lorem", "habitual over-committer", "800k developers"]) {
    expect(html.includes(fake), `found "${fake}"`).toBe(false)
  }
  console.log("html bytes", html.length)

  const dep = await fetch(`${BASE}/api/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, projectName: "personaai-e2e-check" }),
  })
  const deployed = await dep.json()
  console.log("deploy", dep.status, JSON.stringify(deployed))
  expect(dep.status).toBe(200)
  expect(deployed.url).toMatch(/^https:\/\//)

  const live = await fetch(deployed.url)
  const liveHtml = await live.text()
  console.log("live", live.status, liveHtml.includes(github.profile.name || github.profile.username))
  expect(live.status).toBe(200)
}, 180_000)
