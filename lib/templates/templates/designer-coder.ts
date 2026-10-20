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

/* ===== TEMPLATE: DESIGNER CODER ===== */
export function buildDesignerCoder(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; position: relative; }
    .hero-left { flex: 1; background: #0e0e14; display: flex; flex-direction: column; justify-content: center; padding: 60px; }
    .hero-left h2 { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 900; color: #fff; letter-spacing: -0.02em; }
    .hero-left p { font-size: 14px; color: #666; line-height: 1.7; margin-top: 12px; max-width: 280px; }
    .hero-right { flex: 1; background: #0a0a10; display: flex; flex-direction: column; justify-content: center; padding: 60px; border-left: 1px solid rgba(255,255,255,0.04); }
    .hero-right h2 { font-family: 'JetBrains Mono', monospace; font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: ${c.accent}; }
    .hero-right p { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #666; line-height: 1.7; margin-top: 12px; max-width: 280px; }
    .hero-center-photo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: clamp(140px, 18vw, 220px); height: clamp(140px, 18vw, 220px); border-radius: 50%; object-fit: cover; border: 4px solid #0a0a0f; z-index: 10; box-shadow: 0 0 60px ${c.accent}25, -20px -12px 0 ${c.accent}, 20px 12px 0 ${c.primary}; }
    @media (max-width:768px) {
      .hero { flex-direction: column; min-height: auto; }
      .hero-left, .hero-right { padding: 60px 24px; min-height: 40vh; }
      .hero-right { border-left: none; border-top: 1px solid rgba(255,255,255,0.04); }
      .hero-center-photo { position: relative; left: auto; top: auto; transform: none; margin: -40px auto; }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero hero-split">
    <div class="hero-left">
      <h2 class="hero-anim">designer</h2>
      <p class="hero-anim">Creative mind with an eye for detail, UX, and visual storytelling.</p>
    </div>
    <div class="hero-right">
      <h2 class="hero-anim">&lt;coder&gt;</h2>
      <p class="hero-anim">Building robust, clean, and performant applications.</p>
    </div>
    <img src="${img}" alt="${e(name)}" class="hero-center-photo hero-anim hero-photo-parallax" crossorigin="anonymous">
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Stack</p><h2 class="section-title reveal">Tech Stack</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
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
