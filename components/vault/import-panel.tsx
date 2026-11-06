"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GitHubImportCard } from "@/components/vault/github-import-card"
import { ProjectList } from "@/components/vault/project-list"
import { ResumeImportCard } from "@/components/vault/resume-import-card"
import { Spinner } from "@/components/ui/spinner"
import { ContinueLastVault } from "@/components/vault/continue-last-vault"
import { readLastVaultId, rememberVaultId } from "@/components/vault/last-vault"
import { VaultActions } from "@/components/vault/vault-actions"
import { friendlyMessage, loadVault, saveVault } from "@/lib/ingest/client"
import { DEFAULT_VAULT_NAME, mergeImport, type ImportBundle } from "@/lib/ingest/merge"
import type { Vault } from "@/lib/schemas/vault"
import { createEmptyVault } from "@/lib/vault/ops"
import { createVaultUpdateQueue } from "@/lib/vault/update-queue"
import { ProfileEditor } from "./profile-editor"

const VAULT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export function ImportPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawId = searchParams.get("id")
  const idParam = rawId && VAULT_ID_PATTERN.test(rawId) ? rawId : null

  const [vault, setVault] = useState<Vault | null>(null)
  const [loading, setLoading] = useState(idParam !== null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!idParam || vault?.id === idParam) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)
    loadVault(idParam, controller.signal)
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
  }, [idParam, vault?.id])

  const vaultRef = useRef<Vault | null>(null)
  const queue = useRef(createVaultUpdateQueue())
  useEffect(() => { vaultRef.current = vault }, [vault])

  const applyImport = useCallback(async (bundle: ImportBundle) => {
    await queue.current(async () => {
      let current = vaultRef.current
      const savedId = idParam ?? readLastVaultId()
      if (!current && savedId) {
        current = await loadVault(savedId)
        if (!current) throw new Error("Your saved vault could not be found. Open it before importing more data.")
      }
      const base = current ?? createEmptyVault(DEFAULT_VAULT_NAME)
      const next = mergeImport(base, bundle)
      await saveVault(next)
      vaultRef.current = next
      rememberVaultId(next.id)
      setVault(next)
      if (idParam !== next.id) router.replace(`/vault?id=${next.id}`)
      return next
    })
  }, [idParam, router])

  const commitVault = useCallback(async (update: (current: Vault) => Vault) => {
    await queue.current(async () => {
      const current = vaultRef.current
      if (!current) throw new Error("Open your vault before saving changes.")
      const next = update(current)
      await saveVault(next)
      vaultRef.current = next
      setVault(next)
      return next
    })
  }, [])

  useEffect(() => {
    if (vault) rememberVaultId(vault.id)
  }, [vault])

  const blocked = loading || loadError !== null

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading your vault
        </p>
      ) : null}
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {!idParam && !vault ? <ContinueLastVault basePath="/vault" /> : null}

      <p className="text-muted-foreground">Add GitHub, a resume, or both—in either order. New imports are combined with this vault; your confirmed facts stay intact.</p>
      {vault ? <ProfileEditor key={vault.id} vault={vault} onSave={commitVault} /> : null}
      <div className="grid gap-6 md:grid-cols-2">
        <GitHubImportCard disabled={blocked} onImport={applyImport} />
        <ResumeImportCard disabled={blocked} onImport={applyImport} />
      </div>

      {vault ? <VaultActions vault={vault} /> : null}
      {vault ? <ProjectList vault={vault} onChangeVault={commitVault} /> : null}
    </div>
  )
}
