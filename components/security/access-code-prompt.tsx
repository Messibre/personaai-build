"use client"

import { useEffect, useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { onAccessRequired, setBetaCode } from "@/lib/security/beta-code"

/** Stays hidden until a request is refused with 401, then asks for the access code. */
export function AccessCodePrompt() {
  const [visible, setVisible] = useState(false)
  const [code, setCode] = useState("")
  const inputId = useId()

  useEffect(() => onAccessRequired(() => setVisible(true)), [])

  if (!visible) return null

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setBetaCode(trimmed)
    setCode("")
    setVisible(false)
  }

  return (
    <form
      onSubmit={save}
      role="alert"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId}>Access code</Label>
        <p className="text-sm text-muted-foreground">This beta needs an access code. Enter it, then try again.</p>
      </div>
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="password"
          autoComplete="off"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={!code.trim()}>
          Save
        </Button>
      </div>
    </form>
  )
}
