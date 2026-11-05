"use client"

import { guardedFetch, rateLimitMessage } from "@/lib/security/guarded-fetch"
import { useState, useEffect, useCallback, type Dispatch } from "react"
import type { WizardState, WizardAction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getFriendlyErrorMessage } from "@/lib/user-friendly-error"
import {
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Link2,
  Plus,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Linkedin,
  Globe,
  BookOpen,
} from "lucide-react"

interface StepTargetRoleProps {
  state: WizardState
  dispatch: Dispatch<WizardAction>
  onNext: () => void
  onBack: () => void
}

const ROLE_SUGGESTIONS = [
  "Senior Frontend Developer",
  "Full-Stack Engineer",
  "React Developer",
  "Machine Learning Engineer",
  "Data Scientist",
  "DevOps Engineer",
  "Mobile Developer",
  "UI/UX Designer",
  "Backend Developer",
  "Cloud Architect",
]

const LINK_PLACEHOLDERS = [
  { icon: Linkedin, placeholder: "https://linkedin.com/in/yourprofile", label: "LinkedIn" },
  { icon: Globe, placeholder: "https://yourblog.com", label: "Personal Blog" },
  { icon: BookOpen, placeholder: "https://yoursubstack.substack.com", label: "Substack" },
]

// Detect what kind of link a URL is and return the matching social link key
function detectLinkType(url: string): keyof import("@/lib/types").SocialLinks | null {
  try {
    const host = new URL(url).hostname.replace("www.", "")
    if (host.includes("linkedin.com")) return "linkedin"
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter"
    if (host.includes("substack.com")) return "substack"
    // Treat any personal domain or blog as "blog"
    return "blog"
  } catch {
    return null
  }
}

export function StepTargetRole({ state, dispatch, onNext, onBack }: StepTargetRoleProps) {
  const { targetRole, aiContent, github, resume, notion, config } = state
  const [newLink, setNewLink] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const addLink = useCallback(() => {
    const trimmed = newLink.trim()
    if (!trimmed) return
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return
    if (targetRole.externalLinks.includes(trimmed)) {
      setNewLink("")
      return
    }

    // Add to external links for scraping
    dispatch({ type: "SET_EXTERNAL_LINKS", links: [...targetRole.externalLinks, trimmed] })

    // Also auto-fill the matching social link in config so the portfolio contact section gets it
    const linkType = detectLinkType(trimmed)
    if (linkType) {
      // Only set if the slot is empty — don't overwrite something already typed
      const existing = config.socialLinks?.[linkType]
      if (!existing) {
        dispatch({
          type: "SET_SOCIAL_LINKS",
          socialLinks: { ...config.socialLinks, [linkType]: trimmed },
        })
      }
    }

    setNewLink("")
  }, [newLink, targetRole.externalLinks, config.socialLinks, dispatch])

  const removeLink = useCallback(
    (url: string) => {
      dispatch({
        type: "SET_EXTERNAL_LINKS",
        links: targetRole.externalLinks.filter((l) => l !== url),
      })
    },
    [targetRole.externalLinks, dispatch]
  )

  // Once AI content lands in state, advance to the next step.
  // This runs in a useEffect so the state commit from dispatch() has already
  // been applied before onNext() fires — avoiding the stale-state race.
  const [pendingAdvance, setPendingAdvance] = useState(false)
  useEffect(() => {
    if (pendingAdvance && aiContent.projects !== null && !aiContent.loading) {
      setPendingAdvance(false)
      onNext()
    }
  }, [pendingAdvance, aiContent.projects, aiContent.loading, onNext])

  const generateAIContent = useCallback(async () => {
    if (!targetRole.role.trim()) return

    setIsGenerating(true)
    dispatch({ type: "SET_AI_CONTENT_LOADING", loading: true })

    try {
      const res = await guardedFetch("/api/ai-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: targetRole.role,
          externalLinks: targetRole.externalLinks,
          github: {
            profile: github.profile,
            repos: github.repos,
          },
          resumeText: resume.text,
          notionContent: notion.content,
          additionalPrompt: config.additionalPrompt,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(rateLimitMessage(res) || getFriendlyErrorMessage(data.error || `Server error (${res.status})`, "aiContent"))
      }

      dispatch({
        type: "SET_AI_CONTENT",
        content: {
          projects: data.projects,
          aboutMe: data.aboutMe,
          heroTagline: data.heroTagline,
        },
      })

      // Signal the useEffect above to advance once state has committed
      setPendingAdvance(true)
    } catch (err) {
      dispatch({ type: "SET_AI_CONTENT_ERROR", error: getFriendlyErrorMessage(err, "aiContent") })
    } finally {
      setIsGenerating(false)
      dispatch({ type: "SET_AI_CONTENT_LOADING", loading: false })
    }
  }, [targetRole, github, resume, notion, config.additionalPrompt, dispatch])

  const skipAIGeneration = useCallback(() => {
    // Advance immediately — but still fire the AI content request in the background
    // using whatever data we have (even without a target role), so the generate step
    // gets real project descriptions and a bio rather than raw GitHub placeholders.
    onNext()

    if (github.profile) {
      dispatch({ type: "SET_AI_CONTENT_LOADING", loading: true })
      fetch("/api/ai-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: targetRole.role || "",
          externalLinks: targetRole.externalLinks,
          github: { profile: github.profile, repos: github.repos },
          resumeText: resume.text,
          notionContent: notion.content,
          additionalPrompt: config.additionalPrompt,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.projects) {
            dispatch({
              type: "SET_AI_CONTENT",
              content: { projects: data.projects, aboutMe: data.aboutMe, heroTagline: data.heroTagline },
            })
          }
        })
        .catch((err) => {
          dispatch({ type: "SET_AI_CONTENT_ERROR", error: getFriendlyErrorMessage(err, "aiContent") })
        })
    }
  }, [dispatch, onNext, github, resume, notion, config.additionalPrompt, targetRole])

  const canGenerate = targetRole.role.trim().length > 2

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">
          Make it sound like you
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Tell us the role you want. Then share links to your writing — blogs, Substack, LinkedIn — so the AI can pick up your actual voice and personality, not just your job title.
        </p>
      </div>

      {/* Target Role Input */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Briefcase className="size-4 text-[var(--persona-accent)]" />
          Target Role
        </h3>
        <Input
          value={targetRole.role}
          onChange={(e) => dispatch({ type: "SET_TARGET_ROLE", role: e.target.value })}
          placeholder="e.g., Senior React Developer"
          className="text-base bg-[var(--persona-surface)] border-[var(--persona-border)] focus-visible:border-[var(--persona-accent)] focus-visible:ring-[var(--persona-accent)]/20"
        />
        
        {/* Role Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {ROLE_SUGGESTIONS.slice(0, 5).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => dispatch({ type: "SET_TARGET_ROLE", role })}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                targetRole.role === role
                  ? "bg-[var(--persona-accent)] text-[var(--persona-bg)]"
                  : "bg-[var(--persona-surface)] text-muted-foreground hover:bg-[var(--persona-surface-hover)] hover:text-foreground border border-[var(--persona-border)]"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* External Links */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Link2 className="size-4 text-[var(--persona-accent)]" />
          Your Links
          <span className="text-xs font-normal text-muted-foreground">(optional but recommended)</span>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Add your blog, Substack, LinkedIn, or any page where you write or share ideas. The AI reads your actual words to understand your personality and voice — so your portfolio sounds like you, not a template. Links are also auto-added to your contact section.
        </p>

        {/* Existing Links */}
        {targetRole.externalLinks.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {targetRole.externalLinks.map((url) => {
              const linkType = detectLinkType(url)
              const typeLabel = linkType === "linkedin" ? "LinkedIn"
                : linkType === "twitter" ? "X / Twitter"
                : linkType === "substack" ? "Substack"
                : "Blog / Site"
              return (
                <div
                  key={url}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--persona-surface)] border border-[var(--persona-border)] group"
                >
                  <Link2 className="size-4 text-muted-foreground shrink-0" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-[var(--persona-accent)] hover:underline truncate"
                  >
                    {url}
                  </a>
                  <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--persona-accent)]/10 text-[var(--persona-accent)] border border-[var(--persona-accent)]/20">
                    {typeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLink(url)}
                    className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove link"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add New Link */}
        <div className="flex gap-2">
          <Input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="flex-1 bg-[var(--persona-surface)] border-[var(--persona-border)] focus-visible:border-[var(--persona-accent)] focus-visible:ring-[var(--persona-accent)]/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addLink()
              }
            }}
          />
          <Button
            type="button"
            onClick={addLink}
            variant="outline"
            size="icon"
            className="shrink-0 border-[var(--persona-border)] hover:border-[var(--persona-accent)] hover:bg-[var(--persona-accent)]/10"
            disabled={!newLink.trim()}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Quick Add Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {LINK_PLACEHOLDERS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setNewLink(item.placeholder)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--persona-surface)] text-muted-foreground hover:bg-[var(--persona-surface-hover)] hover:text-foreground border border-[var(--persona-border)] transition-all duration-200"
              >
                <Icon className="size-3" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* AI Generation Status */}
      {aiContent.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-fade-in-scale">
          <AlertCircle className="size-4 shrink-0" />
          <span>{aiContent.error}</span>
        </div>
      )}

      {/* AI Preview (if generated) */}
      {aiContent.aboutMe && aiContent.heroTagline && (
        <div className="p-4 rounded-xl bg-[var(--persona-accent)]/5 border border-[var(--persona-accent)]/20 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-[var(--persona-accent)]" />
            <span className="text-sm font-semibold text-foreground">AI-Generated Content Ready</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Tagline:</strong> {aiContent.heroTagline}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              <strong className="text-foreground">About:</strong> {aiContent.aboutMe}
            </p>
            {aiContent.projects && (
              <p className="text-xs text-muted-foreground">
                {aiContent.projects.length} role-relevant projects selected
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={skipAIGeneration}
            className="border-[var(--persona-border)] text-muted-foreground hover:text-foreground"
            disabled={isGenerating}
          >
            Skip AI
          </Button>
          <Button
            onClick={generateAIContent}
            disabled={!canGenerate || isGenerating}
            className="gap-2 bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 shadow-lg shadow-[var(--persona-accent)]/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate AI Content
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
