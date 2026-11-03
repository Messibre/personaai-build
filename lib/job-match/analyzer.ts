import skills from "./skills.json"
import type { JobAnalysis, JobRequirement, JobRoleType } from "./types"

type Skill = (typeof skills)[number]

const REQUIRED = /^(requirements?|qualifications?|what you(?:'ll)? need|must[- ]have|who you are|minimum)/i
const PREFERRED = /^(nice[- ]to[- ]have|preferred|bonus|plus|a plus|ideally|bonus points)/i
const RESPONSIBILITIES = /^(responsibilities|what you(?:'ll)? do|the role|you will)/i
const BOILERPLATE = /^(benefits?|perks?|equal employment|eeo|about (?:us|the company)|salary|compensation|legal|privacy)/i

function clean(text: string): string {
  return text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\r/g, "").replace(/[•●▪]/g, "-").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n").trim().slice(0, 15000)
}

function sentenceLines(text: string): string[] {
  return text.split(/\n|(?<=[.!?])\s+/).map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean)
}

function matchesFor(line: string): Skill[] {
  const source = line.toLowerCase()
  return skills.filter((skill) => skill.aliases.some((alias) => {
    const value = alias.toLowerCase()
    if (value.length < 3 && !["go", "c++", "c#"].includes(value)) return false
    const pattern = new RegExp(`(?<![a-z0-9+#.])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9+#])`, "i")
    return pattern.test(source) && (value !== "go" || /\b(golang|programming|language|experience)\b/i.test(source))
  }))
}

function roleType(text: string, title: string): { roleType: JobRoleType; margin: number } {
  const scores: Record<JobRoleType, number> = { frontend: 0, "ux-engineer": 0, "ai-ml": 0, fullstack: 0, backend: 0, devops: 0, mobile: 0, other: 0 }
  const categories: Record<Exclude<JobRoleType, "other">, string[]> = {
    frontend: ["frontend", "front-end", "react", "vue", "css", "web"],
    "ux-engineer": ["ux", "user experience", "design system", "figma", "accessibility"],
    "ai-ml": ["machine learning", "ai", "ml", "llm", "tensorflow", "pytorch"],
    fullstack: ["fullstack", "full-stack"],
    backend: ["backend", "back-end", "api", "server", "database"],
    devops: ["devops", "infrastructure", "kubernetes", "cloud", "sre"],
    mobile: ["mobile", "ios", "android", "react native"],
  }
  for (const [type, terms] of Object.entries(categories) as Array<[Exclude<JobRoleType, "other">, string[]]>) {
    scores[type] = terms.reduce((score, term) => score + (title.toLowerCase().includes(term) ? 3 : 0) + (text.toLowerCase().split(term).length - 1), 0)
  }
  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return { roleType: ordered[0][1] > 0 ? ordered[0][0] as JobRoleType : "other", margin: ordered[0][1] - ordered[1][1] }
}

export function analyzeJob(jobText: string): JobAnalysis {
  const text = clean(jobText)
  const lines = sentenceLines(text)
  const title = lines[0]?.slice(0, 160) || "Job opportunity"
  const requirements = new Map<string, JobRequirement>()
  let section: "must" | "nice" | "responsibility" | "other" = "other"
  for (const line of lines) {
    if (REQUIRED.test(line)) { section = "must"; continue }
    if (PREFERRED.test(line)) { section = "nice"; continue }
    if (RESPONSIBILITIES.test(line)) { section = "responsibility"; continue }
    if (BOILERPLATE.test(line)) { section = "other"; continue }
    const found = matchesFor(line)
    for (const skill of found) {
      const soft = /preferred|bonus|familiarity|nice to have|a plus|ideally/i.test(line)
      const tier = soft || section === "nice" ? "nice" : section === "must" || section === "responsibility" || (line.length < text.length / 3) ? "must" : "nice"
      const current = requirements.get(skill.id)
      if (!current || (tier === "must" && current.tier === "nice")) {
        requirements.set(skill.id, { skillId: skill.id, label: skill.name, aliases: skill.aliases.slice(0, 5), tier, quote: line.slice(0, 500), confidence: section === "other" ? 0.65 : 0.9 })
      }
    }
  }
  const all = [...requirements.values()]
  const role = roleType(text, title)
  const values = ["accessibility", "performance", "design systems", "shipping", "research", "evaluation", "scale"].filter((value) => text.toLowerCase().includes(value))
  return { roleTitle: title, roleType: role.roleType, roleMargin: role.margin, mustHaveRequirements: all.filter((item) => item.tier === "must"), niceToHaveRequirements: all.filter((item) => item.tier === "nice"), values }
}
