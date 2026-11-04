import type { TemplateData } from "@/lib/templates/shared/types"
import type { AIProject, GitHubProfile, PortfolioConfig, SocialLinks } from "@/lib/types"
import type { Draft, Sentence } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"

export interface BuildTemplateDataInput {
  vault: Vault
  draft: Draft
  picks: ProjectPick[]
  config: PortfolioConfig
  /** Only the title is used; it becomes the "now" focus line. */
  job?: Pick<JobProfile, "title">
}

function joinSentences(sentences: Sentence[]): string {
  return sentences
    .map((sentence) => sentence.text.trim())
    .filter(Boolean)
    .join(" ")
}

function hostOf(link: string): string | null {
  try {
    return new URL(link).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

/** GitHub is represented by the profile; every other personal link lands in the first free slot. */
function toSocialLinks(links: string[]): SocialLinks {
  const social: SocialLinks = {}
  for (const link of links) {
    const host = hostOf(link)
    if (!host || host === "github.com") continue
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) social.linkedin ??= link
    else if (host === "twitter.com" || host === "x.com") social.twitter ??= link
    else if (host === "substack.com" || host.endsWith(".substack.com")) social.substack ??= link
    else social.blog ??= link
  }
  return social
}

function toProfile(vault: Vault): GitHubProfile {
  const username = vault.github?.username ?? ""
  return {
    username,
    name: vault.person.name,
    bio: null,
    avatar_url: "",
    followers: 0,
    following: 0,
    public_repos: 0,
    html_url: username ? `https://github.com/${encodeURIComponent(username)}` : "",
    location: null,
    blog: null,
    company: null,
  }
}

function toAIProjects(vault: Vault, draft: Draft, picks: ProjectPick[]): AIProject[] {
  const sentencesByProject = new Map(draft.projects.map((project) => [project.projectId, project.sentences]))
  const projects: AIProject[] = []
  const seen = new Set<string>()

  for (const pick of picks) {
    if (seen.has(pick.projectId)) continue
    const sentences = sentencesByProject.get(pick.projectId)
    const project = vault.projects.find((candidate) => candidate.id === pick.projectId)
    if (!sentences || !project) continue
    const description = joinSentences(sentences)
    if (!description) continue
    seen.add(pick.projectId)
    projects.push({
      name: project.name,
      url: project.url ?? "#",
      language: project.primaryLanguage ?? null,
      description,
      stars: project.stats?.stars ?? 0,
      forks: project.stats?.forks ?? 0,
    })
  }
  return projects
}

export function buildTemplateData({ vault, draft, picks, config, job }: BuildTemplateDataInput): TemplateData {
  const socialLinks = toSocialLinks(vault.person.links)
  const sections = vault.github ? [...config.sections] : config.sections.filter((section) => section !== "github-stats")
  const about = joinSentences(draft.about)
  const tagline = draft.tagline.trim()

  return {
    profile: toProfile(vault),
    repos: [],
    resumeText: null,
    aiResume: null,
    notionContent: null,
    config: { ...config, sections, socialLinks },
    photoUrl: null,
    aiBio: about || null,
    socialLinks,
    aiProjects: toAIProjects(vault, draft, picks),
    heroTagline: tagline || null,
    targetRole: job?.title ?? null,
  }
}
