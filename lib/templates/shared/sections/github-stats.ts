import type { GitHubProfile, GitHubRepo } from "../../../types"
import { e, safeUrl } from "../escape"
import { getLangs } from "../utils"

export function buildGitHubStats(profile: GitHubProfile, accent: string, repos: GitHubRepo[]): string {
  const username = profile.username
  const langs = getLangs(repos)
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
  const accentEnc = encodeURIComponent(accent.replace("#",""))
  const statsUrl = `https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(username)}&show_icons=true&theme=transparent&title_color=${accentEnc}&text_color=aaaaaa&icon_color=${accentEnc}&border_color=ffffff15&bg_color=00000000&ring_color=${accentEnc}`
  const langsUrl = `https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(username)}&layout=compact&theme=transparent&title_color=${accentEnc}&text_color=aaaaaa&border_color=ffffff15&bg_color=00000000&langs_count=8`
  const streakUrl = `https://github-readme-streak-stats.herokuapp.com/?user=${encodeURIComponent(username)}&theme=transparent&ring=${accentEnc}&fire=${accentEnc}&currStreakLabel=${accentEnc}&sideLabels=aaaaaa&dates=666666&border=ffffff15`

  const statCard = (value: string | number, label: string) =>
    `<div style="text-align:center;padding:20px 28px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;min-width:110px">
      <div style="font-size:2rem;font-weight:800;color:${accent};line-height:1">${value}</div>
      <div style="font-size:11px;color:#555;letter-spacing:1.5px;text-transform:uppercase;margin-top:6px">${label}</div>
    </div>`

  return `
  <section id="github-stats" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Open Source</p>
      <h2 class="section-title reveal">GitHub Activity</h2>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:32px" class="reveal">
        <img src="${safeUrl(statsUrl)}" alt="${e(username)} GitHub stats" loading="lazy" style="border-radius:12px;max-width:100%;flex-shrink:1;min-width:0;height:auto" onerror="this.style.display='none'">
        <img src="${safeUrl(langsUrl)}" alt="${e(username)} top languages" loading="lazy" style="border-radius:12px;max-width:100%;flex-shrink:1;min-width:0;height:auto" onerror="this.style.display='none'">
        <img src="${safeUrl(streakUrl)}" alt="${e(username)} contribution streak" loading="lazy" style="border-radius:12px;max-width:100%;flex-shrink:1;min-width:0;height:auto" onerror="this.style.display='none'">
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap" class="reveal" role="list" aria-label="GitHub statistics">
        ${statCard(profile.public_repos, "Repositories")}
        ${statCard(totalStars, "Stars Earned")}
        ${statCard(profile.followers, "Followers")}
        ${statCard(langs.length, "Languages")}
        ${statCard(profile.following, "Following")}
      </div>
    </div>
  </section>`
}
