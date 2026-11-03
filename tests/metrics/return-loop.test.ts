import { describe, expect, it } from "vitest"
import { accurateShare, computeLoopMetrics, headline, toCsv } from "@/lib/metrics/return-loop"
import { DAY, HOUR, NOW, T0, app, vaultWith } from "./helpers"

describe("computeLoopMetrics", () => {
  it("counts only vaults with at least one application as tested", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-empty-1", []), vaultWith("vault-one-001", [app("a", T0)])], NOW)
    expect(metrics.testedUsers).toBe(1)
    expect(metrics.returners).toBe(0)
  })

  it("one application is tested but not a returner", () => {
    const [user] = computeLoopMetrics([vaultWith("vault-one-001", [app("a", T0)])], NOW).perUser
    expect(user.status).toBe("one")
    expect(user.secondAt).toBeUndefined()
  })

  it("two distinct postings 2 hours apart is a returner", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-two-001", [app("a", T0), app("b", T0 + 2 * HOUR)])], NOW)
    expect(metrics.returners).toBe(1)
    expect(metrics.perUser[0].status).toBe("returned")
    expect(metrics.perUser[0].secondAt).toBe(new Date(T0 + 2 * HOUR).toISOString())
  })

  it("two distinct postings 10 minutes apart is a same-sitting second job, not a returner", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-two-001", [app("a", T0), app("b", T0 + 10 * 60 * 1000)])], NOW)
    expect(metrics.returners).toBe(0)
    expect(metrics.sameSittingSecond).toBe(1)
    expect(metrics.perUser[0].status).toBe("same_sitting")
  })

  it("the same posting recorded twice is still one distinct posting", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-dupe-001", [app("a", T0), app("a", T0 + 3 * DAY)])], NOW)
    expect(metrics.perUser[0].distinctCount).toBe(1)
    expect(metrics.perUser[0].applicationCount).toBe(2)
    expect(metrics.returners).toBe(0)
  })

  it("a second posting 15 days later is outside the window and not a returner", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-late-001", [app("a", T0), app("b", T0 + 15 * DAY)])], NOW)
    expect(metrics.returners).toBe(0)
    expect(metrics.perUser[0].status).toBe("one")
  })

  it("exactly 1 hour and exactly 14 days are inside the window", () => {
    const metrics = computeLoopMetrics(
      [vaultWith("vault-edge-001", [app("a", T0), app("b", T0 + HOUR)]), vaultWith("vault-edge-002", [app("a", T0), app("b", T0 + 14 * DAY)])],
      NOW,
    )
    expect(metrics.returners).toBe(2)
  })

  it("a user with three postings counts as one returner", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-three-01", [app("a", T0), app("b", T0 + 2 * HOUR), app("c", T0 + 3 * DAY)])], NOW)
    expect(metrics.returners).toBe(1)
    expect(metrics.testedUsers).toBe(1)
  })

  it("does not depend on array order", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-order-01", [app("b", T0 + 2 * HOUR), app("a", T0)])], NOW)
    expect(metrics.perUser[0].firstAt).toBe(new Date(T0).toISOString())
    expect(metrics.perUser[0].status).toBe("returned")
  })

  it("ignores applications dated in the future", () => {
    const metrics = computeLoopMetrics([vaultWith("vault-future-1", [app("a", T0), app("b", NOW + DAY)])], NOW)
    expect(metrics.returners).toBe(0)
  })

  it("returns zeros for no vaults", () => {
    expect(computeLoopMetrics([], NOW)).toEqual({
      testedUsers: 0,
      returners: 0,
      sameSittingSecond: 0,
      feedbackCount: 0,
      accurateCount: 0,
      perUser: [],
    })
  })

  it("tallies feedback and keeps notes", () => {
    const metrics = computeLoopMetrics(
      [
        vaultWith("vault-fb-0001", [app("a", T0, { feedback: { accurate: true } }), app("b", T0 + 2 * HOUR, { feedback: { accurate: false, note: "too salesy" } })]),
        vaultWith("vault-fb-0002", [app("a", T0)]),
      ],
      NOW,
    )
    expect(metrics.feedbackCount).toBe(2)
    expect(metrics.accurateCount).toBe(1)
    expect(metrics.perUser[0].feedback).toEqual([{ accurate: true }, { accurate: false, note: "too salesy" }])
  })
})

describe("headline and accuracy", () => {
  it("formats the headline as returners of tested", () => {
    expect(headline({ returners: 3, testedUsers: 10 })).toBe("3 of 10")
    expect(headline({ returners: 0, testedUsers: 0 })).toBe("0 of 0")
  })

  it("accuracy share is null, never NaN, when nobody answered", () => {
    expect(accurateShare({ feedbackCount: 0, accurateCount: 0 })).toBeNull()
    expect(accurateShare({ feedbackCount: 4, accurateCount: 3 })).toBe(0.75)
  })
})

describe("toCsv", () => {
  it("quotes cells and neutralises formula injection in names", () => {
    const { perUser } = computeLoopMetrics([vaultWith("vault-csv-0001", [app("a", T0)], '=HYPERLINK("x"),evil')], NOW)
    const csv = toCsv(perUser)
    const [header, row] = csv.split("\n")
    expect(header).toBe("name,applications,distinct_postings,first_at,second_at,status,feedback_accurate,feedback_total")
    expect(row.startsWith(`"'=HYPERLINK(""x""),evil"`)).toBe(true)
  })

  it("leaves second_at empty when there is none", () => {
    const { perUser } = computeLoopMetrics([vaultWith("vault-csv-0002", [app("a", T0)], "Sam")], NOW)
    expect(toCsv(perUser).split("\n")[1]).toBe(`Sam,1,1,${new Date(T0).toISOString()},,one,0,0`)
  })
})
