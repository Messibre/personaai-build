import type { GitHubProfile, SocialLinks } from "../../../types"
import { e, safeUrl } from "../escape"

// Simple inline SVG icons for social links
export const SOCIAL_SVGS: Record<string, string> = {
  github: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
  linkedin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  twitter: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  substack: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>`,
  blog: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
}

export function buildContact(profile: GitHubProfile, accent: string, socialLinks?: SocialLinks): string {
  // Build social icon row
  const icons: string[] = []
  if (profile.html_url && safeUrl(profile.html_url) !== "#") {
    icons.push(`<a href="${safeUrl(profile.html_url)}" target="_blank" rel="noopener" class="social-link" aria-label="GitHub profile" title="GitHub">${SOCIAL_SVGS.github}</a>`)
  }
  if (socialLinks?.linkedin && safeUrl(socialLinks.linkedin) !== "#") {
    icons.push(`<a href="${safeUrl(socialLinks.linkedin)}" target="_blank" rel="noopener" class="social-link" aria-label="LinkedIn profile" title="LinkedIn">${SOCIAL_SVGS.linkedin}</a>`)
  }
  if (socialLinks?.twitter && safeUrl(socialLinks.twitter) !== "#") {
    icons.push(`<a href="${safeUrl(socialLinks.twitter)}" target="_blank" rel="noopener" class="social-link" aria-label="X / Twitter" title="X / Twitter">${SOCIAL_SVGS.twitter}</a>`)
  }
  if (socialLinks?.substack && safeUrl(socialLinks.substack) !== "#") {
    icons.push(`<a href="${safeUrl(socialLinks.substack)}" target="_blank" rel="noopener" class="social-link" aria-label="Substack" title="Substack">${SOCIAL_SVGS.substack}</a>`)
  }
  const blogUrl = socialLinks?.blog || profile.blog
  if (blogUrl && safeUrl(blogUrl) !== "#") {
    icons.push(`<a href="${safeUrl(blogUrl)}" target="_blank" rel="noopener" class="social-link" aria-label="Personal website" title="Website">${SOCIAL_SVGS.blog}</a>`)
  }

  // Email from GitHub API isn't always available, so we fall back to mailto: pattern
  const emailHint = `${profile.username}@users.noreply.github.com`

  return `
  <section id="contact" class="section">
    <div class="container" style="text-align:center">
      <p class="section-label reveal">Contact</p>
      <h2 class="section-title reveal" style="margin-left:auto;margin-right:auto">Let&rsquo;s work together</h2>
      <p class="section-desc reveal" style="margin-left:auto;margin-right:auto;text-align:center;color:var(--muted,#888)">Have a project in mind or just want to say hello? My inbox is open.</p>
      <div class="social-links reveal" aria-label="Social links">
        ${icons.join("\n        ")}
      </div>
      <div class="reveal" style="display:flex;flex-direction:column;align-items:center;gap:12px">
        <button class="email-copy" onclick="copyEmail('${e(emailHint)}')" aria-label="Copy email address to clipboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy email to clipboard
        </button>
        <a href="${safeUrl(profile.html_url)}" target="_blank" rel="noopener" style="padding:14px 36px;background:${accent};color:#000;border-radius:12px;font-weight:700;font-size:15px;display:inline-flex;align-items:center;gap:8px" aria-label="View GitHub profile">
          ${SOCIAL_SVGS.github} View GitHub Profile
        </a>
      </div>
    </div>
  </section>
  <div id="copy-toast" class="copy-toast" role="status" aria-live="polite">Copied to clipboard!</div>`
}
