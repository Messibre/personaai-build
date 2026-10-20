import type { SocialLinks } from "../../../types"
import { e, safeUrl } from "../escape"

export function buildWriting(socialLinks: SocialLinks | undefined, accent: string): string {
  const substackUrl = socialLinks?.substack
  const blogUrl = socialLinks?.blog
  const hasLink = substackUrl || blogUrl

  return `
  <section id="writing" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Published</p>
      <h2 class="section-title reveal">Featured Writing</h2>
      ${hasLink ? `
      <p class="section-desc reveal">Read more of my writing on ${substackUrl && safeUrl(substackUrl) !== "#" ? `<a href="${safeUrl(substackUrl)}" target="_blank" rel="noopener" style="color:${accent}">Substack</a>` : ""}${blogUrl && safeUrl(blogUrl) !== "#" ? ` and my <a href="${safeUrl(blogUrl)}" target="_blank" rel="noopener" style="color:${accent}">personal blog</a>` : ""}.</p>
      ` : `<p class="section-desc reveal">Add your Substack or blog URL in the wizard to link your writing here.</p>`}
      <div style="display:flex;flex-direction:column;gap:16px" class="reveal">
        ${[
          { title: "Building in Public: Lessons from Shipping 3 Side Projects", pub: "Personal Blog", date: "Apr 2026", read: "5 min read" },
          { title: "Why I Switched from REST to GraphQL (and Back Again)", pub: "Dev.to", date: "Feb 2026", read: "8 min read" },
          { title: "The Hidden Cost of Perfect Code", pub: "Medium", date: "Dec 2025", read: "4 min read" },
        ].map(a => `
        <article style="padding:20px 24px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;transition:border-color .3s" onmouseenter="this.style.borderColor='${accent}30'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.06)'">
          <div>
            <h3 style="font-size:15px;font-weight:600;color:#fff;margin-bottom:4px">${e(a.title)}</h3>
            <div style="display:flex;gap:12px">
              <span style="font-size:12px;color:#555">${e(a.pub)}</span>
              <span style="font-size:12px;color:#555">${e(a.date)}</span>
              <span style="font-size:12px;color:${accent}">${e(a.read)}</span>
            </div>
          </div>
          <span style="font-size:18px;color:${accent};flex-shrink:0">&rarr;</span>
        </article>`).join("")}
      </div>
      <p style="font-size:12px;color:#333;margin-top:16px">Replace these with links to your actual articles after deploying.</p>
    </div>
  </section>`
}
