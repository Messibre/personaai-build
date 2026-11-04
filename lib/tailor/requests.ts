import { z } from "zod"
import { jobProfileSchema, projectPickSchema } from "@/lib/schemas/job"
import { vaultSchema } from "@/lib/schemas/vault"
import { COLOR_SCHEMES, TEMPLATE_OPTIONS, type ColorScheme, type TemplateStyle } from "@/lib/types"

export const MAX_BODY_BYTES = 1_000_000

const templateIds = TEMPLATE_OPTIONS.map((option) => option.id) as [TemplateStyle, ...TemplateStyle[]]
const colorSchemeIds = Object.keys(COLOR_SCHEMES) as [ColorScheme, ...ColorScheme[]]

export const analyzeRequestSchema = z
  .object({
    vault: vaultSchema,
    postingText: z.string().max(200_000),
  })
  .strict()

export const generateRequestSchema = z
  .object({
    vault: vaultSchema,
    job: jobProfileSchema,
    picks: z.array(projectPickSchema).min(1).max(4),
    template: z.enum(templateIds),
    colorScheme: z.enum(colorSchemeIds),
    company: z.string().trim().max(200).optional(),
  })
  .strict()
