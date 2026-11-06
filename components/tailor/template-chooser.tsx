"use client"

import { useState } from "react"
import { TEMPLATE_OPTIONS, type ColorScheme, type TemplateStyle } from "@/lib/types"
import { cn } from "@/lib/utils"

export function TemplateChooser({ value, colorScheme, disabled, onChange }: {
  value: TemplateStyle; colorScheme: ColorScheme; disabled: boolean; onChange: (template: TemplateStyle) => void
}) {
  const [loaded, setLoaded] = useState("")
  const url = `/api/tailor/template-preview?template=${encodeURIComponent(value)}&color=${encodeURIComponent(colorScheme)}`
  const active = TEMPLATE_OPTIONS.find((option) => option.id === value)!
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-3 text-sm font-medium">Choose a template</legend>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATE_OPTIONS.map((option) => <label key={option.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm focus-within:ring-2 focus-within:ring-ring", value === option.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-card-foreground", disabled && "cursor-not-allowed opacity-60")}>
          <input type="radio" name="portfolio-template" value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} className="accent-primary" />
          <span>{option.label}</span>
        </label>)}
      </div>
    </fieldset>
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold">{active.label} preview</h4>
        <p className="text-sm text-muted-foreground">{active.description}</p>
      </div>
      <p role="status" className="text-sm text-muted-foreground">{loaded === url ? "Layout sample only—not your generated content." : "Loading layout sample…"}</p>
      <iframe key={url} src={url} title={`${active.label} layout preview`} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setLoaded(url)} className="h-[460px] w-full rounded-lg border border-border bg-background" />
      <p className="text-sm text-muted-foreground">Scroll inside to explore. Empty sections are removed from your final portfolio. Some designs use a fixed palette.</p>
    </div>
  </div>
}
