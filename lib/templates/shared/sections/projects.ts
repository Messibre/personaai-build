import type { GitHubRepo, AIProject } from "../../../types"
import { e, safeUrl, stripMd } from "../escape"
import { langColor } from "../utils"

// Guessing a repo's purpose from its name produced invented claims, so a repo
// without a real description gets none. Kept as a function so callers stay unchanged.
export function smartRepoDescription(_name: string, _language: string | null): string {
  return ""
}

// Build projects from either AI-enhanced projects or raw repos
export function buildProjects(repos: GitHubRepo[], accent: string, aiProjects?: AIProject[] | null): string {
  function buildFallbackDescription(repo: GitHubRepo): string {
    const desc = repo.description?.trim() || ""
    if (desc && !(desc.includes("A ") && desc.includes(" project") && desc.split(/\s+/).length <= 4)) return desc
    if (repo.topics?.length) return `A ${repo.language || "software"} project focused on ${repo.topics.slice(0, 3).join(", ")}.`
    return ""
  }

  // Determine the most recently pushed repo (first non-fork in the list, as GitHub API returns by updated_at)
  const recentRepo = repos.filter(r => !r.fork)[0]?.name

  if (aiProjects && aiProjects.length > 0) {
    const langs = [...new Set(aiProjects.map(p => p.language).filter(Boolean))] as string[]
    const filterChips = langs.length > 1
      ? `<div class="proj-filter" role="group" aria-label="Filter projects by language">
          <button class="proj-chip active" data-lang="all">All</button>
          ${langs.map(l => `<button class="proj-chip" data-lang="${e(l)}">${e(l)}</button>`).join("")}
        </div>`
      : ""
    return filterChips + aiProjects.slice(0, 7).map((p, i) => {
      const lc = langColor(p.language)
      const isRecent = i === 0
      return `
    <div class="project-card reveal" data-lang="${e(p.language || "")}" style="opacity:0;transform:translateY(40px)">
      <div class="proj-thumb" style="background:linear-gradient(90deg,${lc},${lc}80)" aria-hidden="true"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px">
        <h3 class="project-name">${e(p.name)}</h3>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          ${isRecent ? `<span class="proj-now">Active</span>` : ""}
          ${p.stars > 0 ? `<span class="project-stars" aria-label="${p.stars} stars">&#9733; ${p.stars}</span>` : ""}
        </div>
      </div>
      <p class="project-desc">${e(stripMd(p.description))}</p>
      <div class="project-meta">
        ${p.language ? `<span class="project-lang">${e(p.language)}</span>` : ""}
        <div class="project-links">
          <a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="project-link gh" aria-label="View ${e(p.name)} on GitHub">GitHub</a>
        </div>
      </div>
    </div>`
    }).join("")
  }
  
  const filtered = repos.filter(r => !r.fork).slice(0, 6)
  const langs = [...new Set(filtered.map(r => r.language).filter(Boolean))] as string[]
  const filterChips = langs.length > 1
    ? `<div class="proj-filter" role="group" aria-label="Filter projects by language">
        <button class="proj-chip active" data-lang="all">All</button>
        ${langs.map(l => `<button class="proj-chip" data-lang="${e(l)}">${e(l)}</button>`).join("")}
      </div>`
    : ""

  return filterChips + filtered.map((r, i) => {
    const desc = buildFallbackDescription(r) || smartRepoDescription(r.name, r.language)
    const lc = langColor(r.language)
    const isRecent = r.name === recentRepo
    return `
    <div class="project-card reveal" data-lang="${e(r.language || "")}" style="opacity:0;transform:translateY(40px)">
      <div class="proj-thumb" style="background:linear-gradient(90deg,${lc},${lc}80)" aria-hidden="true"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px">
        <h3 class="project-name">${e(r.name)}</h3>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          ${isRecent ? `<span class="proj-now">Active</span>` : ""}
          ${r.stargazers_count > 0 ? `<span class="project-stars" aria-label="${r.stargazers_count} stars">&#9733; ${r.stargazers_count}</span>` : ""}
        </div>
      </div>
      ${desc ? `<p class="project-desc">${e(desc)}</p>` : ""}
      <div class="project-meta">
        ${r.language ? `<span class="project-lang">${e(r.language)}</span>` : ""}
        ${r.topics?.slice(0, 1).map(t => `<span class="project-lang" style="opacity:0.55">${e(t)}</span>`).join("") || ""}
        <div class="project-links">
          ${r.homepage && safeUrl(r.homepage) !== "#" ? `<a href="${safeUrl(r.homepage)}" target="_blank" rel="noopener" class="project-link" aria-label="Live demo for ${e(r.name)}">Live</a>` : ""}
          <a href="${safeUrl(r.html_url)}" target="_blank" rel="noopener" class="project-link gh" aria-label="View ${e(r.name)} on GitHub">GitHub</a>
        </div>
      </div>
    </div>`
  }).join("")
}
