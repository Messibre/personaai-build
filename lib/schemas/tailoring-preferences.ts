import { z } from "zod"
import { COLOR_SCHEMES, TEMPLATE_OPTIONS, type ColorScheme, type TemplateStyle } from "@/lib/types"

const ids = z.array(z.string().min(1).max(128)).max(500)
export const contentSelectionSchema = z.object({
  experience: ids,
  education: ids,
  contacts: z.array(z.string().min(1).max(2048)).max(100),
  github: z.boolean(),
}).strict()
export type ContentSelection = z.infer<typeof contentSelectionSchema>

export const tailoringPreferencesSchema = z.object({
  postingText: z.string().max(200_000),
  company: z.string().max(200),
  selection: contentSelectionSchema,
  projects: z.array(z.object({ projectId: z.string().min(1).max(128), included: z.boolean() }).strict()).max(4),
  template: z.enum(TEMPLATE_OPTIONS.map((option) => option.id) as [TemplateStyle, ...TemplateStyle[]]),
  colorScheme: z.enum(Object.keys(COLOR_SCHEMES) as [ColorScheme, ...ColorScheme[]]),
}).strict()
export type TailoringPreferences = z.infer<typeof tailoringPreferencesSchema>
