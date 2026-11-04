import { z } from "zod"

export const requirementSchema = z
  .object({
    id: z.string().min(1).max(128),
    label: z.string().min(1).max(300),
    level: z.enum(["must", "nice"]),
    keywords: z.array(z.string().min(1).max(100)),
  })
  .strict()
export type Requirement = z.infer<typeof requirementSchema>

export const jobProfileSchema = z
  .object({
    title: z.string().min(1).max(200),
    seniority: z.string().max(100).optional(),
    roleType: z.string().max(100).optional(),
    requirements: z.array(requirementSchema),
    topThree: z.array(z.string().min(1).max(300)),
  })
  .strict()
export type JobProfile = z.infer<typeof jobProfileSchema>

export const projectPickSchema = z
  .object({
    projectId: z.string().min(1).max(128),
    matchedRequirementIds: z.array(z.string().min(1).max(128)),
    score: z.number().finite(),
  })
  .strict()
export type ProjectPick = z.infer<typeof projectPickSchema>
