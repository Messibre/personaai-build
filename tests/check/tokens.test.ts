import { describe, expect, it } from "vitest"

import { extractClaimTokens, extractNumbers, numberSupported } from "@/lib/check/tokens"

describe("extractNumbers", () => {
  it("reads separators, suffixes, decimals and percentages", () => {
    const numbers = extractNumbers("10,000+ nodes, 65% faster, 100k rows, from 4.2s")
    expect(numbers.map((n) => n.value)).toEqual([10000, 65, 100000, 4.2])
    expect(numbers.map((n) => n.percent)).toEqual([false, true, false, false])
  })

  it("ignores digits glued to letters", () => {
    expect(extractNumbers("Web3 and i18n support")).toEqual([])
  })

  it("requires a percentage to be supported by a percentage", () => {
    const [sentence] = extractNumbers("65% faster")
    expect(numberSupported(sentence, extractNumbers("65 teams"))).toBe(false)
    expect(numberSupported(sentence, extractNumbers("by 65%"))).toBe(true)
  })

  it("treats 100k and 100,000 as the same value", () => {
    const [sentence] = extractNumbers("100,000 rows")
    expect(numberSupported(sentence, extractNumbers("100k+ rows"))).toBe(true)
  })
})

describe("extractClaimTokens", () => {
  const values = (text: string) => extractClaimTokens(text).map((token) => `${token.kind}:${token.value}`)

  it("finds skills, proper-noun-like terms and ownership verbs", () => {
    const text = "Led the React migration at Acme using next.js and GraphQL"
    expect(values(text)).toEqual(expect.arrayContaining(["verb:led", "term:Acme", "term:next.js"]))
    const skillIds = extractClaimTokens(text).flatMap((token) => (token.kind === "skill" ? [token.skillId] : []))
    expect(skillIds).toEqual(expect.arrayContaining(["react", "next.js", "graphql"]))
  })

  it("ignores a capitalized first word", () => {
    expect(values("Rendering was slow")).toEqual([])
  })

  it("finds camelCase and ALLCAPS terms anywhere", () => {
    expect(values("uses useEffect with the DOM")).toEqual(expect.arrayContaining(["term:useEffect", "term:DOM"]))
  })

  it("does not treat short aliases as skills", () => {
    expect(extractClaimTokens("we go to the office").some((token) => token.kind === "skill")).toBe(false)
  })

  it("finds multi-word ownership verbs", () => {
    expect(values("the editor was built from scratch")).toContain("verb:built from scratch")
  })
})
