"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLastVaultId } from "@/components/vault/last-vault"

export function ContinueLastVault({ basePath }: { basePath: "/vault" | "/tailor" }) {
  const lastId = useLastVaultId()
  if (!lastId) return null
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-pretty">You have a vault saved on this device.</p>
      <Button asChild>
        <Link href={`${basePath}?id=${encodeURIComponent(lastId)}`}>Continue with your last vault</Link>
      </Button>
    </div>
  )
}
