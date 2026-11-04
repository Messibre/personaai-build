import type { GitHubRepo, AIProject } from "../../../types"
import { e, safeUrl } from "../escape"
import { smartRepoDescription } from "./projects"

export function buildFeaturedProject(aiProjects: AIProject[] | null | undefined, repos: GitHubRepo[], accent: string): string {
  const featured = aiProjects?.[0] || (repos.filter(r => !r.fork)[0] ? {
    name: repos.filter(r => !r.fork)[0].name,
    description: repos.filter(r => !r.fork)[0].description || smartRepoDescription(repos.filter(r => !r.fork)[0].name, repos.filter(r => !r.fork)[0].language),
    url: repos.filter(r => !r.fork)[0].html_url,
    language: repos.filter(r => !r.fork)[0].language,
    stars: repos.filter(r => !r.fork)[0].stargazers_count,
    forks: repos.filter(r => !r.fork)[0].forks_count,
  } : null)

  if (!featured) return ""

  return `
  <section id="featured" class="section">
    <div class="container">
      <p class="section-label reveal">Case Study</p>
      <h2 class="section-title reveal">Featured Project</h2>
      <div class="reveal" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;right:0;width:40%;height:100%;background:linear-gradient(135deg,${accent}06,transparent);pointer-events:none"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:20px">
          <h3 style="font-size:clamp(1.4rem,2.5vw,2rem);font-weight:800;color:#fff">${e(featured.name)}</h3>
          ${featured.language ? `<span style="font-size:12px;padding:4px 14px;border-radius:20px;background:${accent}12;color:${accent};border:1px solid ${accent}20">${e(featured.language)}</span>` : ""}
          ${featured.stars > 0 ? `<span style="font-size:13px;color:${accent};font-weight:600">&#9733; ${featured.stars} stars</span>` : ""}
        </div>
        <p style="font-size:16px;color:#888;line-height:1.8;max-width:700px;margin-bottom:28px">${e(featured.description)}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="${safeUrl(featured.url)}" target="_blank" rel="noopener" style="padding:12px 28px;background:${accent};color:#000;border-radius:10px;font-size:14px;font-weight:700">View on GitHub &rarr;</a>
        </div>
      </div>
    </div>
  </section>`
}
