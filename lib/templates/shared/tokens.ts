import { safeColor } from "./escape"

export type ColorTokens = {
  bg: string
  surface: string
  "surface-2": string
  border: string
  text: string
  muted: string
  "accent-contrast": string
  "nav-bg": string
  "menu-bg": string
  "footer-bg": string
}

export const DARK_TOKENS: ColorTokens = {
  bg: "#0a0a0f",
  surface: "rgba(255,255,255,0.03)",
  "surface-2": "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  text: "#e8e8ef",
  muted: "#8e8e98",
  "accent-contrast": "#000000",
  "nav-bg": "rgba(10,10,15,0.8)",
  "menu-bg": "rgba(10,10,15,0.95)",
  "footer-bg": "rgba(5,5,10,0.8)",
}

export const LIGHT_TOKENS: ColorTokens = {
  bg: "#f4f4f8",
  surface: "#ffffff",
  "surface-2": "#ebebf1",
  border: "rgba(0,0,0,0.1)",
  text: "#111111",
  muted: "#4a4a52",
  "accent-contrast": "#000000",
  "nav-bg": "rgba(248,248,252,0.92)",
  "menu-bg": "rgba(248,248,252,0.97)",
  "footer-bg": "#f0f0f6",
}

const STATIC_TOKENS: Record<string, string> = {
  "radius-sm": "8px",
  "radius-md": "12px",
  "radius-lg": "16px",
  "space-1": "4px",
  "space-2": "8px",
  "space-3": "12px",
  "space-4": "16px",
  "space-5": "24px",
  "space-6": "32px",
  "space-7": "48px",
  "space-8": "64px",
  "font-body": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  "font-display": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  "font-mono": "'JetBrains Mono', ui-monospace, monospace",
  "shadow-sm": "0 2px 12px rgba(0,0,0,0.06)",
  "shadow-md": "0 20px 60px rgba(0,0,0,0.3)",
  ease: "cubic-bezier(.4,0,.2,1)",
  duration: ".3s",
}

function declarations(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(" ")
}

/**
 * The single token block. Every value is a compile-time constant except
 * --accent, which is passed through safeColor() so only a valid hex can land in CSS.
 */
export function tokensCss(accent: string): string {
  const safeAccent = safeColor(accent)
  return [
    `:root { ${declarations(DARK_TOKENS)} ${declarations(STATIC_TOKENS)} --accent: ${safeAccent}; }`,
    `[data-theme="light"] { ${declarations(LIGHT_TOKENS)} }`,
  ].join("\n    ")
}
