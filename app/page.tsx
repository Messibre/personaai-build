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
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in oklch, var(--persona-accent) 15%, transparent), transparent)"
          }}
        />

        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between px-4 sm:px-8 lg:px-12 py-4 sm:py-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-xl bg-[var(--persona-accent)] text-[var(--persona-bg)] shadow-lg shadow-[var(--persona-accent)]/20">
              <Sparkles className="size-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Persona<span className="text-[var(--persona-accent)]">AI</span>
            </span>
          </div>

          {/* Nav links - hidden on mobile */}
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link href="#templates" className="hover:text-foreground transition-colors">Templates</Link>
            <Link href="/job-match" className="hover:text-foreground transition-colors">Job Match</Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-border z-50 animate-fade-in-up">
            <div className="flex flex-col p-4 gap-2">
              <Link
                href="#how-it-works"
                className="py-3 px-4 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="#templates"
                className="py-3 px-4 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Templates
              </Link>
            </div>
          </div>
        )}

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 lg:pt-16 pb-8 sm:pb-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Left side - Headline */}
            <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground leading-[1.1] text-balance animate-fade-in-up">
                Create a{" "}
                <span className="italic font-serif text-[var(--persona-accent)] relative">stunning</span>{" "}
                portfolio that gets you noticed
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed text-balance animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                AI-powered portfolio generator for Professionals, Students, Entrepreneurs, and Freelancers.
              </p>

            </div>
          </div>
        </div>

        {/* Logo Marquee - Integration logos animation */}
        <div className="relative z-10 border-y border-border/50 bg-secondary/20">
          <div className="max-w-7xl mx-auto">
            <LogoMarquee />
          </div>
        </div>
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
