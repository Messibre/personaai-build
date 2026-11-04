import { e } from "../escape"

export function buildNow(targetRole: string | null | undefined, accent: string): string {
  const focus = targetRole?.trim()
  if (!focus) return ""
  return `
  <section id="now" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Current Status</p>
      <h2 class="section-title reveal">What I&rsquo;m doing now</h2>
      <div class="reveal" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
        <div style="padding:28px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-left:3px solid ${accent};border-radius:12px">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:12px">Focused on</div>
          <p style="font-size:15px;color:#ccc;line-height:1.65">${e(focus)}</p>
        </div>
      </div>
    </div>
  </section>`
}
