"use client"

import { useMemo, useState } from "react"
import { NoteView } from "@/components/outputs/note-view"
import { ResumeView } from "@/components/outputs/resume-view"
import { CopyButton } from "@/components/outputs/copy-button"
import { DownloadButton } from "@/components/outputs/download-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { outputFileStem } from "@/lib/outputs/filename"
import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile } from "@/lib/schemas/job"
import type { ContentSelection } from "@/lib/schemas/tailoring-preferences"
import type { Vault } from "@/lib/schemas/vault"
import { renderFromDraft } from "@/lib/tailor/edit"
import type { GenerateOutput } from "@/lib/tailor/pipeline"
import type { ColorScheme, TemplateStyle } from "@/lib/types"
import { EditableDraft } from "./editable-draft"
import { PublishPanel } from "./publish-panel"
import { RemovedPanel } from "./removed-panel"

interface ResultsViewProps {
  vault: Vault
  job: JobProfile
  output: GenerateOutput
  template: TemplateStyle
  colorScheme: ColorScheme
  company?: string
  selection: ContentSelection
  onVaultChange: (vault: Vault) => void | Promise<void>
}

export function ResultsView({ vault, job, output, template, colorScheme, company, selection, onVaultChange }: ResultsViewProps) {
  const fileStem = outputFileStem(vault.person.name, job.title)

  // Edits are tied to the draft they started from, so a new generation discards them without an effect.
  const [edited, setEdited] = useState<{ base: Draft; draft: Draft } | null>(null)
  const draft = edited && edited.base === output.draft ? edited.draft : output.draft
  const isEdited = draft !== output.draft

  const rendered = useMemo(
    () =>
      isEdited
        ? renderFromDraft({ vault, job, draft, picks: output.picks, template, colorScheme, company })
        : {
            picks: output.picks,
            portfolioHtml: output.portfolioHtml,
            resumeHtml: output.resumeHtml,
            resumeText: output.resumeText,
            noteText: output.noteText,
            noteWordCount: output.noteWordCount,
          },
    [isEdited, vault, job, draft, output, template, colorScheme, company],
  )

  return (
    <Tabs defaultValue="portfolio" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        <TabsTrigger value="resume">Resume</TabsTrigger>
        <TabsTrigger value="note">Note</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="removed">Removed ({output.removed.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="portfolio" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <DownloadButton content={rendered.portfolioHtml} filename={`${fileStem}-portfolio.html`} mimeType="text/html" label="Download HTML" />
          <CopyButton text={rendered.portfolioHtml} label="Copy HTML" />
        </div>
        <iframe title="Portfolio preview" srcDoc={rendered.portfolioHtml} sandbox="allow-scripts" className="h-[720px] w-full rounded-md border border-border" />
        <PublishPanel
          vaultId={vault.id}
          selection={selection}
          job={job}
          draft={draft}
          picks={rendered.picks}
          template={template}
          colorScheme={colorScheme}
          company={company}
          publicContacts={selection.contacts}
        />
      </TabsContent>
      <TabsContent value="resume">
        <ResumeView html={rendered.resumeHtml} text={rendered.resumeText} fileStem={fileStem} />
      </TabsContent>
      <TabsContent value="note">
        <NoteView text={rendered.noteText} wordCount={rendered.noteWordCount} />
      </TabsContent>
      <TabsContent value="edit">
        <EditableDraft
          vault={vault}
          draft={draft}
          picks={rendered.picks}
          onDraftChange={(next) => setEdited({ base: output.draft, draft: next })}
          onVaultChange={onVaultChange}
        />
      </TabsContent>
      <TabsContent value="removed">
        <RemovedPanel removed={output.removed} droppedByRewrite={output.droppedByRewrite} />
      </TabsContent>
    </Tabs>
  )
}
