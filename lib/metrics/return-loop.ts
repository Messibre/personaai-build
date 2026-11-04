import type { Vault } from "@/lib/schemas/vault"

/** A second posting closer than this to the first counts as the same sitting. */
export const MIN_RETURN_GAP_MS = 60 * 60 * 1000
/** A second posting later than this after the first is outside the return window. */
export const MAX_RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export type UserStatus = "one" | "returned" | "same_sitting"

export interface FeedbackEntry {
  accurate: boolean
  note?: string
}

export interface UserLoopMetrics {
  vaultId: string
  name: string
  applicationCount: number
  distinctCount: number
  firstAt: string
  secondAt?: string
  status: UserStatus
  feedback: FeedbackEntry[]
}

export interface LoopMetrics {
  testedUsers: number
  returners: number
  sameSittingSecond: number
  feedbackCount: number
  accurateCount: number
  perUser: UserLoopMetrics[]
}

interface DistinctPosting {
  at: number
  iso: string
}

/** First time each distinct posting was seen, oldest first. Future-dated and unparsable entries are ignored. */
function distinctPostings(vault: Vault, now: number): DistinctPosting[] {
  const firstSeen = new Map<string, DistinctPosting>()
  for (const application of vault.applications) {
    const at = Date.parse(application.createdAt)
    if (!Number.isFinite(at) || at > now) continue
    const known = firstSeen.get(application.jobTextHash)
    if (!known || at < known.at) firstSeen.set(application.jobTextHash, { at, iso: application.createdAt })
  }
  return [...firstSeen.values()].sort((a, b) => a.at - b.at)
}

function classify(postings: DistinctPosting[]): { status: UserStatus; second?: DistinctPosting } {
  const [first, ...later] = postings
  if (!first) return { status: "one" }

  const returned = later.find((p) => p.at - first.at >= MIN_RETURN_GAP_MS && p.at - first.at <= MAX_RETURN_WINDOW_MS)
  if (returned) return { status: "returned", second: returned }

  const sameSitting = later.find((p) => p.at - first.at < MIN_RETURN_GAP_MS)
  if (sameSitting) return { status: "same_sitting", second: sameSitting }

  return { status: "one" }
}

/**
 * Pure. A tested user has at least one application. A returner has a distinct second posting
 * between MIN_RETURN_GAP_MS and MAX_RETURN_WINDOW_MS after the first. See lib/metrics/README.md.
 */
export function computeLoopMetrics(vaults: readonly Vault[], now: Date | number): LoopMetrics {
  const nowMs = typeof now === "number" ? now : now.getTime()
  const perUser: UserLoopMetrics[] = []
  let feedbackCount = 0
  let accurateCount = 0

  for (const vault of vaults) {
    if (vault.applications.length === 0) continue

    const postings = distinctPostings(vault, nowMs)
    const { status, second } = classify(postings)
    const feedback = vault.applications.flatMap((application) =>
      application.feedback
        ? [{ accurate: application.feedback.accurate, ...(application.feedback.note ? { note: application.feedback.note } : {}) }]
        : [],
    )
    feedbackCount += feedback.length
    accurateCount += feedback.filter((entry) => entry.accurate).length

    perUser.push({
      vaultId: vault.id,
      name: vault.person.name,
      applicationCount: vault.applications.length,
      distinctCount: postings.length,
      firstAt: postings[0]?.iso ?? vault.applications[0].createdAt,
      ...(second ? { secondAt: second.iso } : {}),
      status,
      feedback,
    })
  }

  return {
    testedUsers: perUser.length,
    returners: perUser.filter((user) => user.status === "returned").length,
    sameSittingSecond: perUser.filter((user) => user.status === "same_sitting").length,
    feedbackCount,
    accurateCount,
    perUser,
  }
}

export function headline(metrics: Pick<LoopMetrics, "returners" | "testedUsers">): string {
  return `${metrics.returners} of ${metrics.testedUsers}`
}

/** Share of feedback answers that said "accurate", or null when nobody answered (never NaN). */
export function accurateShare(metrics: Pick<LoopMetrics, "feedbackCount" | "accurateCount">): number | null {
  return metrics.feedbackCount === 0 ? null : metrics.accurateCount / metrics.feedbackCount
}

type CsvRow = Omit<UserLoopMetrics, "vaultId"> & { vaultId?: string }

// Leading = + - @ would be run as a formula by spreadsheet apps.
function csvCell(value: string | number | undefined): string {
  if (value === undefined) return ""
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(perUser: readonly CsvRow[]): string {
  const header = ["name", "applications", "distinct_postings", "first_at", "second_at", "status", "feedback_accurate", "feedback_total"]
  const lines = perUser.map((user) =>
    [
      csvCell(user.name),
      csvCell(user.applicationCount),
      csvCell(user.distinctCount),
      csvCell(user.firstAt),
      csvCell(user.secondAt),
      csvCell(user.status),
      csvCell(user.feedback.filter((entry) => entry.accurate).length),
      csvCell(user.feedback.length),
    ].join(","),
  )
  return [header.join(","), ...lines].join("\n") + "\n"
}
