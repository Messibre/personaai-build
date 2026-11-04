import type { SocialLinks } from "../../types"
import { baseStyles, gsapScript } from "./base-styles"
import { e, safeUrl, safeImageSrc, safeColor } from "./escape"
import { themeCss, themeFontHref, type TemplateTheme } from "./tokens"

export function shell(accent: string, extraStyles: string, bodyContent: string, name: string, bio?: string, photoUrl?: string, skills?: string[], socialLinks?: SocialLinks, profileUrl?: string, theme?: TemplateTheme): string {
  const fontLink = theme ? `<link rel="stylesheet" href="${e(themeFontHref(theme))}">` : ""
  const themeStyles = theme ? themeCss(theme) : ""
  const description = bio 
    ? `${name} - ${bio.substring(0, 150)}${bio.length > 150 ? "..." : ""}`
    : `${name}'s personal portfolio showcasing projects, skills, and experience.`
  const safeDescription = e(description)
  const title = `${e(name)} - Portfolio`
  const updatedDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const safeProfileUrl = safeUrl(profileUrl)
  const safePhotoUrl = safeImageSrc(photoUrl)
  const safeAccent = safeColor(accent)

  // JSON-LD Person schema for ATS / AI scrapers
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": name,
    "description": bio || description,
    "url": safeProfileUrl !== "#" ? safeProfileUrl : "",
    "image": safePhotoUrl || "",
    "sameAs": [
      safeProfileUrl !== "#" ? safeProfileUrl : null,
      socialLinks?.linkedin && safeUrl(socialLinks.linkedin) !== "#" ? safeUrl(socialLinks.linkedin) : null,
      socialLinks?.twitter && safeUrl(socialLinks.twitter) !== "#" ? safeUrl(socialLinks.twitter) : null,
      socialLinks?.blog && safeUrl(socialLinks.blog) !== "#" ? safeUrl(socialLinks.blog) : null,
    ].filter(Boolean),
    "knowsAbout": skills || [],
  })
  
  return `<!DOCTYPE html>
<html lang="en"${theme?.defaultMode === "light" ? ' data-theme="light"' : ""}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${safeDescription}">
<meta name="author" content="${e(name)}">
<meta name="robots" content="index, follow">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${safeDescription}">
${safePhotoUrl ? `<meta property="og:image" content="${safePhotoUrl}">` : ""}

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${safeDescription}">
${safePhotoUrl ? `<meta name="twitter:image" content="${safePhotoUrl}">` : ""}

<!-- Theme Color -->
<meta name="theme-color" content="${safeAccent}">

<!-- Preconnect for performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontLink}
<link rel="preconnect" href="https://github-readme-stats.vercel.app">
<link rel="preconnect" href="https://github-readme-streak-stats.herokuapp.com">

<!-- Favicon (generated from accent color) -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='${encodeURIComponent(safeAccent)}'/><text y='.9em' x='50' text-anchor='middle' font-size='70' fill='white'>${e(name.charAt(0).toUpperCase())}</text></svg>">

<!-- JSON-LD structured data -->
<script type="application/ld+json">${jsonLd.replace(/<\/script/gi, "<\\/script")}<\/script>

<style>
  .skip-link { position:absolute; top:-100px; left:16px; padding:8px 16px; background:${safeAccent}; color:#000; font-weight:700; font-size:14px; border-radius:4px; z-index:9999; transition:top .2s; }
  .skip-link:focus { top:8px; }
  ${baseStyles(safeAccent)}
    ${themeStyles}${extraStyles}
</style>
</head>
<body>
<a href="#main-content" class="skip-link">Skip to main content</a>
<div class="grid-bg" aria-hidden="true"></div>
${bodyContent}
${gsapScript()}
<!-- updated:${updatedDate} -->
</body>
</html>`
}
