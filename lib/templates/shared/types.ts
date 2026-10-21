import type { GitHubProfile, GitHubRepo, PortfolioConfig, AIProject, SocialLinks } from "../../types"

export interface TemplateData {
  profile: GitHubProfile
  repos: GitHubRepo[]
  resumeText: string | null
  aiResume?: { summary?: string; highlights?: string[] } | null
  notionContent: string | null
  config: PortfolioConfig
  photoUrl: string | null
  aiBio: string | null
  socialLinks?: SocialLinks
  aiProjects?: AIProject[] | null
  heroTagline?: string | null
  targetRole?: string | null
}
