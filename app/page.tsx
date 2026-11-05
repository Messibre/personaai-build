import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const STEPS = [
  {
    title: "Put your work in once",
    body: "Import your GitHub repositories and resume into a vault. You confirm every fact before it can be used.",
  },
  {
    title: "Paste a job posting",
    body: "We read what the role asks for and pick the projects from your vault that fit it best.",
  },
  {
    title: "Get a page, a resume and a note",
    body: "A portfolio page, a resume and a short note, each written for that exact role from your confirmed facts.",
  },
]

const PROMISES = [
  { title: "Picks the projects that fit", body: "Only the work relevant to the role is put first." },
  { title: "Never invents anything", body: "If you did not do it, it does not appear. Every claim traces back to a fact you confirmed." },
  { title: "Tells you about the gaps", body: "When the job asks for something you do not have, you are told rather than left to guess." },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold tracking-tight">PersonaAI</span>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/job-match" className="transition-colors hover:text-foreground">
            Quick fit check
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 pb-20 pt-10 sm:pt-16">
        <section aria-labelledby="hero-heading" className="flex flex-col gap-6">
          <h1 id="hero-heading" className="max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            Tailor one body of work to every job you apply for
          </h1>
          <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Keep your projects and experience in one place. For each role, get a portfolio page, resume and short note
            that lead with the work that matters to that employer.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/vault">Start your vault</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tailor">Tailor to a job</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="flex flex-col gap-6">
          <h2 id="how-heading" className="text-2xl font-semibold">
            How it works
          </h2>
          <ol className="flex flex-col gap-4 md:flex-row">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-1 flex-col gap-2 rounded-lg border border-border bg-card p-5">
                <span className="text-sm font-medium text-muted-foreground">Step {index + 1}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-pretty leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="promises-heading" className="flex flex-col gap-6">
          <h2 id="promises-heading" className="text-2xl font-semibold">
            Three promises
          </h2>
          <ul className="flex flex-col gap-4 md:flex-row">
            {PROMISES.map((promise) => (
              <li key={promise.title} className="flex flex-1 flex-col gap-2 border-t border-border pt-4">
                <h3 className="text-lg font-semibold">{promise.title}</h3>
                <p className="text-pretty leading-relaxed text-muted-foreground">{promise.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 text-sm text-muted-foreground">
        Looking for the old generic builder?{" "}
        <Link href="/legacy" className="underline underline-offset-4">
          Open the legacy generator
        </Link>
        .
      </footer>
    </div>
  )
}
