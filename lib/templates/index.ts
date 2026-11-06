import type { TemplateData } from "./shared/types"
import { removeUnavailableSectionLinks } from "./shared/navigation"
import { e } from "./shared/escape"
import { buildBentoGrid } from "./templates/bento-grid"
import { buildBoldPortrait } from "./templates/bold-portrait"
import { buildBrutalist } from "./templates/brutalist"
import { buildCyberpunkNoir } from "./templates/cyberpunk-noir"
import { buildDesignerCoder } from "./templates/designer-coder"
import { buildGlassmorphism } from "./templates/glassmorphism"
import { buildGradientAurora } from "./templates/gradient-aurora"
import { buildLiquidGlass } from "./templates/liquid-glass"
import { buildMinimalClean } from "./templates/minimal-clean"
import { buildPastelCreative } from "./templates/pastel-creative"
import { buildSplitEditorial } from "./templates/split-editorial"
import { buildSpotlightDark } from "./templates/spotlight-dark"
import { buildSwissEditorial } from "./templates/swiss-editorial"
import { buildTerminal } from "./templates/terminal"
import { buildTypographic } from "./templates/typographic"

export { e, safeUrl, safeImageSrc, safeColor } from "./shared/escape"
export { getColorScheme } from "./shared/utils"

/* ========== MAIN EXPORT ========== */
const TEMPLATE_BUILDERS: Record<string, (data: TemplateData) => string> = {
  "bold-portrait": buildBoldPortrait,
  "typographic": buildTypographic,
  "split-editorial": buildSplitEditorial,
  "pastel-creative": buildPastelCreative,
  "designer-coder": buildDesignerCoder,
  "minimal-clean": buildMinimalClean,
  "brutalist": buildBrutalist,
  "glassmorphism": buildGlassmorphism,
  "terminal": buildTerminal,
  "liquid-glass": buildLiquidGlass,
  "cyberpunk-noir": buildCyberpunkNoir,
  "bento-grid": buildBentoGrid,
  "spotlight-dark": buildSpotlightDark,
  "swiss-editorial": buildSwissEditorial,
  "gradient-aurora": buildGradientAurora,
}

export function buildPortfolioHtml(data: TemplateData): string {
  const builder = TEMPLATE_BUILDERS[data.config.template] || buildBoldPortrait
  let html = builder(data)
  if (!data.profile.avatar_url && !data.photoUrl) {
    const initials = (data.profile.name || data.profile.username).trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0] ?? "").join("").toUpperCase()
    html = html.replace(/<img\b[^>]*\bsrc=""[^>]*>/g, `<span role="img" aria-label="${e(data.profile.name || "Profile")}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:120px;background:var(--surface);color:var(--text);font-size:3rem;font-weight:700">${e(initials)}</span>`)
  }
  if (data.config.sections.includes("education") && data.education?.length && !html.includes('id="education"')) {
    const education = `<section id="education" class="section"><div class="container"><h2 class="section-title">Education</h2>${data.education.map((entry) => `<article><h3>${e(entry.institution)}</h3>${entry.degree ? `<p>${e(entry.degree)}</p>` : ""}<p>${e([entry.start, entry.end].filter(Boolean).join(" – "))}</p></article>`).join("")}</div></section>`
    const insertion = html.includes("</main>") ? "</main>" : html.includes("<footer") ? "<footer" : "</body>"
    html = html.replace(insertion, `${education}${insertion}`)
  }
  // Ensure first <main> has id="main-content" for skip-to-main accessibility link
  html = html.replace(/<main(?![^>]*id=)/, '<main id="main-content"')
  // Add .typewriter class to hero taglines / hero-bio for the typewriter effect
  // Applied to the first hero-anim heading or hero-bio if not already present
  if (!html.includes('class="typewriter"') && !html.includes("class='typewriter'")) {
    html = html.replace(/class="hero-bio hero-anim"/, 'class="hero-bio hero-anim typewriter"')
    if (!html.includes("typewriter")) {
      // Fallback: apply to first hero-anim paragraph
      html = html.replace(/class="hero-anim"([^>]*>)([^<]{20,})/, 'class="hero-anim typewriter"$1$2')
    }
  }
  // Add loading="lazy" to all img tags that don't already have it
  html = html.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"')
  return removeUnavailableSectionLinks(html)
}
