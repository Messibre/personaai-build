"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { friendlyMessage, importRepos, listGitHubRepos } from "@/lib/ingest/client"
import { MAX_IMPORT_REPOS, type ImportBundle } from "@/lib/ingest/merge"
import type { GitHubProfile, GitHubRepo } from "@/lib/types"

interface GitHubImportCardProps {
  disabled: boolean
  onImport: (bundle: ImportBundle) => Promise<void>
}

export function GitHubImportCard({ disabled, onImport }: GitHubImportCardProps) {
  const [username, setUsername] = useState("")
  const [profile, setProfile] = useState<GitHubProfile | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [phase, setPhase] = useState<"idle" | "listing" | "importing">("idle")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const busy = phase !== "idle"

  async function findRepos(event: FormEvent) {
    event.preventDefault()
    const name = username.trim()
    if (!name) return
    setPhase("listing")
    setError(null)
    setDone(null)
    try {
      const result = await listGitHubRepos(name)
      setProfile(result.profile)
      setRepos(result.repos)
      setSelected([])
    } catch (err) {
      setProfile(null)
      setRepos([])
      setError(friendlyMessage(err))
    } finally {
      setPhase("idle")
    }
  }

  function toggle(name: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, name] : current.filter((entry) => entry !== name)))
  }

  async function importSelected() {
    if (!profile || selected.length === 0) return
    setPhase("importing")
    setError(null)
    setDone(null)
    try {
      const projects = await importRepos(profile.username, selected)
      await onImport({
        projects,
        githubUsername: profile.username,
        personName: profile.name ?? profile.username,
      })
      setDone(`Imported ${projects.length} ${projects.length === 1 ? "repository" : "repositories"}. Review the facts below.`)
      setSelected([])
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setPhase("idle")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from GitHub</CardTitle>
        <CardDescription>
          Pick up to {MAX_IMPORT_REPOS} repositories. Everything imported starts unconfirmed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={findRepos} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="github-username">GitHub username</Label>
            <Input
              id="github-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="alexchen-ui"
              autoComplete="off"
              maxLength={39}
              disabled={disabled || busy}
            />
          </div>
          <Button type="submit" disabled={disabled || busy || username.trim() === ""}>
            {phase === "listing" ? <Spinner /> : null}
            Find repositories
          </Button>
        </form>

        {repos.length > 0 ? (
          <fieldset className="flex flex-col gap-3" disabled={disabled || busy}>
            <legend className="mb-1 text-sm font-medium text-foreground">
              {selected.length} of {MAX_IMPORT_REPOS} selected
            </legend>
            <ul className="flex flex-col gap-2">
              {repos.map((repo) => {
                const checked = selected.includes(repo.name)
                const limitReached = selected.length >= MAX_IMPORT_REPOS && !checked
                const inputId = `repo-${repo.name}`
                return (
                  <li key={repo.name} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <Checkbox
                      id={inputId}
                      checked={checked}
                      disabled={limitReached}
                      onCheckedChange={(value) => toggle(repo.name, value === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={inputId} className="flex flex-1 flex-col items-start gap-1 font-normal">
                      <span className="font-medium text-foreground">{repo.name}</span>
                      {repo.description ? <span className="text-sm text-muted-foreground">{repo.description}</span> : null}
                      {repo.language ? <span className="text-xs text-muted-foreground">{repo.language}</span> : null}
                    </Label>
                  </li>
                )
              })}
            </ul>
            <Button type="button" onClick={importSelected} disabled={selected.length === 0}>
              {phase === "importing" ? <Spinner /> : null}
              Import {selected.length > 0 ? selected.length : ""} selected
            </Button>
          </fieldset>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {done}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
