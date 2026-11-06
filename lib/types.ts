export interface GitHubProfile {
  username: string
  name: string | null
  bio: string | null
  avatar_url: string
  followers: number
  following: number
  public_repos: number
  html_url: string
  location: string | null
  blog: string | null
  company: string | null
}

export interface GitHubRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  html_url: string
  fork: boolean
  topics: string[]
  homepage: string | null
}

export interface EnrichedGitHubRepo extends GitHubRepo {
  readmeText: string
  detectedTech: string
}

export interface ResumeData {
  raw_text: string
}

export interface NotionData {
  content: string | null
  title?: string
  error?: string
}

export type TemplateStyle =
  | "bold-portrait"
  | "typographic"
  | "split-editorial"
  | "pastel-creative"
  | "designer-coder"
  | "minimal-clean"
  | "brutalist"
  | "glassmorphism"
  | "terminal"
  | "liquid-glass"
  | "cyberpunk-noir"
  | "bento-grid"
  | "spotlight-dark"
  | "swiss-editorial"
  | "gradient-aurora"

export type ColorScheme =
  | "ocean"
  | "sunset"
  | "forest"
  | "midnight"
  | "ember"
  | "arctic"
  | "lavender"
  | "rose"

export const COLOR_SCHEMES: Record<ColorScheme, { label: string; primary: string; secondary: string; accent: string }> = {
  ocean: { label: "Ocean", primary: "#0ea5e9", secondary: "#0284c7", accent: "#38bdf8" },
  sunset: { label: "Sunset", primary: "#f97316", secondary: "#ea580c", accent: "#fb923c" },
  forest: { label: "Forest", primary: "#22c55e", secondary: "#16a34a", accent: "#4ade80" },
  midnight: { label: "Midnight", primary: "#6366f1", secondary: "#4f46e5", accent: "#818cf8" },
  ember: { label: "Ember", primary: "#ef4444", secondary: "#dc2626", accent: "#f87171" },
  arctic: { label: "Arctic", primary: "#06b6d4", secondary: "#0891b2", accent: "#22d3ee" },
  lavender: { label: "Lavender", primary: "#a855f7", secondary: "#9333ea", accent: "#c084fc" },
  rose: { label: "Rose", primary: "#f43f5e", secondary: "#e11d48", accent: "#fb7185" },
}

export const TEMPLATE_OPTIONS: {
  id: TemplateStyle
  label: string
  description: string
  inspiration: string
}[] = [
  {
    id: "bold-portrait",
    label: "Bold Portrait",
    description: "Full-screen photo hero with massive typography overlay and stats counters",
    inspiration: "hello-hero",
  },
  {
    id: "typographic",
    label: "Typographic",
    description: "Oversized text behind your portrait, minimal white-space driven layout",
    inspiration: "bazil",
  },
  {
    id: "split-editorial",
    label: "Split Editorial",
    description: "Dark/light split layout with dramatic B&W portrait, editorial magazine feel",
    inspiration: "branding",
  },
  {
    id: "pastel-creative",
    label: "Pastel Creative",
    description: "Soft color blocks, playful contemporary card-based project showcase",
    inspiration: "leslie",
  },
  {
    id: "designer-coder",
    label: "Designer & Coder",
    description: "Half design, half code split concept with colorful portrait center-stage",
    inspiration: "split-designer",
  },
  {
    id: "minimal-clean",
    label: "Minimal Clean",
    description: "Ultra-clean whitespace, refined typography, subtle grid and elegant details",
    inspiration: "minimal",
  },
  {
    id: "brutalist",
    label: "Brutalist",
    description: "Raw, high-contrast, bold borders and oversized typography — unapologetically loud",
    inspiration: "brutalist",
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    description: "Frosted glass cards over vivid blurred gradients — sleek and futuristic",
    inspiration: "glass",
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Command-line aesthetic with monospace fonts, dark background, and syntax-highlighted blocks",
    inspiration: "terminal",
  },
  {
    id: "liquid-glass",
    label: "Liquid Glass",
    description: "Animated floating orbs with ultra-refined backdrop-blur glass cards — polished and modern",
    inspiration: "liquid-glass",
  },
  {
    id: "cyberpunk-noir",
    label: "Cyberpunk Noir",
    description: "Glitch typography, scan lines, corner brackets and neon accents — dark and cinematic",
    inspiration: "cyberpunk",
  },
  {
    id: "bento-grid",
    label: "Bento Grid",
    description: "Mosaic of asymmetric cards — photo, bio, stats, and projects in one visual overview",
    inspiration: "bento",
  },
  {
    id: "spotlight-dark",
    label: "Spotlight Dark",
    description: "Cursor-following radial spotlight on deep black, with a numbered project list — focused and elegant",
    inspiration: "spotlight",
  },
  {
    id: "swiss-editorial",
    label: "Swiss Editorial",
    description: "Grid discipline, heavy typography, stark black-and-white with one bold accent color",
    inspiration: "swiss",
  },
  {
    id: "gradient-aurora",
    label: "Gradient Aurora",
    description: "Animated aurora light bands, centered layout with large gradient name and centered project grid",
    inspiration: "aurora",
  },
]

export const PORTFOLIO_SECTIONS = [
  { id: "about", label: "About Me" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "github-stats", label: "GitHub Stats" },
  { id: "testimonials", label: "Testimonials" },
  { id: "contact", label: "Contact" },
  { id: "now", label: "What I'm Doing Now" },
  { id: "education", label: "Education" },
  { id: "writing", label: "Featured Writing" },
] as const

export type SectionId = (typeof PORTFOLIO_SECTIONS)[number]["id"]

export interface SocialLinks {
  email?: string
  linkedin?: string
  twitter?: string
  substack?: string
  blog?: string
}

// AI-generated content
export interface AIProject {
  name: string
  url: string
  language: string | null
  description: string
  stars: number
  forks: number
}

export interface AIGeneratedContent {
  projects: AIProject[]
  aboutMe: string
  heroTagline: string
}

export interface AIResume {
  summary?: string
  highlights?: string[]
}

// extend generated content with optional resume section
export interface AIGeneratedContentWithResume extends AIGeneratedContent {
  resume?: AIResume
}

export interface TargetRoleConfig {
  role: string
  externalLinks: string[] // URLs for LinkedIn, blog, etc.
}

export interface PortfolioConfig {
  template: TemplateStyle | "ai-generated"
  colorScheme: ColorScheme
  sections: SectionId[]
  socialLinks: SocialLinks
  additionalPrompt?: string
  useAITemplate?: boolean
}

export interface GeneratedPortfolio {
  html: string
  title: string
}

export interface WizardState {
  step: number
  github: {
    username: string
    profile: GitHubProfile | null
    repos: GitHubRepo[]
    loading: boolean
    error: string | null
  }
  resume: {
    file: File | null
    text: string | null
    loading: boolean
    error: string | null
  }
  notion: {
    url: string
    content: string | null
    loading: boolean
    error: string | null
  }
  photo: {
    file: File | null
    dataUrl: string | null
  }
  targetRole: {
    role: string
    externalLinks: string[]
  }
  aiContent: {
    projects: AIProject[] | null
    aboutMe: string | null
    heroTagline: string | null
    resume?: AIResume | null
    loading: boolean
    error: string | null
  }
  config: PortfolioConfig
  portfolio: {
    html: string | null
    title: string | null
    loading: boolean
    error: string | null
  }
}

export type WizardAction =
  | { type: "SET_STEP"; step: number }
  | { type: "SET_GITHUB_USERNAME"; username: string }
  | { type: "SET_GITHUB_LOADING"; loading: boolean }
  | { type: "SET_GITHUB_DATA"; profile: GitHubProfile; repos: GitHubRepo[] }
  | { type: "SET_GITHUB_ERROR"; error: string }
  | { type: "CLEAR_GITHUB" }
  | { type: "SET_RESUME_FILE"; file: File }
  | { type: "SET_RESUME_LOADING"; loading: boolean }
  | { type: "SET_RESUME_TEXT"; text: string }
  | { type: "SET_RESUME_ERROR"; error: string }
  | { type: "CLEAR_RESUME" }
  | { type: "SET_NOTION_URL"; url: string }
  | { type: "SET_NOTION_LOADING"; loading: boolean }
  | { type: "SET_NOTION_CONTENT"; content: string }
  | { type: "SET_NOTION_ERROR"; error: string }
  | { type: "CLEAR_NOTION" }
  | { type: "SET_PHOTO"; file: File; dataUrl: string }
  | { type: "CLEAR_PHOTO" }
  | { type: "SET_CONFIG"; config: Partial<PortfolioConfig> }
  | { type: "TOGGLE_SECTION"; section: SectionId }
  | { type: "SET_SOCIAL_LINKS"; socialLinks: SocialLinks }
  | { type: "SET_ADDITIONAL_PROMPT"; prompt: string }
  | { type: "SET_TARGET_ROLE"; role: string }
  | { type: "SET_EXTERNAL_LINKS"; links: string[] }
  | { type: "SET_AI_CONTENT_LOADING"; loading: boolean }
  | { type: "SET_AI_CONTENT"; content: AIGeneratedContent | AIGeneratedContentWithResume }
  | { type: "SET_AI_CONTENT_ERROR"; error: string }
  | { type: "CLEAR_AI_CONTENT" }
  | { type: "SET_PORTFOLIO_LOADING"; loading: boolean }
  | { type: "SET_PORTFOLIO"; html: string; title: string }
  | { type: "SET_PORTFOLIO_ERROR"; error: string }
  | { type: "CLEAR_PORTFOLIO" }
