import { buildPortfolioHtml } from "@/lib/templates"
import type { AIProject, SocialLinks, PortfolioConfig, ColorScheme, SectionId, TemplateStyle, GitHubProfile, GitHubRepo } from "@/lib/types"
import { getLLMClient } from "@/lib/llm"

// The design config AI picks from
interface AIDesignConfig {
  template: TemplateStyle
  colorScheme: ColorScheme
  heroTaglineOverride?: string
  aboutMeOverride?: string
  reasoning?: string
}

interface AITemplateRequest {
  targetRole: string
  name: string
  aboutMe: string
  heroTagline: string
  projects: AIProject[]
  skills: string[]
  photoUrl: string | null
  socialLinks: SocialLinks
  colorScheme: string // user's picked color, AI may override
  refinementPrompt?: string
  // For refinement: we re-run with a modified config
  currentTemplate?: TemplateStyle
  currentColorScheme?: ColorScheme
}

async function callGemini(prompt: string): Promise<string | null> {
  const client = getLLMClient()
  const result = await client.generate({
    system: `You are a creative director deciding the best visual design for a developer portfolio. 
You output ONLY a valid JSON object. No markdown, no backticks, no explanation. Just raw JSON.`,
    prompt,
    maxOutputTokens: 512,
    responseMimeType: "application/json",
  })

  if (result.ok) {
    const text = result.text.trim()
    if (text.length > 10) return text
  }
  return null
}

// Parse AI JSON, with a safe fallback
function parseDesignConfig(raw: string, fallbackColorScheme: string): AIDesignConfig {
  const VALID_TEMPLATES: TemplateStyle[] = [
    "bold-portrait", "typographic", "split-editorial", "pastel-creative",
    "designer-coder", "minimal-clean", "brutalist", "glassmorphism"
  ]
  const VALID_COLORS: ColorScheme[] = [
    "ocean", "sunset", "forest", "midnight", "ember", "arctic", "lavender", "rose"
  ]

  try {
    // Strip markdown fences if AI ignored instructions
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(cleaned)

    return {
      template: VALID_TEMPLATES.includes(parsed.template) ? parsed.template : "bold-portrait",
      colorScheme: VALID_COLORS.includes(parsed.colorScheme) ? parsed.colorScheme : (VALID_COLORS.includes(fallbackColorScheme as ColorScheme) ? fallbackColorScheme as ColorScheme : "midnight"),
      heroTaglineOverride: typeof parsed.heroTaglineOverride === "string" ? parsed.heroTaglineOverride : undefined,
      aboutMeOverride: typeof parsed.aboutMeOverride === "string" ? parsed.aboutMeOverride : undefined,
    }
  } catch {
    // Safe fallback
    return {
      template: "bold-portrait",
      colorScheme: VALID_COLORS.includes(fallbackColorScheme as ColorScheme) ? fallbackColorScheme as ColorScheme : "midnight",
    }
  }
}

// Build a minimal synthetic GitHubProfile from the AI request data
function buildSyntheticProfile(data: AITemplateRequest): GitHubProfile {
  return {
    username: data.name.toLowerCase().replace(/\s+/g, "-"),
    name: data.name,
    bio: data.aboutMe,
    avatar_url: data.photoUrl || "",
    followers: 0,
    following: 0,
    public_repos: data.projects.length,
    html_url: data.socialLinks?.blog || `https://github.com/${data.name.toLowerCase().replace(/\s+/g, "")}`,
    location: null,
    blog: data.socialLinks?.blog || null,
    company: null,
  }
}

// Build synthetic repos from AI projects
function buildSyntheticRepos(projects: AIProject[]): GitHubRepo[] {
  return projects.map(p => ({
    name: p.name,
    description: p.description,
    language: p.language,
    stargazers_count: p.stars,
    forks_count: p.forks,
    html_url: p.url,
    fork: false,
    topics: [],
    homepage: null,
  }))
}

export async function POST(request: Request) {
  try {
    const data: AITemplateRequest = await request.json()
    const { targetRole, name, aboutMe, heroTagline, projects, skills, colorScheme, refinementPrompt, currentTemplate, currentColorScheme } = data

    if (!name?.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 })
    }

    let designConfig: AIDesignConfig

    if (refinementPrompt && currentTemplate && currentColorScheme) {
      // Refinement: AI adjusts the design config based on the prompt
      const refinementAsk = `
Current portfolio design:
- Template: "${currentTemplate}"
- Color scheme: "${currentColorScheme}"

User wants to change: "${refinementPrompt}"

Available templates: bold-portrait, typographic, split-editorial, pastel-creative, designer-coder, minimal-clean, brutalist, glassmorphism
Available color schemes: ocean, sunset, forest, midnight, ember, arctic, lavender, rose

Output a JSON object with exactly these fields (only change what the user asked for, keep the rest):
{
  "template": "<template id>",
  "colorScheme": "<color scheme id>",
  "heroTaglineOverride": "<optional: new tagline if user asked to change wording>",
  "aboutMeOverride": "<optional: new about me if user asked to change wording>"
}`

      const raw = await callGemini(refinementAsk)
      designConfig = parseDesignConfig(raw || "{}", currentColorScheme)
    } else {
      // Fresh generation: AI picks the best template + color for this role
      const generationAsk = `
You are choosing the best visual design for a developer portfolio.

Person: ${name}
Target role: ${targetRole}
Skills: ${skills.slice(0, 8).join(", ") || "Software development"}
Projects: ${projects.slice(0, 3).map(p => p.name).join(", ") || "Various projects"}
Current tagline: "${heroTagline}"
Bio summary: "${aboutMe.slice(0, 200)}"

Available templates and when to use them:
- "bold-portrait" → Strong personal brand, senior devs, anyone with a photo
- "typographic" → Writers, minimalists, text-focused devs
- "split-editorial" → Designers, creatives, design engineers
- "pastel-creative" → Frontend/UI devs, creative coders, artists
- "designer-coder" → Full-stack, devs who code AND design
- "minimal-clean" → Backend, ML/AI engineers, researchers who prefer minimal
- "brutalist" → Systems programmers, hackers, unconventional thinkers
- "glassmorphism" → Mobile devs, modern web, AI/ML, anyone with a sleek aesthetic

Available color schemes:
- "ocean" → blue tones, trustworthy
- "sunset" → orange, energetic, startup energy
- "forest" → green, growth, sustainability
- "midnight" → indigo/purple, technical depth
- "ember" → red, bold, passionate
- "arctic" → cyan, modern, clean
- "lavender" → purple, creative, design-forward
- "rose" → pink-red, bold, distinctive

User's preferred color: "${colorScheme}" (use it unless a different one is dramatically better)

Pick the best template and color for this person's role and vibe. Also write an improved tagline and about me if you can make them better.

Output ONLY this JSON (no markdown, no backticks, no extra text):
{
  "template": "<template id>",
  "colorScheme": "<color scheme id>",
  "heroTaglineOverride": "<rewritten tagline, punchy 1 line, or omit if original is good>",
  "aboutMeOverride": "<rewritten about me, max 2 sentences, professional tone, or omit if original is good>",
  "reasoning": "<1 sentence explaining your pick>"
}`

      const raw = await callGemini(generationAsk)
      designConfig = parseDesignConfig(raw || "{}", colorScheme)
    }

    // Build the full portfolio using the existing template system
    const profile = buildSyntheticProfile(data)
    const repos = buildSyntheticRepos(projects)

    const config: PortfolioConfig = {
      template: designConfig.template,
      colorScheme: designConfig.colorScheme,
      sections: ["about", "skills", "projects", "contact"] as SectionId[],
      socialLinks: data.socialLinks,
      useAITemplate: true,
    }

    const html = buildPortfolioHtml({
      profile,
      repos,
      resumeText: null,
      notionContent: null,
      config,
      photoUrl: data.photoUrl,
      aiBio: designConfig.aboutMeOverride || aboutMe,
      socialLinks: data.socialLinks,
      aiProjects: projects,
      heroTagline: designConfig.heroTaglineOverride || heroTagline,
      targetRole,
    })

    return Response.json({
      html,
      designConfig: {
        template: designConfig.template,
        colorScheme: designConfig.colorScheme,
        reasoning: designConfig.reasoning,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate template"
    return Response.json({ error: message }, { status: 500 })
  }
}
