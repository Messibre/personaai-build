import type { GitHubProfile, GitHubRepo, PortfolioConfig, AIProject, AIGeneratedContent } from "@/lib/types"
import { buildPortfolioHtml } from "@/lib/templates"
import { getLLMClient } from "@/lib/llm"

interface GenerateRequest {
  github: {
    profile: GitHubProfile | null
    repos: GitHubRepo[]
  }
  resumeText: string | null
  notionContent: string | null
  config: PortfolioConfig
  photoDataUrl: string | null
  aiContent: AIGeneratedContent | null
  targetRole: string | null
}

async function getAiBio(profile: GitHubProfile, repos: GitHubRepo[], resumeText: string | null, notionContent: string | null, additionalPrompt?: string): Promise<string | null> {
  const langs = [...new Set(repos.map((r) => r.language).filter(Boolean))].slice(0, 6)
  const prompt = `Write a compelling 2-3 sentence professional bio for a developer portfolio. Be concise, confident, and write in first person.

Name: ${profile.name || profile.username}
Bio: ${profile.bio || "N/A"}
${profile.company ? `Role: ${profile.company}` : ""}
Languages: ${langs.join(", ") || "Various"}
Repos: ${profile.public_repos}
${resumeText ? `Resume excerpt: ${resumeText.substring(0, 3000)}` : ""}
${notionContent ? `Additional context: ${notionContent.substring(0, 2000)}` : ""}
${additionalPrompt ? `User instructions: ${additionalPrompt}` : ""}

Output ONLY the bio text, no quotes, no labels.`

  const client = getLLMClient()
  const result = await client.generate({
    prompt,
    maxOutputTokens: 500,
  })

  if (result.ok) {
    const text = result.text.trim()
    if (text.length > 20) return text
  }

  return null
}

/** Build real-feeling project descriptions from raw GitHub repo metadata. */
function buildFallbackProjects(repos: GitHubRepo[]): AIProject[] {
  return repos
    .filter((r) => !r.fork)
    .slice(0, 7)
    .map((r) => {
      const lang = r.language || null
      const topics = (r.topics || []).slice(0, 3)
      const desc = r.description?.trim()

      let text: string
      if (desc && desc.length > 20) {
        // Real description exists — enrich with topics/language if short
        text = desc.endsWith(".") ? desc : `${desc}.`
        if (topics.length > 0) {
          text += ` Built with ${[lang, ...topics].filter(Boolean).join(", ")}.`
        }
      } else if (topics.length >= 2) {
        text = `A ${lang || "software"} project covering ${topics.slice(0, 2).join(" and ")}${topics[2] ? ` and ${topics[2]}` : ""}.`
        if (r.stargazers_count > 0) text += ` Has ${r.stargazers_count} stars on GitHub.`
      } else if (lang) {
        text = `An open-source ${lang} project${topics.length ? ` focused on ${topics[0]}` : ""}. View the full source on GitHub.`
      } else {
        text = "An open-source project. View the full source and documentation on GitHub."
      }

      return {
        name: r.name,
        url: r.html_url,
        language: lang,
        description: text,
        stars: r.stargazers_count,
        forks: r.forks_count,
      }
    })
}

/** Build a real-feeling about-me from profile fields when Gemini is unavailable. */
function buildFallbackAboutMe(profile: GitHubProfile, repos: GitHubRepo[]): string {
  const name = profile.name || profile.username
  const langs = [...new Set(repos.filter((r) => !r.fork && r.language).map((r) => r.language as string))].slice(0, 3)
  const topRepo = repos.filter((r) => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count)[0]
  const repoCount = profile.public_repos || repos.length

  if (profile.bio && profile.bio.length > 30) {
    // Use their own GitHub bio as the base and extend it
    return `${profile.bio.endsWith(".") ? profile.bio : `${profile.bio}.`}${langs.length ? ` I primarily work in ${langs.join(", ")}.` : ""} I have ${repoCount} public repositories on GitHub${topRepo && topRepo.stargazers_count > 1 ? `, including ${topRepo.name} which has earned ${topRepo.stargazers_count} stars` : ""}.`
  }

  const bios = [
    `I'm ${name}, a software developer with ${repoCount} public projects on GitHub.${langs.length ? ` Most of my work is in ${langs.join(", ")}.` : ""}${topRepo ? ` My most recognised project is ${topRepo.name}.` : ""} I care about writing code that is clear, well-tested, and easy to maintain.`,
    `Software developer with a focus on ${langs[0] || "building"} ${langs[1] ? `and ${langs[1]} ` : ""}projects.${topRepo && topRepo.stargazers_count > 1 ? ` ${topRepo.name} is one of my most-starred open-source contributions.` : ""} I enjoy turning well-defined problems into reliable, readable code.`,
    `I build software${langs.length ? ` in ${langs.join(", ")}` : ""} and share most of it publicly on GitHub. With ${repoCount} repositories, my work spans${topRepo ? ` from ${topRepo.name}` : ""} to side experiments and tooling that scratches a personal itch. I value clean interfaces and clear documentation.`,
    `${name} here — developer, open-source contributor, and habitual over-committer.${langs.length ? ` I spend most of my time in ${langs.slice(0, 2).join(" and ")}.` : ""} I believe the best code is the code you don't have to explain twice.`,
    `I'm a developer who enjoys working across the full stack${langs.length ? `, primarily with ${langs.join(", ")}` : ""}. I have ${repoCount} projects on GitHub and I'm always looking for interesting problems to solve with well-crafted software.`,
  ]

  // Pick deterministically based on username so the same person always gets the same bio
  const index = (profile.username?.charCodeAt(0) ?? 0) % bios.length
  return bios[index]
}

export async function POST(request: Request) {
  try {
    const data: GenerateRequest = await request.json()

    // Need at least a profile (from github, notion+manual, or manual)
    if (!data.github?.profile) {
      return Response.json({ error: "Profile data is required. Please go back and enter your info." }, { status: 400 })
    }

    // Use AI-generated content if available, otherwise fall back to generating a bio
    let aiBio: string | null = null
    let aiProjects: AIProject[] | null = null
    let heroTagline: string | null = null

    if (data.aiContent?.aboutMe) {
      aiBio = data.aiContent.aboutMe
      heroTagline = data.aiContent.heroTagline || null
      aiProjects = data.aiContent.projects || null
    } else {
      // Fall back to bio generation + build project descriptions from real repo metadata
      const geminiBio = await getAiBio(data.github.profile, data.github.repos || [], data.resumeText, data.notionContent, data.config.additionalPrompt)
      aiBio = geminiBio || buildFallbackAboutMe(data.github.profile, data.github.repos || [])
      aiProjects = buildFallbackProjects(data.github.repos || [])
    }

    const html = buildPortfolioHtml({
      profile: data.github.profile,
      repos: data.github.repos || [],
      resumeText: data.resumeText,
      notionContent: data.notionContent,
      config: data.config,
      photoUrl: data.photoDataUrl || null,
      aiBio,
      socialLinks: data.config.socialLinks,
      aiProjects,
      aiResume: (data.aiContent as { resume?: { summary?: string; highlights?: string[] } } | null)?.resume || undefined,
      heroTagline,
      targetRole: data.targetRole,
    })

    return Response.json({ html, title: `${data.github.profile.name || data.github.profile.username} - Portfolio` })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate portfolio"
    return Response.json({ error: message }, { status: 500 })
  }
}
