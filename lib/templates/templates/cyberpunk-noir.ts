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
import { THEMES } from "../shared/themes"
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ========== TEMPLATE: CYBERPUNK NOIR ========== */
export function buildCyberpunkNoir(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "rose")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || ""
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:var(--font-body); background:var(--bg); color:var(--text); overflow-x:hidden; }
    a { text-decoration:none; transition:all .2s; }
    .scanline { position:fixed; inset:0; pointer-events:none; z-index:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px); }
    .noise { position:fixed; inset:0; pointer-events:none; z-index:0; opacity:0.025; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; background:rgba(8,6,8,0.85); backdrop-filter:blur(16px); border-bottom:1px solid ${c.accent}30; padding:0 24px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:60px; }
    .nav-brand { font-family:var(--font-display); font-size:22px; font-weight:700; color:var(--text); letter-spacing:2px; }
    .nav-brand span { color:${c.accent}; text-shadow:0 0 12px ${c.accent}; }
    .nav-links { display:flex; gap:28px; }
    .nav-links a { font-family:var(--font-mono); font-size:11px; color:var(--muted); letter-spacing:1px; text-transform:uppercase; }
    .nav-links a:hover { color:${c.accent}; text-shadow:0 0 8px ${c.accent}60; }
    .nav-cta { font-family:var(--font-display); padding:8px 22px; background:transparent; border:1px solid ${c.accent}; color:${c.accent}; font-size:14px; font-weight:600; letter-spacing:1px; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); }
    .nav-cta:hover { background:${c.accent}15; text-shadow:0 0 8px ${c.accent}; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:1px; background:${c.accent}; margin:6px 0; }
    .mobile-menu { display:none; position:fixed; top:60px; left:0; right:0; background:rgba(8,6,8,0.97); padding:24px; border-bottom:1px solid ${c.accent}30; z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-family:var(--font-display); font-size:18px; color:var(--muted); letter-spacing:2px; padding:8px 0; border-bottom:1px solid var(--border); }
    .section { position:relative; z-index:1; padding:100px 24px; }
    .container { max-width:1100px; margin:0 auto; }
    .glitch-title { font-family:var(--font-display); font-size:clamp(3rem,8vw,7rem); font-weight:700; color:var(--text); line-height:1; letter-spacing:-2px; position:relative; }
    .glitch-title::before,.glitch-title::after { content:attr(data-text); position:absolute; top:0; left:0; width:100%; overflow:hidden; }
    .glitch-title::before { color:${c.accent}; animation:glitch1 3s infinite; clip-path:polygon(0 0,100% 0,100% 35%,0 35%); }
    .glitch-title::after { color:#0ff; animation:glitch2 3s infinite; clip-path:polygon(0 65%,100% 65%,100% 100%,0 100%); }
    @keyframes glitch1 { 0%,90%,100%{transform:translateX(0)} 92%{transform:translateX(-3px)} 94%{transform:translateX(3px)} 96%{transform:translateX(-1px)} }
    @keyframes glitch2 { 0%,88%,100%{transform:translateX(0)} 90%{transform:translateX(3px)} 92%{transform:translateX(-3px)} }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:60px; overflow:hidden; }
    .hero-inner { display:grid; grid-template-columns:1fr 420px; gap:60px; align-items:center; }
    .hero-sub { font-family:var(--font-mono); font-size:12px; color:${c.accent}; letter-spacing:3px; text-transform:uppercase; margin-bottom:24px; }
    .hero-bio { font-size:15px; color:var(--muted); line-height:1.8; margin:24px 0 32px; max-width:500px; }
    .hero-img-wrap { position:relative; }
    .hero-img-wrap::before { content:''; position:absolute; inset:-1px; background:linear-gradient(135deg,${c.accent}40,transparent 50%,${c.accent}20); border-radius:4px; }
    .hero-img { width:100%; aspect-ratio:3/4; object-fit:cover; filter:grayscale(20%) contrast(1.1); border-radius:2px; display:block; }
    .corner { position:absolute; width:20px; height:20px; border-color:${c.accent}; border-style:solid; }
    .corner-tl { top:-4px; left:-4px; border-width:2px 0 0 2px; }
    .corner-tr { top:-4px; right:-4px; border-width:2px 2px 0 0; }
    .corner-bl { bottom:-4px; left:-4px; border-width:0 0 2px 2px; }
    .corner-br { bottom:-4px; right:-4px; border-width:0 2px 2px 0; }
    .section-label { font-family:var(--font-mono); font-size:10px; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:16px; }
    .section-title { font-family:var(--font-display); font-size:clamp(1.8rem,3vw,2.8rem); font-weight:700; color:var(--text); letter-spacing:1px; margin-bottom:32px; }
    .project-card { border:1px solid var(--border); padding:24px; margin-bottom:12px; position:relative; transition:border-color .3s; background:var(--surface); clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%); }
    .project-card:hover { border-color:${c.accent}40; background:var(--surface); }
    .project-name { font-family:var(--font-display); font-size:18px; font-weight:600; color:var(--text); letter-spacing:1px; margin-bottom:8px; }
    .project-desc { font-size:13px; color:var(--muted); line-height:1.7; margin-bottom:14px; }
    .project-meta { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .project-lang { font-family:var(--font-mono); font-size:11px; color:${c.accent}70; padding:2px 10px; border:1px solid ${c.accent}20; }
    .project-link { font-family:var(--font-mono); font-size:12px; color:${c.accent}; margin-left:auto; }
    .skill-badge { display:inline-block; font-family:var(--font-mono); font-size:11px; color:${c.accent}80; margin:3px; padding:4px 12px; border:1px solid ${c.accent}15; background:${c.accent}05; }
    .footer { position:relative; z-index:1; text-align:center; padding:40px 24px; font-family:var(--font-mono); font-size:11px; color:var(--muted); border-top:1px solid var(--border); }
    .footer a { color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    @media(max-width:768px) { .hero-inner{grid-template-columns:1fr} .hero-img-wrap{display:none} .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} .glitch-title::before,.glitch-title::after{display:none} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="scanline"></div>
  <div class="noise"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-inner">
        <div>
          <p class="hero-sub hero-anim">${e(role)}</p>
          <h1 class="glitch-title hero-anim" data-text="${e(name)}">${e(name)}</h1>
          ${bio ? `<p class="hero-bio hero-anim">${e(bio)}</p>` : ""}
          <div style="display:flex;gap:12px;flex-wrap:wrap" class="hero-anim">
            <a href="#projects" style="font-family:var(--font-display);padding:12px 28px;background:${c.accent};color:var(--accent-contrast);font-size:15px;font-weight:700;letter-spacing:1px;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)">PROJECTS</a>
            <a href="#contact" style="font-family:var(--font-display);padding:12px 28px;border:1px solid ${c.accent}40;color:${c.accent};font-size:15px;font-weight:600;letter-spacing:1px">CONTACT</a>
          </div>
        </div>
        <div class="hero-img-wrap hero-anim">
          <img src="${img}" alt="${e(name)}" class="hero-img hero-photo-parallax" crossorigin="anonymous">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
        </div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">about</p><h2 class="section-title reveal">Who I Am</h2>${bio ? `<p style="font-size:15px;color:var(--muted);line-height:1.85;max-width:680px" class="reveal">${e(bio)}</p>` : ""}</div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">skills</p><h2 class="section-title reveal">Arsenal</h2><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">projects</p><h2 class="section-title reveal">Missions Completed</h2>${projects.map(p=>`<div class="project-card reveal"><div style="display:flex;justify-content:space-between;align-items:flex-start"><p class="project-name">${e(p.name)}</p>${p.stars>0?`<span style="font-family:var(--font-mono);font-size:11px;color:${c.accent}60" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div><p class="project-desc">${e(stripMd(p.description))}</p><div class="project-meta">${p.language?`<span class="project-lang">${e(p.language)}</span>`:""}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="project-link" aria-label="Access ${e(p.name)}">access &rarr;</a></div></div>`).join("")}</div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, bio, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url, THEMES["cyberpunk-noir"])
}
