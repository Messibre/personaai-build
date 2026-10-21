import type { TemplateStyle } from "../../types"
import type { ColorTokens, TemplateTheme } from "./tokens"

/*
 * Design source: the 8 reference kits supplied with Section 7 (measured tokens), mapped as approved:
 *   terminal ← burhan-ops, swiss-editorial ← chanhdai, bento-grid ← elaya, bold-portrait ← eyu.et,
 *   spotlight-dark ← goatrank, split-editorial ← miheretab, minimal-clean ← mikes.cv, brutalist ← voxide.
 * The other 7 templates combine fonts, palettes and radii taken only from those kits.
 * Where a kit had no dark (or light) palette, or a measured value failed 4.5:1, the adjustment is noted inline.
 */

type Palette = {
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  muted: string
  onAccent: string
  /** Hex used for translucent nav / menu / footer chrome; defaults to bg. */
  chrome?: string
}

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function mode(p: Palette): ColorTokens {
  const chrome = p.chrome ?? p.bg
  return {
    bg: p.bg,
    surface: p.surface,
    "surface-2": p.surface2,
    border: p.border,
    text: p.text,
    muted: p.muted,
    "accent-contrast": p.onAccent,
    "nav-bg": rgba(chrome, 0.82),
    "menu-bg": rgba(chrome, 0.97),
    "footer-bg": p.bg,
  }
}

const F = {
  geist: "Geist:wght@400;500;600;700;900",
  geistMono: "Geist+Mono:wght@400;500;700",
  instrumentSerif: "Instrument+Serif:ital@0;1",
  plexSerif: "IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;1,400",
  spaceGrotesk: "Space+Grotesk:wght@400;500;600;700",
  inter: "Inter:wght@400;500;600;700;800",
  outfit: "Outfit:wght@300;400;500;600",
  jakarta: "Plus+Jakarta+Sans:wght@400;500;600;700",
} as const

/* ---------- palettes measured from the kits ---------- */

const BURHAN_DARK = mode({ bg: "#0a0a0a", surface: "#0f0f0f", surface2: "#151515", border: "#222222", text: "#fafafa", muted: "#a1a1a1", onAccent: "#0a0a0a" })
// Kit border #f5f5f5 is invisible on white; one step darker from the same neutral ramp.
const BURHAN_LIGHT = mode({ bg: "#ffffff", surface: "#fafafa", surface2: "#f5f5f5", border: "#e5e5e5", text: "#171717", muted: "#737373", onAccent: "#ffffff" })

const CHANHDAI_LIGHT = mode({ bg: "#ffffff", surface: "#f4f4f5", surface2: "#eeeef0", border: "#e4e4e7", text: "#09090b", muted: "#71717b", onAccent: "#ffffff" })
const CHANHDAI_DARK = mode({ bg: "#09090b", surface: "#151518", surface2: "#1c1c1f", border: "#27272a", text: "#fafafa", muted: "#9f9fa9", onAccent: "#09090b" })

const ELAYA_LIGHT = mode({ bg: "#ebebeb", surface: "#ffffff", surface2: "#f5f5f5", border: "#dcdcdc", text: "#292929", muted: "#616161", onAccent: "#ffffff" })
// Kit is light-only; dark mode inverts the same grey ramp.
const ELAYA_DARK = mode({ bg: "#141414", surface: "#1f1f1f", surface2: "#292929", border: "#2e2e2e", text: "#ebebeb", muted: "#a3a3a3", onAccent: "#141414" })

const EYU_LIGHT = mode({ bg: "#ffffff", surface: "#f9fafb", surface2: "#f3f4f6", border: "#e5e7eb", text: "#000000", muted: "#364153", onAccent: "#000000" })
// Kit is light-only; dark mode uses a neutral black ramp.
const EYU_DARK = mode({ bg: "#0a0a0a", surface: "#141414", surface2: "#1c1c1c", border: "#262626", text: "#ffffff", muted: "#a3a3a3", onAccent: "#000000" })

const GOAT_DARK = mode({ bg: "#030303", surface: "#0a0a0c", surface2: "#111112", border: "#1f1f1f", text: "#fafafa", muted: "#a1a1a1", onAccent: "#030303" })
// Kit muted #737373 is 3.7:1 on #e5e4df; darkened to #5c5c5c (5.3:1).
const GOAT_LIGHT = mode({ bg: "#e5e4df", surface: "#ffffff", surface2: "#efeeec", border: "#d4d3cd", text: "#111111", muted: "#5c5c5c", onAccent: "#111111" })

const MIHERETAB_LIGHT = mode({ bg: "#f4f3f0", surface: "#ffffff", surface2: "#eeebe2", border: "#d9d8d5", text: "#0d0d0c", muted: "#696967", onAccent: "#ffffff" })
const MIHERETAB_DARK = mode({ bg: "#0e0e0e", surface: "#1c1a14", surface2: "#24221c", border: "#2e2c26", text: "#ffffff", muted: "#9f9f9f", onAccent: "#0e0e0e" })

// Kit border is #ffffff (hairlines on blush); a visible blush-grey is used instead.
const MIKES_LIGHT = mode({ bg: "#faf5f5", surface: "#ffffff", surface2: "#f3eded", border: "#e6dede", text: "#060606", muted: "#434445", onAccent: "#ffffff" })
const MIKES_DARK = mode({ bg: "#191817", surface: "#211f1e", surface2: "#2a2827", border: "#393837", text: "#f5f3f0", muted: "#b9b8b6", onAccent: "#ffffff" })

const VOXIDE_LIGHT = mode({ bg: "#f9f9f8", surface: "#eaeaea", surface2: "#e5e5e5", border: "#d4d4d4", text: "#111111", muted: "#666666", onAccent: "#ffffff" })
const VOXIDE_DARK = mode({ bg: "#0a0a0a", surface: "#101010", surface2: "#1e1e1e", border: "#27272a", text: "#ededed", muted: "#a1a1aa", onAccent: "#ffffff" })

/* ---------- translucent variants for the glass blends ---------- */

const GLASS_DARK: ColorTokens = { ...GOAT_DARK, surface: "rgba(255,255,255,0.04)", "surface-2": "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.10)" }
const GLASS_LIGHT: ColorTokens = { ...GOAT_LIGHT, surface: "rgba(255,255,255,0.62)", "surface-2": "rgba(255,255,255,0.82)", border: "rgba(17,17,17,0.10)" }
const LIQUID_DARK: ColorTokens = { ...MIKES_DARK, surface: "rgba(245,243,240,0.05)", "surface-2": "rgba(245,243,240,0.09)", border: "rgba(245,243,240,0.12)" }
const LIQUID_LIGHT: ColorTokens = { ...ELAYA_LIGHT, surface: "rgba(255,255,255,0.66)", "surface-2": "rgba(255,255,255,0.86)", border: "rgba(41,41,41,0.08)" }

export const THEMES: Record<TemplateStyle, TemplateTheme> = {
  /* ===== mapped from a kit ===== */
  terminal: {
    dark: BURHAN_DARK, light: BURHAN_LIGHT,
    fontBody: "Geist Mono", fontDisplay: "Instrument Serif", fontMono: "Geist Mono",
    googleFamilies: [F.geistMono, F.instrumentSerif],
    radius: { sm: "4px", md: "6px", lg: "8px" }, displayWeight: 400, displayTracking: "0",
  },
  "swiss-editorial": {
    dark: CHANHDAI_DARK, light: CHANHDAI_LIGHT,
    fontBody: "IBM Plex Serif", fontDisplay: "Geist", fontMono: "Geist",
    googleFamilies: [F.plexSerif, F.geist],
    radius: { sm: "4px", md: "6px", lg: "8px" }, displayWeight: 500, displayTracking: "-0.025em",
    defaultMode: "light",
  },
  "bento-grid": {
    dark: ELAYA_DARK, light: ELAYA_LIGHT,
    fontBody: "Space Grotesk", fontDisplay: "Space Grotesk", fontMono: "Space Grotesk",
    googleFamilies: [F.spaceGrotesk],
    radius: { sm: "12px", md: "20px", lg: "20px" }, displayWeight: 600, displayTracking: "-0.03em",
  },
  "bold-portrait": {
    dark: EYU_DARK, light: EYU_LIGHT,
    fontBody: "Inter", fontDisplay: "Space Grotesk", fontMono: "Inter",
    googleFamilies: [F.inter, F.spaceGrotesk],
    radius: { sm: "4px", md: "8px", lg: "12px" }, displayWeight: 700, displayTracking: "-0.025em",
  },
  "spotlight-dark": {
    dark: GOAT_DARK, light: GOAT_LIGHT,
    fontBody: "Inter", fontDisplay: "Inter", fontMono: "Inter",
    googleFamilies: [F.inter],
    radius: { sm: "8px", md: "12px", lg: "16px" }, displayWeight: 800, displayTracking: "-0.025em",
  },
  "split-editorial": {
    dark: MIHERETAB_DARK, light: MIHERETAB_LIGHT,
    fontBody: "Plus Jakarta Sans", fontDisplay: "Outfit", fontMono: "Plus Jakarta Sans",
    googleFamilies: [F.jakarta, F.outfit],
    radius: { sm: "4px", md: "8px", lg: "12px" }, displayWeight: 400, displayTracking: "-0.028em",
    defaultMode: "light",
  },
  "minimal-clean": {
    // Kit font MB Sans is not on Google Fonts; Inter is the approved stand-in.
    dark: MIKES_DARK, light: MIKES_LIGHT,
    fontBody: "Inter", fontDisplay: "Inter", fontMono: "Inter",
    googleFamilies: [F.inter],
    radius: { sm: "3px", md: "6px", lg: "16px" }, displayWeight: 500, displayTracking: "-0.01em",
    defaultMode: "light",
  },
  brutalist: {
    dark: VOXIDE_DARK, light: VOXIDE_LIGHT,
    fontBody: "Geist", fontDisplay: "Geist", fontMono: "Geist Mono",
    googleFamilies: [F.geist, F.geistMono],
    radius: { sm: "0", md: "0", lg: "0" }, displayWeight: 900, displayTracking: "-0.05em",
  },

  /* ===== blends of kit ingredients ===== */
  // burhan's Instrument Serif display + voxide's Geist text, on miheretab's warm paper neutrals.
  typographic: {
    dark: MIHERETAB_DARK, light: MIHERETAB_LIGHT,
    fontBody: "Geist", fontDisplay: "Instrument Serif", fontMono: "Geist",
    googleFamilies: [F.geist, F.instrumentSerif],
    radius: { sm: "2px", md: "4px", lg: "6px" }, displayWeight: 400, displayTracking: "-0.02em",
  },
  // miheretab's Outfit + Plus Jakarta Sans, mikes.cv blush palette, elaya's soft 20px cards.
  "pastel-creative": {
    dark: MIKES_DARK, light: MIKES_LIGHT,
    fontBody: "Plus Jakarta Sans", fontDisplay: "Outfit", fontMono: "Plus Jakarta Sans",
    googleFamilies: [F.jakarta, F.outfit],
    radius: { sm: "12px", md: "20px", lg: "20px" }, displayWeight: 500, displayTracking: "-0.028em",
    defaultMode: "light",
  },
  // elaya's Space Grotesk headings over burhan's Geist Mono body, on chanhdai's zinc neutrals.
  "designer-coder": {
    dark: CHANHDAI_DARK, light: CHANHDAI_LIGHT,
    fontBody: "Geist Mono", fontDisplay: "Space Grotesk", fontMono: "Geist Mono",
    googleFamilies: [F.geistMono, F.spaceGrotesk],
    radius: { sm: "6px", md: "10px", lg: "14px" }, displayWeight: 600, displayTracking: "-0.03em",
    defaultMode: "light",
  },
  // goatrank's near-black / stone palette as frosted layers, miheretab's Outfit display + Inter text.
  glassmorphism: {
    dark: GLASS_DARK, light: GLASS_LIGHT,
    fontBody: "Inter", fontDisplay: "Outfit", fontMono: "Inter",
    googleFamilies: [F.inter, F.outfit],
    radius: { sm: "12px", md: "20px", lg: "24px" }, displayWeight: 500, displayTracking: "-0.02em",
  },
  // elaya's grey canvas and 20px / pill radii, mikes.cv warm dark, Space Grotesk + Plus Jakarta Sans.
  "liquid-glass": {
    dark: LIQUID_DARK, light: LIQUID_LIGHT,
    fontBody: "Plus Jakarta Sans", fontDisplay: "Space Grotesk", fontMono: "Plus Jakarta Sans",
    googleFamilies: [F.jakarta, F.spaceGrotesk],
    radius: { sm: "20px", md: "20px", lg: "28px" }, displayWeight: 600, displayTracking: "-0.03em",
  },
  // voxide's Geist 900 display over burhan's Geist Mono, goatrank's blacks; voxide light for day mode.
  "cyberpunk-noir": {
    dark: GOAT_DARK, light: VOXIDE_LIGHT,
    fontBody: "Geist Mono", fontDisplay: "Geist", fontMono: "Geist Mono",
    googleFamilies: [F.geistMono, F.geist],
    radius: { sm: "0", md: "2px", lg: "4px" }, displayWeight: 900, displayTracking: "-0.04em",
  },
  // miheretab's Outfit display + Inter text, chanhdai zinc for night, eyu.et white for day.
  "gradient-aurora": {
    dark: CHANHDAI_DARK, light: EYU_LIGHT,
    fontBody: "Inter", fontDisplay: "Outfit", fontMono: "Inter",
    googleFamilies: [F.inter, F.outfit],
    radius: { sm: "10px", md: "16px", lg: "24px" }, displayWeight: 500, displayTracking: "-0.028em",
  },
}
