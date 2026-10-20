import { e, safeUrl, safeImageSrc, stripMd } from "../shared/escape"
import { buildAbout } from "../shared/sections/about"
import { buildContact } from "../shared/sections/contact"
import { buildEducation } from "../shared/sections/education"
import { buildExperience } from "../shared/sections/experience"
import { buildFooter } from "../shared/sections/footer"
import { buildGitHubStats } from "../shared/sections/github-stats"
import { buildNav } from "../shared/sections/nav"
import { buildNow } from "../shared/sections/now"
import { buildSkills } from "../shared/sections/skills"
import { buildTestimonials } from "../shared/sections/testimonials"
import { buildWriting } from "../shared/sections/writing"
import { shell } from "../shared/shell"
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ===== TEMPLATE: MINIMAL CLEAN (now premium dark minimal) ===== */
export function buildMinimalClean(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
    .hero-photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 2px solid ${c.accent}40; margin-bottom: 28px; box-shadow: 0 0 40px ${c.accent}15; }
    .hero h1 { font-size: clamp(1.5rem, 3vw, 2.2rem); font-weight: 600; color: #fff; margin-bottom: 8px; letter-spacing: 0.01em; }
    .hero p { font-size: 15px; color: #888; letter-spacing: 0.5px; }
    .hero .cta { display: inline-block; margin-top: 28px; padding: 12px 32px; border: 1.5px solid ${c.accent}; color: ${c.accent}; border-radius: 8px; font-weight: 500; font-size: 14px; letter-spacing: 0.5px; }
    .hero .cta:hover { background: ${c.accent}; color: #000; }
    .project-list { display: flex; flex-direction: column; }
    .project-item { padding: 24px 0; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; gap: 16px; transition: all .3s; }
    .project-item:hover { padding-left: 12px; border-color: ${c.accent}30; }
    .project-item h3 { font-size: 16px; font-weight: 600; color: #ddd; }
    .project-item p { font-size: 13px; color: #777; margin-top: 4px; }
    .project-item a { font-size: 13px; color: ${c.accent}; white-space: nowrap; font-weight: 500; }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <img src="${img}" alt="${e(name)}" class="hero-photo hero-anim hero-photo-parallax" crossorigin="anonymous">
    <h1 class="hero-anim">${e(name)}</h1>
    <p class="hero-anim">${e(aiBio || profile.bio || "Developer & Creator")}</p>
    <a href="#projects" class="cta hero-anim">View Work</a>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `
  <section id="projects" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Work</p>
      <h2 class="section-title reveal">Projects</h2>
      <div class="project-list">
        ${(aiProjects && aiProjects.length > 0 ? aiProjects.slice(0, 8).map(p => `
          <div class="project-item reveal">
            <div><h3>${e(p.name)}</h3><p>${e(stripMd(p.description))}</p></div>
            <a href="${safeUrl(p.url)}" target="_blank" rel="noopener">&rarr;</a>
          </div>`) : repos.filter(r => !r.fork).slice(0, 8).map(r => `
          <div class="project-item reveal">
            <div><h3>${e(r.name)}</h3><p>${e(stripMd(r.description || "A carefully crafted project."))}</p></div>
            <a href="${safeUrl(r.html_url)}" target="_blank" rel="noopener">&rarr;</a>
          </div>`)).join("")}
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}
