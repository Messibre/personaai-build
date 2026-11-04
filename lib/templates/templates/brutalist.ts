import { e, safeImageSrc } from "../shared/escape"
import { buildContact } from "../shared/sections/contact"
import { buildEducation } from "../shared/sections/education"
import { buildExperience } from "../shared/sections/experience"
import { buildFooter } from "../shared/sections/footer"
import { buildGitHubStats } from "../shared/sections/github-stats"
import { buildNav } from "../shared/sections/nav"
import { buildNow } from "../shared/sections/now"
import { buildProjects } from "../shared/sections/projects"
import { buildSkills } from "../shared/sections/skills"
import { buildTestimonials } from "../shared/sections/testimonials"
import { buildWriting } from "../shared/sections/writing"
import { shell } from "../shared/shell"
import { THEMES } from "../shared/themes"
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ===== TEMPLATE: BRUTALIST ===== */
export function buildBrutalist(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)
  const role = langs.length > 0 ? `${langs[0]} Dev` : "Developer"

  const extra = `
    * { border-radius: 0 !important; }
    body { background: var(--bg); color: var(--text); font-family:var(--font-mono); }
    .hero { min-height: 100vh; display: flex; align-items: stretch; border-bottom: 4px solid ${c.accent}; }
    .hero-left { flex: 1.2; background: var(--bg); padding: 120px 48px 80px; display: flex; flex-direction: column; justify-content: flex-end; border-right: 4px solid ${c.accent}; }
    .hero-left h1 { font-size: clamp(3rem, 9vw, 6rem); font-weight: var(--display-weight); line-height: 0.9; color: var(--text); text-transform: uppercase; letter-spacing: var(--display-tracking); margin-bottom: 24px; }
    .hero-left h1 em { color: ${c.accent}; font-style: normal; display: block; }
    .hero-left p { font-size: 13px; color: var(--muted); line-height: 1.8; max-width: 360px; font-family:var(--font-body); }
    .hero-left .role-tag { display: inline-block; background: ${c.accent}; color: var(--accent-contrast); font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; padding: 6px 16px; margin-bottom: 20px; }
    .hero-right { flex: 0.7; background: var(--surface); display: flex; flex-direction: column; align-items: stretch; }
    .hero-right img { width: 100%; height: 65%; object-fit: cover; filter: grayscale(100%) contrast(1.2); border-bottom: 4px solid ${c.accent}; }
    .hero-right-info { padding: 24px; flex: 1; display: flex; flex-direction: column; gap: 16px; }
    .stat-box { border: 2px solid var(--border); padding: 14px 16px; }
    .stat-box .num { font-size: 28px; font-weight: 900; color: ${c.accent}; }
    .stat-box .lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; }
    .brut-section { border-top: 4px solid ${c.accent}; }
    .brut-section .section-label { background: ${c.accent}; color: var(--accent-contrast); display: inline-block; padding: 4px 16px; font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 0; }
    .brut-section .section-title { font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; border-bottom: 2px solid var(--border); padding-bottom: 24px; margin-bottom: 40px; }
    .projects-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .project-card { border: 2px solid var(--border); background: var(--bg); }
    .project-card:hover { border-color: ${c.accent}; }
    .project-name { font-family:var(--font-mono); font-size: 15px; }
    @media (max-width:768px) { .hero { flex-direction: column; } .hero-right { border-left: none; border-top: 4px solid ${c.accent}; } .hero-left { padding: 100px 24px 40px; } }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-left">
      <span class="role-tag hero-anim">${e(role)}</span>
      <h1 class="hero-anim">${e(name.split(" ")[0])}<em>${e(name.split(" ").slice(1).join(" ") || ".")}</em></h1>
      ${(aiBio || profile.bio) ? `<p class="hero-anim">${e((aiBio || profile.bio))}</p>` : ""}
    </div>
    <div class="hero-right hero-anim">
      <img src="${img}" alt="${e(name)}" crossorigin="anonymous">
      <div class="hero-right-info">
        <div class="stat-box"><div class="num">${profile.public_repos}</div><div class="lbl">Repositories</div></div>
        <div class="stat-box"><div class="num">${profile.followers}</div><div class="lbl">Followers</div></div>
        <div class="stat-box"><div class="num">${langs.length}</div><div class="lbl">Languages</div></div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `
  <section id="about" class="section brut-section">
    <div class="container">
      <span class="section-label">About</span>
      <h2 class="section-title reveal">Who Am I</h2>
      ${(aiBio || profile.bio) ? `<p class="section-desc reveal" style="max-width:700px;font-family:var(--font-body)">${e((aiBio || profile.bio))}</p>` : ""}
      <div style="display:flex;gap:24px;flex-wrap:wrap" class="reveal">
        ${profile.location ? `<span style="border:2px solid var(--border);padding:8px 16px;font-size:13px;color:var(--muted)">${e(profile.location)}</span>` : ""}
        ${profile.company ? `<span style="border:2px solid var(--border);padding:8px 16px;font-size:13px;color:var(--muted)">${e(profile.company)}</span>` : ""}
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section brut-section"><div class="container"><span class="section-label">Skills</span><h2 class="section-title reveal">Tech Stack</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section brut-section"><div class="container"><span class="section-label">Work</span><h2 class="section-title reveal">Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url, THEMES["brutalist"])
}
