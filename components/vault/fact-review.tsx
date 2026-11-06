"use client"

import { useId, useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { friendlyMessage } from "@/lib/ingest/client"
import type { Fact, Project, Vault } from "@/lib/schemas/vault"
import { confirmFact, editFact, removeFact } from "@/lib/vault/ops"

const SOURCE_LABEL: Record<Fact["source"], string> = {
  github: "GitHub",
  notion: "Notion",
  resume: "Resume",
  user: "You",
  "ai-draft": "AI draft",
}

type ChangeVault = (update: (vault: Vault) => Vault) => Promise<void>

export function FactReview({ project, onChangeVault }: { project: Pick<Project, "facts">; onChangeVault: ChangeVault }) {
  const headingId = useId()
  if (project.facts.length === 0) return null
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-t border-border px-6 py-4">
      <h3 id={headingId} className="text-sm font-semibold text-foreground">
        Review facts
      </h3>
      <ul className="flex flex-col gap-2">
        {project.facts.map((fact) => (
          <FactRow key={fact.id} fact={fact} onChangeVault={onChangeVault} />
        ))}
      </ul>
    </section>
  )
}

function FactRow({ fact, onChangeVault }: { fact: Fact; onChangeVault: ChangeVault }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fact.text)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  async function run(update: (vault: Vault) => Vault): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await onChangeVault(update)
      return true
    } catch (err) {
      setError(friendlyMessage(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      setError("Fact text cannot be empty.")
      return
    }
    if (await run((vault) => editFact(vault, fact.id, text))) setEditing(false)
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{SOURCE_LABEL[fact.source]}</Badge>
        {fact.confirmed ? (
          <Badge variant="secondary">Confirmed</Badge>
        ) : (
          <Badge variant="destructive">Not confirmed</Badge>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="flex flex-col gap-2">
          <label htmlFor={inputId} className="sr-only">
            Edit fact
          </label>
          <textarea
            id={inputId}
            value={draft}
            maxLength={500}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setDraft(fact.text)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm leading-relaxed text-foreground">{fact.text}</p>
      )}

      {fact.evidence ? (
        <blockquote className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
          <span className="sr-only">Evidence: </span>
          {fact.evidence}
        </blockquote>
      ) : null}

      {!editing ? (
        <div className="flex flex-wrap gap-2">
          {!fact.confirmed ? (
            <Button size="sm" disabled={busy} onClick={() => run((vault) => confirmFact(vault, fact.id))}>
              Confirm
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run((vault) => removeFact(vault, fact.id))}>
            Remove
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  )
}
