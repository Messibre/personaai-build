import { createHash } from "crypto"

const VERCEL_API = "https://api.vercel.com"

const teamId = process.env.VERCEL_TEAM_ID
const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""

const AUTH_ERROR =
  "Vercel rejected VERCEL_TOKEN for this scope. Create a new token at vercel.com/account/tokens with access to your team (re-authenticate SAML if required) and update VERCEL_TOKEN (and optionally VERCEL_TEAM_ID)."

interface DeployRequest {
  html: string
  projectName?: string
}

interface FileInfo {
  file: string
  sha: string
  size: number
}

async function waitForReady(deploymentId: string, token: string, maxWaitMs = 90000): Promise<string | null> {
  const start = Date.now()
  const interval = 3000

  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, interval))

    try {
      const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}${teamQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) continue

      const data = await res.json()
      const state: string = data.readyState || data.status || ""

      if (state === "READY") {
        // Return the alias URL if available (cleaner), otherwise the deployment URL
        const alias = data.alias?.[0]
        return alias ? `https://${alias}` : `https://${data.url}`
      }

      if (state === "ERROR" || state === "CANCELED") {
        return null
      }
    } catch {
      // continue polling
    }
  }

  return null
}

const MAX_HTML_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const token = process.env.VERCEL_TOKEN
    if (!token) {
      return Response.json(
        { error: "VERCEL_TOKEN not configured. Please add it in project settings." },
        { status: 500 }
      )
    }

    const { html, projectName = "portfolio" }: DeployRequest = await request.json()

    if (typeof html !== "string" || html.length < 100) {
      return Response.json({ error: "Invalid HTML content" }, { status: 400 })
    }

    if (Buffer.byteLength(html, "utf-8") > MAX_HTML_BYTES) {
      return Response.json({ error: "Portfolio HTML is too large to deploy" }, { status: 413 })
    }

    // Clean slug: only lowercase letters and hyphens, max 52 chars
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 52) || "my-portfolio"

    const files: { path: string; content: string }[] = [
      { path: "index.html", content: html },
      {
        path: "vercel.json",
        content: JSON.stringify({ cleanUrls: true, trailingSlash: false, public: true }),
      },
    ]

    // Upload files
    const fileInfos: FileInfo[] = []

    for (const file of files) {
      const content = Buffer.from(file.content, "utf-8")
      const sha = createHash("sha1").update(content).digest("hex")
      const size = content.length

      const uploadRes = await fetch(`${VERCEL_API}/v2/files${teamQuery}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "x-vercel-digest": sha,
          "Content-Length": size.toString(),
        },
        body: content,
      })

      if (uploadRes.status === 401 || uploadRes.status === 403) {
        return Response.json({ error: AUTH_ERROR }, { status: 502 })
      }

      if (!uploadRes.ok && uploadRes.status !== 409) {
        const errText = await uploadRes.text()
        return Response.json(
          { error: `Failed to upload ${file.path}: ${errText}` },
          { status: 500 }
        )
      }

      fileInfos.push({ file: file.path, sha, size })
    }

    // Create deployment
    const deployRes = await fetch(`${VERCEL_API}/v13/deployments${teamQuery}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: safeName,
        files: fileInfos,
        projectSettings: { framework: null },
        target: "production",
        public: true,
      }),
    })

    if (deployRes.status === 401 || deployRes.status === 403) {
      return Response.json({ error: AUTH_ERROR }, { status: 502 })
    }

    if (!deployRes.ok) {
      const errData = await deployRes.json().catch(() => ({}))
      return Response.json(
        { error: errData.error?.message || `Deployment failed: ${deployRes.status}` },
        { status: 500 }
      )
    }

    const deployData = await deployRes.json()
    const deploymentId: string = deployData.id
    const immediateUrl = `https://${deployData.url}`

    // Poll until READY (up to 90 seconds)
    const readyUrl = await waitForReady(deploymentId, token)

    return Response.json({
      success: true,
      url: readyUrl || immediateUrl,
      deploymentId,
      projectName: safeName,
      ready: !!readyUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deployment failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
