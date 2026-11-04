"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { CopyButton } from "./copy-button"
import { DownloadButton } from "./download-button"

interface ResumeViewProps {
  html: string
  text: string
  fileStem: string
}

export function ResumeView({ html, text, fileStem }: ResumeViewProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [printHint, setPrintHint] = useState(false)

  function print() {
    try {
      const target = frame.current?.contentWindow
      if (!target) throw new Error("No preview window")
      target.focus()
      target.print()
      setPrintHint(false)
    } catch {
      // A sandboxed frame without allow-same-origin is cross-origin, so the browser may refuse.
      setPrintHint(true)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={print}>
          Print / Save as PDF
        </Button>
        <CopyButton text={text} label="Copy as text" />
        <DownloadButton content={html} filename={`${fileStem}-resume.html`} mimeType="text/html" label="Download HTML" />
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {printHint
          ? "Your browser blocked printing from the preview. Download the HTML, open it, and use Print / Save as PDF there."
          : ""}
      </p>
      <iframe
        ref={frame}
        title="Resume preview"
        srcDoc={html}
        sandbox=""
        className="h-[720px] w-full rounded-md border border-border"
      />
    </div>
  )
}
