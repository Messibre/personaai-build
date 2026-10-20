import { e, safeUrl, safeImageSrc, stripMd } from "../shared/escape"
import { buildExperience } from "../shared/sections/experience"
import { buildGitHubStats } from "../shared/sections/github-stats"
import { buildNav } from "../shared/sections/nav"
import { smartRepoDescription } from "../shared/sections/projects"
import { buildTestimonials } from "../shared/sections/testimonials"
import { shell } from "../shared/shell"
import type { TemplateData } from "../shared/types"
import { getColorScheme, getLangs, getTopics } from "../shared/utils"

/* ========== TEMPLATE: SWISS EDITORIAL ========== */
export function buildSwissEditorial(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "ember")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Precision engineering for the web."
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)
  const firstName = name.split(" ")[0].toUpperCase()
  const lastName = (name.split(" ").slice(1).join(" ") || "").toUpperCase()

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#f5f5f0; color:#111; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .2s; }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; background:#f5f5f0; border-bottom:2px solid #111; padding:0 40px; }
    .nav-inner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:60px; }
    .nav-brand { font-size:13px; font-weight:800; color:#111; letter-spacing:3px; text-transform:uppercase; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:32px; }
    .nav-links a { font-size:11px; color:#888; font-weight:600; letter-spacing:2px; text-transform:uppercase; }
    .nav-links a:hover { color:#111; }
    .nav-cta { padding:8px 20px; background:#111; color:#f5f5f0; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; }
    .nav-cta:hover { background:${c.accent}; color:#fff; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:2px; background:#111; margin:5px 0; }
    .mobile-menu { display:none; position:fixed; top:60px; left:0; right:0; background:#f5f5f0; padding:24px 40px; border-bottom:2px solid #111; z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:12px; }
    .mobile-menu a { font-size:14px; color:#888; letter-spacing:2px; text-transform:uppercase; padding:8px 0; border-bottom:1px solid #ddd; }
    .section { position:relative; padding:80px 40px; }
    .container { max-width:1200px; margin:0 auto; }
    .hero { min-height:100vh; display:grid; grid-template-columns:1fr 1px 1fr; padding-top:60px; }
    .hero-left { padding:80px 60px 80px 0; display:flex; flex-direction:column; justify-content:flex-end; border-right:2px solid #111; }
    .hero-right { padding:80px 0 80px 60px; display:flex; flex-direction:column; }
    .big-initial { font-size:clamp(8rem,16vw,14rem); font-weight:900; color:${c.accent}; line-height:1; letter-spacing:-4px; }
    .hero-firstname { font-size:clamp(2.5rem,5vw,5rem); font-weight:900; color:#111; line-height:1; letter-spacing:-2px; }
    .hero-lastname { font-size:clamp(2rem,4vw,4rem); font-weight:300; color:#888; line-height:1; letter-spacing:-1px; }
    .hero-role { font-size:12px; font-weight:700; letter-spacing:4px; color:#888; text-transform:uppercase; margin-top:24px; }
    .hero-photo-right { flex:1; overflow:hidden; margin-bottom:32px; }
    .hero-photo-right img { width:100%; height:100%; object-fit:cover; min-height:400px; }
    .hero-bio-right { font-size:14px; color:#888; line-height:1.8; }
    .hero-cta { display:inline-block; margin-top:24px; padding:14px 32px; background:#111; color:#f5f5f0; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; }
    .hero-cta:hover { background:${c.accent}; }
    .border-top { border-top:2px solid #111; }
    .section-num { font-size:80px; font-weight:900; color:#e8e8e3; line-height:1; }
    .section-label { font-size:11px; font-weight:700; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:8px; }
    .section-title { font-size:clamp(1.8rem,3vw,3rem); font-weight:900; color:#111; letter-spacing:-1px; margin-bottom:32px; }
    .project-item { border-top:1px solid #ddd; padding:24px 0; display:flex; gap:40px; align-items:flex-start; transition:padding-left .2s; }
    .project-item:hover { padding-left:8px; }
    .project-item:hover .proj-num { color:${c.accent}; }
    .proj-num { font-size:11px; font-weight:800; color:#ccc; letter-spacing:1px; min-width:28px; margin-top:3px; }
    .proj-name { font-size:18px; font-weight:700; color:#111; margin-bottom:6px; }
    .proj-desc { font-size:13px; color:#888; line-height:1.65; }
    .proj-lang { font-size:10px; font-weight:700; letter-spacing:2px; color:${c.accent}; text-transform:uppercase; margin-top:8px; display:block; }
    .proj-link { font-size:12px; font-weight:700; color:#111; margin-left:auto; letter-spacing:1px; white-space:nowrap; }
    .proj-link:hover { color:${c.accent}; }
    .skill-badge { display:inline-block; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#111; padding:6px 14px; border:2px solid #111; margin:4px; }
    .skill-badge:hover { background:#111; color:#f5f5f0; }
    .footer { text-align:center; padding:40px; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#bbb; border-top:2px solid #111; }
    .footer a { color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(20px); }
    @media(max-width:768px){
      .hero { grid-template-columns:1fr; grid-template-rows:auto auto; min-height:auto; }
      .hero-left { border-right:none; border-bottom:2px solid #111; padding:60px 24px 40px; }
      .hero-left .big-initial { font-size:clamp(5rem,18vw,8rem); }
      .hero-right { padding:40px 24px; }
      .hero-photo-right { min-height:260px; max-height:340px; }
      .nav { padding:0 16px; }
      .nav-links { display:none; }
      .nav-cta { display:none; }
      .nav-toggle { display:block; }
      .section { padding:60px 20px; }
      .section-num { display:none; }
      .project-item { flex-direction:column; gap:8px; padding:20px 0; }
      .proj-num { display:none; }
      .proj-link { align-self:flex-start; }
      div[style*="grid-template-columns:1fr 3fr"] { display:block !important; }
    }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-left">
      <div class="big-initial hero-anim">${firstName.charAt(0)}</div>
      <div>
        <div class="hero-firstname hero-anim">${e(firstName)}</div>
        <div class="hero-lastname hero-anim">${e(lastName || role.toUpperCase())}</div>
        <div class="hero-role hero-anim">${e(role)}</div>
      </div>
    </div>
    <div class="hero-right">
      <div class="hero-photo-right hero-anim">
        <img src="${img}" alt="${e(name)}" crossorigin="anonymous">
      </div>
      <p class="hero-bio-right hero-anim">${e(bio)}</p>
      <a href="#projects" class="hero-cta hero-anim">View Projects</a>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section border-top"><div class="container"><div style="display:grid;grid-template-columns:1fr 3fr;gap:60px;align-items:start"><div class="section-num" aria-hidden="true">01</div><div><p class="section-label reveal">About</p><h2 class="section-title reveal">The human<br>behind the code</h2><p style="font-size:15px;color:#888;line-height:1.85;max-width:600px" class="reveal">${e(bio)}</p></div></div></div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section border-top"><div class="container"><div style="display:grid;grid-template-columns:1fr 3fr;gap:60px;align-items:start"><div class="section-num" aria-hidden="true">02</div><div><p class="section-label reveal">Skills</p><h2 class="section-title reveal">Toolkit</h2><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section border-top"><div class="container"><div style="display:grid;grid-template-columns:1fr 3fr;gap:60px;align-items:start"><div class="section-num" aria-hidden="true">03</div><div><p class="section-label reveal">Projects</p><h2 class="section-title reveal">Selected<br>Work</h2><div role="list">${projects.map((p,i)=>`<div class="project-item reveal" role="listitem"><span class="proj-num" aria-hidden="true">${String(i+1).padStart(2,"0")}</span><div style="flex:1"><p class="proj-name">${e(p.name)}</p><p class="proj-desc">${e(stripMd(p.description))}</p>${p.language?`<span class="proj-lang">${e(p.language)}</span>`:""}</div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="proj-link" aria-label="Open ${e(p.name)}">Open &rarr;</a></div>`).join("")}</div></div></div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("contact") ? `<section id="contact" class="section border-top"><div class="container"><div style="display:grid;grid-template-columns:1fr 3fr;gap:60px;align-items:start"><div class="section-num" aria-hidden="true">04</div><div><p class="section-label reveal">Contact</p><h2 class="section-title reveal">Let&rsquo;s<br>build together</h2><div style="display:flex;gap:12px;flex-wrap:wrap" class="reveal"><a href="${safeUrl(profile.html_url)}" target="_blank" rel="noopener" style="padding:14px 28px;background:#111;color:#f5f5f0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase" aria-label="GitHub profile">GitHub</a>${data.socialLinks?.linkedin && safeUrl(data.socialLinks.linkedin) !== "#" ? `<a href="${safeUrl(data.socialLinks.linkedin)}" target="_blank" rel="noopener" style="padding:14px 28px;border:2px solid #111;color:#111;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase" aria-label="LinkedIn profile">LinkedIn</a>` : ""}</div></div></div></div></section>` : ""}
  </main>
  <footer class="footer" role="contentinfo"><a href="#home" style="color:${c.accent};font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:11px">${e(name)}</a> &nbsp;|&nbsp; &copy; ${new Date().getFullYear()} &nbsp;|&nbsp; Built with <a href="https://personaai.vercel.app" target="_blank" rel="noopener" style="color:${c.accent}">PersonaAI</a></footer>`

  return shell(c.accent, extra, body, name, bio, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}
