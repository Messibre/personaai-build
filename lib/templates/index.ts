import type { TemplateData } from "./shared/types"
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
  return html
}
