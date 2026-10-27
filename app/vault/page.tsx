import type { Metadata } from "next"
import { Suspense } from "react"
import { ImportPanel } from "@/components/vault/import-panel"

export const metadata: Metadata = {
  title: "Your vault | PersonaAI",
  description: "Import your GitHub repositories and resume into a vault of facts you confirm before anything is published.",
}

export default function VaultPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-semibold text-foreground">Your vault</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Bring in your repositories and resume. Nothing is trusted until you confirm it, and every fact keeps the
          evidence it came from.
        </p>
      </header>
      <Suspense fallback={null}>
        <ImportPanel />
      </Suspense>
    </main>
  )
}
