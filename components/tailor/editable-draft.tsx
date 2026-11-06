"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Draft } from "@/lib/schemas/draft"
import type { ProjectPick } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import { editSentence } from "@/lib/tailor/client"
import {
  MAX_EDIT_CHARS,
  addUnconfirmedUserFact,
  defaultFactTarget,
  deleteSentence,
  sectionKey,
  type AddFactSuggestion,
  type SectionRef,
} from "@/lib/tailor/edit"
import { confirmFact } from "@/lib/vault/ops"

interface EditableDraftProps {
  vault: Vault
  draft: Draft
  picks: ProjectPick[]
  onDraftChange: (draft: Draft) => void
  onVaultChange: (vault: Vault) => void | Promise<void>
}

interface Rejection {
  message: string
  suggestion?: AddFactSuggestion
}

interface PendingFact {
  vault: Vault
  factId: string
  text: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong. Please try again."
}

export function EditableDraft({ vault, draft, picks, onDraftChange, onVaultChange }: EditableDraftProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const projectName = (projectId: string) => vault.projects.find((project) => project.id === projectId)?.name ?? projectId

  const rows: { title: string; items: { ref: SectionRef; text: string }[] }[] = [
    { title: "Tagline", items: draft.tagline ? [{ ref: { section: "tagline" }, text: draft.tagline }] : [] },
    { title: "About", items: draft.about.map((s, index) => ({ ref: { section: "about", index }, text: s.text })) },
    ...draft.projects.map((project) => ({
      title: projectName(project.projectId),
      items: project.sentences.map((s, index) => ({
        ref: { section: "project", projectId: project.projectId, index } as SectionRef,
        text: s.text,
      })),
    })),
    { title: "Resume bullets", items: draft.resumeBullets.map((s, index) => ({ ref: { section: "resume", index }, text: s.text })) },
    { title: "Note", items: draft.note.map((s, index) => ({ ref: { section: "note", index }, text: s.text })) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Edit any sentence. Each edit is checked against your confirmed facts before it replaces the original.
      </p>
      {rows.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.title} className="flex flex-col gap-2" aria-label={group.title}>
            <h3 className="text-sm font-medium text-foreground">{group.title}</h3>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => {
                const key = sectionKey(item.ref)
                return (
                  <SentenceRow
                    key={key}
                    item={item}
                    editing={editingKey === key}
                    vault={vault}
                    draft={draft}
                    picks={picks}
                    onStartEdit={() => setEditingKey(key)}
                    onStopEdit={() => setEditingKey(null)}
                    onDelete={() => onDraftChange(deleteSentence(draft, item.ref))}
                    onDraftChange={(next) => {
                      setEditingKey(null)
                      onDraftChange(next)
                    }}
                    onVaultChange={onVaultChange}
                  />
                )
              })}
            </ul>
          </section>
        ),
      )}
    </div>
  )
}

interface SentenceRowProps {
  item: { ref: SectionRef; text: string }
  editing: boolean
  vault: Vault
  draft: Draft
  picks: ProjectPick[]
  onStartEdit: () => void
  onStopEdit: () => void
  onDelete: () => void
  onDraftChange: (draft: Draft) => void
  onVaultChange: (vault: Vault) => void | Promise<void>
}

function SentenceRow({ item, editing, vault, draft, picks, onStartEdit, onStopEdit, onDelete, onDraftChange, onVaultChange }: SentenceRowProps) {
  const fieldId = useId()
  const [text, setText] = useState(item.text)
  const [busy, setBusy] = useState(false)
  const [rejection, setRejection] = useState<Rejection | null>(null)
  const [pending, setPending] = useState<PendingFact | null>(null)
  const [error, setError] = useState<string | null>(null)

  const preview = item.text.length > 40 ? `${item.text.slice(0, 40)}...` : item.text

  function close() {
    setRejection(null)
    setPending(null)
    setError(null)
    setText(item.text)
    onStopEdit()
  }

  async function submit(attachFactIds?: string[], workingVault: Vault = vault) {
    setBusy(true)
    setError(null)
    try {
      const result = await editSentence({ vault: workingVault, draft, ref: item.ref, newText: text, attachFactIds })
      if (result.ok) {
        setRejection(null)
        setPending(null)
        onDraftChange(result.draft)
      } else {
        setPending(null)
        setRejection({ message: result.message, suggestion: result.suggestion })
      }
    } catch (err: unknown) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function startAddFact(suggestion: AddFactSuggestion) {
    const target = defaultFactTarget(item.ref, vault, picks)
    if (!target) {
      setError("Your vault has no project or role to attach a fact to.")
      return
    }
    try {
      const { vault: withFact, factId } = addUnconfirmedUserFact(vault, target, suggestion.factText)
      setPending({ vault: withFact, factId, text: suggestion.factText })
    } catch (err: unknown) {
      setError(errorMessage(err))
    }
  }

  async function confirmPending() {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      const confirmed = confirmFact(pending.vault, pending.factId)
      await onVaultChange(confirmed)
      setBusy(false)
      await submit([pending.factId], confirmed)
    } catch (err: unknown) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <li className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3">
        <p className="min-w-0 flex-1 text-pretty text-sm leading-relaxed text-foreground">{item.text}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" aria-label={`Edit sentence: ${preview}`} onClick={() => { setText(item.text); onStartEdit() }}>
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" aria-label={`Delete sentence: ${preview}`} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <Label htmlFor={fieldId} className="sr-only">
        Edit sentence
      </Label>
      <Textarea id={fieldId} value={text} rows={3} maxLength={MAX_EDIT_CHARS} disabled={busy || pending !== null} onChange={(event) => setText(event.target.value)} />

      {rejection ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-destructive p-3 text-sm">
          <p className="text-foreground">Not applied. {rejection.message}</p>
          {rejection.suggestion && !pending ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">If this is true, add it to your vault as a fact, confirm it, and the edit will be checked again.</p>
              <div>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => startAddFact(rejection.suggestion as AddFactSuggestion)}>
                  Add this to my vault as a fact
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
          <p className="font-medium text-foreground">Confirm this fact</p>
          <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">{pending.text}</blockquote>
          <p className="text-muted-foreground">It is saved to your vault only after you confirm that it is true.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={confirmPending}>
              {busy ? "Saving" : "Confirm this is true"}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setPending(null)}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={busy || pending !== null || text.trim() === ""} onClick={() => submit()}>
          {busy && !pending ? "Checking" : "Save edit"}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={close}>
          Cancel
        </Button>
      </div>
    </li>
  )
}
