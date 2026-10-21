import type { GitHubProfile, GitHubRepo } from "../../../types"
import { e, safeUrl } from "../escape"

export function buildAbout(profile: GitHubProfile, aiBio: string | null, accent: string, repos?: GitHubRepo[]): string {
  const bio = aiBio || profile.bio || ""
  const totalStars = repos ? repos.reduce((s, r) => s + r.stargazers_count, 0) : 0

  // Quick-fact pills
  const facts: string[] = []
  if (profile.location) facts.push(`&#128205; ${e(profile.location)}`)
  if (profile.company) facts.push(`&#127970; ${e(profile.company)}`)
  if (profile.public_repos > 0) facts.push(`&#128230; ${profile.public_repos} repos`)
  if (totalStars > 0) facts.push(`&#9733; ${totalStars} total stars`)
  if (profile.followers > 0) facts.push(`&#128101; ${profile.followers} followers`)
  return `
  <section id="about" class="section">
    <div class="container">
      <p class="section-label reveal">About</p>
      <h2 class="section-title reveal">A little about me</h2>
      ${bio ? `<p class="section-desc reveal" style="max-width:720px;font-size:17px;line-height:1.75;color:var(--muted,#888)">${e(bio)}</p>` : ""}
      ${facts.length ? `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:32px" class="reveal" role="list" aria-label="Quick facts">
        ${facts.map(f => `<span role="listitem" class="about-fact" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:20px;background:var(--surface,rgba(255,255,255,0.04));border:1px solid var(--border,rgba(255,255,255,0.08));font-size:13px;color:var(--text,#e8e8ef)">${f}</span>`).join("")}
      </div>` : ""}
      <div style="display:flex;gap:12px;flex-wrap:wrap" class="reveal">
        ${profile.blog && safeUrl(profile.blog) !== "#" ? `<a href="${safeUrl(profile.blog)}" target="_blank" rel="noopener" style="padding:10px 22px;border:1.5px solid ${accent}40;color:${accent};border-radius:10px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">&#127758; Website</a>` : ""}
        <a href="${safeUrl(profile.html_url)}" target="_blank" rel="noopener" class="about-gh-link" style="padding:10px 22px;border:1.5px solid var(--border,rgba(255,255,255,0.1));color:var(--text,#e8e8ef);border-radius:10px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">&#128196; GitHub Profile</a>
      </div>
    </div>
  </section>`
}
