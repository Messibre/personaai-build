import type { Removed } from "@/lib/schemas/tailor"

const REASONS: Record<Removed["reason"], string> = {
  unknown_fact: "It cited a fact that is not in your vault.",
  unconfirmed_fact: "It relied on a fact you have not confirmed.",
  number_mismatch: "It contained a number your facts do not support.",
  unsupported: "Your confirmed facts did not back it up.",
}

const SECTIONS: Record<Removed["section"], string> = {
  tagline: "Tagline",
  about: "About",
  project: "Project",
  resume: "Resume",
  note: "Note",
}

export function RemovedPanel({ removed, droppedByRewrite }: { removed: Removed[]; droppedByRewrite: number }) {
  if (removed.length === 0 && droppedByRewrite === 0) {
    return <p className="text-sm text-muted-foreground">The fact checker removed nothing.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        These sentences were removed because your confirmed facts do not support them. Confirm more facts in your vault to bring them back.
      </p>
      {droppedByRewrite > 0 ? (
        <p className="text-sm text-muted-foreground">{droppedByRewrite} more were dropped before checking because they did not cite a confirmed fact.</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {removed.map((entry, index) => (
          <li key={`${entry.section}-${entry.projectId ?? "none"}-${index}`} className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">{SECTIONS[entry.section]}</p>
            <p className="text-sm text-foreground">{entry.text}</p>
            <p className="text-sm text-muted-foreground">{REASONS[entry.reason]}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
