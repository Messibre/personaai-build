"use client"

import { guardedFetch, rateLimitMessage } from "@/lib/security/guarded-fetch"
import { useCallback, type Dispatch } from "react"
import type { WizardState, WizardAction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Github, Star, GitFork, Users, ArrowRight, AlertCircle, X } from "lucide-react"
import { getFriendlyErrorMessage, getFriendlyServerStatusMessage } from "@/lib/user-friendly-error"

interface StepGithubProps {
  state: WizardState
  dispatch: Dispatch<WizardAction>
  onNext: () => void
}

export function StepGithub({ state, dispatch, onNext }: StepGithubProps) {
  const { github } = state

  const fetchGithub = useCallback(async () => {
    if (!github.username.trim()) return

    dispatch({ type: "SET_GITHUB_LOADING", loading: true })

    try {
      const res = await guardedFetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: github.username.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        dispatch({ type: "SET_GITHUB_ERROR", error: rateLimitMessage(res) || getFriendlyServerStatusMessage(res.status, "github") || getFriendlyErrorMessage(data.error, "github") })
        return
      }

      dispatch({ type: "SET_GITHUB_DATA", profile: data.profile, repos: data.repos })
    } catch (err) {
      dispatch({ type: "SET_GITHUB_ERROR", error: getFriendlyErrorMessage(err, "github") })
    }
  }, [github.username, dispatch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      fetchGithub()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">Connect Your GitHub</h2>
        <p className="text-muted-foreground leading-relaxed">
          Enter your GitHub username to import your profile, projects, and contributions.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Github className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="e.g. torvalds"
            value={github.username}
            onChange={(e) => dispatch({ type: "SET_GITHUB_USERNAME", username: e.target.value })}
            onKeyDown={handleKeyDown}
            className="pl-10 bg-[var(--persona-surface)] border-[var(--persona-border)] focus-visible:border-[var(--persona-accent)] focus-visible:ring-[var(--persona-accent)]/20 transition-all duration-300"
            disabled={github.loading}
          />
        </div>
        <Button
          onClick={fetchGithub}
          disabled={!github.username.trim() || github.loading}
          className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--persona-accent)]/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          {github.loading ? <Spinner /> : "Fetch"}
        </Button>
      </div>

      {/* Error */}
      {github.error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 animate-fade-in-scale">
          <AlertCircle className="size-4 shrink-0" />
          <span>{github.error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {github.loading && (
        <Card className="border-[var(--persona-border)] bg-[var(--persona-surface)] animate-shimmer">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Card */}
      {github.profile && !github.loading && (
        <Card className="border-[var(--persona-accent)]/20 bg-[var(--persona-accent)]/5 animate-fade-in-scale">
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={github.profile.avatar_url}
                  alt={`${github.profile.username}'s avatar`}
                  className="size-16 rounded-full border-2 border-[var(--persona-accent)]/30 shadow-md transition-transform duration-300 hover:scale-110"
                  crossOrigin="anonymous"
                />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {github.profile.name || github.profile.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{github.profile.username}</p>
                  {github.profile.bio && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
                      {github.profile.bio}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => dispatch({ type: "CLEAR_GITHUB" })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
                <span className="sr-only">Clear GitHub data</span>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-3.5" />
                <span className="font-medium text-foreground">{github.profile.followers}</span> followers
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <GitFork className="size-3.5" />
                <span className="font-medium text-foreground">{github.profile.public_repos}</span> repos
              </div>
            </div>

            {/* Top Repos */}
            {github.repos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Projects</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 stagger-children">
                  {github.repos.slice(0, 6).map((repo) => (
                    <div
                      key={repo.name}
                      className="flex flex-col gap-1 p-3 rounded-lg bg-background/60 border border-[var(--persona-border)] hover:border-[var(--persona-accent)]/30 transition-all duration-300 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {repo.name}
                        </span>
                        {repo.stargazers_count > 0 && (
                          <div className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                            <Star className="size-3" />
                            {repo.stargazers_count}
                          </div>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {repo.description}
                        </p>
                      )}
                      {repo.language && (
                        <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 mt-1">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!github.profile}
          className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 gap-2 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--persona-accent)]/30 hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
        >
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
