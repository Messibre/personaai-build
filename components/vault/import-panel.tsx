"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GitHubImportCard } from "@/components/vault/github-import-card"
import { ProjectList } from "@/components/vault/project-list"
import { ResumeImportCard } from "@/components/vault/resume-import-card"
import { Spinner } from "@/components/ui/spinner"
import { friendlyMessage, loadVault, saveVault } from "@/lib/ingest/client"
import { DEFAULT_VAULT_NAME, mergeImport, type ImportBundle } from "@/lib/ingest/merge"
import type { Vault } from "@/lib/schemas/vault"
import { createEmptyVault } from "@/lib/vault/ops"

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

  const applyImport = useCallback(
    async (bundle: ImportBundle) => {
      const base = vault ?? { ...createEmptyVault(DEFAULT_VAULT_NAME), ...(idParam ? { id: idParam } : {}) }
      const next = mergeImport(base, bundle)
      if (next === base && vault) return
      await saveVault(next)
      setVault(next)
      if (idParam !== next.id) router.replace(`/vault?id=${next.id}`)
    },
    [vault, idParam, router],
  )

  const vaultRef = useRef<Vault | null>(null)
  useEffect(() => {
    vaultRef.current = vault
  }, [vault])

  const commitVault = useCallback(async (update: (current: Vault) => Vault) => {
    const current = vaultRef.current
    if (!current) return
    const next = update(current)
    await saveVault(next)
    vaultRef.current = next
    setVault(next)
  }, [])

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

      <div className="grid gap-6 md:grid-cols-2">
        <GitHubImportCard disabled={blocked} onImport={applyImport} />
        <ResumeImportCard disabled={blocked} onImport={applyImport} />
      </div>

      {vault ? <ProjectList vault={vault} onChangeVault={commitVault} /> : null}
    </div>
  )
}
