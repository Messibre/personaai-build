"use client"

import { guardedFetch, rateLimitMessage } from "@/lib/security/guarded-fetch"
import { useCallback, useRef, useState, type Dispatch } from "react"
import type { WizardState, WizardAction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Upload, FileText, ArrowRight, ArrowLeft, AlertCircle, X, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getFriendlyErrorMessage, getFriendlyServerStatusMessage } from "@/lib/user-friendly-error"

interface StepResumeProps {
  state: WizardState
  dispatch: Dispatch<WizardAction>
  onNext: () => void
  onBack: () => void
}

export function StepResume({ state, dispatch, onNext, onBack }: StepResumeProps) {
  const { resume } = state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        dispatch({ type: "SET_RESUME_ERROR", error: "Only PDF files are accepted." })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        dispatch({ type: "SET_RESUME_ERROR", error: "File size exceeds 5MB limit." })
        return
      }

      dispatch({ type: "SET_RESUME_FILE", file })
      dispatch({ type: "SET_RESUME_LOADING", loading: true })

      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await guardedFetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          dispatch({ type: "SET_RESUME_ERROR", error: rateLimitMessage(res) || getFriendlyServerStatusMessage(res.status, "resume") || getFriendlyErrorMessage(data.error, "resume") })
          return
        }

        dispatch({ type: "SET_RESUME_TEXT", text: data.text })
      } catch (err) {
        dispatch({ type: "SET_RESUME_ERROR", error: getFriendlyErrorMessage(err, "resume") })
      }
    },
    [dispatch]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">Upload Your Resume</h2>
        <p className="text-muted-foreground leading-relaxed">
          Upload a PDF resume to enrich your portfolio with experience, education, and skills.
          This step is optional.
        </p>
      </div>

      {/* Drop Zone */}
      {!resume.text && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300",
            isDragging
              ? "border-[var(--persona-accent)] bg-[var(--persona-accent)]/10 scale-[1.02]"
              : "border-[var(--persona-border)] bg-[var(--persona-surface)] hover:border-[var(--persona-accent)]/50 hover:bg-[var(--persona-surface-hover)]",
            resume.loading && "pointer-events-none opacity-60"
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
          }}
        >
          {resume.loading ? (
            <>
              <Spinner className="size-8 text-[var(--persona-accent)]" />
              <p className="text-sm text-muted-foreground">Parsing your resume...</p>
            </>
          ) : (
            <>
              <div className={cn(
                "flex items-center justify-center size-14 rounded-full bg-[var(--persona-accent)]/10 transition-transform duration-300",
                isDragging && "animate-float"
              )}>
                <Upload className="size-6 text-[var(--persona-accent)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF files up to 5MB</p>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload resume PDF"
          />
        </div>
      )}

      {/* Error */}
      {resume.error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 animate-fade-in-scale">
          <AlertCircle className="size-4 shrink-0" />
          <span>{resume.error}</span>
        </div>
      )}

      {/* Success - Parsed Text Preview */}
      {resume.text && (
        <Card className="border-[var(--persona-accent)]/20 bg-[var(--persona-accent)]/5 animate-fade-in-scale">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-full bg-[var(--persona-accent)]/10">
                  <FileText className="size-5 text-[var(--persona-accent)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {resume.file?.name || "Resume"}
                    </h3>
                    <CheckCircle className="size-4 text-green-500 animate-check-pop" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {resume.text.length.toLocaleString()} characters extracted
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => dispatch({ type: "CLEAR_RESUME" })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
                <span className="sr-only">Remove resume</span>
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-background/60 border border-[var(--persona-border)] p-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {resume.text.substring(0, 800)}
                {resume.text.length > 800 && "..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {!resume.text && (
            <Button variant="ghost" onClick={onNext} className="text-muted-foreground hover:text-foreground transition-colors">
              Skip
            </Button>
          )}
          <Button
            onClick={onNext}
            className="bg-[var(--persona-accent)] text-[var(--persona-bg)] hover:bg-[var(--persona-accent)]/90 gap-2 shadow-lg shadow-[var(--persona-accent)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--persona-accent)]/30 hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
