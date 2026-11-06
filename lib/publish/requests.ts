import { z } from "zod"
import { draftSchema } from "@/lib/schemas/draft"
import { jobProfileSchema, projectPickSchema } from "@/lib/schemas/job"
import { contentSelectionSchema } from "@/lib/schemas/tailoring-preferences"
import { COLOR_SCHEMES, TEMPLATE_OPTIONS, type ColorScheme, type TemplateStyle } from "@/lib/types"

const templateIds = TEMPLATE_OPTIONS.map((option) => option.id) as [TemplateStyle, ...TemplateStyle[]]
const colorIds = Object.keys(COLOR_SCHEMES) as [ColorScheme, ...ColorScheme[]]

/** The browser sends choices and the draft only. Public HTML is always rendered by the server. */
export const publishRequestSchema = z
  .object({
    vaultId: z.string().min(8).max(64),
    selection: contentSelectionSchema,
    job: jobProfileSchema,
    draft: draftSchema,
    picks: z.array(projectPickSchema).max(4),
    template: z.enum(templateIds),
    colorScheme: z.enum(colorIds),
    company: z.string().trim().max(200).optional(),
    confirmPublic: z.literal(true),
  })
  .strict()
export type PublishRequest = z.infer<typeof publishRequestSchema>

export const statusQuerySchema = z.object({ token: z.string().min(10).max(1024) }).strict()
