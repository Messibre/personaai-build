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

/* ========== TEMPLATE: SPOTLIGHT DARK ========== */
export function buildSpotlightDark(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "ocean")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || ""
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#030303; color:#c8c8c8; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    .spotlight { position:fixed; width:800px; height:800px; border-radius:50%; background:radial-gradient(circle,${c.accent}10 0%,transparent 70%); pointer-events:none; transform:translate(-50%,-50%); transition:left .15s,top .15s; z-index:0; }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0 32px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:64px; }
    .nav-brand { font-size:16px; font-weight:800; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:32px; }
    .nav-links a { font-size:13px; color:#555; font-weight:500; }
    .nav-links a:hover { color:#fff; }
    .nav-cta { padding:8px 22px; border:1px solid rgba(255,255,255,0.12); color:#fff; border-radius:8px; font-size:13px; }
    .nav-cta:hover { border-color:${c.accent}; color:${c.accent}; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:1px; background:#fff; margin:6px 0; }
    .mobile-menu { display:none; position:fixed; top:64px; left:0; right:0; background:#030303; padding:24px 32px; border-bottom:1px solid rgba(255,255,255,0.05); z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-size:16px; color:#888; padding:8px 0; }
    .section { position:relative; z-index:1; padding:100px 32px; }
    .container { max-width:1100px; margin:0 auto; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:64px; }
    .hero-layout { display:grid; grid-template-columns:1fr 380px; gap:80px; align-items:center; }
    .eyebrow { font-size:12px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; font-weight:600; margin-bottom:24px; }
    .hero-name { font-size:clamp(3rem,6vw,5.5rem); font-weight:800; color:#fff; line-height:1.0; letter-spacing:-2px; margin-bottom:24px; }
    .hero-bio { font-size:16px; color:#666; line-height:1.8; margin-bottom:36px; max-width:500px; }
    .hero-ctas { display:flex; gap:12px; flex-wrap:wrap; }
    .btn-primary { padding:14px 32px; background:${c.accent}; color:#000; border-radius:8px; font-size:14px; font-weight:700; }
    .btn-secondary { padding:14px 32px; border:1px solid rgba(255,255,255,0.1); color:#888; border-radius:8px; font-size:14px; }
    .btn-secondary:hover { border-color:rgba(255,255,255,0.2); color:#fff; }
    .hero-photo { width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:16px; filter:grayscale(15%); }
    .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent); margin:0 32px; }
    .section-label { font-size:11px; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:16px; }
    .section-title { font-size:clamp(1.8rem,3vw,2.5rem); font-weight:800; color:#fff; letter-spacing:-1px; margin-bottom:40px; }
    .project-row { border-top:1px solid rgba(255,255,255,0.04); padding:28px 0; display:grid; grid-template-columns:1fr 2fr 120px; gap:24px; align-items:center; transition:all .3s; }
    .project-row:hover { padding-left:12px; }
    .project-row:hover .proj-num { color:${c.accent}; }
    .proj-num { font-size:12px; color:#333; font-weight:600; font-variant-numeric:tabular-nums; }
    .proj-name { font-size:17px; font-weight:700; color:#fff; margin-bottom:4px; }
    .proj-desc { font-size:13px; color:#555; line-height:1.6; }
    .proj-link { font-size:13px; color:${c.accent}; text-align:right; }
    .proj-lang { font-size:11px; color:#444; }
    .skill-wrap { display:flex; flex-wrap:wrap; gap:8px; }
    .skill-badge { padding:8px 16px; border:1px solid rgba(255,255,255,0.06); color:#666; border-radius:6px; font-size:13px; transition:all .2s; }
    .skill-badge:hover { border-color:${c.accent}30; color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    .footer { position:relative; z-index:1; padding:40px 32px; text-align:center; font-size:13px; color:#333; border-top:1px solid rgba(255,255,255,0.04); }
    .footer a { color:${c.accent}; }
    @media(max-width:768px){
      .hero-layout { grid-template-columns:1fr; }
      .hero-photo-wrap { display:none; }
      .section { padding:60px 20px; }
      .project-row { display:flex; flex-direction:column; gap:8px; padding:20px 0; }
      .proj-num { display:none; }
      .proj-link { text-align:left; }
      .nav-links { display:none; }
      .nav-cta { display:none; }
      .nav-toggle { display:block; }
      .divider { margin:0 20px; }
    }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="spotlight" id="spotlight"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-layout">
        <div>
          <p class="eyebrow hero-anim">${e(role)}</p>
          <h1 class="hero-name hero-anim">${e(name)}</h1>
          ${bio ? `<p class="hero-bio hero-anim">${e(bio)}</p>` : ""}
          <div class="hero-ctas hero-anim">
            <a href="#projects" class="btn-primary">View Projects</a>
            <a href="#contact" class="btn-secondary">Get in Touch</a>
          </div>
        </div>
        <div class="hero-photo-wrap hero-anim">
          <img src="${img}" alt="${e(name)}" class="hero-photo hero-photo-parallax" crossorigin="anonymous">
        </div>
      </div>
    </div>
  </section>
  <main>
  <div class="divider"></div>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">About</p><h2 class="section-title reveal">${e(name.split(" ")[0])}</h2>${bio ? `<p style="font-size:16px;color:#666;line-height:1.85;max-width:680px" class="reveal">${e(bio)}</p>` : ""}</div></section><div class="divider"></div>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">What I work with</h2><div class="skill-wrap reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section><div class="divider"></div>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">Projects</p><h2 class="section-title reveal">Selected Work</h2><div role="list">${projects.map((p,i)=>`<div class="project-row reveal" role="listitem"><span class="proj-num" aria-hidden="true">${String(i+1).padStart(2,"0")}</span><div><p class="proj-name">${e(p.name)}</p><p class="proj-desc">${e(stripMd(p.description))}</p>${p.language?`<span class="proj-lang">${e(p.language)}</span>`:""}</div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="proj-link" aria-label="View ${e(p.name)}">View &rarr;</a></div>`).join("")}</div></div></section><div class="divider"></div>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}
  <script>
    const spotlight = document.getElementById('spotlight');
    if (spotlight) {
      document.addEventListener('mousemove', function(ev) {
        spotlight.style.left = ev.clientX + 'px';
        spotlight.style.top = ev.clientY + 'px';
      });
    }
  <\/script>`

  return shell(c.accent, extra, body, name, bio, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}
