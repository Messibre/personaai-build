import { e } from "../escape"

export function navLabel(s: string): string {
  const labels: Record<string, string> = {
    "home": "Home", "about": "About", "skills": "Skills", "projects": "Projects",
    "experience": "Experience", "github-stats": "GitHub Stats", "testimonials": "Testimonials", "contact": "Contact"
  }
  return labels[s] || (s.charAt(0).toUpperCase() + s.slice(1))
}

export function buildNav(name: string, sections: string[], accent: string): string {
  const navItems = ["home", ...sections.filter(s => s !== "home")]
  const hasContact = sections.includes("contact")
  return `
  <nav class="nav" role="navigation" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="#home" class="nav-brand" aria-label="${e(name)} — Back to top">${e(name.split(" ")[0])}<span>.</span></a>
      <div class="nav-links" role="list">
        ${navItems.map(s => `<a href="#${s}" data-section="${s}" role="listitem">${navLabel(s)}</a>`).join("")}
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <button id="theme-toggle" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark/light mode" title="Toggle theme">&#9788;</button>
        ${hasContact ? `<a href="#contact" class="nav-cta">Contact Me</a>` : ""}
      </div>
      <button class="nav-toggle" onclick="var m=document.getElementById('mobileMenu');var open=m.classList.toggle('open');this.setAttribute('aria-expanded',open)" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobileMenu">
        <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
      </button>
    </div>
  </nav>
  <div id="mobileMenu" class="mobile-menu" role="dialog" aria-label="Mobile navigation">
    ${navItems.map(s => `<a href="#${s}" onclick="document.getElementById('mobileMenu').classList.remove('open');document.querySelector('.nav-toggle').setAttribute('aria-expanded','false')">${navLabel(s)}</a>`).join("")}
    ${hasContact ? `<a href="#contact" onclick="document.getElementById('mobileMenu').classList.remove('open');document.querySelector('.nav-toggle').setAttribute('aria-expanded','false')" style="color:${accent};font-weight:700">Contact Me</a>` : ""}
  </div>`
}
