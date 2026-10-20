#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();

// Files allowed to make user-influenced / dynamic fetches until L13 refactor
const LEGACY_FETCH_ALLOWLIST = new Set([
  path.normalize("app/api/notion/route.ts"),
  path.normalize("app/api/ai-content/route.ts"),
]);

// Ignored directories when scanning
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".husky",
  "dist",
  "coverage",
]);

function getSourceFiles(dir, extensions = [".ts", ".tsx", ".js", ".mjs"]) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getSourceFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

export function runBoundaryChecks(rootDir = ROOT_DIR) {
  const violations = [];

  // Check 1: app/ must never import from lib/mcp/server
  const appDir = path.join(rootDir, "app");
  if (fs.existsSync(appDir)) {
    const appFiles = getSourceFiles(appDir);
    const mcpServerPattern = /from\s+['"][^'"]*lib\/mcp\/server/i;

    for (const file of appFiles) {
      const relPath = path.relative(rootDir, file);
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (mcpServerPattern.test(line)) {
          violations.push({
            rule: "mcp-server-boundary",
            file: relPath,
            line: i + 1,
            snippet: line.trim(),
            message: `app/ must not import from lib/mcp/server. Server-only MCP components cannot be exposed directly to routes or client.`,
          });
        }
      }
    }
  }

  // Check 2: Outbound fetch on user-influenced URLs must go only through lib/security/safe-fetch.ts
  const allSourceFiles = getSourceFiles(rootDir);
  const safeFetchRelPath = path.normalize("lib/security/safe-fetch.ts");

  for (const file of allSourceFiles) {
    const relPath = path.normalize(path.relative(rootDir, file));

    // Skip tests, scripts, fixtures, and safe-fetch itself
    if (
      relPath.startsWith("tests" + path.sep) ||
      relPath.startsWith("scripts" + path.sep) ||
      relPath.startsWith("fixtures" + path.sep) ||
      relPath === safeFetchRelPath
    ) {
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match fetch(...) calls
      const fetchMatch = line.match(/\bfetch\s*\(([^)]*)\)/);
      if (!fetchMatch) continue;

      const arg = fetchMatch[1].trim();

      // Allowed safe patterns:
      // 1. Literal strings to internal/fixed endpoints e.g. "/api/..." or fixed domain constants
      const isInternalApiCall =
        /^['"]\/api\//.test(arg) ||
        /^`\/api\//.test(arg);

      const isKnownFixedProvider =
        arg.includes("GITHUB_API") ||
        arg.includes("VERCEL_API") ||
        arg.includes("GEMINI_URL") ||
        arg.includes("generativelanguage.googleapis.com") ||
        arg.includes("notion.so/api");

      if (isInternalApiCall || isKnownFixedProvider) {
        continue;
      }

      // Check legacy allowlist (temporary until L13)
      if (LEGACY_FETCH_ALLOWLIST.has(relPath)) {
        continue;
      }

      // Any other variable fetch is flagged
      violations.push({
        rule: "safe-fetch-boundary",
        file: relPath,
        line: i + 1,
        snippet: line.trim(),
        message: `Outbound fetch call '${arg}' outside lib/security/safe-fetch.ts. Dynamic or user-influenced fetches must use safeFetch.`,
      });
    }
  }

  return violations;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("boundary-check.mjs")) {
  const violations = runBoundaryChecks();

  if (violations.length > 0) {
    console.error(`\x1b[31m[boundary-check] ${violations.length} boundary violation(s) found:\x1b[0m\n`);
    for (const v of violations) {
      console.error(`  \x1b[33m${v.file}:${v.line}\x1b[0m (${v.rule})`);
      console.error(`    \x1b[90m${v.snippet}\x1b[0m`);
      console.error(`    -> ${v.message}\n`);
    }
    process.exit(1);
  } else {
    console.log(`\x1b[32m[boundary-check] All architectural boundary checks passed.\x1b[0m`);
    process.exit(0);
  }
}
