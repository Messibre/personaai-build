import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ResumeExtraction } from "@/lib/ingest/resume"
import { mergeImport } from "@/lib/ingest/merge"
import type { Vault } from "@/lib/schemas/vault"
import { recordApplication } from "@/lib/vault/applications"
import { confirmFact, createEmptyVault } from "@/lib/vault/ops"
import { COLOR_SCHEME, JOBS, TEMPLATE, confirmedFactIds, draftSentences, isolatedEnv, json, postRequest, scriptedLLM, vaultRequest, visibleText } from "../helpers/e2e"

const holder = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock("@/lib/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/llm")>()), getLLMClient: () => holder.client }))

import { GET as getVault, PUT as putVault } from "@/app/api/vault/[id]/route"
import { POST as importResume } from "@/app/api/import/resume/route"
import { POST as analyze } from "@/app/api/tailor/analyze/route"
import { POST as generate } from "@/app/api/tailor/generate/route"

const MARKER = "Zebrafinch"

const RESUME = [
  "Dana Ortiz",
  "Senior UX Engineer at Lumen Labs (2021 - present)",
  "- Built an accessible React design system used across all product surfaces.",
  "- Shipped keyboard navigation and screen reader support that met WCAG 2.1 AA.",
  `- Prototyped the ${MARKER} telemetry dashboard in Svelte.`,
  "Projects",
  "Beacon UI: a React component library with prefers-reduced-motion support.",
  "- Every animated component in Beacon UI respects prefers-reduced-motion.",
  `- Beacon UI ships the ${MARKER} colour theme.`,
  "Skills: React, TypeScript, Accessibility",
].join("\n")

const EXTRACTION = {
  experience: [
    {
      company: "Lumen Labs",
      title: "Senior UX Engineer",
      start: "2021",
      end: "present",
      evidence: "Senior UX Engineer at Lumen Labs",
      facts: [
        { text: "Built an accessible React design system used across all product surfaces", kind: "built", evidence: "Built an accessible React design system used across all product surfaces." },
        { text: "Shipped keyboard navigation and screen reader support that met WCAG 2.1 AA", kind: "outcome", evidence: "Shipped keyboard navigation and screen reader support that met WCAG 2.1 AA." },
        { text: `Prototyped the ${MARKER} telemetry dashboard in Svelte`, kind: "built", evidence: `Prototyped the ${MARKER} telemetry dashboard in Svelte.` },
      ],
    },
  ],
  projects: [
    {
      name: "Beacon UI",
      techs: ["React"],
      evidence: "Beacon UI: a React component library",
      facts: [
        { text: "A React component library with prefers-reduced-motion support", kind: "built", evidence: "a React component library with prefers-reduced-motion support" },
        { text: "Every animated component respects prefers-reduced-motion", kind: "decided", evidence: "Every animated component in Beacon UI respects prefers-reduced-motion" },
        { text: `Ships the ${MARKER} colour theme`, kind: "built", evidence: `Beacon UI ships the ${MARKER} colour theme.` },
      ],
    },
  ],
  skills: [{ name: "React", evidence: "React" }],
  education: [],
}

describe("J1: resume only, from empty vault to tailored output and back", () => {
  beforeEach(() => {
    isolatedEnv()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("imports, confirms, tailors, records and round-trips the vault", async () => {
    const llm = scriptedLLM({ resume: () => JSON.stringify(EXTRACTION) })
    holder.client = llm.client

    // 1. Create the vault.
    let vault: Vault = createEmptyVault("Dana Ortiz")
    const created = await putVault(...vaultRequest("PUT", vault.id, vault))
    expect(created.status).toBe(200)
    expect(await json(created)).toEqual({ id: vault.id, updatedAt: vault.updatedAt })

    // 2. Import the resume. Every fact arrives unconfirmed, with verbatim evidence.
    const imported = await importResume(postRequest("/api/import/resume", { text: RESUME }))
    expect(imported.status).toBe(200)
    const extraction = await json<ResumeExtraction>(imported)
    expect(extraction.dropped).toBe(0)
    const importedFacts = [...extraction.experience, ...extraction.projects].flatMap((owner) => owner.facts)
    expect(importedFacts).toHaveLength(6)
    for (const fact of importedFacts) {
      expect(fact.confirmed).toBe(false)
      expect(RESUME.replace(/\s+/g, " ")).toContain(fact.evidence!.replace(/\s+/g, " "))
    }

    // 3. Merge and confirm everything except the marker facts.
    vault = mergeImport(vault, { experience: extraction.experience, projects: extraction.projects, skills: extraction.skills })
    for (const fact of [...vault.experience, ...vault.projects].flatMap((owner) => owner.facts)) {
      if (!fact.text.includes(MARKER)) vault = confirmFact(vault, fact.id)
    }
    expect(confirmedFactIds(vault).size).toBe(4)

    // 4. Analyze the UX posting.
    const analyzed = await analyze(postRequest("/api/tailor/analyze", { vault, postingText: JOBS.ux }))
    expect(analyzed.status).toBe(200)
    const analysis = await json<{ job: { title: string; requirements: unknown[] }; gaps: unknown[]; picks: Array<{ projectId: string }> }>(analyzed)
    expect(analysis.job.requirements.length).toBeGreaterThanOrEqual(2)
    expect(analysis.picks.map((pick) => pick.projectId)).toEqual([vault.projects[0].id])
    expect(Array.isArray(analysis.gaps)).toBe(true)

    // 5. Generate.
    const generated = await generate(
      postRequest("/api/tailor/generate", { vault, job: analysis.job, picks: analysis.picks, template: TEMPLATE, colorScheme: COLOR_SCHEME }),
    )
    expect(generated.status).toBe(200)
    const output = await json<{
      draft: Parameters<typeof draftSentences>[0]
      portfolioHtml: string
      resumeHtml: string
      resumeText: string
      noteText: string
    }>(generated)

    for (const key of ["portfolioHtml", "resumeHtml", "resumeText", "noteText"] as const) {
      expect(output[key].length, key).toBeGreaterThan(0)
    }
    const readable = [visibleText(output.portfolioHtml), visibleText(output.resumeHtml), output.resumeText, output.noteText]
    for (const text of readable) {
      expect(text).not.toMatch(/\bundefined\b|\bnull\b|\bNaN\b|followers/i)
    }

    // Only confirmed content anywhere: the marker sits only on unconfirmed facts.
    const everything = [output.portfolioHtml, output.resumeHtml, output.resumeText, output.noteText, JSON.stringify(output.draft)].join("\n")
    expect(everything).not.toContain(MARKER)
    const tailorPrompts = llm.prompts.filter((p) => !(p.system ?? "").includes("extract structured career data"))
    expect(tailorPrompts.length).toBeGreaterThan(0)
    expect(tailorPrompts.map((p) => p.prompt).join("\n")).not.toContain(MARKER)
    const confirmed = confirmedFactIds(vault)
    for (const sentence of draftSentences(output.draft)) {
      for (const id of sentence.factIds) expect(confirmed.has(id)).toBe(true)
    }

    // 6. Record, save and read back.
    vault = await recordApplication(vault, { jobTitle: analysis.job.title, jobText: JOBS.ux })
    expect(vault.applications).toHaveLength(1)
    const saved = await putVault(...vaultRequest("PUT", vault.id, vault))
    expect(saved.status).toBe(200)
    const read = await getVault(...vaultRequest("GET", vault.id))
    expect(read.status).toBe(200)
    expect(await json(read)).toEqual(vault)
  })
})
