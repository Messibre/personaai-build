import { ONE_MINUTE_MS, withGuards } from "@/lib/security/guard"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getLedger } from "@/lib/job-match/report/store"
import { deterministicCoverLetter } from "@/lib/job-match/ai/cover-letter"

const schema = z.object({
  analysisId: z.string().min(1),
  options: z.object({
    tone: z.enum(["concise", "warm", "formal"]).default("warm"),
    length: z.enum(["short", "standard"]).default("standard"),
    featuredProjectId: z.string().optional(),
    addressGaps: z.boolean().default(false),
  }),
})

export const POST = withGuards(handlePost, { route: "job-match/cover-letter", max: 10, windowMs: ONE_MINUTE_MS })

async function handlePost(request: Request): Promise<Response> {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: "Invalid cover letter options." } }, { status: 400 })
    const ledger = getLedger(parsed.data.analysisId)
    if (!ledger) return NextResponse.json({ ok: false, error: { code: "ANALYSIS_EXPIRED", message: "This analysis expired. Run the job match again." } }, { status: 404 })
    const result = deterministicCoverLetter(ledger, parsed.data.options)
    return NextResponse.json({ ok: true, status: "fallback", ...result, options: parsed.data.options, meta: { aiEnhanced: false } })
  } catch {
    return NextResponse.json({ ok: false, error: { code: "COVER_LETTER_FAILED", message: "Could not generate the cover letter." } }, { status: 422 })
  }
}
