import type { GitHubRepo, ColorScheme } from "../../types"
import { COLOR_SCHEMES } from "../../types"
import { safeColor } from "./escape"

export function getColorScheme(scheme: unknown, fallbackScheme: ColorScheme = "ocean") {
  if (typeof scheme === "string" && scheme in COLOR_SCHEMES) {
    const item = COLOR_SCHEMES[scheme as ColorScheme]
    return {
      label: item.label,
      primary: safeColor(item.primary),
      secondary: safeColor(item.secondary),
      accent: safeColor(item.accent),
    }
  }
  const fallback = COLOR_SCHEMES[fallbackScheme] || COLOR_SCHEMES.ocean
  return {
    label: fallback.label,
    primary: safeColor(fallback.primary),
    secondary: safeColor(fallback.secondary),
    accent: safeColor(fallback.accent),
  }
}

export function getLangs(repos: GitHubRepo[]): string[] {
  return [...new Set(repos.map((r) => r.language).filter(Boolean))] as string[]
}

export function getTopics(repos: GitHubRepo[]): string[] {
  return [...new Set(repos.flatMap((r) => r.topics).filter(Boolean))]
}

// Language → gradient color map for project thumbnails
export const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f0db4f", Python: "#3572a5", Rust: "#dea584",
  Go: "#00add8", Java: "#b07219", "C++": "#f34b7d", C: "#555555", "C#": "#178600",
  Ruby: "#701516", Swift: "#f05138", Kotlin: "#a97bff", PHP: "#4f5d95",
  Dart: "#00b4ab", Scala: "#c22d40", Elixir: "#6e4a7e", Haskell: "#5e5086",
  HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", Vue: "#41b883", Svelte: "#ff3e00",
}

export function langColor(lang: string | null): string {
  if (!lang) return "#7c5cfc"
  return LANG_COLORS[lang] || "#7c5cfc"
}
