import type { Metadata } from "next"
import { Suspense } from "react"
import { TailorFlow } from "@/components/tailor/tailor-flow"

export const metadata: Metadata = {
  title: "Tailor to a job | PersonaAI",
  description: "Paste a job posting and get a portfolio, resume and note built only from facts you have confirmed.",
}

export default function TailorPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-balance text-3xl font-semibold text-foreground">Tailor to a job</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Every sentence is checked against your confirmed facts. Anything that is not backed up is removed and shown to you.
        </p>
      </header>
      <Suspense fallback={null}>
        <TailorFlow />
      </Suspense>
    </main>
  )
}
