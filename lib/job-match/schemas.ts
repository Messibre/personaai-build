import { z } from "zod"

export const jobMatchInputSchema = z.object({
  jobText: z.string().trim().max(15000).optional(),
  jobUrl: z.string().trim().max(2048).optional(),
  githubUsername: z.string().trim().min(1).max(39),
  resumeText: z.string().trim().max(30000).optional(),
  refresh: z.boolean().optional(),
}).refine((value) => Boolean(value.jobText || value.jobUrl), { message: "Paste a job description or provide a job URL." })
