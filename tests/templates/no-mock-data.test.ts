import { describe, expect, it } from "vitest"
import { personas, type PersonaId } from "../../fixtures/personas"
import { FORBIDDEN_PHRASES, FORBIDDEN_TOKENS, TEMPLATES, renderTemplate, stripScriptsAndStyles } from "./helpers"

const PERSONA_IDS = Object.keys(personas) as PersonaId[]

describe("no mock data in generated output", () => {
  for (const personaId of PERSONA_IDS) {
    for (const template of TEMPLATES) {
      it(`${personaId}/${template}`, () => {
        const persona = personas[personaId]
        const html = renderTemplate(
          {
            profile: persona.github.profile,
            repos: persona.github.repos,
            resumeText: persona.resumeText,
            notionContent: persona.notionContent,
            photoUrl: persona.github.profile.avatar_url,
          },
          template,
        )
        const visible = stripScriptsAndStyles(html)

        for (const phrase of FORBIDDEN_PHRASES) {
          expect(visible, `contains "${phrase}"`).not.toContain(phrase)
        }
        for (const token of FORBIDDEN_TOKENS) {
          expect(visible, `contains ${token}`).not.toMatch(token)
        }
      })
    }
  }
})
