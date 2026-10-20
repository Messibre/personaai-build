import { e, safeUrl, safeImageSrc, stripMd } from "../shared/escape"
import { buildContact } from "../shared/sections/contact"
import { buildEducation } from "../shared/sections/education"
import { buildExperience } from "../shared/sections/experience"
import { buildFooter } from "../shared/sections/footer"
import { buildGitHubStats } from "../shared/sections/github-stats"
import { buildNav } from "../shared/sections/nav"
import { buildNow } from "../shared/sections/now"
import { smartRepoDescription } from "../shared/sections/projects"
import { buildSkills } from "../shared/sections/skills"
import { buildTestimonials } from "../shared/sections/testimonials"
import { buildWriting } from "../shared/sections/writing"
import { shell } from "../shared/shell"
import { THEMES } from "../shared/themes"
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ===== TEMPLATE: GLASSMORPHISM ===== */
export function buildGlassmorphism(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)
  const role = langs.length > 0 ? `${langs[0]} Developer` : "Software Developer"

  const extra = `
    body { background: var(--bg); overflow-x: hidden; }
    .glass-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    .glass-bg::before { content: ''; position: absolute; top: -20%; left: -10%; width: 60%; height: 60%; border-radius: 50%; background: ${c.accent}; filter: blur(120px); opacity: 0.12; }
    .glass-bg::after { content: ''; position: absolute; bottom: -20%; right: -10%; width: 50%; height: 50%; border-radius: 50%; background: ${c.primary}; filter: blur(100px); opacity: 0.1; }
    .hero { min-height: 100vh; display: flex; align-items: center; position: relative; z-index: 1; padding: 100px 24px 60px; }
    .hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; display: flex; align-items: center; gap: 60px; }
    .hero-glass { background: var(--surface); backdrop-filter: blur(24px); border: 1px solid var(--border); border-radius: 32px; padding: 56px 48px; flex: 1; }
    .hero-glass .tag { font-size: 13px; color: ${c.accent}; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .hero-glass .tag::before { content: ''; display: inline-block; width: 24px; height: 2px; background: ${c.accent}; }
    .hero-glass h1 { font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; color: var(--text); line-height: 1.2; margin-bottom: 16px; }
    .hero-glass p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.75; margin-bottom: 32px; max-width: 440px; }
    .hero-glass .ctas { display: flex; gap: 12px; flex-wrap: wrap; }
    .hero-glass .ctas a { padding: 13px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; transition: all .3s; }
    .hero-glass .ctas .primary { background: ${c.accent}; color: var(--accent-contrast); box-shadow: 0 8px 32px ${c.accent}35; }
    .hero-glass .ctas .primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px ${c.accent}50; }
    .hero-glass .ctas .secondary { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); backdrop-filter: blur(8px); }
    .hero-glass .ctas .secondary:hover { background: var(--surface-2); }
    .hero-photo-wrap { flex-shrink: 0; position: relative; }
    .hero-photo-wrap img { width: clamp(200px, 22vw, 300px); height: clamp(260px, 28vw, 380px); object-fit: cover; border-radius: 28px; border: 1px solid var(--border); }
    .hero-photo-wrap::before { content: ''; position: absolute; inset: -2px; border-radius: 30px; background: linear-gradient(135deg, ${c.accent}60, transparent 50%, ${c.primary}40); z-index: -1; }
    .hero-photo-wrap::after { content: ''; position: absolute; inset: -20px; border-radius: 40px; background: ${c.accent}; filter: blur(40px); opacity: 0.12; z-index: -2; }
    .glass-card { background: var(--surface); backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: 20px; padding: 28px; transition: all .4s; }
    .glass-card:hover { background: var(--surface-2); border-color: ${c.accent}30; transform: translateY(-4px); }
    .glass-section { position: relative; z-index: 1; }
    .skill-badge { background: var(--surface); border: 1px solid var(--border); backdrop-filter: blur(8px); }
    .skill-badge:hover { background: ${c.accent}15; }
    @media (max-width:768px) { .hero-inner { flex-direction: column; } .hero-glass { padding: 36px 24px; } .hero-photo-wrap img { width: 200px; height: 260px; } }
  `
  const body = `
  <div class="glass-bg"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-inner">
      <div class="hero-glass hero-anim">
        <div class="tag">${e(role)}</div>
        <h1>${e(name)}</h1>
        ${(aiBio || profile.bio) ? `<p>${e((aiBio || profile.bio))}</p>` : ""}
        <div class="ctas">
          <a href="#projects" class="primary">View My Work</a>
          <a href="#contact" class="secondary">Get in Touch</a>
        </div>
      </div>
      <div class="hero-photo-wrap hero-anim">
        <img src="${img}" alt="${e(name)}" class="hero-photo-parallax" crossorigin="anonymous">
      </div>
    </div>
  </section>
  <main class="glass-section">
  ${config.sections.includes("about") ? `
  <section id="about" class="section">
    <div class="container">
      <p class="section-label reveal">About</p>
      <h2 class="section-title reveal">A little about me</h2>
      <div class="glass-card reveal" style="max-width:700px">
        ${(aiBio || profile.bio) ? `<p style="color:rgba(255,255,255,0.7);line-height:1.75;font-size:15px">${e((aiBio || profile.bio))}</p>` : ""}
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:24px">
          ${profile.location ? `<span style="font-size:13px;color:${c.accent}">&#9679; ${e(profile.location)}</span>` : ""}
          ${profile.company ? `<span style="font-size:13px;color:${c.accent}">&#9679; ${e(profile.company)}</span>` : ""}
          ${profile.blog && safeUrl(profile.blog) !== "#" ? `<a href="${safeUrl(profile.blog)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent}">&#9679; ${e(profile.blog)}</a>` : ""}
        </div>
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Expertise</p><h2 class="section-title reveal">Skills & Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `
  <section id="projects" class="section">
    <div class="container">
      <p class="section-label reveal">Work</p>
      <h2 class="section-title reveal">Featured Projects</h2>
      <div class="projects-grid">
        ${(aiProjects && aiProjects.length > 0 ? aiProjects.slice(0, 7).map(p => `
        <div class="glass-card reveal" style="opacity:0;transform:translateY(40px)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="font-size:17px;font-weight:700;color:var(--text)">${e(p.name)}</h3>
            ${p.stars > 0 ? `<span style="font-size:12px;color:${c.accent};font-weight:600">&#9733; ${p.stars}</span>` : ""}
          </div>
          <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:16px">${e(stripMd(p.description))}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${p.language ? `<span style="font-size:11px;padding:3px 12px;border-radius:20px;background:${c.accent}12;color:${c.accent};border:1px solid ${c.accent}25">${e(p.language)}</span>` : ""}
            <a href="${safeUrl(p.url)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent};font-weight:500;margin-left:auto">View &rarr;</a>
          </div>
        </div>`) : repos.filter(r => !r.fork).slice(0, 6).map(r => {
          const desc = r.description && r.description.trim() ? stripMd(r.description) : smartRepoDescription(r.name, r.language)
          return `
        <div class="glass-card reveal" style="opacity:0;transform:translateY(40px)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="font-size:17px;font-weight:700;color:var(--text)">${e(r.name)}</h3>
            ${r.stargazers_count > 0 ? `<span style="font-size:12px;color:${c.accent};font-weight:600">&#9733; ${r.stargazers_count}</span>` : ""}
          </div>
          <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:16px">${e(desc)}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${r.language ? `<span style="font-size:11px;padding:3px 12px;border-radius:20px;background:${c.accent}12;color:${c.accent};border:1px solid ${c.accent}25">${e(r.language)}</span>` : ""}
            <a href="${safeUrl(r.html_url)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent};font-weight:500;margin-left:auto">View &rarr;</a>
          </div>
        </div>`
        })).join("")}
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

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url, THEMES["glassmorphism"])
}
