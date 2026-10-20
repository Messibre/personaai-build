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

/* ===== TEMPLATE: SPLIT EDITORIAL ===== */
export function buildSplitEditorial(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; }
    .hero-dark { flex: 1; background: #050508; display: flex; align-items: center; justify-content: center; padding: 40px; position: relative; }
    .hero-dark img { width: 80%; max-width: 380px; height: 85vh; max-height: 550px; object-fit: cover; filter: grayscale(100%); border-radius: 8px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
    .hero-dark .num { position: absolute; top: 100px; left: 40px; font-size: 60px; font-weight: 200; color: rgba(255,255,255,0.08); }
    .hero-light { flex: 1; background: #12121a; display: flex; flex-direction: column; justify-content: center; padding: 60px; border-left: 1px solid rgba(255,255,255,0.06); }
    .hero-light h1 { font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 800; line-height: 1.15; color: #fff; margin-bottom: 20px; }
    .hero-light h1 span { color: ${c.accent}; font-style: italic; }
    .hero-light p { font-size: 15px; color: #888; line-height: 1.7; margin-bottom: 28px; max-width: 400px; }
    .hero-light a.cta { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: ${c.accent}; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    @media (max-width:768px) {
      .hero { flex-direction: column; min-height: auto; }
      .hero-dark { min-height: 350px; } .hero-dark img { width: 60%; height: auto; aspect-ratio: 3/4; }
      .hero-light { padding: 40px 24px; border-left: none; border-top: 1px solid rgba(255,255,255,0.06); }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero hero-split">
    <div class="hero-dark">
      <span class="num hero-anim">01</span>
      <img src="${img}" alt="${e(name)}" class="hero-anim hero-photo-parallax" crossorigin="anonymous">
    </div>
    <div class="hero-light">
      <h1 class="hero-anim">${e(name)}<br><span>Portfolio</span></h1>
      ${(aiBio || profile.bio) ? `<p class="hero-anim">${e((aiBio || profile.bio))}</p>` : ""}
      <a href="#projects" class="cta hero-anim">View Projects &darr;</a>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Expertise</p><h2 class="section-title reveal">Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
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
