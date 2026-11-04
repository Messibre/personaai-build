"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type CopyState = "idle" | "copied" | "failed"

interface CopyButtonProps {
  text: string
  label?: string
  disabled?: boolean
}

export function CopyButton({ text, label = "Copy", disabled = false }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function copy() {
    let next: CopyState = "copied"
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      next = "failed"
    }
    setState(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState("idle"), 2500)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy} disabled={disabled}>
        {label}
      </Button>
      <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : ""}
      </span>
    </span>
  )
}
