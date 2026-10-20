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

/* ========== TEMPLATE: LIQUID GLASS ========== */
export function buildLiquidGlass(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "arctic")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || ""
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,600;0,700;1,300&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#050510; color:#e8e8f5; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    /* Animated background orbs */
    .orb { position:fixed; border-radius:50%; filter:blur(80px); pointer-events:none; animation:float 8s ease-in-out infinite; }
    .orb-1 { width:600px; height:600px; background:${c.primary}18; top:-200px; left:-100px; animation-delay:0s; }
    .orb-2 { width:500px; height:500px; background:${c.accent}12; bottom:-100px; right:-100px; animation-delay:-4s; }
    .orb-3 { width:300px; height:300px; background:${c.secondary}10; top:50%; left:40%; animation-delay:-2s; }
    @keyframes float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-40px) scale(1.05)} }
    /* Glass card */
    .glass { background:rgba(255,255,255,0.04); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.08); border-radius:24px; }
    .glass-strong { background:rgba(255,255,255,0.07); backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%); border:1px solid rgba(255,255,255,0.12); border-radius:24px; }
    .nav { position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:100; width:calc(100% - 48px); max-width:900px; }
    .nav-inner { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; background:rgba(5,5,16,0.6); backdrop-filter:blur(40px); border:1px solid rgba(255,255,255,0.08); border-radius:50px; }
    .nav-brand { font-size:16px; font-weight:700; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:24px; }
    .nav-links a { font-size:13px; color:rgba(255,255,255,0.5); }
    .nav-links a:hover { color:${c.accent}; }
    .nav-cta { padding:8px 20px; background:${c.accent}; color:#000; border-radius:50px; font-size:13px; font-weight:600; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:20px; height:2px; background:#fff; margin:4px 0; }
    .mobile-menu { display:none; position:fixed; top:80px; left:24px; right:24px; z-index:99; padding:24px; border-radius:20px; background:rgba(5,5,16,0.95); backdrop-filter:blur(40px); border:1px solid rgba(255,255,255,0.1); }
    .mobile-menu.open { display:flex; flex-direction:column; gap:12px; }
    .mobile-menu a { font-size:15px; color:rgba(255,255,255,0.7); padding:8px 0; }
    .section { position:relative; z-index:1; padding:100px 24px; }
    .container { max-width:1100px; margin:0 auto; }
    .section-label { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; font-weight:600; margin-bottom:12px; }
    .section-title { font-size:clamp(1.8rem,3.5vw,2.8rem); font-weight:700; color:#fff; margin-bottom:20px; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:80px; }
    .hero-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:center; }
    .hero-tag { display:inline-block; padding:6px 16px; background:${c.accent}15; border:1px solid ${c.accent}30; border-radius:50px; font-size:12px; color:${c.accent}; font-weight:600; letter-spacing:1px; margin-bottom:20px; }
    .hero-name { font-size:clamp(2.5rem,5vw,4rem); font-weight:700; color:#fff; line-height:1.1; margin-bottom:16px; }
    .hero-bio { font-size:16px; color:rgba(255,255,255,0.55); line-height:1.75; margin-bottom:32px; }
    .hero-photo { width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:24px; }
    .project-card { padding:28px; margin-bottom:16px; transition:transform .3s,box-shadow .3s; }
    .project-card:hover { transform:translateY(-4px); box-shadow:0 24px 80px rgba(0,0,0,0.4),0 0 60px ${c.accent}10; }
    .skill-badge { display:inline-block; padding:8px 18px; border-radius:50px; font-size:13px; border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); margin:4px; background:rgba(255,255,255,0.04); backdrop-filter:blur(8px); transition:all .3s; }
    .skill-badge:hover { border-color:${c.accent}40; color:${c.accent}; }
    .footer { position:relative; z-index:1; padding:40px 24px; text-align:center; font-size:13px; color:#444; }
    .footer a { color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    .reveal-scale { opacity:0; transform:scale(0.95); }
    @media(max-width:768px) { .hero-grid{grid-template-columns:1fr} .hero-photo{max-height:400px} .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-grid">
        <div>
          <div class="hero-tag hero-anim">${e(role)}</div>
          <h1 class="hero-name hero-anim">${e(name)}</h1>
          ${bio ? `<p class="hero-bio hero-anim">${e(bio)}</p>` : ""}
          <div style="display:flex;gap:12px;flex-wrap:wrap" class="hero-anim">
            <a href="#projects" style="padding:14px 28px;background:${c.accent};color:#000;border-radius:50px;font-weight:600;font-size:14px">See Work</a>
            <a href="#contact" style="padding:14px 28px;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:50px;font-size:14px;backdrop-filter:blur(8px)">Contact</a>
          </div>
        </div>
        <div class="glass hero-anim" style="overflow:hidden">
          <img src="${img}" alt="${e(name)}" class="hero-photo hero-photo-parallax" crossorigin="anonymous">
        </div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">About</p><h2 class="section-title reveal">${e(name.split(" ")[0])}&rsquo;s story</h2><div class="glass-strong reveal" style="padding:32px;max-width:680px">${bio ? `<p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.8">${e(bio)}</p>` : ""}</div></div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">Tech Stack</h2><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Featured Projects</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">${projects.map(p=>`<div class="glass project-card reveal"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><h3 style="font-size:16px;font-weight:700;color:#fff">${e(p.name)}</h3>${p.stars>0?`<span style="font-size:12px;color:${c.accent};font-weight:600" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div><p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;margin-bottom:16px">${e(stripMd(p.description))}</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${p.language?`<span style="font-size:11px;padding:3px 12px;border-radius:50px;background:${c.accent}12;color:${c.accent};border:1px solid ${c.accent}20">${e(p.language)}</span>`:""}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent};font-weight:600;margin-left:auto" aria-label="View ${e(p.name)} on GitHub">View &rarr;</a></div></div>`).join("")}</div></div></section>` : ""}
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
