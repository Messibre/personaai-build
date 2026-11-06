"use client"

import { useState, type FormEvent } from "react"
import { vaultSchema, type Vault } from "@/lib/schemas/vault"

export function ProfileEditor({ vault, onSave }: {
  vault: Vault
  onSave: (update: (current: Vault) => Vault) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    const person = {
      name: String(data.get("name") ?? "").trim(),
      ...(email ? { email } : {}),
      links: String(data.get("links") ?? "").split(/\r?\n/).map((link) => link.trim()).filter(Boolean),
    }
    const parsed = vaultSchema.safeParse({ ...vault, person })
    if (!parsed.success || person.links.some((link) => !/^https:\/\//i.test(link))) {
      setFailed(true)
      setMessage("Enter a name, a valid email if provided, and complete https:// links (one per line).")
      return
    }
    setBusy(true)
    setMessage("")
    try {
      await onSave((current) => ({ ...current, person, updatedAt: new Date().toISOString() }))
      setFailed(false)
      setMessage("Profile saved. Review contact visibility before generating public outputs.")
    } catch {
      setFailed(true)
      setMessage("Profile could not be saved. Your changes remain here; please retry.")
    } finally { setBusy(false) }
  }

  return <section className="rounded-xl border bg-card p-6 text-card-foreground" aria-labelledby="profile-heading">
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 id="profile-heading" className="text-xl font-semibold">Your profile & contacts</h2>
        <p className="text-sm text-muted-foreground">Add the details you want to share. Email and links are optional; choose what appears when tailoring.</p>
      </div>
      <label className="flex flex-col gap-2">Display name
        <input name="name" required maxLength={200} defaultValue={vault.person.name} autoComplete="name" className="rounded-md border bg-background px-3 py-2 text-foreground" />
      </label>
      <label className="flex flex-col gap-2">Email (optional)
        <input name="email" type="email" maxLength={320} defaultValue={vault.person.email ?? ""} autoComplete="email" className="rounded-md border bg-background px-3 py-2 text-foreground" />
      </label>
      <label className="flex flex-col gap-2">LinkedIn, X, GitHub or website links (optional)
        <textarea name="links" rows={4} defaultValue={vault.person.links.join("\n")} placeholder="https://www.linkedin.com/in/your-name" className="rounded-md border bg-background px-3 py-2 text-foreground" aria-describedby="links-help" />
      </label>
      <p id="links-help" className="text-sm text-muted-foreground">One complete URL per line. Importing GitHub projects does not require displaying your GitHub profile.</p>
      <button disabled={busy} className="self-start rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save profile"}</button>
      {message ? <p role={failed ? "alert" : "status"} className="text-sm">{message}</p> : null}
    </form>
  </section>
}
