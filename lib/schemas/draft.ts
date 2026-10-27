import { z } from "zod"

export const sentenceSchema = z
  .object({
    text: z.string().min(1),
    factIds: z.array(z.string().min(1).max(128)),
  })
  .strict()
export type Sentence = z.infer<typeof sentenceSchema>

export const draftSchema = z
  .object({
    tagline: z.string(),
    about: z.array(sentenceSchema),
    projects: z.array(
      z
        .object({
          projectId: z.string().min(1).max(128),
          sentences: z.array(sentenceSchema),
        })
        .strict(),
    ),
    resumeBullets: z.array(sentenceSchema),
    note: z.array(sentenceSchema),
  })
  .strict()
export type Draft = z.infer<typeof draftSchema>
