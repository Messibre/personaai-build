import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const API_ROOT = path.join(process.cwd(), "app", "api")
const METHODS = "GET|POST|PUT|PATCH|DELETE"

/** Handlers that are intentionally exported without withGuards/withRateLimit. */
const ALLOWLIST = new Set([
  // The vault id in the URL is the access secret; reads stay open so a saved link always works.
  "vault/[id]/route.ts GET",
  // Protected by its own bearer-token check (ADMIN_TOKEN).
  "admin/metrics/route.ts GET",
])

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return routeFiles(full)
    return entry.name === "route.ts" ? [full] : []
  })
}

export function findUnguardedHandlers(root: string = API_ROOT): string[] {
  const problems: string[] = []
  for (const file of routeFiles(root)) {
    const rel = path.relative(root, file).split(path.sep).join("/")
    const source = fs.readFileSync(file, "utf8")

    for (const match of source.matchAll(new RegExp(`^export\\s+(?:async\\s+)?function\\s+(${METHODS})\\b`, "gm"))) {
      if (!ALLOWLIST.has(`${rel} ${match[1]}`)) problems.push(`${rel} ${match[1]}: exported as a bare function`)
    }

    for (const match of source.matchAll(new RegExp(`^export\\s+const\\s+(${METHODS})\\b[^\\n]*`, "gm"))) {
      if (ALLOWLIST.has(`${rel} ${match[1]}`)) continue
      if (!/\bwith(?:Guards|RateLimit)\(/.test(match[0])) {
        problems.push(`${rel} ${match[1]}: not wrapped in withGuards/withRateLimit on the export line`)
      }
    }

    for (const match of source.matchAll(new RegExp(`^export\\s*\\{[^}]*\\b(${METHODS})\\b[^}]*\\}`, "gm"))) {
      problems.push(`${rel} ${match[1]}: re-exported handler cannot be checked; export it directly`)
    }
  }
  return problems.sort()
}

describe("API guard coverage", () => {
  it("wraps every exported route handler in withGuards or withRateLimit", () => {
    expect(findUnguardedHandlers()).toEqual([])
  })

  it("keeps the allowlist pointing at real handlers", () => {
    for (const entry of ALLOWLIST) {
      const [rel, method] = entry.split(" ")
      const source = fs.readFileSync(path.join(API_ROOT, rel), "utf8")
      expect(source, entry).toMatch(new RegExp(`^export\\s+(?:async\\s+)?function\\s+${method}\\b`, "m"))
    }
  })
})
