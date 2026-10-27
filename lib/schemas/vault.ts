import { z } from "zod"

export const VAULT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export const vaultIdSchema = z.string().regex(VAULT_ID_PATTERN, "Invalid vault id")

const idSchema = z.string().min(1).max(128)

// http(s) only: a stored `javascript:` URL must never reach a rendered link.
const urlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "https:" || protocol === "http:"
  }, "URL must use http or https")

const isoDateSchema = z.string().datetime()

export const factKindSchema = z.enum(["built", "hard", "decided", "outcome", "metric", "tech", "role"])
export type FactKind = z.infer<typeof factKindSchema>

export const factSourceSchema = z.enum(["github", "notion", "resume", "user", "ai-draft"])
export type FactSource = z.infer<typeof factSourceSchema>

export const factSchema = z
  .object({
    id: idSchema,
    text: z
      .string()
      .min(1)
      .max(500)
      .refine((value) => value.trim().length > 0, "Fact text must not be blank"),
    kind: factKindSchema,
    source: factSourceSchema,
    evidence: z.string().max(1000).optional(),
    confirmed: z.boolean(),
  })
  .strict()
export type Fact = z.infer<typeof factSchema>

export const projectSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(200),
    url: urlSchema.optional(),
    primaryLanguage: z.string().max(100).optional(),
    stats: z
      .object({
        stars: z.number().int().nonnegative(),
        forks: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    techs: z.array(z.string().min(1).max(100)),
    facts: z.array(factSchema),
    sourceSnapshot: z
      .object({
        readme: z.string().max(6000).optional(),
        commits: z.array(z.string()).max(10).optional(),
        fetchedAt: isoDateSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
export type Project = z.infer<typeof projectSchema>

export const experienceSchema = z
  .object({
    id: idSchema,
    company: z.string().min(1).max(200),
    title: z.string().min(1).max(200),
    start: z.string().max(50).optional(),
    end: z.string().max(50).optional(),
    facts: z.array(factSchema),
  })
  .strict()
export type Experience = z.infer<typeof experienceSchema>

export const educationSchema = z
  .object({
    id: idSchema,
    institution: z.string().min(1).max(200),
    degree: z.string().max(200).optional(),
    start: z.string().max(50).optional(),
    end: z.string().max(50).optional(),
  })
  .strict()
export type Education = z.infer<typeof educationSchema>

export const skillSchema = z
  .object({
    name: z.string().min(1).max(100),
    source: factSourceSchema,
    confirmed: z.boolean(),
  })
  .strict()
export type Skill = z.infer<typeof skillSchema>

export const applicationSchema = z
  .object({
    id: idSchema,
    createdAt: isoDateSchema,
    jobTitle: z.string().min(1).max(200),
    company: z.string().max(200).optional(),
    jobTextHash: z.string().regex(/^[a-f0-9]{64}$/, "jobTextHash must be a SHA-256 hex digest"),
  })
  .strict()
export type Application = z.infer<typeof applicationSchema>

export const vaultSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: vaultIdSchema,
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    person: z
      .object({
        name: z.string().min(1).max(200),
        email: z.string().email().max(320).optional(),
        links: z.array(urlSchema),
      })
      .strict(),
    github: z.object({ username: z.string().min(1).max(100) }).strict().optional(),
    projects: z.array(projectSchema),
    experience: z.array(experienceSchema),
    education: z.array(educationSchema),
    skills: z.array(skillSchema),
    applications: z.array(applicationSchema),
  })
  .strict()
export type Vault = z.infer<typeof vaultSchema>
