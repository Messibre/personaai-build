import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { countFacts, countVaultFacts } from "@/lib/ingest/summary"
import type { Vault } from "@/lib/schemas/vault"

const MAX_TECH_BADGES = 6

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

export function ProjectList({ vault }: { vault: Vault }) {
  const totals = countVaultFacts(vault)
  const isEmpty = vault.projects.length === 0 && vault.experience.length === 0 && vault.skills.length === 0

  return (
    <section aria-labelledby="vault-contents-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="vault-contents-heading" className="text-lg font-semibold text-foreground">
          {vault.person.name}&apos;s vault
        </h2>
        {totals.unconfirmed > 0 ? (
          <Badge variant="destructive" data-testid="unconfirmed-badge">
            {plural(totals.unconfirmed, "fact")} need{totals.unconfirmed === 1 ? "s" : ""} your confirmation
          </Badge>
        ) : totals.total > 0 ? (
          <Badge variant="secondary">All {plural(totals.total, "fact")} confirmed</Badge>
        ) : null}
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Import repositories or a resume above to start your vault.
        </p>
      ) : null}

      {vault.projects.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Projects">
          {vault.projects.map((project) => {
            const counts = countFacts(project.facts)
            return (
              <li key={project.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {project.url ? (
                        <a href={project.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                          {project.name}
                        </a>
                      ) : (
                        project.name
                      )}
                    </CardTitle>
                    <CardDescription>
                      {plural(counts.total, "fact")}
                      {counts.unconfirmed > 0 ? `, ${counts.unconfirmed} unconfirmed` : ", all confirmed"}
                      {project.primaryLanguage ? ` · ${project.primaryLanguage}` : ""}
                    </CardDescription>
                  </CardHeader>
                  {project.techs.length > 0 ? (
                    <CardContent className="flex flex-wrap gap-2">
                      {project.techs.slice(0, MAX_TECH_BADGES).map((tech) => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                      {project.techs.length > MAX_TECH_BADGES ? (
                        <Badge variant="outline">+{project.techs.length - MAX_TECH_BADGES} more</Badge>
                      ) : null}
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            )
          })}
        </ul>
      ) : null}

      {vault.experience.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Experience">
          {vault.experience.map((entry) => {
            const counts = countFacts(entry.facts)
            return (
              <li key={entry.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {entry.title} at {entry.company}
                    </CardTitle>
                    <CardDescription>
                      {plural(counts.total, "fact")}
                      {counts.unconfirmed > 0 ? `, ${counts.unconfirmed} unconfirmed` : ", all confirmed"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : null}

      {vault.skills.length > 0 || vault.education.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {plural(vault.skills.length, "skill")} and {plural(vault.education.length, "education entry").replace("entrys", "entries")} on file.
        </p>
      ) : null}
    </section>
  )
}
