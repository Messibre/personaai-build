import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runBoundaryChecks } from "../../scripts/boundary-check.mjs";

describe("Boundary Checks", () => {
  it("passes cleanly on the active codebase", () => {
    const violations = runBoundaryChecks();
    expect(violations).toEqual([]);
  });

  describe("Simulated repository environments", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "boundary-test-"));
      fs.mkdirSync(path.join(tempDir, "app", "api", "test"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "lib", "test"), { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("flags an import of lib/mcp/server inside app/", () => {
      const offendingFile = path.join(tempDir, "app", "api", "test", "route.ts");
      fs.writeFileSync(
        offendingFile,
        `import { createMcpServer } from "@/lib/mcp/server";\nexport function GET() {}`
      );

      const violations = runBoundaryChecks(tempDir);
      expect(violations.length).toBe(1);
      expect(violations[0].rule).toBe("mcp-server-boundary");
      expect(violations[0].message).toContain("app/ must not import from lib/mcp/server");
    });

    it("flags an outbound dynamic fetch outside lib/security/safe-fetch.ts", () => {
      const offendingFile = path.join(tempDir, "lib", "test", "helper.ts");
      fs.writeFileSync(
        offendingFile,
        `export async function getUntrusted(userUrl: string) { return await fetch(userUrl); }`
      );

      const violations = runBoundaryChecks(tempDir);
      expect(violations.length).toBe(1);
      expect(violations[0].rule).toBe("safe-fetch-boundary");
      expect(violations[0].message).toContain("Outbound fetch call");
    });

    it("allows internal relative /api/ fetch calls", () => {
      const safeFile = path.join(tempDir, "app", "api", "test", "client.ts");
      fs.writeFileSync(
        safeFile,
        `export async function loadData() { return await fetch("/api/data"); }`
      );

      const violations = runBoundaryChecks(tempDir);
      expect(violations).toEqual([]);
    });
  });
});
