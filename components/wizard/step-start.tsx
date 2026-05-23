"use client"

import { useState, useCallback, useRef, type Dispatch } from "react"
import type { WizardState, WizardAction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Github, Star, GitFork, Users, ArrowRight, AlertCircle, X,
  Link2, StickyNote, User, CheckCircle
} from "lucide-react"
import { getFriendlyErrorMessage, getFriendlyServerStatusMessage } from "@/lib/user-friendly-error"

interface StepStartProps {
  state: WizardState
  dispatch: Dispatch<WizardAction>
  onNext: () => void
}

type InputMode = "github" | "notion" | "manual" | null

export function StepStart({ state, dispatch, onNext }: StepStartProps) {
  const { github, notion } = state
  const [mode, setMode] = useState<InputMode>(github.profile ? "github" : null)
  const [manualName, setManualName] = useState("")
  const [manualRole, setManualRole] = useState("")
  const [manualBio, setManualBio] = useState("")

  const hasData = github.profile !== null || notion.content !== null || (manualName.trim().length > 0)

  // --- GitHub ---
  const fetchGithub = useCallback(async () => {
    if (!github.username.trim()) return
    dispatch({ type: "SET_GITHUB_LOADING", loading: true })
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: github.username.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        dispatch({ type: "SET_GITHUB_ERROR", error: getFriendlyServerStatusMessage(res.status, "github") || getFriendlyErrorMessage(data.error, "github") })
        return
      }
      dispatch({ type: "SET_GITHUB_DATA", profile: data.profile, repos: data.repos })
    } catch (err) {
      dispatch({ type: "SET_GITHUB_ERROR", error: getFriendlyErrorMessage(err, "github") })
    }
  }, [github.username, dispatch])

  // --- Notion ---
  const fetchNotion = useCallback(async () => {
    if (!notion.url.trim()) return
    dispatch({ type: "SET_NOTION_LOADING", loading: true })
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: notion.url.trim() }),
      })
      const data = await res.json()
      if (data.content) {
        dispatch({ type: "SET_NOTION_CONTENT", content: data.content })
      } else {
        dispatch({ type: "SET_NOTION_ERROR", error: getFriendlyServerStatusMessage(res.status, "notion") || getFriendlyErrorMessage(data.error, "notion") })
      }
    } catch (err) {
      dispatch({ type: "SET_NOTION_ERROR", error: getFriendlyErrorMessage(err, "notion") })
    }
  }, [notion.url, dispatch])

  // --- Manual mode: create a synthetic github profile ---
  const applyManual = useCallback(() => {
    if (!manualName.trim()) return
    const syntheticProfile = {
      username: manualName.trim().toLowerCase().replace(/\s+/g, "-"),
      name: manualName.trim(),
      bio: manualBio.trim() || null,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(manualName.trim())}`,
      followers: 0,
      following: 0,
      public_repos: 0,
      html_url: "#",
      location: null,
      blog: null,
      company: manualRole.trim() || null,
    }
    dispatch({ type: "SET_GITHUB_DATA", profile: syntheticProfile, repos: [] })
  }, [manualName, manualRole, manualBio, dispatch])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">
          {"Let's build your portfolio"}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Choose how you want to get started. You can use GitHub, a Notion page, or just enter your info manually.
        </p>
      </div>

      {/* Source Selection */}
      {!mode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setMode("github")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[var(--persona-border)] bg-[var(--persona-surface)] hover:border-[var(--persona-accent)] hover:bg-[var(--persona-accent)]/5 transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-[var(--persona-accent)]/10 group-hover:bg-[var(--persona-accent)]/20 transition-colors">
              <Github className="size-6 text-[var(--persona-accent)]" />
            </div>
            <span className="font-semibold text-foreground">GitHub</span>
            <span className="text-xs text-muted-foreground text-center">Import profile, repos & languages</span>
          </button>

          <button
            onClick={() => setMode("notion")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[var(--persona-border)] bg-[var(--persona-surface)] hover:border-[var(--persona-accent)] hover:bg-[var(--persona-accent)]/5 transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-[var(--persona-accent)]/10 group-hover:bg-[var(--persona-accent)]/20 transition-colors">
              <StickyNote className="size-6 text-[var(--persona-accent)]" />
            </div>
            <span className="font-semibold text-foreground">Notion</span>
            <span className="text-xs text-muted-foreground text-center">Import from a public Notion page</span>
          </button>

          <button
            onClick={() => setMode("manual")}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-[var(--persona-border)] bg-[var(--persona-surface)] hover:border-[var(--persona-accent)] hover:bg-[var(--persona-accent)]/5 transition-all duration-300 hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-[var(--persona-accent)]/10 group-hover:bg-[var(--persona-accent)]/20 transition-colors">
              <User className="size-6 text-[var(--persona-accent)]" />
            </div>
            <span className="font-semibold text-foreground">Manual</span>
            <span className="text-xs text-muted-foreground text-center">Enter your name, role & bio</span>
          </button>
        </div>
      )}

      {/* GitHub Input */}
      {mode === "github" && (
        <div className="flex flex-col gap-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => { setMode(null); dispatch({ type: "CLEAR_GITHUB" }) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">&larr; Back</button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium text-[var(--persona-accent)]">GitHub</span>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="e.g. torvalds"
                value={github.username}
                onChange={(e) => dispatch({ type: "SET_GITHUB_USERNAME", username: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchGithub() } }}
                className="pl-10 bg-[var(--persona-surface)] border-[var(--persona-border)] focus-visible:border-[var(--persona-accent)] focus-visible:ring-[var(--persona-accent)]/20 transition-all duration-300"
                disabled={github.loading}
              />
            </div>
            <Button
              onClick={fetchGithub}
              disabled={!github.username.trim() || github.loading}
              className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {github.loading ? <Spinner /> : "Fetch"}
            </Button>
          </div>
          {github.error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 animate-fade-in-scale">
              <AlertCircle className="size-4 shrink-0" />
              <span>{github.error}</span>
            </div>
          )}
          {github.loading && (
            <Card className="border-[var(--persona-border)] bg-[var(--persona-surface)] animate-shimmer">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-14 rounded-full" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {github.profile && !github.loading && (
            <Card className="border-[var(--persona-accent)]/20 bg-[var(--persona-accent)]/5 animate-fade-in-scale">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <img src={github.profile.avatar_url} alt={`${github.profile.username}'s avatar`} className="size-14 rounded-full border-2 border-[var(--persona-accent)]/30 shadow-md" crossOrigin="anonymous" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{github.profile.name || github.profile.username}</h3>
                        <CheckCircle className="size-4 text-green-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">@{github.profile.username}</p>
                      {github.profile.bio && <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">{github.profile.bio}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: "CLEAR_GITHUB" })} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" /><span className="sr-only">Clear</span>
                  </Button>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="size-3.5" /><span className="font-medium text-foreground">{github.profile.followers}</span> followers</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><GitFork className="size-3.5" /><span className="font-medium text-foreground">{github.profile.public_repos}</span> repos</div>
                </div>
                {github.repos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Projects</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {github.repos.slice(0, 4).map((repo) => (
                        <div key={repo.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border border-[var(--persona-border)]">
                          <span className="font-medium text-sm text-foreground truncate">{repo.name}</span>
                          {repo.stargazers_count > 0 && <div className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0"><Star className="size-3" />{repo.stargazers_count}</div>}
                          {repo.language && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{repo.language}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Notion Input */}
      {mode === "notion" && (
        <div className="flex flex-col gap-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => { setMode(null); dispatch({ type: "CLEAR_NOTION" }) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">&larr; Back</button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium text-[var(--persona-accent)]">Notion</span>
          </div>
          <p className="text-sm text-muted-foreground">Paste a link to your public Notion page. Make sure it is published to the web (Share &rarr; Publish).</p>
          {!notion.content && (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="https://your-name.notion.site/My-Portfolio-abc123..."
                  value={notion.url}
                  onChange={(e) => dispatch({ type: "SET_NOTION_URL", url: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchNotion() } }}
                  className="pl-10 bg-[var(--persona-surface)] border-[var(--persona-border)] focus-visible:border-[var(--persona-accent)] focus-visible:ring-[var(--persona-accent)]/20 transition-all duration-300"
                  disabled={notion.loading}
                />
              </div>
              <Button onClick={fetchNotion} disabled={!notion.url.trim() || notion.loading} className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                {notion.loading ? <Spinner /> : "Fetch"}
              </Button>
            </div>
          )}
          {notion.loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4 animate-fade-in-up">
              <Spinner className="size-5 text-[var(--persona-accent)]" />
              <span>Fetching Notion content...</span>
            </div>
          )}
          {notion.error && (
            <div className="flex items-start gap-2 text-sm text-amber-500 bg-amber-500/10 rounded-lg px-4 py-3 animate-fade-in-scale">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p>{notion.error}</p>
                <p className="text-xs text-amber-500/70 mt-1">Make sure the page is published: Share &rarr; Publish to web. Private pages cannot be accessed.</p>
              </div>
            </div>
          )}
          {notion.content && (
            <Card className="border-[var(--persona-accent)]/20 bg-[var(--persona-accent)]/5 animate-fade-in-scale">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StickyNote className="size-5 text-[var(--persona-accent)]" />
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Content imported</h3>
                      <CheckCircle className="size-4 text-green-500" />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: "CLEAR_NOTION" })} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" /><span className="sr-only">Clear</span>
                  </Button>
                </div>
                <div className="max-h-28 overflow-y-auto rounded-lg bg-background/60 border border-[var(--persona-border)] p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {notion.content.substring(0, 400)}{notion.content.length > 400 && "..."}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">You will also need to enter your name on the next step so the portfolio has a title.</p>
              </CardContent>
            </Card>
          )}
          {/* If they have Notion content but no GitHub profile, let them add name */}
          {notion.content && !github.profile && (
            <div className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--persona-border)] bg-[var(--persona-surface)]">
              <p className="text-sm font-medium text-foreground">Your details</p>
              <Input placeholder="Your full name" value={manualName} onChange={(e) => setManualName(e.target.value)} className="bg-background border-[var(--persona-border)]" />
              <Input placeholder="Role (e.g. Product Designer, Writer)" value={manualRole} onChange={(e) => setManualRole(e.target.value)} className="bg-background border-[var(--persona-border)]" />
              <Button onClick={applyManual} disabled={!manualName.trim()} className="w-fit bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90">Save</Button>
            </div>
          )}
        </div>
      )}

      {/* Manual Input */}
      {mode === "manual" && (
        <div className="flex flex-col gap-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => { setMode(null); if (!github.profile) dispatch({ type: "CLEAR_GITHUB" }) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">&larr; Back</button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium text-[var(--persona-accent)]">Manual</span>
          </div>
          <div className="flex flex-col gap-3 p-5 rounded-xl border border-[var(--persona-border)] bg-[var(--persona-surface)]">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
              <Input placeholder="e.g. Jane Smith" value={manualName} onChange={(e) => setManualName(e.target.value)} className="bg-background border-[var(--persona-border)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Role / Title</label>
              <Input placeholder="e.g. Product Designer, Writer, Student" value={manualRole} onChange={(e) => setManualRole(e.target.value)} className="bg-background border-[var(--persona-border)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Short Bio</label>
              <textarea
                placeholder="Tell us about yourself in a few sentences..."
                value={manualBio}
                onChange={(e) => setManualBio(e.target.value)}
                rows={3}
                className="w-full rounded-md bg-background border border-[var(--persona-border)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--persona-accent)] focus:ring-1 focus:ring-[var(--persona-accent)]/20 transition-all"
              />
            </div>
            {github.profile ? (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle className="size-4" />
                <span>Profile saved: {github.profile.name}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: "CLEAR_GITHUB" })} className="text-muted-foreground hover:text-foreground ml-auto"><X className="size-3" /></Button>
              </div>
            ) : (
              <Button onClick={applyManual} disabled={!manualName.trim()} className="w-fit bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90">Save Profile</Button>
            )}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!hasData}
          className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 gap-2 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--persona-accent)]/30 hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Early Access Promo */}
      <div className="flex flex-col items-center text-center gap-4 pt-8 pb-4 border-t border-[var(--persona-border)] mt-4">
        <div className="flex flex-col gap-2 max-w-md">
          <h3 className="text-lg font-semibold text-foreground">
            New portfolio designs are almost here.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our designers have been crafting stunning, modern templates that make your work look as good as it deserves. Sign up now to get early access + an exclusive launch discount.
          </p>
        </div>
        <a
          href="https://tally.so/r/D4ZJbZ"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--persona-accent)] text-[var(--persona-bg)] font-medium text-sm hover:bg-[var(--persona-accent)]/90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--persona-accent)]/20"
        >
          Get Early Access & Discount
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  )
}
