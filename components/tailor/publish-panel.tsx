"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLinkIcon, GlobeIcon } from "lucide-react"
import { CopyButton } from "@/components/outputs/copy-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { ContentSelection } from "@/lib/schemas/tailoring-preferences"
import { TailorApiError, getPublishStatus, isAbort, publishPortfolio } from "@/lib/tailor/client"
import type { ColorScheme, TemplateStyle } from "@/lib/types"

const POLL_MS = 3_000
const POLL_LIMIT = 80

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "building" }
  | { kind: "ready"; url: string }
  | { kind: "failed"; message: string }

interface PublishPanelProps {
  vaultId: string
  selection: ContentSelection
  job: JobProfile
  draft: Draft
  picks: ProjectPick[]
  template: TemplateStyle
  colorScheme: ColorScheme
  company?: string
  publicContacts: string[]
}

export function PublishPanel({ vaultId, selection, job, draft, picks, template, colorScheme, company, publicContacts }: PublishPanelProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const publish = useCallback(async () => {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setPhase({ kind: "starting" })
    try {
      const started = await publishPortfolio(
        { vaultId, selection, job, draft, picks, template, colorScheme, ...(company ? { company } : {}), confirmPublic: true },
        abort.signal,
      )
      setPhase({ kind: "building" })
      for (let attempt = 0; attempt < POLL_LIMIT; attempt++) {
        const status = await getPublishStatus(started.statusToken, abort.signal)
        if (status.state === "ready" && status.url) {
          setPhase({ kind: "ready", url: status.url })
          return
        }
        if (status.state === "failed") {
          setPhase({ kind: "failed", message: "The site could not be built. Please try again." })
          return
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS))
        if (abort.signal.aborted) return
      }
      setPhase({ kind: "failed", message: "Publishing is taking longer than expected. Please try again in a moment." })
    } catch (error) {
      if (isAbort(error)) return
      setPhase({ kind: "failed", message: error instanceof TailorApiError ? error.message : "Publishing failed. Please try again." })
    }
  }, [vaultId, selection, job, draft, picks, template, colorScheme, company])

  const busy = phase.kind === "starting" || phase.kind === "building"

  return (
    <section aria-labelledby="publish-heading" className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <h3 id="publish-heading" className="flex items-center gap-2 text-base font-semibold">
          <GlobeIcon className="size-4" aria-hidden="true" />
          Publish this portfolio
        </h3>
        <p className="text-sm text-muted-foreground">
          Creates a public website from the draft above. Only the content you selected is included.
        </p>
      </div>

      <p className="text-sm">
        Public contact details:{" "}
        <span className="font-medium">{publicContacts.length ? publicContacts.join(", ") : "none"}</span>
      </p>

      <div className="flex items-start gap-2">
        <Checkbox id="confirm-public" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} disabled={busy} />
        <Label htmlFor="confirm-public" className="text-sm leading-relaxed font-normal">
          I understand anyone with the link can see this page, and I have reviewed the text.
        </Label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={publish} disabled={!confirmed || busy}>
          {busy ? <Spinner data-icon="inline-start" /> : null}
          {phase.kind === "ready" ? "Publish again" : busy ? "Publishing" : "Publish portfolio"}
        </Button>
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {phase.kind === "starting" ? "Checking and sending your portfolio..." : phase.kind === "building" ? "Building your site. This usually takes under a minute." : ""}
        </span>
      </div>

      {phase.kind === "ready" ? (
        <Alert>
          <AlertTitle>Your portfolio is live</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap items-center gap-3">
              <a href={phase.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-4 break-all">
                {phase.url}
                <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
              </a>
              <CopyButton text={phase.url} label="Copy link" />
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {phase.kind === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>Publishing did not finish</AlertTitle>
          <AlertDescription>{phase.message}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  )
}
