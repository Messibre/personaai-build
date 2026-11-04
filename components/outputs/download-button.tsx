"use client"

import { Button } from "@/components/ui/button"

interface DownloadButtonProps {
  content: string
  filename: string
  mimeType: "text/html" | "text/plain"
  label: string
  disabled?: boolean
}

export function DownloadButton({ content, filename, mimeType, label, disabled = false }: DownloadButtonProps) {
  function download() {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={download} disabled={disabled}>
      {label}
    </Button>
  )
}
