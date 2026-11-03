import { z } from "zod"
import type { JobAnalysis } from "./types"

const requirementSchema = z.object({
  label: z.string().min(1).max(100),
  synonyms: z.array(z.string().min(1).max(60)).max(8),
  quote: z.string().min(1).max(500),
  priority: z.enum(["must-have", "nice-to-have"]),
})

export const jobAnalysisSchema = z.object({
  roleTitle: z.string().min(1).max(160),
  roleType: z.enum(["frontend", "ux-engineer", "ai-ml", "fullstack", "backend", "other"]),
  mustHaveRequirements: z.array(requirementSchema).max(30),
  niceToHaveRequirements: z.array(requirementSchema).max(30),
  values: z.array(z.string().min(1).max(160)).max(15),
})

export const jobMatchInputSchema = z.object({
  jobText: z.string().trim().max(15000).optional(),
  jobUrl: z.string().trim().max(2048).optional(),
  githubUsername: z.string().trim().max(39).optional(),
  resumeText: z.string().trim().max(30000).optional(),
}).refine((value) => Boolean(value.jobText || value.jobUrl), {
  message: "Paste a job description or provide a job URL.",
})

export function parseJobAnalysis(value: unknown): JobAnalysis {
  return jobAnalysisSchema.parse(value)
}
