import type { SocialLinks } from "../../../types"
import { safeUrl } from "../escape"

export function buildWriting(socialLinks: SocialLinks | undefined, accent: string): string {
  const substackUrl = socialLinks?.substack && safeUrl(socialLinks.substack) !== "#" ? safeUrl(socialLinks.substack) : ""
  const blogUrl = socialLinks?.blog && safeUrl(socialLinks.blog) !== "#" ? safeUrl(socialLinks.blog) : ""
  if (!substackUrl && !blogUrl) return ""

  const links = [
    substackUrl ? `<a href="${substackUrl}" target="_blank" rel="noopener" style="color:${accent}">Substack</a>` : "",
    blogUrl ? `my <a href="${blogUrl}" target="_blank" rel="noopener" style="color:${accent}">personal blog</a>` : "",
  ].filter(Boolean).join(" and ")

  return `
  <section id="writing" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Published</p>
      <h2 class="section-title reveal">Writing</h2>
      <p class="section-desc reveal">Read my writing on ${links}.</p>
    </div>
  </section>`
}
