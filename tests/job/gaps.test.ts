import { describe, expect, it } from "vitest"

import { detectGaps } from "@/lib/job/gaps"
import type { JobProfile, Requirement } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import { loadAlexVault } from "../vault/helpers"

function req(skillId: string, label: string, level: "must" | "nice"): Requirement {
  return { id: `req-${skillId}`, label, level, keywords: [label] }
}

function jobOf(requirements: Requirement[]): JobProfile {
  return { title: "Test role", roleType: "frontend", requirements, topThree: [requirements[0].label] }
}

function alex(): Vault {
  return structuredClone(loadAlexVault())
}

const PLAYWRIGHT_FACT_ID = "fact_cf-playwright"

function withPlaywrightFact(confirmed: boolean): Vault {
  const vault = alex()
  vault.projects[0].facts.push({
    id: PLAYWRIGHT_FACT_ID,
    text: "Wrote Playwright end-to-end tests for the canvas editor",
    kind: "built",
    source: "user",
    confirmed,
  })
  return vault
}

const playwrightJob = jobOf([req("playwright", "Playwright", "must")])

describe("detectGaps", () => {
  it("does not count an unconfirmed fact as evidence", () => {
    const gaps = detectGaps(playwrightJob, withPlaywrightFact(false))
    expect(gaps.map((gap) => gap.requirementId)).toEqual(["req-playwright"])
    expect(gaps[0].message).toContain("Nothing in your confirmed facts shows it")
  })

  it("counts the same fact once it is confirmed", () => {
    expect(detectGaps(playwrightJob, withPlaywrightFact(true))).toEqual([])
  })

  it("ignores project.techs that no confirmed fact states", () => {
    const vault = alex()
    vault.projects[0].techs.push("Python")
    const gaps = detectGaps(jobOf([req("python", "Python", "must")]), vault)
    expect(gaps.map((gap) => gap.requirementId)).toEqual(["req-python"])
  })

  it("ignores unconfirmed skills", () => {
    // Storybook is in Alex's skills but unconfirmed; React (confirmed) is only adjacent.
    const gaps = detectGaps(jobOf([req("storybook", "Storybook", "must")]), alex())
    expect(gaps).toHaveLength(1)
    expect(gaps[0].message).toContain("but nothing confirmed shows Storybook itself")
  })

  it("covers a requirement that a confirmed fact mentions by alias", () => {
    // fact_mt-built says "WCAG-compliant"; wcag is an accessibility alias.
    expect(detectGaps(jobOf([req("accessibility", "Accessibility", "must")]), alex())).toEqual([])
  })

  it("reports partial when only an adjacent skill is confirmed", () => {
    const gaps = detectGaps(jobOf([req("redux", "Redux", "must")]), alex())
    expect(gaps).toHaveLength(1)
    expect(gaps[0].message).toBe(
      "The posting asks for Redux. You have related work (React), but nothing confirmed shows Redux itself.",
    )
  })

  it("uses the exact missing message", () => {
    const gaps = detectGaps(jobOf([req("python", "Python", "nice")]), alex())
    expect(gaps[0].message).toBe(
      "The posting asks for Python. Nothing in your confirmed facts shows it. If you have done this, add it to your vault; otherwise leave it out.",
    )
  })

  it("never suggests claiming a skill the vault does not show", () => {
    const job = jobOf([
      req("python", "Python", "must"),
      req("redux", "Redux", "must"),
      req("rust", "Rust", "nice"),
      req("storybook", "Storybook", "nice"),
    ])
    for (const gap of detectGaps(job, alex())) {
      expect(gap.message).not.toMatch(/anyway|claim|say you|mention it|exaggerat|stretch|pretend/i)
    }
  })

  it("orders must before nice, then missing before partial, then job order", () => {
    const job = jobOf([
      req("storybook", "Storybook", "nice"),
      req("python", "Python", "nice"),
      req("redux", "Redux", "must"),
      req("playwright", "Playwright", "must"),
      req("accessibility", "Accessibility", "must"),
    ])
    expect(detectGaps(job, alex()).map((gap) => gap.requirementId)).toEqual([
      "req-playwright",
      "req-redux",
      "req-python",
      "req-storybook",
    ])
  })

  it("is deterministic", () => {
    const job = jobOf([req("redux", "Redux", "must"), req("python", "Python", "nice")])
    expect(detectGaps(job, alex())).toEqual(detectGaps(job, alex()))
  })
})

describe("implied skills", () => {
  it("treats FastAPI and a prediction model as evidence for Python, APIs and Machine Learning", () => {
    const vault = alex()
    vault.projects[0].facts.push(
      { id: "fact_fastapi", text: "Connected the model to a React frontend through a FastAPI backend", kind: "built", source: "user", confirmed: true },
      { id: "fact_model", text: "Trained a prediction model on two years of booking data", kind: "built", source: "user", confirmed: true },
    )
    const job = jobOf([req("python", "Python", "must"), req("api", "APIs", "must"), req("machine-learning", "Machine Learning", "must")])
    expect(detectGaps(job, vault)).toEqual([])
  })

  it("does not count an unconfirmed FastAPI fact", () => {
    const vault = alex()
    vault.projects[0].facts.push({ id: "fact_fastapi", text: "Built a FastAPI backend", kind: "built", source: "user", confirmed: false })
    const gaps = detectGaps(jobOf([req("python", "Python", "must")]), vault)
    expect(gaps.map((gap) => gap.label)).toEqual(["Python"])
  })
})
