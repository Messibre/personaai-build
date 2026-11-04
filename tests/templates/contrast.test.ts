import { describe, expect, it } from "vitest"
import { THEMES } from "../../lib/templates/shared/themes"
import { DARK_TOKENS, LIGHT_TOKENS, type ColorTokens } from "../../lib/templates/shared/tokens"

type Rgba = [number, number, number, number]

function parseColor(value: string): Rgba {
  const v = value.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1]
    const n = Number.parseInt(h, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(v)
  if (fn) {
    const [r, g, b, a = "1"] = fn[1].split(",").map((p) => p.trim())
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  throw new Error(`Unsupported colour: ${value}`)
}

function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg[3]
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: string, bg: string): number {
  const background = parseColor(bg)
  const l1 = luminance(over(parseColor(fg), background))
  const l2 = luminance(background)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const PALETTES: Array<[string, ColorTokens]> = [
  ["base/dark", DARK_TOKENS],
  ["base/light", LIGHT_TOKENS],
  ...Object.entries(THEMES).flatMap(([name, theme]): Array<[string, ColorTokens]> => [
    [`${name}/dark`, theme.dark],
    [`${name}/light`, theme.light],
  ]),
]

describe("token contrast is at least 4.5:1", () => {
  for (const [name, tokens] of PALETTES) {
    it(name, () => {
      expect(contrast(tokens.text, tokens.bg), "--text on --bg").toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens.muted, tokens.bg), "--muted on --bg").toBeGreaterThanOrEqual(4.5)
    })
  }
})
