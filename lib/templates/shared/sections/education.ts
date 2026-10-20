import { e } from "../escape"

export function buildEducation(resumeText: string | null, accent: string): string {
  const items: { degree: string; school: string; year: string }[] = []

  if (resumeText) {
    const lines = resumeText.split("\n").map(l => l.trim()).filter(Boolean)
    let inEdu = false
    const yearRe = /\b(19|20)\d{2}\b/
    for (const line of lines) {
      if (/^education/i.test(line)) { inEdu = true; continue }
      if (/^(experience|skills|projects|certifications|awards|work)/i.test(line)) { inEdu = false }
      if (!inEdu) continue
      const yearMatch = line.match(yearRe)
      if (yearMatch && line.length < 120) {
        const parts = line.split(/[|,–\-@]/).map(p => p.trim()).filter(Boolean)
        if (parts.length >= 2) {
          items.push({ degree: parts[0], school: parts[1] || "", year: yearMatch[0] })
        }
      }
      if (items.length >= 3) break
    }
  }

  const entries = items.length > 0 ? items : [
    { degree: "B.Sc. Computer Science", school: "Your University", year: "2022" },
    { degree: "Full-Stack Development Bootcamp", school: "Online / Self-taught", year: "2021" },
  ]

  return `
  <section id="education" class="section">
    <div class="container">
      <p class="section-label reveal">Background</p>
      <h2 class="section-title reveal">Education & Certifications</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px" class="reveal">
        ${entries.map(ed => `
        <div style="padding:28px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
          <div style="font-size:12px;color:${accent};font-weight:700;letter-spacing:1px;margin-bottom:8px">${e(ed.year)}</div>
          <h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px">${e(ed.degree)}</h3>
          <p style="font-size:14px;color:#666">${e(ed.school)}</p>
        </div>`).join("")}
      </div>
    </div>
  </section>`
}
