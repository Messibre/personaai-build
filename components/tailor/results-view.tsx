"use client"

import { NoteView } from "@/components/outputs/note-view"
import { ResumeView } from "@/components/outputs/resume-view"
import { CopyButton } from "@/components/outputs/copy-button"
import { DownloadButton } from "@/components/outputs/download-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { outputFileStem } from "@/lib/outputs/filename"
import type { JobProfile } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import type { GenerateOutput } from "@/lib/tailor/pipeline"
import { RemovedPanel } from "./removed-panel"

interface ResultsViewProps {
  vault: Vault
  job: JobProfile
  output: GenerateOutput
}

export function ResultsView({ vault, job, output }: ResultsViewProps) {
  const fileStem = outputFileStem(vault.person.name, job.title)

  return (
    <Tabs defaultValue="portfolio" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        <TabsTrigger value="resume">Resume</TabsTrigger>
        <TabsTrigger value="note">Note</TabsTrigger>
        <TabsTrigger value="removed">Removed ({output.removed.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="portfolio" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <DownloadButton content={output.portfolioHtml} filename={`${fileStem}-portfolio.html`} mimeType="text/html" label="Download HTML" />
          <CopyButton text={output.portfolioHtml} label="Copy HTML" />
        </div>
        <iframe title="Portfolio preview" srcDoc={output.portfolioHtml} sandbox="" className="h-[720px] w-full rounded-md border border-border" />
      </TabsContent>
      <TabsContent value="resume">
        <ResumeView html={output.resumeHtml} text={output.resumeText} fileStem={fileStem} />
      </TabsContent>
      <TabsContent value="note">
        <NoteView text={output.noteText} wordCount={output.noteWordCount} />
      </TabsContent>
      <TabsContent value="removed">
        <RemovedPanel removed={output.removed} droppedByRewrite={output.droppedByRewrite} />
      </TabsContent>
    </Tabs>
  )
}
