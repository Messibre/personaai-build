"use client"

import { useState, type FormEvent } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface UserRow {
  name: string
  applicationCount: number
  distinctCount: number
  firstAt: string
  secondAt?: string
  status: "one" | "returned" | "same_sitting"
  feedback: { accurate: boolean; note?: string }[]
}

interface MetricsResponse {
  headline: string
  testedUsers: number
  returners: number
  sameSittingSecond: number
  feedbackCount: number
  accurateCount: number
  accurateShare: number | null
  unreadableVaults: number
  perUser: UserRow[]
}

const STATUS_LABEL: Record<UserRow["status"], string> = {
  one: "No second job",
  returned: "Returned",
  same_sitting: "Same sitting",
}

function describeFailure(status: number): string {
  if (status === 401) return "That token was not accepted."
  if (status === 503) return "Admin metrics are not configured on this deployment, or storage is unavailable."
  return "Could not load metrics."
}

/** The token lives only in component state: never in storage, never in the URL. */
export function MetricsPanel() {
  const [token, setToken] = useState("")
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function request(format?: "csv"): Promise<Response> {
    return fetch(`/api/admin/metrics${format ? `?format=${format}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
  }

  async function load(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await request()
      if (!response.ok) {
        setMetrics(null)
        setError(describeFailure(response.status))
        return
      }
      setMetrics((await response.json()) as MetricsResponse)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setBusy(false)
    }
  }

  async function downloadCsv() {
    setError(null)
    try {
      const response = await request("csv")
      if (!response.ok) {
        setError(describeFailure(response.status))
        return
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement("a")
      link.href = url
      link.download = "return-loop.csv"
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Could not download the CSV.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={load} className="flex max-w-md flex-col gap-2">
        <Label htmlFor="admin-token">Admin token</Label>
        <div className="flex gap-2">
          <Input id="admin-token" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} />
          <Button type="submit" disabled={busy || token.length === 0}>
            {busy ? "Loading" : "Load"}
          </Button>
        </div>
      </form>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {metrics ? (
        <>
          <section aria-label="Headline" className="flex flex-col gap-1">
            <p className="text-5xl font-semibold text-foreground">{metrics.headline}</p>
            <p className="text-muted-foreground">tested users came back with a second job</p>
            <p className="text-sm text-muted-foreground">
              Same-sitting second job: {metrics.sameSittingSecond}. Accurate feedback:{" "}
              {metrics.accurateShare === null ? "no answers yet" : `${metrics.accurateCount} of ${metrics.feedbackCount}`}.
              {metrics.unreadableVaults > 0 ? ` Unreadable vaults: ${metrics.unreadableVaults}.` : ""}
            </p>
          </section>

          <div className="flex flex-col gap-3">
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => void downloadCsv()}>
                Download CSV
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Distinct</TableHead>
                  <TableHead>First</TableHead>
                  <TableHead>Second</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.perUser.map((user, index) => (
                  <TableRow key={`${index}-${user.firstAt}`}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{STATUS_LABEL[user.status]}</TableCell>
                    <TableCell>{user.applicationCount}</TableCell>
                    <TableCell>{user.distinctCount}</TableCell>
                    <TableCell>{user.firstAt}</TableCell>
                    <TableCell>{user.secondAt ?? ""}</TableCell>
                    <TableCell>
                      {user.feedback.map((entry) => `${entry.accurate ? "Yes" : "Partly or no"}${entry.note ? `: ${entry.note}` : ""}`).join("; ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  )
}
