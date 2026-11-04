import { describe, expect, it } from "vitest"
import type { BuildInput } from "./helpers"
import { TEMPLATES, renderTemplate } from "./helpers"

const MARKERS = {
  name: "MkName7q",
  bio: "MkBio7q",
  location: "MkLocation7q",
  company: "MkCompany7q",
  repoName: "mkrepo7q",
  description: "MkDescription7q",
  topic: "mktopic7q",
}

const MARKED: BuildInput = {
  profile: {
    username: "marker-user",
    name: `Ada ${MARKERS.name}`,
    bio: `Builds things ${MARKERS.bio}`,
    avatar_url: "https://avatars.githubusercontent.com/u/1",
    followers: 3,
    following: 1,
    public_repos: 2,
    html_url: "https://github.com/marker-user",
    location: `Addis ${MARKERS.location}`,
    blog: null,
    company: `Acme ${MARKERS.company}`,
  },
  repos: [1, 2].map((i) => ({
    name: `${MARKERS.repoName}-${i}`,
    description: `A tool ${MARKERS.description}`,
    language: "TypeScript",
    stargazers_count: i,
    forks_count: 0,
    html_url: `https://github.com/marker-user/${MARKERS.repoName}-${i}`,
    fork: false,
    topics: [`${MARKERS.topic}-${i}`],
    homepage: null,
  })),
  resumeText: `${MARKERS.name} resume ${MARKERS.company}`,
  notionContent: null,
  photoUrl: "https://avatars.githubusercontent.com/u/1",
}

function styleContexts(html: string): string[] {
  const blocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])
  const attrs = [...html.matchAll(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)].map((m) => m[1])
  return [...blocks, ...attrs]
}

describe("user data never reaches style contexts", () => {
  for (const template of TEMPLATES) {
    it(template, () => {
      const html = renderTemplate(MARKED, template)
      const contexts = styleContexts(html).map((c) => c.toLowerCase())
      expect(contexts.length, "template has style contexts to inspect").toBeGreaterThan(0)
      expect(html.toLowerCase(), "markers reach the output, so the check is meaningful").toContain(
        MARKERS.repoName,
      )

      for (const [field, marker] of Object.entries(MARKERS)) {
        const leaked = contexts.find((c) => c.includes(marker.toLowerCase()))
        expect(leaked, `${field} marker inside a style context`).toBeUndefined()
      }
    })
  }
})
