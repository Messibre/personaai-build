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

/* ===== TEMPLATE: BOLD PORTRAIT ===== */
export function buildBoldPortrait(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; align-items: center; position: relative; overflow: hidden; }
    .hero-img { position: absolute; right: 0; top: 0; width: 50%; height: 100%; object-fit: cover; filter: grayscale(100%); opacity: 0.5; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, #0a0a0f 40%, transparent 80%); }
    .hero-content { position: relative; z-index: 2; padding: 120px 6vw 80px; max-width: 650px; }
    .hero h1 { font-size: clamp(3.5rem, 9vw, 7rem); font-weight: 900; line-height: 0.95; color: #fff; margin-bottom: 20px; }
    .hero h1 span { color: ${c.accent}; }
    .hero-bio { font-size: clamp(1rem, 1.5vw, 1.15rem); color: #999; line-height: 1.7; margin-bottom: 40px; }
    .stats-row { display: flex; gap: 48px; }
    .stat-num { font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; color: ${c.accent}; }
    .stat-label { font-size: 13px; color: #666; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
    @media (max-width:768px) {
      .hero-img { position: relative; width: 100%; height: 250px; opacity: 0.4; }
      .hero { flex-direction: column; }
      .hero-overlay { background: linear-gradient(180deg, transparent, #0a0a0f 60%); }
      .hero-content { padding: 40px 24px 60px; }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <img src="${img}" alt="${e(name)}" class="hero-img hero-photo-parallax" crossorigin="anonymous">
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <h1 class="hero-anim">Hello<span>.</span></h1>
      <p class="hero-bio hero-anim">${e(aiBio || profile.bio || `I'm ${name}, a developer building exceptional digital experiences.`)}</p>
      <div class="stats-row hero-anim">
        <div><div class="stat-num">+${profile.public_repos}</div><div class="stat-label">Projects</div></div>
        <div><div class="stat-num">+${profile.followers}</div><div class="stat-label">Followers</div></div>
        <div><div class="stat-num">${langs.length}</div><div class="stat-label">Languages</div></div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Expertise</p><h2 class="section-title reveal">Skills & Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Featured Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}
