"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Vault } from "@/lib/schemas/vault"

type CopyStatus = "idle" | "copied" | "failed"

export function hasTailorableProject(vault: Vault): boolean {
  return vault.projects.some((project) => project.facts.some((fact) => fact.confirmed === true))
}

export function VaultActions({ vault }: { vault: Vault }) {
  const [origin, setOrigin] = useState("")
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const hintId = useId()
  const linkId = useId()

  useEffect(() => setOrigin(window.location.origin), [])

  const vaultPath = `/vault?id=${encodeURIComponent(vault.id)}`
  const fullUrl = `${origin}${vaultPath}`
  const canTailor = hasTailorableProject(vault)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("failed")
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tailor to a job</CardTitle>
          <CardDescription>Paste a job posting and get a portfolio, resume and note built from your confirmed facts.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {canTailor ? (
            <Button asChild size="lg" className="self-start">
              <Link href={`/tailor?id=${encodeURIComponent(vault.id)}`}>Tailor to a job</Link>
            </Button>
          ) : (
            <>
              <Button size="lg" className="self-start" disabled aria-describedby={hintId}>
                Tailor to a job
              </Button>
              <p id={hintId} className="text-sm text-muted-foreground">
                Confirm at least one fact on a project first. Answer its questions or confirm an imported fact below.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save your link</CardTitle>
          <CardDescription>This link is the only way back to your vault.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label htmlFor={linkId} className="sr-only">
            Your vault link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={linkId}
              readOnly
              value={fullUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
            />
            <Button type="button" variant="outline" onClick={copyLink}>
              Copy
            </Button>
          </div>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : ""}
          </p>
          <p className="text-sm font-medium text-foreground">
            Anyone with this link can read and change your vault. Keep it private.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
