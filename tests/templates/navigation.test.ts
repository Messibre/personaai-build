import { describe, expect, it } from "vitest"
import { removeUnavailableSectionLinks } from "@/lib/templates/shared/navigation"
import { buildContact } from "@/lib/templates/shared/sections/contact"
import type { GitHubProfile } from "@/lib/types"

const profile: GitHubProfile = { username: "", name: "Alex", bio: null, avatar_url: "", followers: 0, following: 0, public_repos: 0, html_url: "", location: null, blog: null, company: null }

describe("sparse portfolio navigation", () => {
  it("removes missing section links but keeps rendered targets and external URLs", () => {
    const html = '<nav><a href="#experience">Experience</a><a href="#projects">Projects</a><a href="https://example.com">Site</a></nav><section id="projects"></section>'
    const result = removeUnavailableSectionLinks(html)
    expect(result).not.toContain('href="#experience"')
    expect(result).toContain('href="#projects"')
    expect(result).toContain('href="https://example.com"')
  })
  it("hides empty contacts and never produces a dead GitHub button", () => {
    expect(buildContact(profile, "#000000", {})).toBe("")
    const html = buildContact(profile, "#000000", { email: "alex@example.com" })
    expect(html).toContain("mailto:alex%40example.com")
    expect(html).not.toContain("View GitHub Profile")
    expect(html).not.toContain('href="#"')
  })
  it("does not turn unsafe URLs into contact controls", () => {
    expect(buildContact({ ...profile, html_url: "javascript:alert(1)" }, "#000000", { blog: "javascript:alert(2)" })).toBe("")
  })
})
