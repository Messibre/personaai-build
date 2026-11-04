"use client"

import { WizardShell } from "@/components/wizard/wizard-shell"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sparkles, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

const EXAMPLE_PORTFOLIOS = [
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260425_132300_338-iHWRiOPN7oiiaDBUXjcDTxGReKBzo8.jpg",
    alt: "Bold Portrait template - Hello hero design with large typography overlay",
    label: "Bold Portrait",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260425_132300_147-G7tnz4jOQXTgtYf8tUNuvsIK9jjfJS.jpg",
    alt: "Typographic template - Oversized text with photo depth effect",
    label: "Typographic",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260425_132300_299-2LbFYTPFXFFgrpcAzJvE3REdl7NfHM.jpg",
    alt: "Split Editorial template - Magazine style dark/light split layout",
    label: "Split Editorial",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260425_132300_615-dAreLsgkXOvqmwRk33HdcUNK947NnT.jpg",
    alt: "Pastel Creative template - Soft colors with contemporary card design",
    label: "Pastel Creative",
  },
  {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_20260425_132259_890-EjaC1tHIX2LBu6Kr3tsFpgaa5mNhsK.jpg",
    alt: "Designer Coder template - Split personality creative developer design",
    label: "Designer & Coder",
  },
]

// Integration logos SVG paths
const INTEGRATION_LOGOS = [
  {
    name: "GitHub",
    svg: (
      <svg viewBox="0 0 24 24" className="size-6 sm:size-8" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (
      <svg viewBox="0 0 24 24" className="size-6 sm:size-8" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.044c-.42-.326-.98-.7-2.052-.606L2.636 2.634c-.467.047-.56.28-.374.466l2.197 1.108zM5.252 7.38v13.54c0 .746.373 1.026 1.213.98l14.474-.84c.84-.046.933-.56.933-1.166V6.494c0-.606-.233-.933-.746-.886l-15.127.887c-.56.046-.747.326-.747.886zm14.288.513c.094.42 0 .84-.42.886l-.7.14v10.026c-.607.326-1.166.513-1.633.513-.746 0-.933-.233-1.493-.933L10.78 10.2v8.26l1.447.327s0 .84-1.166.84l-3.22.187c-.092-.187 0-.653.326-.747l.84-.233V8.9l-1.166-.094c-.093-.42.14-1.026.793-1.073l3.453-.233 4.76 7.273V8.227l-1.213-.14c-.093-.514.28-.886.746-.933l3.454-.26z" />
      </svg>
    ),
  },
  {
    name: "Resume",
    svg: (
      <svg viewBox="0 0 24 24" className="size-6 sm:size-8" fill="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-9H9v2h6v-2zm0 4H9v2h6v-2z" />
      </svg>
    ),
  },
  {
    name: "AI",
    svg: (
      <svg viewBox="0 0 24 24" className="size-6 sm:size-8" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: "HTML",
    svg: (
      <svg viewBox="0 0 24 24" className="size-6 sm:size-8" fill="currentColor">
        <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z" />
      </svg>
    ),
  },
]

function LogoMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const marquee = marqueeRef.current
    if (!marquee) return

    let position = 0
    const speed = 0.15

    const animate = () => {
      position -= speed
      if (position <= -50) {
        position = 0
      }
      marquee.style.transform = `translateX(${position}%)`
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div className="relative overflow-hidden py-6 sm:py-8">
      {/* Gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10" />

      {/* Marquee container */}
      <div ref={marqueeRef} className="flex gap-8 sm:gap-16 whitespace-nowrap">
        {/* Double the logos for seamless loop */}
        {[...INTEGRATION_LOGOS, ...INTEGRATION_LOGOS, ...INTEGRATION_LOGOS, ...INTEGRATION_LOGOS].map((logo, i) => (
          <div
            key={`${logo.name}-${i}`}
            className="flex flex-col items-center gap-2 text-muted-foreground/60 hover:text-foreground transition-colors duration-300 group"
          >
            <div className="group-hover:scale-110 group-hover:text-[var(--persona-accent)] transition-all duration-300">
              {logo.svg}
            </div>
            <span className="text-[10px] sm:text-xs font-medium tracking-wider uppercase">{logo.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

      {/* Wizard Section — padding is handled inside WizardShell so preview can go full-width */}
      <section id="wizard" className="relative scroll-mt-8 overflow-x-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10">
          <WizardShell />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-16 sm:py-24 border-t border-border/50 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-[var(--persona-accent)] mb-3">
              Simple by design
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 text-balance">
              From zero to deployed in minutes
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto text-balance">
              No design skills, no coding, no hosting headaches. Just connect your data and go.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line — desktop only */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[var(--persona-accent)]/30 to-transparent" />

            {[
              {
                step: "01",
                title: "Connect GitHub",
                description: "Link your GitHub profile. We pull your repos, languages, and contribution data automatically.",
              },
              {
                step: "02",
                title: "Add context",
                description: "Optionally import your resume, Notion notes, or personal links to give the AI more to work with.",
              },
              {
                step: "03",
                title: "Pick a template",
                description: "Choose from 15 professionally designed templates. Each adapts to your data and color preferences.",
              },
              {
                step: "04",
                title: "Deploy instantly",
                description: "One click and your portfolio is live on a public URL — no account, no server, nothing to maintain.",
              },
            ].map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center sm:items-start sm:text-left group">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-[var(--persona-accent)]/10 border border-[var(--persona-accent)]/20 mb-4 group-hover:bg-[var(--persona-accent)]/20 transition-colors relative z-10">
                  <span className="text-lg font-bold text-[var(--persona-accent)]">{item.step}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-4 py-16 sm:py-24 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-[var(--persona-accent)] mb-3">
              Built for everyone
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 text-balance">
              Whether you code, create, or lead — we&apos;ve got you covered
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto text-balance">
              PersonaAI adapts to your story. Import from the tools you already use and let AI craft your perfect portfolio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                  </svg>
                ),
                title: "Developers & Engineers",
                description: "Pull your repos, languages, and contributions straight from GitHub. Your code speaks for itself.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                ),
                title: "Designers & Creatives",
                description: "Choose from stunning visual templates that put your aesthetic front and center. Upload your own images to personalize.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                ),
                title: "Freelancers & Consultants",
                description: "Showcase your expertise, past work, and contact info in one polished page. Win more clients.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 10 3 12 0v-5" />
                  </svg>
                ),
                title: "Students & Graduates",
                description: "No portfolio yet? No problem. Import your Notion notes or just type your bio and let AI do the heavy lifting.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
                  </svg>
                ),
                title: "Product Managers & Founders",
                description: "Tell your professional story with a polished personal site. Perfect for thought leadership and networking.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                ),
                title: "Content Creators & Writers",
                description: "Import content from Notion, add your photo, and have a beautiful portfolio ready to share in seconds.",
              },
            ].map((persona) => (
              <div
                key={persona.title}
                className="group relative p-6 rounded-2xl border border-border bg-card hover:border-[var(--persona-accent)]/40 hover:shadow-lg hover:shadow-[var(--persona-accent)]/5 transition-all duration-300"
              >
                <div className="flex items-center justify-center size-11 rounded-xl bg-[var(--persona-accent)]/10 text-[var(--persona-accent)] mb-4 group-hover:bg-[var(--persona-accent)]/20 transition-colors">
                  {persona.icon}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{persona.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{persona.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates / Examples Gallery */}
      <section id="templates" className="px-4 pb-16 sm:pb-24 scroll-mt-20 border-t border-border/50 pt-16 sm:pt-24">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-[var(--persona-accent)] mb-3">
              15 templates
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 text-balance">
              A template for every style
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto text-balance">
              From clean minimalist to bold editorial — each template is fully responsive, AI-populated, and instantly deployable.
            </p>
          </div>

          {/* Gallery grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {EXAMPLE_PORTFOLIOS.map((example, i) => (
              <div
                key={example.label}
                className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-[var(--persona-accent)]/5 hover:-translate-y-1 hover:border-[var(--persona-accent)]/30"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={example.src}
                    alt={example.alt}
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <span className="inline-block px-3 py-1.5 text-sm font-medium text-white bg-black/70 backdrop-blur-sm rounded-full">
                    {example.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-[var(--persona-accent)] text-[var(--persona-bg)]">
                <Sparkles className="size-3.5" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Persona<span className="text-[var(--persona-accent)]">AI</span>
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>your personal AI brand engine!</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
