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

/* ========== TEMPLATE: GRADIENT AURORA ========== */
export function buildGradientAurora(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "lavender")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || ""
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@400;600;700;800&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#07070f; color:#ddd; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    .aurora { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
    .aurora-band { position:absolute; width:200%; height:300px; opacity:0.12; filter:blur(60px); animation:aurora-drift 12s ease-in-out infinite; }
    .aurora-1 { background:linear-gradient(90deg,${c.primary},${c.accent},transparent); top:10%; animation-delay:0s; }
    .aurora-2 { background:linear-gradient(90deg,transparent,${c.secondary},${c.primary}); top:30%; animation-delay:-4s; }
    .aurora-3 { background:linear-gradient(90deg,${c.accent},transparent,${c.secondary}); top:60%; animation-delay:-8s; }
    @keyframes aurora-drift { 0%,100%{transform:translateX(-50%) skewY(-2deg)} 50%{transform:translateX(0%) skewY(2deg)} }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0 32px; background:rgba(7,7,15,0.7); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.06); }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:64px; }
    .nav-brand { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:28px; }
    .nav-links a { font-size:13px; color:rgba(255,255,255,0.4); }
    .nav-links a:hover { color:#fff; }
    .nav-cta { padding:9px 22px; background:linear-gradient(135deg,${c.primary},${c.accent}); color:#fff; border-radius:8px; font-size:13px; font-weight:600; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:2px; background:#fff; margin:5px 0; }
    .mobile-menu { display:none; position:fixed; top:64px; left:0; right:0; background:rgba(7,7,15,0.97); padding:24px 32px; border-bottom:1px solid rgba(255,255,255,0.06); z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-size:16px; color:rgba(255,255,255,0.6); padding:8px 0; }
    .section { position:relative; z-index:1; padding:100px 32px; }
    .container { max-width:1100px; margin:0 auto; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:64px; text-align:center; }
    .hero-inner { max-width:800px; margin:0 auto; }
    .hero-photo-circle { width:120px; height:120px; border-radius:50%; border:2px solid rgba(255,255,255,0.1); overflow:hidden; margin:0 auto 24px; }
    .hero-photo-circle img { width:100%; height:100%; object-fit:cover; }
    .hero-pill { display:inline-block; padding:6px 18px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:50px; font-size:12px; color:rgba(255,255,255,0.5); letter-spacing:1px; margin-bottom:24px; }
    .hero-name { font-family:'Syne',sans-serif; font-size:clamp(3rem,7vw,6rem); font-weight:800; line-height:1.05; letter-spacing:-3px; margin-bottom:24px; }
    .hero-name .gradient-text { background:linear-gradient(135deg,#fff 40%,${c.accent}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .hero-bio { font-size:17px; color:rgba(255,255,255,0.45); line-height:1.75; margin-bottom:40px; }
    .gradient-btn { padding:14px 32px; background:linear-gradient(135deg,${c.primary},${c.accent}); color:#fff; border-radius:50px; font-size:14px; font-weight:600; }
    .gradient-btn:hover { opacity:0.9; transform:translateY(-2px); }
    .section-label { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; text-align:center; margin-bottom:12px; }
    .section-title { font-family:'Syne',sans-serif; font-size:clamp(1.8rem,3vw,2.8rem); font-weight:800; color:#fff; text-align:center; margin-bottom:48px; letter-spacing:-1px; }
    .project-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:28px; transition:all .3s; position:relative; overflow:hidden; }
    .project-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,${c.accent}08,transparent); opacity:0; transition:opacity .3s; }
    .project-card:hover { border-color:${c.accent}30; transform:translateY(-4px); }
    .project-card:hover::before { opacity:1; }
    .proj-name { font-family:'Syne',sans-serif; font-size:17px; font-weight:700; color:#fff; margin-bottom:8px; }
    .proj-desc { font-size:13px; color:rgba(255,255,255,0.4); line-height:1.65; margin-bottom:16px; }
    .proj-lang { font-size:11px; padding:3px 12px; border-radius:20px; background:${c.accent}12; color:${c.accent}; border:1px solid ${c.accent}22; }
    .proj-link { font-size:13px; color:${c.accent}; font-weight:600; }
    .skill-badge { display:inline-block; padding:8px 18px; border-radius:50px; font-size:13px; border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); margin:4px; background:rgba(255,255,255,0.03); transition:all .3s; }
    .skill-badge:hover { background:linear-gradient(135deg,${c.primary}15,${c.accent}15); border-color:${c.accent}30; color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    .footer { position:relative; z-index:1; text-align:center; padding:40px; font-size:13px; color:#444; border-top:1px solid rgba(255,255,255,0.04); }
    .footer a { color:${c.accent}; }
    @media(max-width:768px){ .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="aurora"><div class="aurora-band aurora-1"></div><div class="aurora-band aurora-2"></div><div class="aurora-band aurora-3"></div></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-inner">
        <div class="hero-photo-circle hero-anim"><img src="${img}" alt="${e(name)}" crossorigin="anonymous"></div>
        <div class="hero-pill hero-anim">${e(role)}</div>
        <h1 class="hero-name hero-anim"><span class="gradient-text">${e(name)}</span></h1>
        ${bio ? `<p class="hero-bio hero-anim">${e(bio)}</p>` : ""}
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" class="hero-anim">
          <a href="#projects" class="gradient-btn">See My Work</a>
          <a href="#contact" style="padding:14px 32px;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);border-radius:50px;font-size:14px">Say Hello</a>
        </div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">About</p><h2 class="section-title reveal">${e(name.split(" ")[0])}&rsquo;s story</h2>${bio ? `<p style="font-size:15px;color:rgba(255,255,255,0.45);line-height:1.85;max-width:640px;margin:0 auto;text-align:center" class="reveal">${e(bio)}</p>` : ""}</div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Stack</p><h2 class="section-title reveal">Tools &amp; Technologies</h2><div style="text-align:center" class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Featured Projects</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${projects.map(p=>`<div class="project-card reveal"><p class="proj-name">${e(p.name)}</p><p class="proj-desc">${e(stripMd(p.description))}</p><div style="display:flex;align-items:center;justify-content:space-between">${p.language?`<span class="proj-lang">${e(p.language)}</span>`:`<span></span>`}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="proj-link" aria-label="View ${e(p.name)}">View &rarr;</a></div></div>`).join("")}</div></div></section>` : ""}
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
