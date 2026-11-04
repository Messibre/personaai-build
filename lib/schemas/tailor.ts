import { z } from "zod"
import { draftSchema } from "./draft"

export const gapSchema = z
  .object({
    requirementId: z.string().min(1).max(128),
    label: z.string().min(1).max(300),
    level: z.enum(["must", "nice"]),
    message: z.string().min(1).max(500),
  })
  .strict()
export type Gap = z.infer<typeof gapSchema>

export const removedSchema = z
  .object({
    section: z.enum(["tagline", "about", "project", "resume", "note"]),
    projectId: z.string().min(1).max(128).optional(),
    text: z.string(),
    reason: z.enum(["unknown_fact", "unconfirmed_fact", "number_mismatch", "unsupported"]),
  })
  .strict()
export type Removed = z.infer<typeof removedSchema>

export const checkResultSchema = z
  .object({
    clean: draftSchema,
    removed: z.array(removedSchema),
  })
  .strict()
export type CheckResult = z.infer<typeof checkResultSchema>
