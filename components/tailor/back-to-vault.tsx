"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { VAULT_ID_PATTERN } from "@/components/vault/last-vault"

export function BackToVault() {
  const rawId = useSearchParams().get("id")
  const href = rawId && VAULT_ID_PATTERN.test(rawId) ? `/vault?id=${encodeURIComponent(rawId)}` : "/vault"
  return (
    <Link href={href} className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      Back to vault
    </Link>
  )
}
