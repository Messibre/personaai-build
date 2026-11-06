import type { ColorScheme, TemplateStyle } from "@/lib/types"
import type { TemplateData } from "./shared/types"

/** Fictional layout content only; never mixed with a user's generated output. */
export function templatePreviewData(template: TemplateStyle, colorScheme: ColorScheme): TemplateData {
  return {
    profile: { username: "sample", name: "Your Name", bio: null, avatar_url: "", followers: 0, following: 0, public_repos: 0, html_url: "", location: null, blog: null, company: null },
    config: { template, colorScheme, sections: ["about", "projects", "experience", "education"], socialLinks: {} },
    repos: [], resumeText: null, notionContent: null, photoUrl: null,
    aiBio: "This is a layout preview with fictional content. Your generated portfolio uses only the confirmed facts you choose to include.",
    heroTagline: "Your work, thoughtfully presented.",
    aiProjects: [
      { name: "Selected project", url: "", language: null, description: "Your confirmed project description appears here, with its context and the work you contributed.", stars: 0, forks: 0 },
      { name: "Another project", url: "", language: null, description: "Choose and reorder the work you want to feature. This sample is not added to your vault.", stars: 0, forks: 0 },
    ],
    aiResume: { highlights: ["Your role · Your company: a confirmed contribution appears here."] },
    education: [{ institution: "Your institution", degree: "Your qualification" }],
  }
}
