"use client"

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { JobProfile } from "@/lib/schemas/job"
import type { Gap } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"
import { includedCount, type SelectableProject } from "@/lib/tailor/selection"
import { COLOR_SCHEMES, type ColorScheme, type TemplateStyle } from "@/lib/types"
import { TemplateChooser } from "./template-chooser"

interface AnalysisReviewProps {
  vault: Vault
  job: JobProfile
  gaps: Gap[]
  items: SelectableProject[]
  template: TemplateStyle
  colorScheme: ColorScheme
  busy: boolean
  onToggle: (projectId: string) => void
  onMove: (projectId: string, direction: -1 | 1) => void
  onTemplateChange: (value: TemplateStyle) => void
  onColorSchemeChange: (value: ColorScheme) => void
  onGenerate: () => void
}

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AnalysisReview(props: AnalysisReviewProps) {
  const { vault, job, gaps, items, busy } = props
  const requirementLabels = new Map(job.requirements.map((requirement) => [requirement.id, requirement.label]))
  const onlyOne = includedCount(items) <= 1

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="job-summary" className="flex flex-col gap-3">
        <h3 id="job-summary" className="text-lg font-semibold text-foreground">
          {job.title.length > 90 ? `${job.title.slice(0, 87).trimEnd()}…` : job.title}
        </h3>
        <p className="text-sm text-muted-foreground">Private match context—never a claim about your current role.</p>
        {job.topThree.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-foreground">What this job cares about most</p>
            <ol className="mt-1 list-decimal pl-5 text-sm text-muted-foreground">
              {job.topThree.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer font-medium text-foreground">Requirements and gaps ({gaps.length})</summary>
        <section aria-label="Match details" className="mt-4 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{job.title}</p>
        {gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in your confirmed facts is missing for this posting.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {gaps.map((gap) => (
              <li key={gap.requirementId} className="flex flex-col gap-1 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={gap.level === "must" ? "destructive" : "secondary"}>{gap.level === "must" ? "Required" : "Nice to have"}</Badge>
                  <span className="text-sm font-medium text-foreground">{gap.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{gap.message}</p>
              </li>
            ))}
          </ul>
        )}
        </section>
      </details>

      <section aria-labelledby="picks-heading" className="flex flex-col gap-3">
        <h3 id="picks-heading" className="text-lg font-semibold text-foreground">
          Projects to feature
        </h3>
        <p className="text-sm text-muted-foreground">{items.length ? "Reorder or remove projects. At least one must stay." : "No project is required for a resume-only vault. Include an experience with confirmed facts above."}</p>
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => {
            const project = vault.projects.find((candidate) => candidate.id === item.projectId)
            if (!project) return null
            const matches = item.matchedRequirementIds.map((id) => requirementLabels.get(id)).filter((label): label is string => Boolean(label))
            return (
              <li key={item.projectId} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={item.included ? "font-medium text-foreground" : "font-medium text-muted-foreground line-through"}>{project.name}</span>
                  {matches.length > 0 ? <span className="text-sm text-muted-foreground">Matches: {matches.join(", ")}</span> : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" disabled={index === 0 || busy} onClick={() => props.onMove(item.projectId, -1)} aria-label={`Move ${project.name} up`}>
                    <ArrowUpIcon />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" disabled={index === items.length - 1 || busy} onClick={() => props.onMove(item.projectId, 1)} aria-label={`Move ${project.name} down`}>
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || (item.included && onlyOne)}
                    onClick={() => props.onToggle(item.projectId)}
                  >
                    {item.included ? "Remove" : "Add back"}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="style-heading" className="flex flex-col gap-3">
        <h3 id="style-heading" className="text-lg font-semibold text-foreground">
          Portfolio style
        </h3>
        <TemplateChooser value={props.template} colorScheme={props.colorScheme} disabled={busy} onChange={props.onTemplateChange} />
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="color-scheme">Colors</Label>
            <select id="color-scheme" className={selectClass} value={props.colorScheme} disabled={busy} onChange={(event) => props.onColorSchemeChange(event.target.value as ColorScheme)}>
              {Object.entries(COLOR_SCHEMES).map(([id, scheme]) => (
                <option key={id} value={id}>
                  {scheme.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div>
        <Button type="button" onClick={props.onGenerate} disabled={busy}>
          {busy ? <Spinner /> : null}
          {busy ? "Writing and fact-checking" : "Generate portfolio, resume and note"}
        </Button>
      </div>
    </div>
  )
}
