"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { friendlyMessage, loadVault, saveVault } from "@/lib/ingest/client"
import type { JobProfile } from "@/lib/schemas/job"
import type { Gap } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"
import { analyzeJob, generateOutputs, isAbort } from "@/lib/tailor/client"
import type { GenerateOutput } from "@/lib/tailor/pipeline"
import { recordIfGenerated } from "@/lib/tailor/record"
import { moveItem, toPicksPayload, toSelectable, toggleIncluded, type SelectableProject } from "@/lib/tailor/selection"
import type { ColorScheme, TemplateStyle } from "@/lib/types"
import { AnalysisReview } from "./analysis-review"
import { FeedbackPrompt } from "./feedback-prompt"
import { JobStep } from "./job-step"
import { ResultsView } from "./results-view"

const VAULT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

type Stage = "input" | "review" | "done"

interface FlowError {
  message: string
  retry: () => void
}

export function TailorFlow() {
  const searchParams = useSearchParams()
  const rawId = searchParams.get("id")
  const vaultId = rawId && VAULT_ID_PATTERN.test(rawId) ? rawId : null

  const [vault, setVault] = useState<Vault | null>(null)
  const [loading, setLoading] = useState(vaultId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [stage, setStage] = useState<Stage>("input")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FlowError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [postingText, setPostingText] = useState("")
  const [company, setCompany] = useState("")
  const [job, setJob] = useState<JobProfile | null>(null)
  const [gaps, setGaps] = useState<Gap[]>([])
  const [items, setItems] = useState<SelectableProject[]>([])
  const [template, setTemplate] = useState<TemplateStyle>("minimal-clean")
  const [colorScheme, setColorScheme] = useState<ColorScheme>("ocean")
  const [output, setOutput] = useState<GenerateOutput | null>(null)

  const request = useRef<AbortController | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!vaultId) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)
    loadVault(vaultId, controller.signal)
      .then((loaded) => {
        setVault(loaded)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(friendlyMessage(err))
        setLoading(false)
      })
    return () => controller.abort()
  }, [vaultId])

  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => {
    heading.current?.focus()
  }, [stage])

  const runAnalyze = useCallback(async () => {
    if (!vault) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      const result = await analyzeJob(vault, postingText, controller.signal)
      setJob(result.job)
      setGaps(result.gaps)
      setItems(toSelectable(result.picks))
      setOutput(null)
      setStage("review")
    } catch (err) {
      if (isAbort(err)) return
      setError({ message: friendlyMessage(err), retry: () => void runAnalyze() })
    } finally {
      if (request.current === controller) setBusy(false)
    }
  }, [vault, postingText])

  const runGenerate = useCallback(async () => {
    if (!vault || !job) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await generateOutputs(
        { vault, job, picks: toPicksPayload(items), template, colorScheme, ...(company.trim() ? { company: company.trim() } : {}) },
        controller.signal,
      )
      setOutput(result)
      setStage("done")
      try {
        const updated = await recordIfGenerated(vault, { ok: true, data: result }, { job, postingText, company })
        if (updated !== vault) {
          await saveVault(updated)
          setVault(updated)
        }
      } catch {
        setNotice("Your outputs are ready, but this application could not be saved to your vault history.")
      }
    } catch (err) {
      if (isAbort(err)) return
      setError({ message: friendlyMessage(err), retry: () => void runGenerate() })
    } finally {
      if (request.current === controller) setBusy(false)
    }
  }, [vault, job, items, template, colorScheme, company, postingText])

  if (!vaultId) {
    return (
      <Notice title="No vault selected">
        Open this page from your vault, or <Link className="underline" href="/vault">import your projects first</Link>.
      </Notice>
    )
  }
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Spinner /> Loading your vault
      </p>
    )
  }
  if (loadError) return <Notice title="Could not load your vault">{loadError}</Notice>
  if (!vault) {
    return (
      <Notice title="Vault not found">
        <Link className="underline" href="/vault">Import your projects</Link> to create one.
      </Notice>
    )
  }

  const stageTitle = stage === "input" ? "Paste the job posting" : stage === "review" ? "Review the match" : "Your tailored outputs"

  return (
    <div className="flex flex-col gap-6">
      <h2 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold text-foreground outline-none">
        {stageTitle}
      </h2>

      <div role="status" aria-live="polite" className="sr-only">
        {busy ? "Working" : ""}
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>That did not work</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={error.retry} disabled={busy}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      {stage === "input" ? (
        <JobStep postingText={postingText} company={company} busy={busy} onPostingChange={setPostingText} onCompanyChange={setCompany} onSubmit={() => void runAnalyze()} />
      ) : null}

      {stage === "review" && job ? (
        <>
          <AnalysisReview
            vault={vault}
            job={job}
            gaps={gaps}
            items={items}
            template={template}
            colorScheme={colorScheme}
            busy={busy}
            onToggle={(id) => setItems((current) => toggleIncluded(current, id))}
            onMove={(id, direction) => setItems((current) => moveItem(current, id, direction))}
            onTemplateChange={setTemplate}
            onColorSchemeChange={setColorScheme}
            onGenerate={() => void runGenerate()}
          />
          <div>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setStage("input")}>
              Back to the posting
            </Button>
          </div>
        </>
      ) : null}

      {stage === "done" && output && job ? (
        <>
          <ResultsView
            vault={vault}
            job={job}
            output={output}
            template={template}
            colorScheme={colorScheme}
            company={company.trim() || undefined}
            onVaultChange={setVault}
          />
          <FeedbackPrompt key={`${vault.id}:${postingText}`} vault={vault} postingText={postingText} onSaved={setVault} />
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStage("review")}>
              Back to the match
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
