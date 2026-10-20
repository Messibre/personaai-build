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

/* ===== TEMPLATE: PASTEL CREATIVE (now dark premium) ===== */
export function buildPastelCreative(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; align-items: center; position: relative; padding: 120px 24px 80px; }
    .hero-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 60px; width: 100%; }
    .hero-text { flex: 1; }
    .hero-text .tag { font-size: 14px; color: ${c.accent}; font-weight: 600; margin-bottom: 12px; display: inline-block; padding: 6px 16px; border: 1px solid ${c.accent}30; border-radius: 20px; background: ${c.accent}08; }
    .hero-text h1 { font-size: clamp(2.2rem, 4.5vw, 3.5rem); font-weight: 800; color: #fff; line-height: 1.15; margin-bottom: 16px; }
    .hero-text p { font-size: 16px; color: #888; line-height: 1.7; margin-bottom: 32px; max-width: 480px; }
    .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }
    .hero-ctas a { padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }
    .hero-ctas .primary { background: ${c.accent}; color: #000; }
    .hero-ctas .secondary { border: 2px solid rgba(255,255,255,0.12); color: #ccc; }
    .hero-photo-wrap { position: relative; flex-shrink: 0; }
    .hero-photo-wrap img { width: clamp(200px, 22vw, 300px); height: clamp(250px, 28vw, 380px); object-fit: cover; border-radius: 20px; border: 2px solid rgba(255,255,255,0.06); }
    .hero-photo-wrap::before { content: ''; position: absolute; inset: -8px; border-radius: 24px; border: 2px solid ${c.accent}20; }
    .hero-photo-wrap::after { content: ''; position: absolute; inset: 0; border-radius: 20px; box-shadow: 0 0 60px ${c.accent}15, 0 30px 80px rgba(0,0,0,0.3); pointer-events: none; }
    @media (max-width:768px) {
      .hero-inner { flex-direction: column-reverse; text-align: center; }
      .hero-photo-wrap img { width: 200px; height: 260px; }
      .hero-ctas { justify-content: center; }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-inner">
      <div class="hero-text">
        <h1 class="hero-anim">${e(name)}</h1>
        ${(aiBio || profile.bio) ? `<p class="hero-anim">${e((aiBio || profile.bio))}</p>` : ""}
        <div class="hero-ctas hero-anim">
          <a href="#projects" class="primary">View Projects</a>
          <a href="#contact" class="secondary">Get in Touch</a>
        </div>
      </div>
      <div class="hero-photo-wrap hero-anim">
        <img src="${img}" alt="${e(name)}" class="hero-photo-parallax" crossorigin="anonymous">
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">My Toolkit</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Portfolio</p><h2 class="section-title reveal">Recent Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
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
