import { e, safeUrl, safeImageSrc, stripMd } from "../shared/escape"
import { buildContact } from "../shared/sections/contact"
import { buildEducation } from "../shared/sections/education"
import { buildExperience } from "../shared/sections/experience"
import { buildFooter } from "../shared/sections/footer"
import { buildGitHubStats } from "../shared/sections/github-stats"
import { buildNav } from "../shared/sections/nav"
import { buildNow } from "../shared/sections/now"
import { smartRepoDescription } from "../shared/sections/projects"
import { buildTestimonials } from "../shared/sections/testimonials"
import { buildWriting } from "../shared/sections/writing"
import { shell } from "../shared/shell"
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ========== TEMPLATE: TERMINAL / CLI ========== */
export function buildTerminal(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "forest")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || ""
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'JetBrains Mono', monospace; background:#0d0d0d; color:#c8ffc8; overflow-x:hidden; }
    body::before { content:''; position:fixed; inset:0; background: repeating-linear-gradient(0deg,rgba(0,255,0,0.015) 0px,rgba(0,255,0,0.015) 1px,transparent 1px,transparent 4px); pointer-events:none; z-index:0; }
    a { text-decoration:none; transition:all .2s; }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; background:#0d0d0d; border-bottom:1px solid ${c.accent}40; padding:0 24px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:56px; }
    .nav-brand { font-size:15px; font-weight:700; color:${c.accent}; }
    .nav-links { display:flex; gap:24px; }
    .nav-links a { font-size:12px; color:#666; }
    .nav-links a:hover { color:${c.accent}; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:20px; height:1px; background:${c.accent}; margin:5px 0; }
    .mobile-menu { display:none; position:fixed; top:56px; left:0; right:0; background:#0d0d0d; padding:20px 24px; border-bottom:1px solid ${c.accent}30; z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:12px; }
    .mobile-menu a { font-size:14px; color:#888; padding:8px 0; }
    .mobile-menu a:hover { color:${c.accent}; }
    .section { position:relative; z-index:1; padding:80px 24px; max-width:1100px; margin:0 auto; }
    .prompt { color:${c.accent}; }
    .prompt::before { content:'> '; }
    .cmd-line { font-size:13px; color:#555; margin-bottom:4px; }
    .cmd-line::before { content:'$ '; color:${c.accent}60; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:56px; }
    .hero-terminal { background:#111; border:1px solid ${c.accent}30; border-radius:8px; padding:32px; max-width:700px; width:100%; }
    .terminal-bar { display:flex; gap:8px; margin-bottom:24px; }
    .terminal-dot { width:12px; height:12px; border-radius:50%; }
    .terminal-output { font-size:14px; line-height:2; }
    .terminal-output .key { color:${c.accent}; }
    .terminal-output .val { color:#e0e0e0; }
    .terminal-output .comment { color:#444; }
    .blink { animation:blink 1s step-end infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .section-heading { font-size:11px; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:32px; }
    .section-heading::before { content:'// '; color:#333; }
    .project-card { background:#111; border:1px solid #222; border-radius:6px; padding:24px; margin-bottom:16px; transition:border-color .3s; }
    .project-card:hover { border-color:${c.accent}50; }
    .project-name { font-size:15px; font-weight:700; color:#fff; margin-bottom:6px; }
    .project-name::before { content:'['; color:${c.accent}; }
    .project-name::after { content:']'; color:${c.accent}; }
    .project-desc { font-size:12px; color:#666; line-height:1.7; margin-bottom:12px; }
    .project-meta { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .project-lang { font-size:11px; color:${c.accent}80; }
    .project-lang::before { content:'lang:'; color:#333; }
    .project-link { font-size:12px; color:${c.accent}; margin-left:auto; }
    .skill-badge { display:inline-block; font-size:12px; color:${c.accent}; margin:4px; padding:4px 12px; border:1px solid ${c.accent}20; border-radius:3px; background:${c.accent}06; }
    .footer { text-align:center; padding:40px 24px; font-size:12px; color:#333; border-top:1px solid #1a1a1a; }
    .footer a { color:${c.accent}; }
    @media(max-width:768px) { .nav-links{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero" aria-label="Introduction">
    <div class="section">
      <div class="terminal-bar" aria-hidden="true">
        <div class="terminal-dot" style="background:#ff5f57"></div>
        <div class="terminal-dot" style="background:#febc2e"></div>
        <div class="terminal-dot" style="background:#28c840"></div>
      </div>
      <div class="terminal-output hero-anim" role="region" aria-label="Terminal output">
        <div class="cmd-line">whoami</div>
        <div style="margin-bottom:16px"><span class="key">name</span>: <span class="val">"${e(name)}"</span> <span class="comment">// ${e(role)}</span></div>
        <div class="cmd-line">cat about.txt</div>
        ${bio ? `<div style="margin-bottom:16px;color:#aaa;font-size:13px;line-height:1.8;max-width:580px">${e(bio)}</div>` : ""}
        <div class="cmd-line">ls -la skills/</div>
        <div style="margin-bottom:16px">${langs.slice(0, 6).map(l => `<span class="skill-badge">${e(l)}</span>`).join("")}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">
          <a href="#projects" style="font-size:13px;color:${c.accent};border:1px solid ${c.accent}40;padding:8px 20px;border-radius:4px">./view-projects</a>
          <a href="#contact" style="font-size:13px;color:#666;border:1px solid #333;padding:8px 20px;border-radius:4px">./contact</a>
        </div>
        <div style="margin-top:16px;font-size:13px;color:#555" aria-hidden="true">_<span class="blink">|</span></div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><p class="section-heading reveal">about_me</p>${bio ? `<p style="font-size:13px;color:#888;line-height:1.9;max-width:640px" class="reveal">${e(bio)}</p>` : ""}</section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><p class="section-heading reveal">skills_and_tools</p><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><p class="section-heading reveal">projects</p>${projects.map(p=>`<div class="project-card reveal"><div style="display:flex;justify-content:space-between;align-items:flex-start"><p class="project-name">${e(p.name)}</p>${p.stars>0?`<span style="font-size:11px;color:${c.accent}60" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div><p class="project-desc">${e(stripMd(p.description))}</p><div class="project-meta">${p.language?`<span class="project-lang">${e(p.language)}</span>`:""}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="project-link" aria-label="View ${e(p.name)} on GitHub">open &rarr;</a></div></div>`).join("")}</section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, bio, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}
