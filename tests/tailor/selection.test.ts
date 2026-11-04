import { describe, expect, it } from "vitest"
import { moveItem, toPicksPayload, toSelectable, toggleIncluded } from "@/lib/tailor/selection"

const picks = [
  { projectId: "a", matchedRequirementIds: ["r1"], score: 3 },
  { projectId: "b", matchedRequirementIds: [], score: 2 },
  { projectId: "c", matchedRequirementIds: [], score: 1 },
]

describe("selection", () => {
  it("starts with everything included", () => {
    expect(toSelectable(picks).every((item) => item.included)).toBe(true)
  })

  it("refuses to exclude the last remaining project", () => {
    let items = toSelectable(picks.slice(0, 2))
    items = toggleIncluded(items, "a")
    items = toggleIncluded(items, "b")
    expect(items.filter((item) => item.included).map((item) => item.projectId)).toEqual(["b"])
  })

  it("never allows more than four included", () => {
    const five = [...picks, { projectId: "d", matchedRequirementIds: [], score: 0 }, { projectId: "e", matchedRequirementIds: [], score: 0 }]
    expect(toSelectable(five)).toHaveLength(4)
  })

  it("moves items within bounds only", () => {
    const items = toSelectable(picks)
    expect(moveItem(items, "a", -1)).toBe(items)
    expect(moveItem(items, "c", 1)).toBe(items)
    expect(moveItem(items, "c", -1).map((item) => item.projectId)).toEqual(["a", "c", "b"])
  })

  it("payload keeps order and drops excluded projects and UI state", () => {
    let items = moveItem(toSelectable(picks), "c", -1)
    items = toggleIncluded(items, "b")
    const payload = toPicksPayload(items)
    expect(payload.map((pick) => pick.projectId)).toEqual(["a", "c"])
    expect(payload[0]).toEqual(picks[0])
    expect(Object.keys(payload[0]).sort()).toEqual(["matchedRequirementIds", "projectId", "score"])
  })
})
