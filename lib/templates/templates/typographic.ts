import { e, safeImageSrc } from "../shared/escape"
import { buildAbout } from "../shared/sections/about"
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
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ===== TEMPLATE: TYPOGRAPHIC ===== */
export function buildTypographic(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)
  const role = langs.length > 0 ? `${langs[0]} Developer` : "Developer"

  const extra = `
    .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 24px; }
    .hero-photo { width: clamp(180px, 25vw, 280px); height: clamp(180px, 25vw, 280px); border-radius: 50%; object-fit: cover; filter: grayscale(90%); position: relative; z-index: 1; box-shadow: 0 0 80px ${c.accent}25; }
    .hero-title { position: absolute; font-size: clamp(3.5rem, 12vw, 9rem); font-weight: 900; color: rgba(255,255,255,0.08); z-index: 2; text-align: center; line-height: 0.95; pointer-events: none; text-transform: uppercase; letter-spacing: -0.03em; }
    .hero-name { position: relative; z-index: 3; margin-top: 24px; font-size: clamp(1rem, 1.5vw, 1.2rem); color: #aaa; text-align: center; letter-spacing: 4px; text-transform: uppercase; font-weight: 500; }
    .hero-role { font-size: 14px; color: ${c.accent}; text-align: center; margin-top: 8px; letter-spacing: 2px; text-transform: uppercase; }
    @media (max-width:768px) { .hero-title { font-size: clamp(3rem, 16vw, 5rem); } .hero-photo { width: 160px; height: 160px; } }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-title hero-anim">${e(role)}</div>
    <img src="${img}" alt="${e(name)}" class="hero-photo hero-anim hero-photo-parallax" crossorigin="anonymous">
    <div class="hero-name hero-anim">${e(name)}</div>
    <div class="hero-role hero-anim">${e(profile.location || "Worldwide")}</div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">What I work with</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Projects</p><h2 class="section-title reveal">Selected Work</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
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
