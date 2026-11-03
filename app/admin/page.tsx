import type { Metadata } from "next"
import { MetricsPanel } from "@/components/admin/metrics-panel"

export const metadata: Metadata = {
  title: "Admin | PersonaAI",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-semibold text-foreground">Return-loop metrics</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          How many people who tried a tailored application came back with a second, different job posting.
        </p>
      </header>
      <MetricsPanel />
    </main>
  )
}
