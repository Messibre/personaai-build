"use client"

import { useCallback, useEffect, useRef, useState, type Dispatch } from "react"
import type { WizardState, WizardAction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PortfolioEditor } from "@/components/portfolio/portfolio-editor"
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Copy,
  Download,
  ExternalLink,
  Sparkles,
  Check,
  Rocket,
  Loader2,
  Link2,
  Send,
  Wand2,
  Globe,
  ChevronDown,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getFriendlyErrorMessage, getFriendlyServerStatusMessage } from "@/lib/user-friendly-error"

interface StepPreviewProps {
  state: WizardState
  dispatch: Dispatch<WizardAction>
  onBack: () => void
}

// Friendly display names for templates
const TEMPLATE_LABELS: Record<string, string> = {
  "bold-portrait": "Bold Portrait",
  "typographic": "Typographic",
  "split-editorial": "Split Editorial",
  "pastel-creative": "Pastel Creative",
  "designer-coder": "Designer & Coder",
  "minimal-dark": "Minimal Dark",
  "gradient-mesh": "Gradient Mesh",
  "glassmorphism": "Glassmorphism",
  "terminal": "Terminal",
  "liquid-glass": "Liquid Glass",
  "cyberpunk-noir": "Cyberpunk Noir",
  "bento-grid": "Bento Grid",
  "spotlight-dark": "Spotlight Dark",
  "swiss-editorial": "Swiss Editorial",
  "gradient-aurora": "Gradient Aurora",
}

export function StepPreview({ state, dispatch, onBack }: StepPreviewProps) {
  const { portfolio, github, resume, notion, config, photo, aiContent, targetRole } = state
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // AI Template refinement
  const [refinementPrompt, setRefinementPrompt] = useState("")
  const [isRefining, setIsRefining] = useState(false)
  const [showRefinePanel, setShowRefinePanel] = useState(false)

  // Deploy state
  const [deploying, setDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState<"idle" | "uploading" | "deploying" | "ready" | "error">("idle")
  const [deployUrl, setDeployUrl] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  // Deploy name dialog
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [deployName, setDeployName] = useState("")

  // AI template tracking for refinement
  const [lastAITemplate, setLastAITemplate] = useState<string>(config.template)
  const [lastAIColor, setLastAIColor] = useState<string>(config.colorScheme)

  const aiContentReady = aiContent.projects !== null || aiContent.aboutMe !== null || aiContent.heroTagline !== null

  // Always-current ref so the generate closure never reads stale aiContent.
  const aiContentRef = useRef(aiContent)
  useEffect(() => { aiContentRef.current = aiContent }, [aiContent])

  const templateLabel = TEMPLATE_LABELS[config.template] || config.template

  const generate = useCallback(async () => {
    if (!github.profile) return
    setIsGenerating(true)
    dispatch({ type: "SET_PORTFOLIO_LOADING", loading: true })

    try {
      if (config.useAITemplate) {
        const skills = [...new Set(github.repos.map((r) => r.language).filter(Boolean))] as string[]
        const res = await fetch("/api/ai-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRole: targetRole.role || "Software Developer",
            name: github.profile.name || github.profile.username,
            aboutMe: aiContentRef.current.aboutMe || github.profile.bio || `${github.profile.name || github.profile.username} is a software developer.`,
            heroTagline: aiContentRef.current.heroTagline || targetRole.role || "Software Developer",
            projects: aiContentRef.current.projects || github.repos.slice(0, 7).map((r) => ({
              name: r.name, url: r.html_url, language: r.language,
              description: r.description || `A ${r.language || "software"} project.`,
              stars: r.stargazers_count, forks: r.forks_count,
            })),
            skills,
            photoUrl: photo.dataUrl,
            socialLinks: config.socialLinks,
            colorScheme: config.colorScheme,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          dispatch({ type: "SET_PORTFOLIO_ERROR", error: getFriendlyServerStatusMessage(res.status, "template") || getFriendlyErrorMessage(data.error, "template") })
          setIsGenerating(false)
          return
        }
        if (!data.html || data.html.length < 100) {
          dispatch({ type: "SET_PORTFOLIO_ERROR", error: "We couldn’t build the AI template just now. Please try again in a few minutes." })
          setIsGenerating(false)
          return
        }
        if (data.designConfig?.template) setLastAITemplate(data.designConfig.template)
        if (data.designConfig?.colorScheme) setLastAIColor(data.designConfig.colorScheme)
        dispatch({ type: "SET_PORTFOLIO", html: data.html, title: `${github.profile.name || github.profile.username} - Portfolio` })
        setIsGenerating(false)
        return
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github: { profile: github.profile, repos: github.repos },
          resumeText: resume.text,
          notionContent: notion.content,
          config,
          photoDataUrl: photo.dataUrl,
          aiContent: aiContentRef.current.projects ? {
            projects: aiContentRef.current.projects, aboutMe: aiContentRef.current.aboutMe, heroTagline: aiContentRef.current.heroTagline,
          } : null,
          targetRole: targetRole.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        dispatch({ type: "SET_PORTFOLIO_ERROR", error: getFriendlyServerStatusMessage(res.status, "portfolio") || getFriendlyErrorMessage(data.error, "portfolio") })
        setIsGenerating(false)
        return
      }
      if (!data.html || data.html.length < 100) {
        dispatch({ type: "SET_PORTFOLIO_ERROR", error: "We couldn’t generate the portfolio just now. Please try again in a few minutes." })
        setIsGenerating(false)
        return
      }
      dispatch({ type: "SET_PORTFOLIO", html: data.html, title: data.title })
      setIsGenerating(false)
    } catch (err) {
      dispatch({ type: "SET_PORTFOLIO_ERROR", error: getFriendlyErrorMessage(err, "portfolio") })
      setIsGenerating(false)
    }
  }, [github, resume.text, notion.content, config, photo.dataUrl, dispatch, targetRole])

  const hasGeneratedRef = useRef(false)

  // Safety valve: if aiContent is still loading after 12 s (e.g. background
  // fire-and-forget from the "Skip" path), unblock generation with whatever
  // data we have rather than leaving the user stuck on the loading screen.
  const [aiContentTimedOut, setAiContentTimedOut] = useState(false)
  useEffect(() => {
    if (!aiContent.loading) return
    if (aiContentReady) return // already have data — no need for a timer
    const id = setTimeout(() => setAiContentTimedOut(true), 12000)
    return () => clearTimeout(id)
  }, [aiContent.loading, aiContentReady])

  useEffect(() => {
    if (hasGeneratedRef.current) return
    if (portfolio.html || portfolio.loading || portfolio.error || isGenerating) return
    // Only hold off if aiContent is still loading AND we have no data yet AND
    // we haven't timed out yet. If the user already has AI content, or the
    // background fetch has been running too long, proceed immediately.
    if (aiContent.loading && !aiContentReady && !aiContentTimedOut) return
    hasGeneratedRef.current = true
    generate()
  }, [generate, portfolio.html, portfolio.loading, portfolio.error, isGenerating, aiContent.loading, aiContentReady, aiContentTimedOut])

  const handleHtmlChange = useCallback(
    (newHtml: string) => {
      dispatch({ type: "SET_PORTFOLIO", html: newHtml, title: portfolio.title || "portfolio" })
    },
    [dispatch, portfolio.title]
  )

  const copyHtml = useCallback(async () => {
    if (!portfolio.html) return
    try {
      await navigator.clipboard.writeText(portfolio.html)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = portfolio.html
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [portfolio.html])

  const downloadHtml = useCallback(() => {
    if (!portfolio.html) return
    const blob = new Blob([portfolio.html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${portfolio.title || "portfolio"}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [portfolio.html, portfolio.title])

  const openDeployDialog = useCallback(() => {
    const fullName = github.profile?.name || portfolio.title || "my-portfolio"
    const parts = fullName.trim().split(/\s+/)
    const slug = parts.length >= 2 ? `${parts[0]}-${parts[parts.length - 1]}-portfolio` : `${parts[0]}-portfolio`
    const defaultName = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 52)
    setDeployName(defaultName)
    setShowDeployDialog(true)
  }, [portfolio.title, github.profile?.name])

  const deployToVercel = useCallback(async () => {
    if (!portfolio.html || !deployName.trim()) return
    setShowDeployDialog(false)
    setDeploying(true)
    setDeployStatus("uploading")
    setDeployError(null)
    setDeployUrl(null)
    try {
      setDeployStatus("deploying")
      const sanitizedName = deployName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 40) || "my-portfolio"
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: portfolio.html, projectName: sanitizedName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(getFriendlyServerStatusMessage(res.status, "deploy") || getFriendlyErrorMessage(data.error, "deploy"))
      setDeployUrl(data.url)
      setDeployStatus("ready")
    } catch (err) {
      setDeployError(getFriendlyErrorMessage(err, "deploy"))
      setDeployStatus("error")
    } finally {
      setDeploying(false)
    }
  }, [portfolio.html, deployName])

  const copyDeployUrl = useCallback(async () => {
    if (!deployUrl) return
    try {
      await navigator.clipboard.writeText(deployUrl)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = deployUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }, [deployUrl])

  const refineTemplate = useCallback(async () => {
    if (!portfolio.html || !refinementPrompt.trim() || !config.useAITemplate) return
    setIsRefining(true)
    try {
      const skills = [...new Set(github.repos.map((r) => r.language).filter(Boolean))] as string[]
      const res = await fetch("/api/ai-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: targetRole.role || "Software Developer",
          name: github.profile?.name || github.profile?.username || "User",
          aboutMe: aiContent.aboutMe || github.profile?.bio || "",
          heroTagline: aiContent.heroTagline || "",
          projects: aiContent.projects || github.repos.slice(0, 7).map((r) => ({
            name: r.name, url: r.html_url, language: r.language,
            description: r.description || "", stars: r.stargazers_count, forks: r.forks_count,
          })),
          skills,
          photoUrl: photo.dataUrl,
          socialLinks: config.socialLinks,
          colorScheme: config.colorScheme,
          refinementPrompt,
          currentTemplate: lastAITemplate,
          currentColorScheme: lastAIColor,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        dispatch({ type: "SET_PORTFOLIO_ERROR", error: getFriendlyServerStatusMessage(res.status, "template") || getFriendlyErrorMessage(data.error, "template") })
        setIsRefining(false)
        return
      }
      if (data.designConfig?.template) setLastAITemplate(data.designConfig.template)
      if (data.designConfig?.colorScheme) setLastAIColor(data.designConfig.colorScheme)
      dispatch({ type: "SET_PORTFOLIO", html: data.html, title: portfolio.title || "Portfolio" })
      setRefinementPrompt("")
    } catch (err) {
      dispatch({ type: "SET_PORTFOLIO_ERROR", error: getFriendlyErrorMessage(err, "template") })
    } finally {
      setIsRefining(false)
    }
  }, [portfolio.html, refinementPrompt, config, github, aiContent, targetRole, photo.dataUrl, dispatch, portfolio.title, lastAITemplate, lastAIColor])

  const loading = isGenerating || portfolio.loading
  const name = github.profile?.name || github.profile?.username || "Your"

  // Scroll to top of page when preview mounts so the sticky header is visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <div className="flex flex-col min-h-screen border-t border-[var(--persona-border)]">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-[var(--persona-border)] shadow-sm shadow-black/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3 h-14">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0 h-8 px-2"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="w-px h-5 bg-[var(--persona-border)] shrink-0" />

          {/* Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="size-6 rounded-md bg-[var(--persona-accent)]/10 flex items-center justify-center shrink-0">
              <Globe className="size-3.5 text-[var(--persona-accent)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none truncate">
                {name}&apos;s Portfolio
              </p>
              {portfolio.html && !loading && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {config.useAITemplate ? "AI-designed" : templateLabel} template
                </p>
              )}
            </div>
          </div>

          {/* Actions — visible when portfolio is ready */}
          {portfolio.html && !loading && (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Regenerate */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  dispatch({ type: "CLEAR_PORTFOLIO" })
                  setDeployStatus("idle")
                  setDeployUrl(null)
                  setDeployError(null)
                  generate()
                }}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 hidden sm:flex"
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>

              {/* Copy HTML */}
              <Button
                variant="outline"
                size="sm"
                onClick={copyHtml}
                className={cn(
                  "gap-1.5 text-xs h-8 border-[var(--persona-border)] transition-all",
                  copied && "border-green-500/30 text-green-600"
                )}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy HTML"}</span>
              </Button>

              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={downloadHtml}
                className="gap-1.5 text-xs h-8 border-[var(--persona-border)] hidden sm:flex"
              >
                <Download className="size-3.5" />
                Download
              </Button>

              {/* Deploy */}
              <Button
                size="sm"
                onClick={deploying ? undefined : deployStatus === "ready" ? undefined : openDeployDialog}
                disabled={deploying}
                className={cn(
                  "gap-1.5 text-xs h-8 transition-all",
                  deployStatus === "ready"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90"
                )}
              >
                {deploying ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="hidden sm:inline">
                      {deployStatus === "uploading" ? "Uploading..." : "Deploying..."}
                    </span>
                  </>
                ) : deployStatus === "ready" ? (
                  <>
                    <Check className="size-3.5" />
                    <span className="hidden sm:inline">Deployed</span>
                  </>
                ) : (
                  <>
                    <Rocket className="size-3.5" />
                    <span className="hidden sm:inline">Deploy</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-screen-2xl mx-auto w-full">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-5 py-24 animate-fade-in-up">
            <div className="relative">
              <div className="size-16 rounded-full border-2 border-[var(--persona-accent)]/20 flex items-center justify-center animate-pulse-glow">
                <Sparkles className="size-7 text-[var(--persona-accent)] animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">Building your portfolio</p>
              <p className="text-sm text-muted-foreground mt-1.5">AI is crafting your personal site&hellip;</p>
            </div>
            <div className="w-52 h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className="h-full w-full animate-shimmer rounded-full" />
            </div>
          </div>
        )}

        {/* Error */}
        {portfolio.error && !loading && (
          <div className="flex flex-col items-center gap-4 py-20 animate-fade-in-scale">
            <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <div className="text-center max-w-sm">
              <p className="font-semibold text-foreground mb-1">Generation failed</p>
              <p className="text-sm text-muted-foreground">{portfolio.error}</p>
            </div>
            <Button
              onClick={generate}
              className="gap-2 bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90"
            >
              <RefreshCw className="size-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Portfolio Preview */}
        {portfolio.html && !loading && (
          <div className="space-y-4 animate-fade-in-up">

            {/* Deployed URL banner */}
            {deployUrl && deployStatus === "ready" && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/8 border border-green-500/20">
                <div className="size-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Check className="size-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-0.5">Live at</p>
                  <a
                    href={deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-[var(--persona-accent)] hover:underline truncate block"
                  >
                    {deployUrl}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={copyDeployUrl} className={cn("h-7 gap-1 text-xs", urlCopied && "text-green-500")}>
                    {urlCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {urlCopied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(deployUrl, "_blank")} className="h-7 gap-1 text-xs">
                    <ExternalLink className="size-3.5" />
                    Open
                  </Button>
                </div>
              </div>
            )}

            {/* Deploy error */}
            {deployError && deployStatus === "error" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span className="flex-1">{deployError}</span>
                <Button variant="ghost" size="sm" onClick={deployToVercel} className="h-7 gap-1 text-xs text-destructive hover:text-destructive shrink-0">
                  <RefreshCw className="size-3" />
                  Retry
                </Button>
              </div>
            )}

            {/* Editor */}
            <PortfolioEditor
              html={portfolio.html}
              onHtmlChange={handleHtmlChange}
              templateName={config.useAITemplate ? "AI Template" : templateLabel}
            />

            {/* Mobile action bar (visible only on mobile) */}
            <div className="flex items-center gap-2 sm:hidden flex-wrap">
              <Button variant="outline" size="sm" onClick={copyHtml} className={cn("gap-1.5 text-xs flex-1 h-9 border-[var(--persona-border)]", copied && "border-green-500/30 text-green-600")}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy HTML"}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadHtml} className="gap-1.5 text-xs flex-1 h-9 border-[var(--persona-border)]">
                <Download className="size-3.5" />
                Download
              </Button>
              <Button
                size="sm"
                onClick={deploying ? undefined : deployStatus === "ready" ? undefined : openDeployDialog}
                disabled={deploying}
                className={cn(
                  "gap-1.5 text-xs w-full h-9 transition-all",
                  deployStatus === "ready"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90"
                )}
              >
                {deploying ? (
                  <><Loader2 className="size-3.5 animate-spin" />{deployStatus === "uploading" ? "Uploading..." : "Deploying..."}</>
                ) : deployStatus === "ready" ? (
                  <><Check className="size-3.5" />Deployed</>
                ) : (
                  <><Rocket className="size-3.5" />Deploy to Vercel</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { dispatch({ type: "CLEAR_PORTFOLIO" }); setDeployStatus("idle"); setDeployUrl(null); setDeployError(null); generate() }}
                className="gap-1.5 text-xs w-full h-9 text-muted-foreground"
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
            </div>

            {/* AI Refinement panel */}
            {config.useAITemplate && (
              <div className="rounded-xl border border-[var(--persona-border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRefinePanel((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--persona-surface)] hover:bg-[var(--persona-surface-hover)] transition-colors text-left"
                >
                  <Wand2 className="size-4 text-[var(--persona-accent)] shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">Refine with AI</span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showRefinePanel && "rotate-180")} />
                </button>
                {showRefinePanel && (
                  <div className="px-4 pb-4 pt-1 bg-[var(--persona-surface)] border-t border-[var(--persona-border)] animate-fade-in-up">
                    <p className="text-xs text-muted-foreground mb-3">
                      Describe how to improve your design. Try: &ldquo;Make it darker&rdquo;, &ldquo;Use more whitespace&rdquo;, &ldquo;Switch to a warm palette&rdquo;
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="e.g., Make the hero section more bold..."
                        className="flex-1 bg-background border-[var(--persona-border)] focus-visible:border-[var(--persona-accent)] text-sm h-9"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && refinementPrompt.trim() && !isRefining) refineTemplate()
                        }}
                        disabled={isRefining}
                      />
                      <Button
                        onClick={refineTemplate}
                        disabled={!refinementPrompt.trim() || isRefining}
                        size="sm"
                        className="gap-1.5 h-9 bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 shrink-0"
                      >
                        {isRefining ? (
                          <><Loader2 className="size-3.5 animate-spin" />Refining...</>
                        ) : (
                          <><Send className="size-3.5" />Apply</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Deploy name dialog ── */}
      {showDeployDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeployDialog(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Name your portfolio site"
        >
          <div className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in-scale">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-[var(--persona-accent)]/10 flex items-center justify-center shrink-0">
                  <Globe className="size-5 text-[var(--persona-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground leading-tight">Name your site</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose a URL for your portfolio</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeployDialog(false)}
                  className="size-8 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                  aria-label="Close dialog"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="mb-5">
                <Input
                  value={deployName}
                  onChange={(e) => setDeployName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-"))}
                  placeholder="firstname-lastname-portfolio"
                  className="bg-background border-border font-mono text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deployName.trim()) deployToVercel()
                    else if (e.key === "Escape") setShowDeployDialog(false)
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Link2 className="size-3 shrink-0" />
                  <span>
                    Your site will be live at{" "}
                    <span className="font-mono text-[var(--persona-accent)]">
                      {deployName || "your-name-portfolio"}.vercel.app
                    </span>
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDeployDialog(false)} className="flex-1 border-border h-10">
                  Cancel
                </Button>
                <Button
                  onClick={deployToVercel}
                  disabled={!deployName.trim()}
                  className="flex-1 gap-2 bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 h-10"
                >
                  <Rocket className="size-4" />
                  Deploy now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
