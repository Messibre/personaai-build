import { createHash, randomUUID, timingSafeEqual } from "node:crypto"
import { MAX_RETURN_WINDOW_MS, MIN_RETURN_GAP_MS, accurateShare, computeLoopMetrics, headline, toCsv } from "@/lib/metrics/return-loop"
import type { Vault } from "@/lib/schemas/vault"
import { getServerVaultStore } from "@/lib/vault/index"

/*
 * Admin-only. Requires `Authorization: Bearer <ADMIN_TOKEN>`; without ADMIN_TOKEN configured the
 * route is closed (503). The response never contains vault ids (they are access secrets), emails,
 * facts, posting text or posting hashes: only names, counts, timestamps and feedback.
 */

export const runtime = "nodejs"

const READ_CONCURRENCY = 10

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest()
}

function tokenMatches(header: string | null, expected: string): boolean {
  const match = header?.match(/^Bearer (.+)$/)
  if (!match) return false
  // Hashing gives equal-length buffers, so the comparison is constant-time whatever the input length.
  return timingSafeEqual(digest(match[1]), digest(expected))
}

async function readAllVaults(): Promise<{ vaults: Vault[]; unreadable: number }> {
  const store = getServerVaultStore()
  const summaries = await store.list()
  const vaults: Vault[] = []
  let unreadable = 0

  for (let i = 0; i < summaries.length; i += READ_CONCURRENCY) {
    const batch = summaries.slice(i, i + READ_CONCURRENCY)
    const results = await Promise.allSettled(batch.map((summary) => store.get(summary.id)))
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) vaults.push(result.value)
      else unreadable += 1
    }
  }
  return { vaults, unreadable }
}

export async function GET(request: Request): Promise<Response> {
  const adminToken = process.env.ADMIN_TOKEN
  if (!adminToken) return json(503, { error: "Admin metrics are not configured." })
  if (!tokenMatches(request.headers.get("authorization"), adminToken)) {
    return json(401, { error: "Unauthorized." })
  }

  let loaded: { vaults: Vault[]; unreadable: number }
  try {
    loaded = await readAllVaults()
  } catch {
    const traceId = randomUUID()
    console.error(`[admin-metrics] storage failed traceId=${traceId}`)
    return json(503, { error: "Vault storage is not available.", traceId })
  }

  const metrics = computeLoopMetrics(loaded.vaults, Date.now())
  const perUser = metrics.perUser.map(({ vaultId: _vaultId, ...user }) => user)

  if (new URL(request.url).searchParams.get("format") === "csv") {
    return new Response(toCsv(perUser), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="return-loop.csv"',
        "Cache-Control": "no-store",
      },
    })
  }

  return json(200, {
    headline: headline(metrics),
    testedUsers: metrics.testedUsers,
    returners: metrics.returners,
    sameSittingSecond: metrics.sameSittingSecond,
    feedbackCount: metrics.feedbackCount,
    accurateCount: metrics.accurateCount,
    accurateShare: accurateShare(metrics),
    unreadableVaults: loaded.unreadable,
    definition: { minReturnGapMs: MIN_RETURN_GAP_MS, maxReturnWindowMs: MAX_RETURN_WINDOW_MS },
    perUser,
  })
}
