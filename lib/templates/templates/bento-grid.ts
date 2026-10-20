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

/* ========== TEMPLATE: BENTO GRID ========== */
export function buildBentoGrid(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "midnight")
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
    body { font-family:'Inter', sans-serif; background:#0a0a0a; color:#e0e0e0; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0 24px; background:rgba(10,10,10,0.85); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.05); }
    .nav-inner { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:60px; }
    .nav-brand { font-size:17px; font-weight:800; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:24px; }
    .nav-links a { font-size:13px; color:#666; }
    .nav-links a:hover { color:${c.accent}; }
    .nav-cta { padding:8px 20px; background:${c.accent}; color:#000; border-radius:8px; font-size:13px; font-weight:600; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:2px; background:#fff; margin:5px 0; }
    .mobile-menu { display:none; position:fixed; top:60px; left:0; right:0; background:rgba(10,10,10,0.97); padding:24px; border-bottom:1px solid rgba(255,255,255,0.06); z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-size:16px; color:#888; padding:8px 0; }
    .section { position:relative; padding:80px 24px; }
    .container { max-width:1200px; margin:0 auto; }
    .bento { display:grid; grid-template-columns:repeat(12,1fr); grid-auto-rows:minmax(80px,auto); gap:12px; }
    .bento-cell { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:28px; overflow:hidden; transition:border-color .3s,transform .3s; }
    .bento-cell:hover { border-color:${c.accent}25; transform:translateY(-2px); }
    .bento-name { grid-column:span 7; grid-row:span 3; background:linear-gradient(135deg,${c.accent}12,transparent); border-color:${c.accent}20; }
    .bento-photo { grid-column:span 5; grid-row:span 3; padding:0; overflow:hidden; }
    .bento-photo img { width:100%; height:100%; object-fit:cover; border-radius:18px; }
    .bento-bio { grid-column:span 8; grid-row:span 2; }
    .bento-stats { grid-column:span 4; grid-row:span 2; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; background:${c.accent}08; border-color:${c.accent}18; }
    .bento-skills { grid-column:span 12; }
    .bento-project { grid-column:span 4; }
    .big-name { font-size:clamp(2rem,4.5vw,3.5rem); font-weight:800; color:#fff; line-height:1.1; margin-bottom:12px; }
    .role-tag { display:inline-block; padding:6px 14px; background:${c.accent}20; border:1px solid ${c.accent}30; border-radius:8px; font-size:12px; color:${c.accent}; font-weight:600; letter-spacing:0.5px; margin-bottom:16px; }
    .section-label { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; margin-bottom:8px; }
    .section-title { font-size:clamp(1.6rem,2.5vw,2.2rem); font-weight:700; color:#fff; margin-bottom:24px; }
    .skill-badge { display:inline-block; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:500; border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.55); margin:3px; background:rgba(255,255,255,0.03); transition:all .2s; }
    .skill-badge:hover { border-color:${c.accent}30; color:${c.accent}; }
    .proj-name { font-size:15px; font-weight:700; color:#fff; margin-bottom:6px; }
    .proj-desc { font-size:12px; color:#666; line-height:1.6; margin-bottom:12px; }
    .proj-lang { font-size:11px; color:${c.accent}; padding:2px 10px; border:1px solid ${c.accent}20; border-radius:20px; display:inline-block; }
    .reveal { opacity:0; transform:translateY(30px); }
    .footer { position:relative; text-align:center; padding:40px 24px; font-size:13px; color:#444; border-top:1px solid rgba(255,255,255,0.05); }
    .footer a { color:${c.accent}; }
    @media(max-width:768px) { .bento{grid-template-columns:1fr} .bento-name,.bento-photo,.bento-bio,.bento-stats,.bento-skills,.bento-project{grid-column:span 1;grid-row:span 1} .bento-photo{height:300px} .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects.slice(0, 6) : repos.filter(r => !r.fork).slice(0, 6).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <div style="padding-top:60px"></div>
  <main>
  <section id="home" aria-label="Introduction">
  <div class="container section">
    <div class="bento">
      <div class="bento-cell bento-name hero-anim">
        <span class="role-tag">${e(role)}</span>
        <h1 class="big-name">${e(name)}</h1>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <a href="#projects" style="padding:10px 22px;background:${c.accent};color:#000;border-radius:10px;font-size:13px;font-weight:700">Projects</a>
          <a href="#contact" style="padding:10px 22px;border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:10px;font-size:13px">Contact</a>
        </div>
      </div>
      <div class="bento-cell bento-photo hero-anim">
        <img src="${img}" alt="${e(name)}" crossorigin="anonymous">
      </div>
      <div class="bento-cell bento-bio hero-anim">
        <p class="section-label">About</p>
        ${bio ? `<p style="font-size:14px;color:#888;line-height:1.8">${e(bio)}</p>` : ""}
      </div>
      <div class="bento-cell bento-stats hero-anim">
        <div style="font-size:2.5rem;font-weight:800;color:${c.accent}">${profile.public_repos}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Public Repos</div>
        <div style="font-size:2rem;font-weight:800;color:#fff;margin-top:16px">${profile.followers}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Followers</div>
      </div>
      ${config.sections.includes("skills") ? `<div class="bento-cell bento-skills hero-anim"><p class="section-label">Stack</p><div style="margin-top:8px">${[...langs,...topics].slice(0,14).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div>` : ""}
      ${config.sections.includes("projects") ? projects.map(p=>`<div class="bento-cell bento-project reveal"><a href="${safeUrl(p.url)}" target="_blank" rel="noopener" aria-label="View ${e(p.name)}"><p class="proj-name">${e(p.name)}</p></a><p class="proj-desc">${e(stripMd(p.description))}</p><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">${p.language?`<span class="proj-lang">${e(p.language)}</span>`:`<span></span>`}${p.stars>0?`<span style="font-size:11px;color:${c.accent}70" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div></div>`).join("") : ""}
    </div>
  </div>
  </section>
  ${config.sections.includes("about") ? "" : ""}
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
