import { describe, expect, it } from "vitest"
import type { BuildInput } from "./helpers"
import {
  FORBIDDEN_PHRASES,
  FORBIDDEN_TOKENS,
  TEMPLATES,
  renderTemplate,
  stripScriptsAndStyles,
  textContent,
} from "./helpers"

const SPARSE: BuildInput = {
  profile: {
    username: "sparse-user",
    name: null,
    bio: null,
    avatar_url: "",
    followers: 0,
    following: 0,
    public_repos: 2,
    html_url: "https://github.com/sparse-user",
    location: null,
    blog: null,
    company: null,
  },
  repos: [
    {
      name: "first-repo",
      description: null,
      language: null,
      stargazers_count: 0,
      forks_count: 0,
      html_url: "https://github.com/sparse-user/first-repo",
      fork: false,
      topics: [],
      homepage: null,
    },
    {
      name: "second-repo",
      description: null,
      language: "TypeScript",
      stargazers_count: 1,
      forks_count: 0,
      html_url: "https://github.com/sparse-user/second-repo",
      fork: false,
      topics: [],
      homepage: null,
    },
  ],
  resumeText: null,
  notionContent: null,
  photoUrl: null,
}

/** Sections whose only text is their heading(s). Innermost sections are checked first. */
function emptySectionShells(html: string): string[] {
  const shells: string[] = []
  let rest = html
  const innermost = /<section\b([^>]*)>((?:(?!<section\b)[\s\S])*?)<\/section>/i
  for (let match = innermost.exec(rest); match; match = innermost.exec(rest)) {
    const [whole, attrs, body] = match
    const withoutHeadings = body.replace(/<h[1-6]\b[\s\S]*?<\/h[1-6]>/gi, "")
    const hasMedia = /<(img|svg|canvas|video|iframe|form|input|a)\b/i.test(withoutHeadings)
    if (/<h[1-6]\b/i.test(body) && !hasMedia && textContent(withoutHeadings) === "") {
      shells.push(`<section${attrs}>: ${textContent(body).slice(0, 60)}`)
    }
    rest = rest.replace(whole, "")
  }
  return shells
}

describe("templates with missing data", () => {
  it("shell detector flags a heading-only section", () => {
    const html = '<section id="x"><div><h2>Writing</h2><div class="grid"></div></div></section><section><h2>About</h2><p>Hi</p></section>'
    expect(emptySectionShells(html)).toHaveLength(1)
  })

  for (const template of TEMPLATES) {
    it(template, () => {
      const visible = stripScriptsAndStyles(renderTemplate(SPARSE, template))

      expect(emptySectionShells(visible), "empty section shells").toEqual([])
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(visible, `contains "${phrase}"`).not.toContain(phrase)
      }
      for (const token of FORBIDDEN_TOKENS) {
        expect(visible, `contains ${token}`).not.toMatch(token)
      }
    })
  }
})
