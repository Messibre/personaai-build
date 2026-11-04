import type { Draft, Sentence } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import { e, safeUrl } from "@/lib/templates/shared/escape"
import { jobKeywordWords, keywordOverlap, skillMatchesKeywords, stableSortByScore } from "./keywords"

export const RESUME_LIMITS = {
  projectBullets: 3,
  roleBullets: 4,
  highlights: 6,
} as const

export interface ResumeLink {
  label: string
  url: string
}

export interface ResumeProject {
  projectId: string
  name: string
  url?: string
  bullets: string[]
}

export interface ResumeRole {
  company: string
  title: string
  dates?: string
  bullets: string[]
}

export interface ResumeEducation {
  institution: string
  degree?: string
  dates?: string
}

export interface ResumeModel {
  name: string
  email?: string
  links: ResumeLink[]
  jobTitle: string
  summary?: string
  highlights: string[]
  projects: ResumeProject[]
  experience: ResumeRole[]
  skills: string[]
  education: ResumeEducation[]
}

export interface BuildResumeModelInput {
  vault: Vault
  draft: Draft
  job: JobProfile
  picks: ProjectPick[]
}

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

function sentenceTexts(sentences: Sentence[], max: number): string[] {
  const texts: string[] = []
  for (const sentence of sentences) {
    const text = clean(sentence.text)
    if (text) texts.push(text)
    if (texts.length >= max) break
  }
  return texts
}

function validLink(input: string | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  return safeUrl(trimmed) === "#" ? null : trimmed
}

function linkLabel(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "")
}

function formatDates(start: string | undefined, end: string | undefined): string | undefined {
  const from = clean(start)
  const to = clean(end)
  if (from && to) return `${from} - ${to}`
  if (from) return `${from} - Present`
  if (to) return to
  return undefined
}

export function buildResumeModel({ vault, draft, job, picks }: BuildResumeModelInput): ResumeModel {
  const keywords = jobKeywordWords(job)

  const links: ResumeLink[] = []
  const seenLinks = new Set<string>()
  for (const link of vault.person.links) {
    const url = validLink(link)
    if (!url || seenLinks.has(url.toLowerCase())) continue
    seenLinks.add(url.toLowerCase())
    links.push({ label: linkLabel(url), url })
  }

  const draftProjects = new Map<string, Sentence[]>()
  for (const entry of draft.projects) {
    draftProjects.set(entry.projectId, [...(draftProjects.get(entry.projectId) ?? []), ...entry.sentences])
  }
  const projectsById = new Map(vault.projects.map((project) => [project.id, project]))
  const projects: ResumeProject[] = []
  const usedProjects = new Set<string>()
  for (const pick of picks) {
    if (usedProjects.has(pick.projectId)) continue
    usedProjects.add(pick.projectId)
    const project = projectsById.get(pick.projectId)
    if (!project) continue
    const bullets = sentenceTexts(draftProjects.get(pick.projectId) ?? [], RESUME_LIMITS.projectBullets)
    if (bullets.length === 0) continue
    projects.push({
      projectId: project.id,
      name: clean(project.name),
      url: validLink(project.url) ?? undefined,
      bullets,
    })
  }

  const experience: ResumeRole[] = vault.experience.map((role) => {
    const confirmed = role.facts.filter((fact) => fact.confirmed && clean(fact.text))
    const ordered = stableSortByScore(confirmed, (fact) => keywordOverlap(fact.text, keywords))
    return {
      company: clean(role.company),
      title: clean(role.title),
      dates: formatDates(role.start, role.end),
      bullets: ordered.slice(0, RESUME_LIMITS.roleBullets).map((fact) => clean(fact.text)),
    }
  })

  const seenSkills = new Set<string>()
  const confirmedSkills: string[] = []
  for (const skill of vault.skills) {
    const name = clean(skill.name)
    if (!skill.confirmed || !name || seenSkills.has(name.toLowerCase())) continue
    seenSkills.add(name.toLowerCase())
    confirmedSkills.push(name)
  }
  const skills = stableSortByScore(confirmedSkills, (name) => (skillMatchesKeywords(name, keywords) ? 1 : 0))

  const education: ResumeEducation[] = vault.education.map((item) => ({
    institution: clean(item.institution),
    degree: clean(item.degree) || undefined,
    dates: formatDates(item.start, item.end),
  }))

  return {
    name: clean(vault.person.name),
    email: clean(vault.person.email) || undefined,
    links,
    jobTitle: clean(job.title),
    summary: clean(draft.tagline) || undefined,
    highlights: sentenceTexts(draft.resumeBullets, RESUME_LIMITS.highlights),
    projects,
    experience,
    skills,
    education,
  }
}

const RESUME_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{font-size:11pt;-webkit-print-color-adjust:economy;print-color-adjust:economy}
body{margin:0;padding:0.6in;background:#fff;color:#000;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;line-height:1.4}
main{max-width:7in;margin:0 auto}
h1{font-size:1.9rem;line-height:1.15;margin:0 0 0.25rem}
h2{font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;margin:1.25rem 0 0.4rem;padding-bottom:0.15rem;border-bottom:1px solid #000}
h3{font-size:1rem;margin:0}
p{margin:0.2rem 0}
ul{margin:0.25rem 0 0.6rem;padding-left:1.1rem}
li{margin:0.15rem 0}
a{color:#000}
.contact{font-size:0.9rem}
.contact span+span::before{content:" | "}
.meta{font-size:0.9rem}
.role,.project,.education-item{break-inside:avoid;page-break-inside:avoid;margin-bottom:0.5rem}
.skills{margin:0}
@page{margin:0.6in}
@media print{
*{background:transparent!important;color:#000!important;box-shadow:none!important}
body{padding:0}
a{text-decoration:none}
}
`

function renderLink(url: string, label: string): string {
  return `<a href="${safeUrl(url)}" rel="noopener noreferrer">${e(label)}</a>`
}

function renderBullets(bullets: string[]): string {
  if (bullets.length === 0) return ""
  return `<ul>${bullets.map((bullet) => `<li>${e(bullet)}</li>`).join("")}</ul>`
}

export function buildResumeHtml(model: ResumeModel): string {
  const contact: string[] = []
  if (model.email) contact.push(`<span><a href="mailto:${e(model.email)}">${e(model.email)}</a></span>`)
  for (const link of model.links) contact.push(`<span>${renderLink(link.url, link.label)}</span>`)

  const sections: string[] = []

  if (model.summary) {
    sections.push(`<section><h2>Summary</h2><p>${e(model.summary)}</p></section>`)
  }

  if (model.highlights.length > 0) {
    sections.push(`<section><h2>Highlights</h2>${renderBullets(model.highlights)}</section>`)
  }

  if (model.projects.length > 0) {
    const items = model.projects.map((project) => {
      const heading = project.url ? renderLink(project.url, project.name) : e(project.name)
      return `<div class="project"><h3>${heading}</h3>${renderBullets(project.bullets)}</div>`
    })
    sections.push(`<section><h2>Projects</h2>${items.join("")}</section>`)
  }

  if (model.experience.length > 0) {
    const items = model.experience.map((role) => {
      const dates = role.dates ? `<p class="meta">${e(role.dates)}</p>` : ""
      return `<div class="role"><h3>${e(role.title)}, ${e(role.company)}</h3>${dates}${renderBullets(role.bullets)}</div>`
    })
    sections.push(`<section><h2>Experience</h2>${items.join("")}</section>`)
  }

  if (model.skills.length > 0) {
    sections.push(`<section><h2>Skills</h2><p class="skills">${model.skills.map(e).join(", ")}</p></section>`)
  }

  if (model.education.length > 0) {
    const items = model.education.map((item) => {
      const title = [item.degree, item.institution].filter(Boolean).map((part) => e(part)).join(", ")
      const dates = item.dates ? `<p class="meta">${e(item.dates)}</p>` : ""
      return `<div class="education-item"><h3>${title}</h3>${dates}</div>`
    })
    sections.push(`<section><h2>Education</h2>${items.join("")}</section>`)
  }

  const contactBlock = contact.length > 0 ? `<p class="contact">${contact.join("")}</p>` : ""

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${e(model.name)} - Resume</title>`,
    `<style>${RESUME_CSS}</style>`,
    "</head>",
    "<body>",
    `<main><header><h1>${e(model.name)}</h1>${contactBlock}</header>${sections.join("")}</main>`,
    "</body>",
    "</html>",
  ].join("\n")
}

export function buildResumePlainText(model: ResumeModel): string {
  const blocks: string[] = []

  const header = [model.name]
  const contact = [model.email, ...model.links.map((link) => link.url)].filter(Boolean)
  if (contact.length > 0) header.push(contact.join(" | "))
  blocks.push(header.join("\n"))

  if (model.summary) blocks.push(["SUMMARY", model.summary].join("\n"))

  if (model.highlights.length > 0) {
    blocks.push(["HIGHLIGHTS", ...model.highlights.map((bullet) => `- ${bullet}`)].join("\n"))
  }

  if (model.projects.length > 0) {
    const items = model.projects.map((project) =>
      [project.url ? `${project.name} (${project.url})` : project.name, ...project.bullets.map((bullet) => `- ${bullet}`)].join(
        "\n",
      ),
    )
    blocks.push(["PROJECTS", items.join("\n\n")].join("\n"))
  }

  if (model.experience.length > 0) {
    const items = model.experience.map((role) =>
      [
        `${role.title}, ${role.company}${role.dates ? ` (${role.dates})` : ""}`,
        ...role.bullets.map((bullet) => `- ${bullet}`),
      ].join("\n"),
    )
    blocks.push(["EXPERIENCE", items.join("\n\n")].join("\n"))
  }

  if (model.skills.length > 0) blocks.push(["SKILLS", model.skills.join(", ")].join("\n"))

  if (model.education.length > 0) {
    const items = model.education.map((item) => {
      const title = [item.degree, item.institution].filter(Boolean).join(", ")
      return item.dates ? `${title} (${item.dates})` : title
    })
    blocks.push(["EDUCATION", items.join("\n")].join("\n"))
  }

  return `${blocks.join("\n\n")}\n`
}
