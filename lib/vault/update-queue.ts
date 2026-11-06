import type { Vault } from "@/lib/schemas/vault"

/** Serialize read-modify-write operations; a failed save must not poison later updates. */
export function createVaultUpdateQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  return (update: () => Promise<Vault>): Promise<Vault> => {
    const next = tail.then(update)
    tail = next.catch(() => undefined)
    return next
  }
}
