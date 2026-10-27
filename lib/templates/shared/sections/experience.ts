import { e } from "../escape"

export function buildExperience(aiResume: { summary?: string; highlights?: string[] } | null | undefined, resumeText: string | null, accent: string): string {
  // If AI provided a resume summary/highlights, prefer that (simpler display)
  if (aiResume && (aiResume.summary || (aiResume.highlights && aiResume.highlights.length > 0))) {
    const summary = aiResume.summary ? e(aiResume.summary) : ""
    const highlights = (aiResume.highlights || []).slice(0, 6)
    return `
    <section id="experience" class="section">
      <div class="container">
        <p class="section-label reveal">Career</p>
        <h2 class="section-title reveal">Experience & Highlights</h2>
        <p class="section-desc reveal">${summary}</p>
        <ul style="list-style:none;padding:0;margin-top:12px">${highlights.map(h => `<li style="font-size:14px;color:var(--muted,#888);line-height:1.65;margin-bottom:8px">• ${e(h)}</li>`).join("")}</ul>
      </div>
    </section>`
  }
  // Otherwise fall back to parsing full resume text as before
  // Parse bullet points from resume if available
  const items: { title: string; org: string; period: string; bullets: string[] }[] = []

  if (resumeText) {
    // Try to extract experience blocks from resume text using common patterns
    const lines = resumeText.split("\n").map(l => l.trim()).filter(Boolean)
    let current: typeof items[0] | null = null
    const expSectionRe = /^(experience|work history|employment|professional experience)/i
    const roleRe = /^([A-Z][^|•\n]{4,60})\s*[|@–\-]\s*(.+)$/
    const dateRe = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i
    let inExp = false

    for (const line of lines) {
      if (expSectionRe.test(line)) { inExp = true; continue }
      if (/^(education|skills|projects|certifications|awards)/i.test(line)) { inExp = false }
      if (!inExp) continue

      const roleMatch = line.match(roleRe)
      if (roleMatch && !dateRe.test(line.split("|")[0])) {
        if (current) items.push(current)
        current = { title: roleMatch[1].trim(), org: roleMatch[2].trim(), period: "", bullets: [] }
      } else if (current && dateRe.test(line) && line.length < 60) {
        current.period = line
      } else if (current && /^[•\-*]/.test(line)) {
        current.bullets.push(line.replace(/^[•\-*]\s*/, ""))
      }
      if (items.length >= 4) break
    }
    if (current && items.length < 4) items.push(current)
  }

  if (items.length === 0) return ""
  const entries = items

  return `
  <section id="experience" class="section">
    <div class="container">
      <p class="section-label reveal">Career</p>
      <h2 class="section-title reveal">Work Experience</h2>
      <div style="position:relative;padding-left:32px;border-left:2px solid ${accent}20;margin-top:8px">
        ${entries.map((entry) => `
        <div class="reveal" style="position:relative;margin-bottom:40px">
          <div style="position:absolute;left:-41px;top:4px;width:18px;height:18px;border-radius:50%;background:${accent};border:3px solid var(--bg,#0a0a0f);box-sizing:border-box"></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:6px">
            <h3 style="font-size:17px;font-weight:700;color:var(--text,#fff)">${e(entry.title)}</h3>
            <span style="font-size:14px;color:${accent};font-weight:500">${e(entry.org)}</span>
            ${entry.period ? `<span style="font-size:12px;color:var(--muted,#555);margin-left:auto">${e(entry.period)}</span>` : ""}
          </div>
          <ul style="list-style:none;padding:0;margin:0">
            ${entry.bullets.slice(0, 3).map(b => `<li style="font-size:14px;color:var(--muted,#888);line-height:1.65;margin-bottom:4px;padding-left:16px;position:relative"><span style="position:absolute;left:0;color:${accent}">›</span>${e(b)}</li>`).join("")}
          </ul>
        </div>`).join("")}
      </div>
    </div>
  </section>`
}
