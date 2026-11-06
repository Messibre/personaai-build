"use client"

import type { Vault } from "@/lib/schemas/vault"

import type { ContentSelection } from "@/lib/schemas/tailoring-preferences"
export type { ContentSelection } from "@/lib/schemas/tailoring-preferences"

export function selectedVault(vault: Vault, selection: ContentSelection): Vault {
  return {
    ...vault,
    tailoringPreferences: undefined,
    github: selection.github ? vault.github : undefined,
    person: {
      name: vault.person.name,
      ...(selection.contacts.includes("email") && vault.person.email ? { email: vault.person.email } : {}),
      links: vault.person.links.filter((link) => selection.contacts.includes(link)),
    },
    experience: vault.experience.filter((item) => selection.experience.includes(item.id)),
    education: vault.education.filter((item) => selection.education.includes(item.id)),
  }
}

export function ContentSelectionForm({ vault, value, onChange, disabled }: {
  vault: Vault; value: ContentSelection; onChange: (next: ContentSelection) => void; disabled: boolean
}) {
  function toggle(key: "experience" | "education" | "contacts", id: string) {
    onChange({ ...value, [key]: value[key].includes(id) ? value[key].filter((item) => item !== id) : [...value[key], id] })
  }
  return <fieldset disabled={disabled} className="flex flex-col gap-4 rounded-xl border p-5">
    <legend className="px-2 font-semibold">Choose what to include</legend>
    <p className="text-sm text-muted-foreground">Excluded experiences and education are not sent to generation. Contacts start private: check only what you want in your public outputs.</p>
    {vault.experience.map((item) => <label key={item.id} className="flex items-center gap-3"><input type="checkbox" checked={value.experience.includes(item.id)} onChange={() => toggle("experience", item.id)} />{item.title} · {item.company}</label>)}
    {vault.education.map((item) => <label key={item.id} className="flex items-center gap-3"><input type="checkbox" checked={value.education.includes(item.id)} onChange={() => toggle("education", item.id)} />{item.degree} · {item.institution}</label>)}
    {vault.person.email ? <label className="flex items-center gap-3"><input type="checkbox" checked={value.contacts.includes("email")} onChange={() => toggle("contacts", "email")} />Public email: {vault.person.email}</label> : null}
    {vault.person.links.map((link) => <label key={link} className="flex items-center gap-3 break-all"><input type="checkbox" checked={value.contacts.includes(link)} onChange={() => toggle("contacts", link)} />{link}</label>)}
    {vault.github ? <label className="flex items-center gap-3"><input type="checkbox" checked={value.github} onChange={() => onChange({ ...value, github: !value.github })} />Display GitHub profile and photo</label> : null}
    <p className="text-sm text-muted-foreground">Project repository links remain attached to included projects. Empty portfolio sections are hidden automatically.</p>
  </fieldset>
}
