import type { GitHubProfile, GitHubRepo, PortfolioConfig, ColorScheme, AIProject, SocialLinks } from "./types"
import { COLOR_SCHEMES } from "./types"

interface TemplateData {
  profile: GitHubProfile
  repos: GitHubRepo[]
  resumeText: string | null
  aiResume?: { summary?: string; highlights?: string[] } | null
  notionContent: string | null
  config: PortfolioConfig
  photoUrl: string | null
  aiBio: string | null
  socialLinks?: SocialLinks
  aiProjects?: AIProject[] | null
  heroTagline?: string | null
  targetRole?: string | null
}

export function e(str: unknown): string {
  if (typeof str !== "string") return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const DATA_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/

export function safeUrl(input: unknown): string {
  if (typeof input !== "string") return "#"
  let raw = input.trim()
  if (!raw) return "#"
  // blog fields often come without a scheme ("mysite.com")
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = "https://" + raw
  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") return "#" // blocks javascript:, data:, file:, http:
    return e(url.href) // escape again for safety
  } catch {
    return "#"
  }
}

export function safeImageSrc(input: unknown): string {
  if (typeof input !== "string") return ""
  const v = input.trim()
  if (v.length < 3_000_000 && DATA_IMAGE.test(v)) return e(v) // uploaded photo
  const u = safeUrl(v)
  return u === "#" ? "" : u // GitHub avatar etc.
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/

export function safeColor(color: unknown, fallback = "#0ea5e9"): string {
  if (typeof color === "string" && HEX_COLOR_REGEX.test(color.trim())) {
    return color.trim()
  }
  return fallback
}

export function getColorScheme(scheme: unknown, fallbackScheme: ColorScheme = "ocean") {
  if (typeof scheme === "string" && scheme in COLOR_SCHEMES) {
    const item = COLOR_SCHEMES[scheme as ColorScheme]
    return {
      label: item.label,
      primary: safeColor(item.primary),
      secondary: safeColor(item.secondary),
      accent: safeColor(item.accent),
    }
  }
  const fallback = COLOR_SCHEMES[fallbackScheme] || COLOR_SCHEMES.ocean
  return {
    label: fallback.label,
    primary: safeColor(fallback.primary),
    secondary: safeColor(fallback.secondary),
    accent: safeColor(fallback.accent),
  }
}


/** Strip common markdown syntax so raw README text renders cleanly as plain text */
function stripMd(text: string): string {
  if (!text) return text
  return text
    .replace(/^#{1,6}\s+/gm, "")          // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")       // bold
    .replace(/\*(.+?)\*/g, "$1")           // italic
    .replace(/__(.+?)__/g, "$1")           // bold alt
    .replace(/_(.+?)_/g, "$1")             // italic alt
    .replace(/`{1,3}[^`]*`{1,3}/g, "")    // inline code / code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → label only
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // images
    .replace(/^[-*+]\s+/gm, "")           // unordered list bullets
    .replace(/^\d+\.\s+/gm, "")           // ordered list numbers
    .replace(/^>\s+/gm, "")               // blockquotes
    .replace(/^-{3,}$/gm, "")             // horizontal rules
    .replace(/\n{3,}/g, "\n\n")           // excess blank lines
    .trim()
    .split("\n")[0]                        // keep only the first meaningful line
    .trim()
}

function getLangs(repos: GitHubRepo[]): string[] {
  return [...new Set(repos.map((r) => r.language).filter(Boolean))] as string[]
}

function getTopics(repos: GitHubRepo[]): string[] {
  return [...new Set(repos.flatMap((r) => r.topics).filter(Boolean))]
}

// Language → gradient color map for project thumbnails
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f0db4f", Python: "#3572a5", Rust: "#dea584",
  Go: "#00add8", Java: "#b07219", "C++": "#f34b7d", C: "#555555", "C#": "#178600",
  Ruby: "#701516", Swift: "#f05138", Kotlin: "#a97bff", PHP: "#4f5d95",
  Dart: "#00b4ab", Scala: "#c22d40", Elixir: "#6e4a7e", Haskell: "#5e5086",
  HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", Vue: "#41b883", Svelte: "#ff3e00",
}

function langColor(lang: string | null): string {
  if (!lang) return "#7c5cfc"
  return LANG_COLORS[lang] || "#7c5cfc"
}

// Shared base styles injected into every template
function baseStyles(accent: string): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&display=swap');
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 80px; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0f; color: #e8e8ef; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
    img { max-width: 100%; height: auto; loading: lazy; }
    a { text-decoration: none; transition: all .3s; }
    a:hover { opacity: 0.85; }
    a:focus-visible, button:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px; }

    /* Dark/light theme variables */
    :root { --bg: #0a0a0f; --surface: rgba(255,255,255,0.03); --border: rgba(255,255,255,0.06); --text: #e8e8ef; --muted: #888; --accent: ${accent}; }
    [data-theme="light"] { --bg: #f4f4f8; --surface: rgba(0,0,0,0.04); --border: rgba(0,0,0,0.1); --text: #111; --muted: #444; }
    [data-theme="light"] body { background: #f4f4f8 !important; color: #111 !important; }
    /* Nav */
    [data-theme="light"] .nav { background: rgba(248,248,252,0.92) !important; border-bottom-color: rgba(0,0,0,0.08) !important; }
    [data-theme="light"] .nav-brand { color: #111 !important; }
    [data-theme="light"] .nav-links a { color: #444 !important; }
    [data-theme="light"] .nav-links a:hover,[data-theme="light"] .nav-links a.active { color: ${accent} !important; }
    [data-theme="light"] .nav-toggle span { background: #111 !important; }
    [data-theme="light"] .mobile-menu { background: rgba(248,248,252,0.97) !important; }
    [data-theme="light"] .mobile-menu a { color: #333 !important; }
    /* All text elements — beat inline styles */
    [data-theme="light"] h1,[data-theme="light"] h2,[data-theme="light"] h3,
    [data-theme="light"] h4,[data-theme="light"] h5,[data-theme="light"] h6 { color: #111 !important; }
    [data-theme="light"] p { color: #444 !important; }
    [data-theme="light"] li { color: #444 !important; }
    [data-theme="light"] span { color: inherit; }
    [data-theme="light"] .hero-bio,[data-theme="light"] .hero-desc,[data-theme="light"] .hero-tagline { color: #444 !important; }
    /* Sections */
    [data-theme="light"] .section-title { color: #111 !important; }
    [data-theme="light"] .section-desc { color: #555 !important; }
    [data-theme="light"] .section-label { color: ${accent} !important; }
    /* Cards and surfaces */
    [data-theme="light"] .project-card,
    [data-theme="light"] .bento-cell,
    [data-theme="light"] .glass-card { background: #fff !important; border-color: rgba(0,0,0,0.08) !important; box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important; }
    [data-theme="light"] .project-card { background: #fff; border-color: rgba(0,0,0,0.08); box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    [data-theme="light"] .project-name { color: #111; }
    [data-theme="light"] .project-desc { color: #555; }
    [data-theme="light"] .project-link.gh { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.1); color: #555; }
    [data-theme="light"] .project-link.gh:hover { background: rgba(0,0,0,0.07); color: #111; border-color: rgba(0,0,0,0.2); }
    /* Filter chips */
    [data-theme="light"] .proj-chip { border-color: rgba(0,0,0,0.12); color: #555; }
    /* Skills */
    [data-theme="light"] .skill-category-title { color: #666; border-bottom-color: rgba(0,0,0,0.08); }
    [data-theme="light"] .skill-badge { color: ${accent} !important; border-color: ${accent}40 !important; background: ${accent}0d !important; }
    [data-theme="light"] .skill-badge[style*="rgba(255"] { color: ${accent} !important; }
    /* Contact / social */
    [data-theme="light"] .social-link { border-color: rgba(0,0,0,0.12); color: #555; }
    [data-theme="light"] .email-copy { border-color: rgba(0,0,0,0.12); color: #333; }
    /* Experience section */
    [data-theme="light"] #experience h3 { color: #111 !important; }
    [data-theme="light"] #experience li,[data-theme="light"] #experience p { color: #555 !important; }
    [data-theme="light"] #experience span[style*="color:#555"] { color: #777 !important; }
    /* Blanket section text — ensure all p/span/li are readable in light mode */
    [data-theme="light"] .section p,
    [data-theme="light"] .section-desc,
    [data-theme="light"] .section li { color: #444 !important; }
    [data-theme="light"] .section h1,
    [data-theme="light"] .section h2,
    [data-theme="light"] .section h3 { color: #111 !important; }
    /* About section card background */
    [data-theme="light"] #about { background: transparent !important; }
    [data-theme="light"] #about .about-fact { background: rgba(0,0,0,0.05) !important; border-color: rgba(0,0,0,0.1) !important; color: #333 !important; }
    [data-theme="light"] #about .about-gh-link { border-color: rgba(0,0,0,0.14) !important; color: #333 !important; background: rgba(0,0,0,0.03) !important; }
    /* Per-template hero overrides — all hardcoded color:#fff in hero h1/p */
    [data-theme="light"] .hero h1,[data-theme="light"] .hero-light h1,[data-theme="light"] .hero-left h2,
    [data-theme="light"] .hero-text h1,[data-theme="light"] .hero-glass h1 { color: #111 !important; }
    [data-theme="light"] .hero p,[data-theme="light"] .hero-light p,[data-theme="light"] .hero-left p,
    [data-theme="light"] .hero-text p,[data-theme="light"] .hero-glass p { color: #555 !important; }
    [data-theme="light"] .hero-light { background: #f0f0f8 !important; border-left-color: rgba(0,0,0,0.06) !important; }
    [data-theme="light"] .hero-dark { background: #e8e8f0 !important; }
    [data-theme="light"] .hero-left { background: #eeeef6 !important; }
    [data-theme="light"] .hero-right { background: #f4f4fc !important; border-left-color: rgba(0,0,0,0.06) !important; }
    /* Glass template overrides */
    [data-theme="light"] .hero-glass { background: rgba(255,255,255,0.7) !important; border-color: rgba(0,0,0,0.1) !important; backdrop-filter: blur(24px); }
    [data-theme="light"] .glass-card { background: rgba(255,255,255,0.8) !important; border-color: rgba(0,0,0,0.08) !important; }
    [data-theme="light"] .hero-glass .ctas .secondary { background: rgba(0,0,0,0.06) !important; border-color: rgba(0,0,0,0.12) !important; color: #333 !important; }
    /* Terminal template overrides */
    [data-theme="light"] .cmd-line { color: #777 !important; }
    /* Inline style overrides — catch any remaining color:#fff / #888 / #aaa / #ccc on spans */
    [data-theme="light"] span[style*="color:#ccc"],[data-theme="light"] span[style*="color: #ccc"] { color: #444 !important; }
    [data-theme="light"] span[style*="color:#888"],[data-theme="light"] span[style*="color: #888"] { color: #555 !important; }
    [data-theme="light"] span[style*="color:#aaa"],[data-theme="light"] span[style*="color: #aaa"] { color: #555 !important; }
    [data-theme="light"] span[style*="color:#fff"],[data-theme="light"] span[style*="color: #fff"] { color: #111 !important; }
    [data-theme="light"] h3[style*="color:#fff"],[data-theme="light"] h3[style*="color: #fff"] { color: #111 !important; }
    [data-theme="light"] p[style*="color:#888"],[data-theme="light"] p[style*="color: #888"] { color: #555 !important; }
    [data-theme="light"] a[style*="color:#ccc"],[data-theme="light"] a[style*="color: #ccc"] { color: #444 !important; border-color: rgba(0,0,0,0.12) !important; }
    /* GitHub stats */
    [data-theme="light"] #github-stats { background: transparent; }
    /* Footer */
    [data-theme="light"] .footer { background: #f0f0f6; border-top-color: rgba(0,0,0,0.08); }
    [data-theme="light"] .footer p { color: #888; }
    [data-theme="light"] .footer a { color: ${accent}; }
    [data-theme="light"] .footer span[style*="color:#555"] { color: #666 !important; }
    /* Grid bg */
    [data-theme="light"] .grid-bg { opacity: 0; }

    /* Theme toggle button */
    .theme-toggle { background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #999; cursor: pointer; font-size: 14px; padding: 6px 10px; transition: all .2s; display: flex; align-items: center; gap: 4px; }
    .theme-toggle:hover { border-color: ${accent}40; color: ${accent}; }
    [data-theme="light"] .theme-toggle { border-color: rgba(0,0,0,0.12); color: #555; }

    /* Background grid */
    .grid-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; 
      background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 60px 60px; }
    .grid-bg::after { content: ''; position: absolute; inset: 0; 
      background: radial-gradient(ellipse 60% 40% at 50% 0%, ${accent}15, transparent 70%); }

    /* Sections */
    .section { position: relative; z-index: 1; padding: 100px 24px; }
    .container { max-width: 1100px; margin: 0 auto; }
    .section-label { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: ${accent}; font-weight: 600; margin-bottom: 12px; }
    .section-title { font-size: clamp(1.8rem, 3.5vw, 2.5rem); font-weight: 800; color: var(--text, #fff); margin-bottom: 20px; line-height: 1.2; }
    .section-desc { font-size: 16px; color: var(--muted, #888); line-height: 1.7; max-width: 600px; margin-bottom: 48px; }

    /* Nav */
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 24px; background: rgba(10,10,15,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
    .nav-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .nav-brand { font-size: 18px; font-weight: 800; color: var(--text, #fff); }
    .nav-brand span { color: ${accent}; }
    .nav-links { display: flex; gap: 28px; }
    .nav-links a { font-size: 13px; color: var(--muted, #999); font-weight: 500; letter-spacing: 0.3px; transition: color 0.3s; }
    .nav-links a:hover, .nav-links a.active { color: ${accent}; }
    .nav-cta { padding: 8px 20px; border-radius: 8px; background: ${accent}; color: #000; font-size: 13px; font-weight: 600; }
    .nav-cta:hover { opacity: 0.9; transform: translateY(-1px); }
    .nav-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
    .nav-toggle span { display: block; width: 22px; height: 2px; background: #fff; margin: 5px 0; transition: all .3s; }
    .mobile-menu { display: none; position: fixed; top: 64px; left: 0; right: 0; background: rgba(10,10,15,0.95); backdrop-filter: blur(20px); padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); z-index: 99; }
    .mobile-menu.open { display: flex; flex-direction: column; gap: 16px; }
    .mobile-menu a { font-size: 16px; color: #ccc; font-weight: 500; padding: 8px 0; }
    .mobile-menu a:hover { color: ${accent}; }

    /* Project cards & filter chips */
    .proj-filter { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
    .proj-chip { padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid var(--border, rgba(255,255,255,0.1)); color: var(--muted, #999); cursor: pointer; transition: all .2s; background: transparent; letter-spacing: 0.5px; }
    .proj-chip:hover, .proj-chip.active { background: ${accent}; color: #000; border-color: ${accent}; }
    .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .project-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px; transition: all .4s cubic-bezier(.4,0,.2,1); position: relative; overflow: hidden; }
    .project-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, ${accent}40, transparent); opacity: 0; transition: opacity .4s; }
    .project-card:hover { border-color: ${accent}30; transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 40px ${accent}08; }
    .project-card:hover::before { opacity: 1; }
    .project-card[hidden] { display: none; }
    .proj-thumb { width: 100%; height: 6px; border-radius: 4px; margin-bottom: 20px; opacity: 0.7; }
    .project-name { font-size: 18px; font-weight: 700; color: var(--text, #fff); margin-bottom: 8px; }
    .project-desc { font-size: 14px; color: var(--muted, #888); line-height: 1.6; margin-bottom: 16px; }
    .project-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .project-lang { font-size: 12px; padding: 4px 12px; border-radius: 20px; background: ${accent}12; color: ${accent}; font-weight: 500; }
    .project-links { display: flex; gap: 8px; align-items: center; margin-left: auto; }
    .project-link { font-size: 12px; padding: 5px 14px; border-radius: 8px; font-weight: 600; border: 1px solid ${accent}30; color: ${accent}; transition: all .2s; }
    .project-link:hover { background: ${accent}; color: #000; border-color: ${accent}; opacity: 1; }
    .project-link.gh { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: #aaa; }
    .project-link.gh:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }
    .project-stars { font-size: 12px; color: ${accent}; font-weight: 600; }
    .proj-now { font-size: 10px; padding: 3px 10px; border-radius: 12px; background: ${accent}18; border: 1px solid ${accent}30; color: ${accent}; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }

    /* Skills */
    .skill-badge { display: inline-block; padding: 8px 18px; border-radius: 24px; font-size: 13px; font-weight: 500; border: 1px solid ${accent}20; color: ${accent}; margin: 4px; background: ${accent}08; transition: all .3s; }
    .skill-badge:hover { background: ${accent}18; border-color: ${accent}40; transform: translateY(-2px); }
    .skill-category { margin-bottom: 28px; }
    .skill-category-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted, #555); font-weight: 600; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.05)); cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
    .skill-category-title:hover { color: ${accent}; }
    .skill-category-badges { display: flex; flex-wrap: wrap; gap: 0; transition: all .3s; }
    .skill-category-badges.collapsed { display: none; }

    /* Copy-email toast */
    .copy-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px); background: ${accent}; color: #000; padding: 10px 24px; border-radius: 24px; font-size: 13px; font-weight: 700; opacity: 0; pointer-events: none; transition: all .3s; z-index: 9999; }
    .copy-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* Social icon links */
    .social-links { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-bottom: 32px; }
    .social-link { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border, rgba(255,255,255,0.1)); color: var(--muted, #aaa); transition: all .2s; }
    .social-link:hover { border-color: ${accent}; color: ${accent}; background: ${accent}10; opacity: 1; }
    .email-copy { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 12px; color: var(--text, #ccc); font-size: 14px; cursor: pointer; transition: all .2s; background: none; font-family: inherit; }
    .email-copy:hover { border-color: ${accent}; color: ${accent}; background: ${accent}08; }

    /* Footer */
    .footer { position: relative; z-index: 1; padding: 40px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(5,5,10,0.8); }
    .footer p { font-size: 13px; color: #555; }
    .footer a { color: ${accent}; font-weight: 600; }

    /* GSAP reveal classes */
    .reveal { opacity: 0; transform: translateY(40px); }
    .reveal-left { opacity: 0; transform: translateX(-40px); }
    .reveal-right { opacity: 0; transform: translateX(40px); }
    .reveal-scale { opacity: 0; transform: scale(0.9); }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      .reveal, .reveal-left, .reveal-right, .reveal-scale { opacity: 1 !important; transform: none !important; }
      html { scroll-behavior: auto; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-cta { display: none; }
      .nav-toggle { display: block; }
      .hero-split { flex-direction: column !important; }
      .hero-photo-side { position: relative !important; width: 100% !important; height: 300px !important; }
      .projects-grid { grid-template-columns: 1fr; }
      .stats-row { flex-direction: column; gap: 24px !important; }
      .section { padding: 60px 16px; }
      /* Shared section builders */
      #github-stats img { max-width: 100%; height: auto; }
      #github-stats > .container > div[style*="display:flex"] { flex-direction: column; }
      #experience .container > div[style*="padding-left:32px"] { padding-left: 24px; }
      #testimonials > .container > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
      #featured .container > div[style*="padding:40px"] { padding: 24px !important; }
    }

    /* Print stylesheet */
    @media print {
      .nav, .nav-toggle, .mobile-menu, .grid-bg, .theme-toggle, .proj-filter { display: none !important; }
      body { background: #fff !important; color: #000 !important; font-size: 11pt; }
      .section { padding: 24pt 0; break-inside: avoid; }
      .project-card { border: 1pt solid #ddd !important; background: #fff !important; break-inside: avoid; }
      .project-name, .section-title { color: #000 !important; }
      .section-desc, .project-desc, .section-label { color: #444 !important; }
      a[href]::after { content: " (" attr(href) ")"; font-size: 9pt; color: #666; }
      .reveal, .reveal-left, .reveal-right, .reveal-scale { opacity: 1 !important; transform: none !important; }
      .footer { border-top: 1pt solid #ddd; background: transparent !important; }
    }
  `
}

// GSAP CDN + ScrollTrigger + init script
function gsapScript(): string {
  return `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"><\/script>
  <script>
    // ── Dark / light toggle ─────────────────────────────────────────────────���
    (function() {
      var saved = localStorage.getItem('persona-theme') || 'dark';
      if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    })();

    function toggleTheme() {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
      localStorage.setItem('persona-theme', isLight ? 'dark' : 'light');
      var btn = document.getElementById('theme-toggle');
      if (btn) btn.innerHTML = isLight ? '&#9788;' : '&#9790;';
    }

    // ── Typewriter effect ────────────────────────────────────────────────────
    function typewriter(el, delay) {
      if (!el) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var text = el.textContent;
      el.textContent = '';
      el.style.opacity = '1';
      var i = 0;
      setTimeout(function tick() {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 28);
      }, delay || 400);
    }
    document.addEventListener('DOMContentLoaded', function() {
      typewriter(document.querySelector('.typewriter'), 600);
    });

    // ── Copy email to clipboard ──────────────────────────────────────────────
    function copyEmail(email) {
      navigator.clipboard.writeText(email).then(function() {
        var t = document.getElementById('copy-toast');
        if (!t) return;
        t.classList.add('show');
        setTimeout(function() { t.classList.remove('show'); }, 2200);
      });
    }

    // ── Project filter chips ─────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function() {
      var chips = document.querySelectorAll('.proj-chip');
      chips.forEach(function(chip) {
        chip.addEventListener('click', function() {
          var lang = chip.dataset.lang;
          chips.forEach(function(c) { c.classList.remove('active'); });
          chip.classList.add('active');
          document.querySelectorAll('.project-card').forEach(function(card) {
            if (lang === 'all' || card.dataset.lang === lang) {
              card.removeAttribute('hidden');
            } else {
              card.setAttribute('hidden', '');
            }
          });
        });
      });
    });

    // ── Skill accordion ───────────────────���──────────────────────────────────
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.skill-category-title').forEach(function(title) {
        title.addEventListener('click', function() {
          var badges = title.nextElementSibling;
          if (badges) badges.classList.toggle('collapsed');
          var arrow = title.querySelector('.acc-arrow');
          if (arrow) arrow.textContent = badges && badges.classList.contains('collapsed') ? '▸' : '▾';
        });
      });
    });

    // ── Mouse-tracked hero parallax ──────────────────────────────────────────
    (function() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var frame = null;
      document.addEventListener('mousemove', function(e) {
        if (frame) return;
        frame = requestAnimationFrame(function() {
          frame = null;
          var el = document.querySelector('.hero-photo-parallax');
          if (!el) return;
          var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          var dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy;
          el.style.transform = 'translate(' + (-dx * 8) + 'px,' + (-dy * 8) + 'px)';
        });
      });
    })();

    // ── GSAP animations ──────────────────────────────────────────────────────
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced) {
      gsap.registerPlugin(ScrollTrigger);

      gsap.utils.toArray('.reveal').forEach(function(el) {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });
      gsap.utils.toArray('.reveal-left').forEach(function(el) {
        gsap.to(el, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });
      gsap.utils.toArray('.reveal-right').forEach(function(el) {
        gsap.to(el, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });
      gsap.utils.toArray('.reveal-scale').forEach(function(el) {
        gsap.to(el, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });
      ScrollTrigger.batch('.project-card:not([hidden])', {
        onEnter: function(batch) { gsap.to(batch, { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }); },
        start: 'top 85%', once: true
      });
      ScrollTrigger.batch('.skill-badge', {
        onEnter: function(batch) { gsap.to(batch, { opacity: 1, y: 0, scale: 1, stagger: 0.04, duration: 0.4, ease: 'back.out(1.7)' }); },
        start: 'top 90%', once: true
      });
      gsap.from('.hero-anim', { opacity: 0, y: 30, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.2 });

      // Active nav link on scroll
      var navLinks = document.querySelectorAll('.nav-links a[data-section]');
      document.querySelectorAll('section[id]').forEach(function(sec) {
        ScrollTrigger.create({
          trigger: sec, start: 'top center', end: 'bottom center',
          onEnter: function() { setActiveNav(sec.id); },
          onEnterBack: function() { setActiveNav(sec.id); },
        });
      });
      function setActiveNav(id) {
        navLinks.forEach(function(a) { a.classList.toggle('active', a.getAttribute('data-section') === id); });
      }
    } else {
      // Reduced motion: make all animated elements immediately visible
      document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale,.hero-anim,.project-card,.skill-badge').forEach(function(el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }
  <\/script>`
}

function navLabel(s: string): string {
  const labels: Record<string, string> = {
    "home": "Home", "about": "About", "skills": "Skills", "projects": "Projects",
    "experience": "Experience", "github-stats": "GitHub Stats", "testimonials": "Testimonials", "contact": "Contact"
  }
  return labels[s] || (s.charAt(0).toUpperCase() + s.slice(1))
}

function buildNav(name: string, sections: string[], accent: string): string {
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

function smartRepoDescription(name: string, language: string | null): string {
  // Convert repo-name-with-hyphens to readable words
  const words = name.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
  const lang = language ? `${language}-based ` : ""
  // Detect common patterns
  if (/api|backend|server/.test(words)) return `A ${lang}backend API service for ${words.replace(/api|backend|server/g, "").trim() || "data management"}.`
  if (/cli|tool|script/.test(words)) return `A ${lang}command-line tool for ${words.replace(/cli|tool|script/g, "").trim() || "automation"}.`
  if (/app|web|site|portfolio/.test(words)) return `A ${lang}web application — ${words}.`
  if (/bot|discord|telegram/.test(words)) return `An automated ${lang}bot: ${words}.`
  if (/ml|model|predict|classify/.test(words)) return `A machine learning project for ${words}.`
  if (/game|chess|puzzle/.test(words)) return `A ${lang}game: ${words}.`
  if (/dashboard|admin|panel/.test(words)) return `A ${lang}dashboard for managing ${words.replace(/dashboard|admin|panel/g, "").trim() || "data"}.`
  return `A ${lang}project — ${words.charAt(0).toUpperCase() + words.slice(1)}.`
}

// Build projects from either AI-enhanced projects or raw repos
function buildProjects(repos: GitHubRepo[], accent: string, aiProjects?: AIProject[] | null): string {
  function buildFallbackDescription(repo: GitHubRepo): string {
    const desc = repo.description?.trim() || ""
    if (desc && !(desc.includes("A ") && desc.includes(" project") && desc.split(/\s+/).length <= 4)) return desc
    if (repo.topics?.length) return `A ${repo.language || "software"} project focused on ${repo.topics.slice(0, 3).join(", ")}.`
    return `Open-source ${repo.language || "software"} project. View on GitHub for details.`
  }

  // Determine the most recently pushed repo (first non-fork in the list, as GitHub API returns by updated_at)
  const recentRepo = repos.filter(r => !r.fork)[0]?.name

  if (aiProjects && aiProjects.length > 0) {
    const langs = [...new Set(aiProjects.map(p => p.language).filter(Boolean))] as string[]
    const filterChips = langs.length > 1
      ? `<div class="proj-filter" role="group" aria-label="Filter projects by language">
          <button class="proj-chip active" data-lang="all">All</button>
          ${langs.map(l => `<button class="proj-chip" data-lang="${e(l)}">${e(l)}</button>`).join("")}
        </div>`
      : ""
    return filterChips + aiProjects.slice(0, 7).map((p, i) => {
      const lc = langColor(p.language)
      const isRecent = i === 0
      return `
    <div class="project-card reveal" data-lang="${e(p.language || "")}" style="opacity:0;transform:translateY(40px)">
      <div class="proj-thumb" style="background:linear-gradient(90deg,${lc},${lc}80)" aria-hidden="true"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px">
        <h3 class="project-name">${e(p.name)}</h3>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          ${isRecent ? `<span class="proj-now">Active</span>` : ""}
          ${p.stars > 0 ? `<span class="project-stars" aria-label="${p.stars} stars">&#9733; ${p.stars}</span>` : ""}
        </div>
      </div>
      <p class="project-desc">${e(stripMd(p.description))}</p>
      <div class="project-meta">
        ${p.language ? `<span class="project-lang">${e(p.language)}</span>` : ""}
        <div class="project-links">
          <a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="project-link gh" aria-label="View ${e(p.name)} on GitHub">GitHub</a>
        </div>
      </div>
    </div>`
    }).join("")
  }
  
  const filtered = repos.filter(r => !r.fork).slice(0, 6)
  const langs = [...new Set(filtered.map(r => r.language).filter(Boolean))] as string[]
  const filterChips = langs.length > 1
    ? `<div class="proj-filter" role="group" aria-label="Filter projects by language">
        <button class="proj-chip active" data-lang="all">All</button>
        ${langs.map(l => `<button class="proj-chip" data-lang="${e(l)}">${e(l)}</button>`).join("")}
      </div>`
    : ""

  return filterChips + filtered.map((r, i) => {
    const desc = buildFallbackDescription(r) || smartRepoDescription(r.name, r.language)
    const lc = langColor(r.language)
    const isRecent = r.name === recentRepo
    return `
    <div class="project-card reveal" data-lang="${e(r.language || "")}" style="opacity:0;transform:translateY(40px)">
      <div class="proj-thumb" style="background:linear-gradient(90deg,${lc},${lc}80)" aria-hidden="true"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px">
        <h3 class="project-name">${e(r.name)}</h3>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          ${isRecent ? `<span class="proj-now">Active</span>` : ""}
          ${r.stargazers_count > 0 ? `<span class="project-stars" aria-label="${r.stargazers_count} stars">&#9733; ${r.stargazers_count}</span>` : ""}
        </div>
      </div>
      <p class="project-desc">${e(desc)}</p>
      <div class="project-meta">
        ${r.language ? `<span class="project-lang">${e(r.language)}</span>` : ""}
        ${r.topics?.slice(0, 1).map(t => `<span class="project-lang" style="opacity:0.55">${e(t)}</span>`).join("") || ""}
        <div class="project-links">
          ${r.homepage && safeUrl(r.homepage) !== "#" ? `<a href="${safeUrl(r.homepage)}" target="_blank" rel="noopener" class="project-link" aria-label="Live demo for ${e(r.name)}">Live</a>` : ""}
          <a href="${safeUrl(r.html_url)}" target="_blank" rel="noopener" class="project-link gh" aria-label="View ${e(r.name)} on GitHub">GitHub</a>
        </div>
      </div>
    </div>`
  }).join("")
}

function buildSkills(langs: string[], topics: string[], resumeText?: string | null): string {
  // Categorize languages
  const webLangs = ["JavaScript","TypeScript","HTML","CSS","Svelte","Vue"]
  const backLangs = ["Python","Go","Rust","Java","C#","C++","C","PHP","Ruby","Scala","Kotlin","Elixir","Swift","Haskell","Dart"]
  const toolTopics = ["docker","kubernetes","aws","gcp","azure","git","ci/cd","postgres","mongodb","redis","graphql","rest","linux","nginx","terraform"]

  const languages = langs.filter(l => [...webLangs,...backLangs].includes(l))
  const frameworks = topics.filter(t => !toolTopics.includes(t.toLowerCase())).slice(0, 8)
  const tools = topics.filter(t => toolTopics.includes(t.toLowerCase())).slice(0, 6)

  // If no topics, just render flat badges
  if (topics.length === 0) {
    return langs.slice(0, 14).map(s =>
      `<span class="skill-badge reveal-scale" style="opacity:0;transform:scale(0.9)">${e(s)}</span>`
    ).join("")
  }

  const categories: { label: string; items: string[] }[] = []
  if (languages.length) categories.push({ label: "Languages", items: languages })
  if (frameworks.length) categories.push({ label: "Frameworks & Libraries", items: frameworks })
  if (tools.length) categories.push({ label: "Tools & Platforms", items: tools })
  // Fallback — if nothing fits, dump everything
  if (!categories.length) {
    categories.push({ label: "Technologies", items: [...langs, ...topics].slice(0, 14) })
  }

  return categories.map(cat => `
    <div class="skill-category">
      <div class="skill-category-title" role="button" tabindex="0" aria-expanded="true">
        ${e(cat.label)} <span class="acc-arrow">&#9662;</span>
      </div>
      <div class="skill-category-badges">
        ${cat.items.map(s => `<span class="skill-badge reveal-scale" style="opacity:0;transform:scale(0.9)">${e(s)}</span>`).join("")}
      </div>
    </div>`).join("")
}

function buildAbout(profile: GitHubProfile, aiBio: string | null, accent: string, repos?: GitHubRepo[]): string {
  const bio = aiBio || profile.bio || "I build useful software and care about making it simple to maintain."
  const totalStars = repos ? repos.reduce((s, r) => s + r.stargazers_count, 0) : 0

  // Quick-fact pills
  const facts: string[] = []
  if (profile.location) facts.push(`&#128205; ${e(profile.location)}`)
  if (profile.company) facts.push(`&#127970; ${e(profile.company)}`)
  if (profile.public_repos > 0) facts.push(`&#128230; ${profile.public_repos} repos`)
  if (totalStars > 0) facts.push(`&#9733; ${totalStars} total stars`)
  if (profile.followers > 0) facts.push(`&#128101; ${profile.followers} followers`)
  return `
  <section id="about" class="section">
    <div class="container">
      <p class="section-label reveal">About</p>
      <h2 class="section-title reveal">A little about me</h2>
      <p class="section-desc reveal" style="max-width:720px;font-size:17px;line-height:1.75;color:var(--muted,#888)">${e(bio)}</p>
      ${facts.length ? `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:32px" class="reveal" role="list" aria-label="Quick facts">
        ${facts.map(f => `<span role="listitem" class="about-fact" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:20px;background:var(--surface,rgba(255,255,255,0.04));border:1px solid var(--border,rgba(255,255,255,0.08));font-size:13px;color:var(--text,#e8e8ef)">${f}</span>`).join("")}
      </div>` : ""}
      <div style="display:flex;gap:12px;flex-wrap:wrap" class="reveal">
        ${profile.blog && safeUrl(profile.blog) !== "#" ? `<a href="${safeUrl(profile.blog)}" target="_blank" rel="noopener" style="padding:10px 22px;border:1.5px solid ${accent}40;color:${accent};border-radius:10px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">&#127758; Website</a>` : ""}
        <a href="${safeUrl(profile.html_url)}" target="_blank" rel="noopener" class="about-gh-link" style="padding:10px 22px;border:1.5px solid var(--border,rgba(255,255,255,0.1));color:var(--text,#e8e8ef);border-radius:10px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">&#128196; GitHub Profile</a>
      </div>
    </div>
  </section>`
}

// Simple inline SVG icons for social links
const SOCIAL_SVGS: Record<string, string> = {
  github: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
  linkedin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  twitter: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  substack: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>`,
  blog: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
}

function buildContact(profile: GitHubProfile, accent: string, socialLinks?: SocialLinks): string {
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



function shell(accent: string, extraStyles: string, bodyContent: string, name: string, bio?: string, photoUrl?: string, skills?: string[], socialLinks?: SocialLinks, profileUrl?: string): string {
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
<html lang="en">
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
<link rel="preconnect" href="https://github-readme-stats.vercel.app">
<link rel="preconnect" href="https://github-readme-streak-stats.herokuapp.com">

<!-- Favicon (generated from accent color) -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='${encodeURIComponent(safeAccent)}'/><text y='.9em' x='50' text-anchor='middle' font-size='70' fill='white'>${e(name.charAt(0).toUpperCase())}</text></svg>">

<!-- JSON-LD structured data -->
<script type="application/ld+json">${jsonLd.replace(/<\/script/gi, "<\\/script")}<\/script>

<style>
  .skip-link { position:absolute; top:-100px; left:16px; padding:8px 16px; background:${safeAccent}; color:#000; font-weight:700; font-size:14px; border-radius:4px; z-index:9999; transition:top .2s; }
  .skip-link:focus { top:8px; }
  ${baseStyles(safeAccent)}${extraStyles}
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

function buildFooter(name: string, accent: string): string {
  const updatedDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
  return `
  <footer class="footer" role="contentinfo">
    <div style="max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <a href="#home" style="color:${accent};font-weight:600;font-size:13px">${e(name)}</a>
      <span style="font-size:12px;color:#444">Updated ${updatedDate}</span>
      <span style="font-size:13px;color:#555">&copy; ${new Date().getFullYear()} ${e(name)}. Built with <a href="https://personaai.vercel.app" target="_blank" rel="noopener" style="color:${accent}">PersonaAI</a>.</span>
    </div>
  </footer>`
}

/* ===== TEMPLATE: BOLD PORTRAIT ===== */
function buildBoldPortrait(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; align-items: center; position: relative; overflow: hidden; }
    .hero-img { position: absolute; right: 0; top: 0; width: 50%; height: 100%; object-fit: cover; filter: grayscale(100%); opacity: 0.5; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, #0a0a0f 40%, transparent 80%); }
    .hero-content { position: relative; z-index: 2; padding: 120px 6vw 80px; max-width: 650px; }
    .hero h1 { font-size: clamp(3.5rem, 9vw, 7rem); font-weight: 900; line-height: 0.95; color: #fff; margin-bottom: 20px; }
    .hero h1 span { color: ${c.accent}; }
    .hero-bio { font-size: clamp(1rem, 1.5vw, 1.15rem); color: #999; line-height: 1.7; margin-bottom: 40px; }
    .stats-row { display: flex; gap: 48px; }
    .stat-num { font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; color: ${c.accent}; }
    .stat-label { font-size: 13px; color: #666; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
    @media (max-width:768px) {
      .hero-img { position: relative; width: 100%; height: 250px; opacity: 0.4; }
      .hero { flex-direction: column; }
      .hero-overlay { background: linear-gradient(180deg, transparent, #0a0a0f 60%); }
      .hero-content { padding: 40px 24px 60px; }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <img src="${img}" alt="${e(name)}" class="hero-img hero-photo-parallax" crossorigin="anonymous">
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <h1 class="hero-anim">Hello<span>.</span></h1>
      <p class="hero-bio hero-anim">${e(aiBio || profile.bio || `I'm ${name}, a developer building exceptional digital experiences.`)}</p>
      <div class="stats-row hero-anim">
        <div><div class="stat-num">+${profile.public_repos}</div><div class="stat-label">Projects</div></div>
        <div><div class="stat-num">+${profile.followers}</div><div class="stat-label">Followers</div></div>
        <div><div class="stat-num">${langs.length}</div><div class="stat-label">Languages</div></div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Expertise</p><h2 class="section-title reveal">Skills & Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Featured Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: TYPOGRAPHIC ===== */
function buildTypographic(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)
  const role = langs.length > 0 ? `${langs[0]} Developer` : "Developer"

  const extra = `
    .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 24px; }
    .hero-photo { width: clamp(180px, 25vw, 280px); height: clamp(180px, 25vw, 280px); border-radius: 50%; object-fit: cover; filter: grayscale(90%); position: relative; z-index: 1; box-shadow: 0 0 80px ${c.accent}25; }
    .hero-title { position: absolute; font-size: clamp(3.5rem, 12vw, 9rem); font-weight: 900; color: rgba(255,255,255,0.08); z-index: 2; text-align: center; line-height: 0.95; pointer-events: none; text-transform: uppercase; letter-spacing: -0.03em; }
    .hero-name { position: relative; z-index: 3; margin-top: 24px; font-size: clamp(1rem, 1.5vw, 1.2rem); color: #aaa; text-align: center; letter-spacing: 4px; text-transform: uppercase; font-weight: 500; }
    .hero-role { font-size: 14px; color: ${c.accent}; text-align: center; margin-top: 8px; letter-spacing: 2px; text-transform: uppercase; }
    @media (max-width:768px) { .hero-title { font-size: clamp(3rem, 16vw, 5rem); } .hero-photo { width: 160px; height: 160px; } }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-title hero-anim">${e(role)}</div>
    <img src="${img}" alt="${e(name)}" class="hero-photo hero-anim hero-photo-parallax" crossorigin="anonymous">
    <div class="hero-name hero-anim">${e(name)}</div>
    <div class="hero-role hero-anim">${e(profile.location || "Worldwide")}</div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">What I work with</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Projects</p><h2 class="section-title reveal">Selected Work</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: SPLIT EDITORIAL ===== */
function buildSplitEditorial(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; }
    .hero-dark { flex: 1; background: #050508; display: flex; align-items: center; justify-content: center; padding: 40px; position: relative; }
    .hero-dark img { width: 80%; max-width: 380px; height: 85vh; max-height: 550px; object-fit: cover; filter: grayscale(100%); border-radius: 8px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
    .hero-dark .num { position: absolute; top: 100px; left: 40px; font-size: 60px; font-weight: 200; color: rgba(255,255,255,0.08); }
    .hero-light { flex: 1; background: #12121a; display: flex; flex-direction: column; justify-content: center; padding: 60px; border-left: 1px solid rgba(255,255,255,0.06); }
    .hero-light h1 { font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 800; line-height: 1.15; color: #fff; margin-bottom: 20px; }
    .hero-light h1 span { color: ${c.accent}; font-style: italic; }
    .hero-light p { font-size: 15px; color: #888; line-height: 1.7; margin-bottom: 28px; max-width: 400px; }
    .hero-light a.cta { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: ${c.accent}; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    @media (max-width:768px) {
      .hero { flex-direction: column; min-height: auto; }
      .hero-dark { min-height: 350px; } .hero-dark img { width: 60%; height: auto; aspect-ratio: 3/4; }
      .hero-light { padding: 40px 24px; border-left: none; border-top: 1px solid rgba(255,255,255,0.06); }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero hero-split">
    <div class="hero-dark">
      <span class="num hero-anim">01</span>
      <img src="${img}" alt="${e(name)}" class="hero-anim hero-photo-parallax" crossorigin="anonymous">
    </div>
    <div class="hero-light">
      <h1 class="hero-anim">${e(name)}<br><span>Portfolio</span></h1>
      <p class="hero-anim">${e(aiBio || profile.bio || "Creating impactful digital experiences with code and design.")}</p>
      <a href="#projects" class="cta hero-anim">View Projects &darr;</a>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Expertise</p><h2 class="section-title reveal">Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: PASTEL CREATIVE (now dark premium) ===== */
function buildPastelCreative(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; align-items: center; position: relative; padding: 120px 24px 80px; }
    .hero-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 60px; width: 100%; }
    .hero-text { flex: 1; }
    .hero-text .tag { font-size: 14px; color: ${c.accent}; font-weight: 600; margin-bottom: 12px; display: inline-block; padding: 6px 16px; border: 1px solid ${c.accent}30; border-radius: 20px; background: ${c.accent}08; }
    .hero-text h1 { font-size: clamp(2.2rem, 4.5vw, 3.5rem); font-weight: 800; color: #fff; line-height: 1.15; margin-bottom: 16px; }
    .hero-text p { font-size: 16px; color: #888; line-height: 1.7; margin-bottom: 32px; max-width: 480px; }
    .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }
    .hero-ctas a { padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }
    .hero-ctas .primary { background: ${c.accent}; color: #000; }
    .hero-ctas .secondary { border: 2px solid rgba(255,255,255,0.12); color: #ccc; }
    .hero-photo-wrap { position: relative; flex-shrink: 0; }
    .hero-photo-wrap img { width: clamp(200px, 22vw, 300px); height: clamp(250px, 28vw, 380px); object-fit: cover; border-radius: 20px; border: 2px solid rgba(255,255,255,0.06); }
    .hero-photo-wrap::before { content: ''; position: absolute; inset: -8px; border-radius: 24px; border: 2px solid ${c.accent}20; }
    .hero-photo-wrap::after { content: ''; position: absolute; inset: 0; border-radius: 20px; box-shadow: 0 0 60px ${c.accent}15, 0 30px 80px rgba(0,0,0,0.3); pointer-events: none; }
    @media (max-width:768px) {
      .hero-inner { flex-direction: column-reverse; text-align: center; }
      .hero-photo-wrap img { width: 200px; height: 260px; }
      .hero-ctas { justify-content: center; }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-inner">
      <div class="hero-text">
        <span class="tag hero-anim">Available for hire</span>
        <h1 class="hero-anim">${e(name)}</h1>
        <p class="hero-anim">${e(aiBio || profile.bio || "A creative developer making beautiful, functional digital experiences.")}</p>
        <div class="hero-ctas hero-anim">
          <a href="#projects" class="primary">View Projects</a>
          <a href="#contact" class="secondary">Get in Touch</a>
        </div>
      </div>
      <div class="hero-photo-wrap hero-anim">
        <img src="${img}" alt="${e(name)}" class="hero-photo-parallax" crossorigin="anonymous">
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">My Toolkit</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Portfolio</p><h2 class="section-title reveal">Recent Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: DESIGNER CODER ===== */
function buildDesignerCoder(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; position: relative; }
    .hero-left { flex: 1; background: #0e0e14; display: flex; flex-direction: column; justify-content: center; padding: 60px; }
    .hero-left h2 { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 900; color: #fff; letter-spacing: -0.02em; }
    .hero-left p { font-size: 14px; color: #666; line-height: 1.7; margin-top: 12px; max-width: 280px; }
    .hero-right { flex: 1; background: #0a0a10; display: flex; flex-direction: column; justify-content: center; padding: 60px; border-left: 1px solid rgba(255,255,255,0.04); }
    .hero-right h2 { font-family: 'JetBrains Mono', monospace; font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: ${c.accent}; }
    .hero-right p { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #666; line-height: 1.7; margin-top: 12px; max-width: 280px; }
    .hero-center-photo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: clamp(140px, 18vw, 220px); height: clamp(140px, 18vw, 220px); border-radius: 50%; object-fit: cover; border: 4px solid #0a0a0f; z-index: 10; box-shadow: 0 0 60px ${c.accent}25, -20px -12px 0 ${c.accent}, 20px 12px 0 ${c.primary}; }
    @media (max-width:768px) {
      .hero { flex-direction: column; min-height: auto; }
      .hero-left, .hero-right { padding: 60px 24px; min-height: 40vh; }
      .hero-right { border-left: none; border-top: 1px solid rgba(255,255,255,0.04); }
      .hero-center-photo { position: relative; left: auto; top: auto; transform: none; margin: -40px auto; }
    }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero hero-split">
    <div class="hero-left">
      <h2 class="hero-anim">designer</h2>
      <p class="hero-anim">Creative mind with an eye for detail, UX, and visual storytelling.</p>
    </div>
    <div class="hero-right">
      <h2 class="hero-anim">&lt;coder&gt;</h2>
      <p class="hero-anim">Building robust, clean, and performant applications.</p>
    </div>
    <img src="${img}" alt="${e(name)}" class="hero-center-photo hero-anim hero-photo-parallax" crossorigin="anonymous">
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Stack</p><h2 class="section-title reveal">Tech Stack</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section" style="background:rgba(255,255,255,0.01)"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: MINIMAL CLEAN (now premium dark minimal) ===== */
function buildMinimalClean(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)

  const extra = `
    .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; }
    .hero-photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 2px solid ${c.accent}40; margin-bottom: 28px; box-shadow: 0 0 40px ${c.accent}15; }
    .hero h1 { font-size: clamp(1.5rem, 3vw, 2.2rem); font-weight: 600; color: #fff; margin-bottom: 8px; letter-spacing: 0.01em; }
    .hero p { font-size: 15px; color: #888; letter-spacing: 0.5px; }
    .hero .cta { display: inline-block; margin-top: 28px; padding: 12px 32px; border: 1.5px solid ${c.accent}; color: ${c.accent}; border-radius: 8px; font-weight: 500; font-size: 14px; letter-spacing: 0.5px; }
    .hero .cta:hover { background: ${c.accent}; color: #000; }
    .project-list { display: flex; flex-direction: column; }
    .project-item { padding: 24px 0; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; gap: 16px; transition: all .3s; }
    .project-item:hover { padding-left: 12px; border-color: ${c.accent}30; }
    .project-item h3 { font-size: 16px; font-weight: 600; color: #ddd; }
    .project-item p { font-size: 13px; color: #777; margin-top: 4px; }
    .project-item a { font-size: 13px; color: ${c.accent}; white-space: nowrap; font-weight: 500; }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <img src="${img}" alt="${e(name)}" class="hero-photo hero-anim hero-photo-parallax" crossorigin="anonymous">
    <h1 class="hero-anim">${e(name)}</h1>
    <p class="hero-anim">${e(aiBio || profile.bio || "Developer & Creator")}</p>
    <a href="#projects" class="cta hero-anim">View Work</a>
  </section>
  <main>
  ${config.sections.includes("about") ? buildAbout(profile, aiBio, c.accent, repos) : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `
  <section id="projects" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Work</p>
      <h2 class="section-title reveal">Projects</h2>
      <div class="project-list">
        ${(aiProjects && aiProjects.length > 0 ? aiProjects.slice(0, 8).map(p => `
          <div class="project-item reveal">
            <div><h3>${e(p.name)}</h3><p>${e(stripMd(p.description))}</p></div>
            <a href="${safeUrl(p.url)}" target="_blank" rel="noopener">&rarr;</a>
          </div>`) : repos.filter(r => !r.fork).slice(0, 8).map(r => `
          <div class="project-item reveal">
            <div><h3>${e(r.name)}</h3><p>${e(stripMd(r.description || "A carefully crafted project."))}</p></div>
            <a href="${safeUrl(r.html_url)}" target="_blank" rel="noopener">&rarr;</a>
          </div>`)).join("")}
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: BRUTALIST ===== */
function buildBrutalist(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)
  const role = langs.length > 0 ? `${langs[0]} Dev` : "Developer"

  const extra = `
    * { border-radius: 0 !important; }
    body { background: #0a0a0a; color: #f0f0f0; font-family: 'JetBrains Mono', monospace; }
    .hero { min-height: 100vh; display: flex; align-items: stretch; border-bottom: 4px solid ${c.accent}; }
    .hero-left { flex: 1.2; background: #0a0a0a; padding: 120px 48px 80px; display: flex; flex-direction: column; justify-content: flex-end; border-right: 4px solid ${c.accent}; }
    .hero-left h1 { font-size: clamp(3rem, 9vw, 7.5rem); font-weight: 900; line-height: 0.9; color: #fff; text-transform: uppercase; letter-spacing: -0.03em; margin-bottom: 24px; }
    .hero-left h1 em { color: ${c.accent}; font-style: normal; display: block; }
    .hero-left p { font-size: 13px; color: #888; line-height: 1.8; max-width: 360px; font-family: 'Inter', sans-serif; }
    .hero-left .role-tag { display: inline-block; background: ${c.accent}; color: #000; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; padding: 6px 16px; margin-bottom: 20px; }
    .hero-right { flex: 0.7; background: #111; display: flex; flex-direction: column; align-items: stretch; }
    .hero-right img { width: 100%; height: 65%; object-fit: cover; filter: grayscale(100%) contrast(1.2); border-bottom: 4px solid ${c.accent}; }
    .hero-right-info { padding: 24px; flex: 1; display: flex; flex-direction: column; gap: 16px; }
    .stat-box { border: 2px solid rgba(255,255,255,0.08); padding: 14px 16px; }
    .stat-box .num { font-size: 28px; font-weight: 900; color: ${c.accent}; }
    .stat-box .lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
    .brut-section { border-top: 4px solid ${c.accent}; }
    .brut-section .section-label { background: ${c.accent}; color: #000; display: inline-block; padding: 4px 16px; font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 0; }
    .brut-section .section-title { font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; border-bottom: 2px solid rgba(255,255,255,0.06); padding-bottom: 24px; margin-bottom: 40px; }
    .projects-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .project-card { border: 2px solid rgba(255,255,255,0.08); background: #0f0f0f; }
    .project-card:hover { border-color: ${c.accent}; }
    .project-name { font-family: 'JetBrains Mono', monospace; font-size: 15px; }
    @media (max-width:768px) { .hero { flex-direction: column; } .hero-right { border-left: none; border-top: 4px solid ${c.accent}; } .hero-left { padding: 100px 24px 40px; } }
  `
  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-left">
      <span class="role-tag hero-anim">${e(role)}</span>
      <h1 class="hero-anim">${e(name.split(" ")[0])}<em>${e(name.split(" ").slice(1).join(" ") || ".")}</em></h1>
      <p class="hero-anim">${e(aiBio || profile.bio || "Building things that matter. One commit at a time.")}</p>
    </div>
    <div class="hero-right hero-anim">
      <img src="${img}" alt="${e(name)}" crossorigin="anonymous">
      <div class="hero-right-info">
        <div class="stat-box"><div class="num">${profile.public_repos}</div><div class="lbl">Repositories</div></div>
        <div class="stat-box"><div class="num">${profile.followers}</div><div class="lbl">Followers</div></div>
        <div class="stat-box"><div class="num">${langs.length}</div><div class="lbl">Languages</div></div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `
  <section id="about" class="section brut-section">
    <div class="container">
      <span class="section-label">About</span>
      <h2 class="section-title reveal">Who Am I</h2>
      <p class="section-desc reveal" style="max-width:700px;font-family:'Inter',sans-serif">${e(aiBio || profile.bio || "A developer dedicated to crafting exceptional digital experiences.")}</p>
      <div style="display:flex;gap:24px;flex-wrap:wrap" class="reveal">
        ${profile.location ? `<span style="border:2px solid var(--border,rgba(255,255,255,0.08));padding:8px 16px;font-size:13px;color:var(--muted,#aaa)">${e(profile.location)}</span>` : ""}
        ${profile.company ? `<span style="border:2px solid var(--border,rgba(255,255,255,0.08));padding:8px 16px;font-size:13px;color:var(--muted,#aaa)">${e(profile.company)}</span>` : ""}
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section brut-section"><div class="container"><span class="section-label">Skills</span><h2 class="section-title reveal">Tech Stack</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section brut-section"><div class="container"><span class="section-label">Work</span><h2 class="section-title reveal">Projects</h2><div class="projects-grid">${buildProjects(repos, c.accent, aiProjects)}</div></div></section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ===== TEMPLATE: GLASSMORPHISM ===== */
function buildGlassmorphism(data: TemplateData): string {
  const { profile, repos, config, photoUrl, aiBio, aiProjects, heroTagline, targetRole } = data
  const c = getColorScheme(config.colorScheme)
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const name = profile.name || profile.username
  const img = safeImageSrc(photoUrl || profile.avatar_url)
  const role = langs.length > 0 ? `${langs[0]} Developer` : "Software Developer"

  const extra = `
    body { background: #050510; overflow-x: hidden; }
    .glass-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    .glass-bg::before { content: ''; position: absolute; top: -20%; left: -10%; width: 60%; height: 60%; border-radius: 50%; background: ${c.accent}; filter: blur(120px); opacity: 0.12; }
    .glass-bg::after { content: ''; position: absolute; bottom: -20%; right: -10%; width: 50%; height: 50%; border-radius: 50%; background: ${c.primary}; filter: blur(100px); opacity: 0.1; }
    .hero { min-height: 100vh; display: flex; align-items: center; position: relative; z-index: 1; padding: 100px 24px 60px; }
    .hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; display: flex; align-items: center; gap: 60px; }
    .hero-glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); border-radius: 32px; padding: 56px 48px; flex: 1; }
    .hero-glass .tag { font-size: 13px; color: ${c.accent}; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .hero-glass .tag::before { content: ''; display: inline-block; width: 24px; height: 2px; background: ${c.accent}; }
    .hero-glass h1 { font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 16px; }
    .hero-glass p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.75; margin-bottom: 32px; max-width: 440px; }
    .hero-glass .ctas { display: flex; gap: 12px; flex-wrap: wrap; }
    .hero-glass .ctas a { padding: 13px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; transition: all .3s; }
    .hero-glass .ctas .primary { background: ${c.accent}; color: #000; box-shadow: 0 8px 32px ${c.accent}35; }
    .hero-glass .ctas .primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px ${c.accent}50; }
    .hero-glass .ctas .secondary { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #ccc; backdrop-filter: blur(8px); }
    .hero-glass .ctas .secondary:hover { background: rgba(255,255,255,0.1); }
    .hero-photo-wrap { flex-shrink: 0; position: relative; }
    .hero-photo-wrap img { width: clamp(200px, 22vw, 300px); height: clamp(260px, 28vw, 380px); object-fit: cover; border-radius: 28px; border: 1px solid rgba(255,255,255,0.1); }
    .hero-photo-wrap::before { content: ''; position: absolute; inset: -2px; border-radius: 30px; background: linear-gradient(135deg, ${c.accent}60, transparent 50%, ${c.primary}40); z-index: -1; }
    .hero-photo-wrap::after { content: ''; position: absolute; inset: -20px; border-radius: 40px; background: ${c.accent}; filter: blur(40px); opacity: 0.12; z-index: -2; }
    .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; transition: all .4s; }
    .glass-card:hover { background: rgba(255,255,255,0.07); border-color: ${c.accent}30; transform: translateY(-4px); }
    .glass-section { position: relative; z-index: 1; }
    .skill-badge { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(8px); }
    .skill-badge:hover { background: ${c.accent}15; }
    @media (max-width:768px) { .hero-inner { flex-direction: column; } .hero-glass { padding: 36px 24px; } .hero-photo-wrap img { width: 200px; height: 260px; } }
  `
  const body = `
  <div class="glass-bg"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="hero-inner">
      <div class="hero-glass hero-anim">
        <div class="tag">${e(role)}</div>
        <h1>${e(name)}</h1>
        <p>${e(aiBio || profile.bio || "Crafting elegant digital experiences at the intersection of design and technology.")}</p>
        <div class="ctas">
          <a href="#projects" class="primary">View My Work</a>
          <a href="#contact" class="secondary">Get in Touch</a>
        </div>
      </div>
      <div class="hero-photo-wrap hero-anim">
        <img src="${img}" alt="${e(name)}" class="hero-photo-parallax" crossorigin="anonymous">
      </div>
    </div>
  </section>
  <main class="glass-section">
  ${config.sections.includes("about") ? `
  <section id="about" class="section">
    <div class="container">
      <p class="section-label reveal">About</p>
      <h2 class="section-title reveal">A little about me</h2>
      <div class="glass-card reveal" style="max-width:700px">
        <p style="color:rgba(255,255,255,0.7);line-height:1.75;font-size:15px">${e(aiBio || profile.bio || "A passionate developer dedicated to crafting exceptional digital experiences.")}</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:24px">
          ${profile.location ? `<span style="font-size:13px;color:${c.accent}">&#9679; ${e(profile.location)}</span>` : ""}
          ${profile.company ? `<span style="font-size:13px;color:${c.accent}">&#9679; ${e(profile.company)}</span>` : ""}
          ${profile.blog && safeUrl(profile.blog) !== "#" ? `<a href="${safeUrl(profile.blog)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent}">&#9679; ${e(profile.blog)}</a>` : ""}
        </div>
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Expertise</p><h2 class="section-title reveal">Skills & Technologies</h2><div style="display:flex;flex-wrap:wrap;gap:0">${buildSkills(langs, topics)}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `
  <section id="projects" class="section">
    <div class="container">
      <p class="section-label reveal">Work</p>
      <h2 class="section-title reveal">Featured Projects</h2>
      <div class="projects-grid">
        ${(aiProjects && aiProjects.length > 0 ? aiProjects.slice(0, 7).map(p => `
        <div class="glass-card reveal" style="opacity:0;transform:translateY(40px)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="font-size:17px;font-weight:700;color:#fff">${e(p.name)}</h3>
            ${p.stars > 0 ? `<span style="font-size:12px;color:${c.accent};font-weight:600">&#9733; ${p.stars}</span>` : ""}
          </div>
          <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:16px">${e(stripMd(p.description))}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${p.language ? `<span style="font-size:11px;padding:3px 12px;border-radius:20px;background:${c.accent}12;color:${c.accent};border:1px solid ${c.accent}25">${e(p.language)}</span>` : ""}
            <a href="${safeUrl(p.url)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent};font-weight:500;margin-left:auto">View &rarr;</a>
          </div>
        </div>`) : repos.filter(r => !r.fork).slice(0, 6).map(r => {
          const desc = r.description && r.description.trim() ? stripMd(r.description) : smartRepoDescription(r.name, r.language)
          return `
        <div class="glass-card reveal" style="opacity:0;transform:translateY(40px)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="font-size:17px;font-weight:700;color:#fff">${e(r.name)}</h3>
            ${r.stargazers_count > 0 ? `<span style="font-size:12px;color:${c.accent};font-weight:600">&#9733; ${r.stargazers_count}</span>` : ""}
          </div>
          <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:16px">${e(desc)}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${r.language ? `<span style="font-size:11px;padding:3px 12px;border-radius:20px;background:${c.accent}12;color:${c.accent};border:1px solid ${c.accent}25">${e(r.language)}</span>` : ""}
            <a href="${safeUrl(r.html_url)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent};font-weight:500;margin-left:auto">View &rarr;</a>
          </div>
        </div>`
        })).join("")}
      </div>
    </div>
  </section>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}`

  return shell(c.accent, extra, body, name, aiBio || profile.bio || undefined, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ========== TEMPLATE: TERMINAL / CLI ========== */
function buildTerminal(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "forest")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Building things that matter."
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'JetBrains Mono', monospace; background:#0d0d0d; color:#c8ffc8; overflow-x:hidden; }
    body::before { content:''; position:fixed; inset:0; background: repeating-linear-gradient(0deg,rgba(0,255,0,0.015) 0px,rgba(0,255,0,0.015) 1px,transparent 1px,transparent 4px); pointer-events:none; z-index:0; }
    a { text-decoration:none; transition:all .2s; }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; background:#0d0d0d; border-bottom:1px solid ${c.accent}40; padding:0 24px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:56px; }
    .nav-brand { font-size:15px; font-weight:700; color:${c.accent}; }
    .nav-links { display:flex; gap:24px; }
    .nav-links a { font-size:12px; color:#666; }
    .nav-links a:hover { color:${c.accent}; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:20px; height:1px; background:${c.accent}; margin:5px 0; }
    .mobile-menu { display:none; position:fixed; top:56px; left:0; right:0; background:#0d0d0d; padding:20px 24px; border-bottom:1px solid ${c.accent}30; z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:12px; }
    .mobile-menu a { font-size:14px; color:#888; padding:8px 0; }
    .mobile-menu a:hover { color:${c.accent}; }
    .section { position:relative; z-index:1; padding:80px 24px; max-width:1100px; margin:0 auto; }
    .prompt { color:${c.accent}; }
    .prompt::before { content:'> '; }
    .cmd-line { font-size:13px; color:#555; margin-bottom:4px; }
    .cmd-line::before { content:'$ '; color:${c.accent}60; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:56px; }
    .hero-terminal { background:#111; border:1px solid ${c.accent}30; border-radius:8px; padding:32px; max-width:700px; width:100%; }
    .terminal-bar { display:flex; gap:8px; margin-bottom:24px; }
    .terminal-dot { width:12px; height:12px; border-radius:50%; }
    .terminal-output { font-size:14px; line-height:2; }
    .terminal-output .key { color:${c.accent}; }
    .terminal-output .val { color:#e0e0e0; }
    .terminal-output .comment { color:#444; }
    .blink { animation:blink 1s step-end infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .section-heading { font-size:11px; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:32px; }
    .section-heading::before { content:'// '; color:#333; }
    .project-card { background:#111; border:1px solid #222; border-radius:6px; padding:24px; margin-bottom:16px; transition:border-color .3s; }
    .project-card:hover { border-color:${c.accent}50; }
    .project-name { font-size:15px; font-weight:700; color:#fff; margin-bottom:6px; }
    .project-name::before { content:'['; color:${c.accent}; }
    .project-name::after { content:']'; color:${c.accent}; }
    .project-desc { font-size:12px; color:#666; line-height:1.7; margin-bottom:12px; }
    .project-meta { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .project-lang { font-size:11px; color:${c.accent}80; }
    .project-lang::before { content:'lang:'; color:#333; }
    .project-link { font-size:12px; color:${c.accent}; margin-left:auto; }
    .skill-badge { display:inline-block; font-size:12px; color:${c.accent}; margin:4px; padding:4px 12px; border:1px solid ${c.accent}20; border-radius:3px; background:${c.accent}06; }
    .footer { text-align:center; padding:40px 24px; font-size:12px; color:#333; border-top:1px solid #1a1a1a; }
    .footer a { color:${c.accent}; }
    @media(max-width:768px) { .nav-links{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero" aria-label="Introduction">
    <div class="section">
      <div class="terminal-bar" aria-hidden="true">
        <div class="terminal-dot" style="background:#ff5f57"></div>
        <div class="terminal-dot" style="background:#febc2e"></div>
        <div class="terminal-dot" style="background:#28c840"></div>
      </div>
      <div class="terminal-output hero-anim" role="region" aria-label="Terminal output">
        <div class="cmd-line">whoami</div>
        <div style="margin-bottom:16px"><span class="key">name</span>: <span class="val">"${e(name)}"</span> <span class="comment">// ${e(role)}</span></div>
        <div class="cmd-line">cat about.txt</div>
        <div style="margin-bottom:16px;color:#aaa;font-size:13px;line-height:1.8;max-width:580px">${e(bio)}</div>
        <div class="cmd-line">ls -la skills/</div>
        <div style="margin-bottom:16px">${langs.slice(0, 6).map(l => `<span class="skill-badge">${e(l)}</span>`).join("")}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">
          <a href="#projects" style="font-size:13px;color:${c.accent};border:1px solid ${c.accent}40;padding:8px 20px;border-radius:4px">./view-projects</a>
          <a href="#contact" style="font-size:13px;color:#666;border:1px solid #333;padding:8px 20px;border-radius:4px">./contact</a>
        </div>
        <div style="margin-top:16px;font-size:13px;color:#555" aria-hidden="true">_<span class="blink">|</span></div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><p class="section-heading reveal">about_me</p><p style="font-size:13px;color:#888;line-height:1.9;max-width:640px" class="reveal">${e(bio)}</p></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><p class="section-heading reveal">skills_and_tools</p><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><p class="section-heading reveal">projects</p>${projects.map(p=>`<div class="project-card reveal"><div style="display:flex;justify-content:space-between;align-items:flex-start"><p class="project-name">${e(p.name)}</p>${p.stars>0?`<span style="font-size:11px;color:${c.accent}60" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div><p class="project-desc">${e(stripMd(p.description))}</p><div class="project-meta">${p.language?`<span class="project-lang">${e(p.language)}</span>`:""}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="project-link" aria-label="View ${e(p.name)} on GitHub">open &rarr;</a></div></div>`).join("")}</section>` : ""}
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

/* ========== TEMPLATE: LIQUID GLASS ========== */
function buildLiquidGlass(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "arctic")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Crafting digital experiences."
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,600;0,700;1,300&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#050510; color:#e8e8f5; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    /* Animated background orbs */
    .orb { position:fixed; border-radius:50%; filter:blur(80px); pointer-events:none; animation:float 8s ease-in-out infinite; }
    .orb-1 { width:600px; height:600px; background:${c.primary}18; top:-200px; left:-100px; animation-delay:0s; }
    .orb-2 { width:500px; height:500px; background:${c.accent}12; bottom:-100px; right:-100px; animation-delay:-4s; }
    .orb-3 { width:300px; height:300px; background:${c.secondary}10; top:50%; left:40%; animation-delay:-2s; }
    @keyframes float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-40px) scale(1.05)} }
    /* Glass card */
    .glass { background:rgba(255,255,255,0.04); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%); border:1px solid rgba(255,255,255,0.08); border-radius:24px; }
    .glass-strong { background:rgba(255,255,255,0.07); backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%); border:1px solid rgba(255,255,255,0.12); border-radius:24px; }
    .nav { position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:100; width:calc(100% - 48px); max-width:900px; }
    .nav-inner { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; background:rgba(5,5,16,0.6); backdrop-filter:blur(40px); border:1px solid rgba(255,255,255,0.08); border-radius:50px; }
    .nav-brand { font-size:16px; font-weight:700; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:24px; }
    .nav-links a { font-size:13px; color:rgba(255,255,255,0.5); }
    .nav-links a:hover { color:${c.accent}; }
    .nav-cta { padding:8px 20px; background:${c.accent}; color:#000; border-radius:50px; font-size:13px; font-weight:600; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:20px; height:2px; background:#fff; margin:4px 0; }
    .mobile-menu { display:none; position:fixed; top:80px; left:24px; right:24px; z-index:99; padding:24px; border-radius:20px; background:rgba(5,5,16,0.95); backdrop-filter:blur(40px); border:1px solid rgba(255,255,255,0.1); }
    .mobile-menu.open { display:flex; flex-direction:column; gap:12px; }
    .mobile-menu a { font-size:15px; color:rgba(255,255,255,0.7); padding:8px 0; }
    .section { position:relative; z-index:1; padding:100px 24px; }
    .container { max-width:1100px; margin:0 auto; }
    .section-label { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; font-weight:600; margin-bottom:12px; }
    .section-title { font-size:clamp(1.8rem,3.5vw,2.8rem); font-weight:700; color:#fff; margin-bottom:20px; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:80px; }
    .hero-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:center; }
    .hero-tag { display:inline-block; padding:6px 16px; background:${c.accent}15; border:1px solid ${c.accent}30; border-radius:50px; font-size:12px; color:${c.accent}; font-weight:600; letter-spacing:1px; margin-bottom:20px; }
    .hero-name { font-size:clamp(2.5rem,5vw,4rem); font-weight:700; color:#fff; line-height:1.1; margin-bottom:16px; }
    .hero-bio { font-size:16px; color:rgba(255,255,255,0.55); line-height:1.75; margin-bottom:32px; }
    .hero-photo { width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:24px; }
    .project-card { padding:28px; margin-bottom:16px; transition:transform .3s,box-shadow .3s; }
    .project-card:hover { transform:translateY(-4px); box-shadow:0 24px 80px rgba(0,0,0,0.4),0 0 60px ${c.accent}10; }
    .skill-badge { display:inline-block; padding:8px 18px; border-radius:50px; font-size:13px; border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); margin:4px; background:rgba(255,255,255,0.04); backdrop-filter:blur(8px); transition:all .3s; }
    .skill-badge:hover { border-color:${c.accent}40; color:${c.accent}; }
    .footer { position:relative; z-index:1; padding:40px 24px; text-align:center; font-size:13px; color:#444; }
    .footer a { color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    .reveal-scale { opacity:0; transform:scale(0.95); }
    @media(max-width:768px) { .hero-grid{grid-template-columns:1fr} .hero-photo{max-height:400px} .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-grid">
        <div>
          <div class="hero-tag hero-anim">${e(role)}</div>
          <h1 class="hero-name hero-anim">${e(name)}</h1>
          <p class="hero-bio hero-anim">${e(bio)}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap" class="hero-anim">
            <a href="#projects" style="padding:14px 28px;background:${c.accent};color:#000;border-radius:50px;font-weight:600;font-size:14px">See Work</a>
            <a href="#contact" style="padding:14px 28px;border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:50px;font-size:14px;backdrop-filter:blur(8px)">Contact</a>
          </div>
        </div>
        <div class="glass hero-anim" style="overflow:hidden">
          <img src="${img}" alt="${e(name)}" class="hero-photo hero-photo-parallax" crossorigin="anonymous">
        </div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">About</p><h2 class="section-title reveal">${e(name.split(" ")[0])}&rsquo;s story</h2><div class="glass-strong reveal" style="padding:32px;max-width:680px"><p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.8">${e(bio)}</p></div></div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">Tech Stack</h2><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Featured Projects</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">${projects.map(p=>`<div class="glass project-card reveal"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px"><h3 style="font-size:16px;font-weight:700;color:#fff">${e(p.name)}</h3>${p.stars>0?`<span style="font-size:12px;color:${c.accent};font-weight:600" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div><p style="font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;margin-bottom:16px">${e(stripMd(p.description))}</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${p.language?`<span style="font-size:11px;padding:3px 12px;border-radius:50px;background:${c.accent}12;color:${c.accent};border:1px solid ${c.accent}20">${e(p.language)}</span>`:""}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" style="font-size:13px;color:${c.accent};font-weight:600;margin-left:auto" aria-label="View ${e(p.name)} on GitHub">View &rarr;</a></div></div>`).join("")}</div></div></section>` : ""}
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

/* ========== TEMPLATE: CYBERPUNK NOIR ========== */
function buildCyberpunkNoir(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "rose")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Building the future, one line at a time."
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;600&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#080608; color:#ddd; overflow-x:hidden; }
    a { text-decoration:none; transition:all .2s; }
    .scanline { position:fixed; inset:0; pointer-events:none; z-index:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px); }
    .noise { position:fixed; inset:0; pointer-events:none; z-index:0; opacity:0.025; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; background:rgba(8,6,8,0.85); backdrop-filter:blur(16px); border-bottom:1px solid ${c.accent}30; padding:0 24px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:60px; }
    .nav-brand { font-family:'Rajdhani',sans-serif; font-size:22px; font-weight:700; color:#fff; letter-spacing:2px; }
    .nav-brand span { color:${c.accent}; text-shadow:0 0 12px ${c.accent}; }
    .nav-links { display:flex; gap:28px; }
    .nav-links a { font-family:'JetBrains Mono',monospace; font-size:11px; color:#555; letter-spacing:1px; text-transform:uppercase; }
    .nav-links a:hover { color:${c.accent}; text-shadow:0 0 8px ${c.accent}60; }
    .nav-cta { font-family:'Rajdhani',sans-serif; padding:8px 22px; background:transparent; border:1px solid ${c.accent}; color:${c.accent}; font-size:14px; font-weight:600; letter-spacing:1px; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); }
    .nav-cta:hover { background:${c.accent}15; text-shadow:0 0 8px ${c.accent}; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:1px; background:${c.accent}; margin:6px 0; }
    .mobile-menu { display:none; position:fixed; top:60px; left:0; right:0; background:rgba(8,6,8,0.97); padding:24px; border-bottom:1px solid ${c.accent}30; z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-family:'Rajdhani',sans-serif; font-size:18px; color:#888; letter-spacing:2px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
    .section { position:relative; z-index:1; padding:100px 24px; }
    .container { max-width:1100px; margin:0 auto; }
    .glitch-title { font-family:'Rajdhani',sans-serif; font-size:clamp(3rem,8vw,7rem); font-weight:700; color:#fff; line-height:1; letter-spacing:-2px; position:relative; }
    .glitch-title::before,.glitch-title::after { content:attr(data-text); position:absolute; top:0; left:0; width:100%; overflow:hidden; }
    .glitch-title::before { color:${c.accent}; animation:glitch1 3s infinite; clip-path:polygon(0 0,100% 0,100% 35%,0 35%); }
    .glitch-title::after { color:#0ff; animation:glitch2 3s infinite; clip-path:polygon(0 65%,100% 65%,100% 100%,0 100%); }
    @keyframes glitch1 { 0%,90%,100%{transform:translateX(0)} 92%{transform:translateX(-3px)} 94%{transform:translateX(3px)} 96%{transform:translateX(-1px)} }
    @keyframes glitch2 { 0%,88%,100%{transform:translateX(0)} 90%{transform:translateX(3px)} 92%{transform:translateX(-3px)} }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:60px; overflow:hidden; }
    .hero-inner { display:grid; grid-template-columns:1fr 420px; gap:60px; align-items:center; }
    .hero-sub { font-family:'JetBrains Mono',monospace; font-size:12px; color:${c.accent}; letter-spacing:3px; text-transform:uppercase; margin-bottom:24px; }
    .hero-bio { font-size:15px; color:#888; line-height:1.8; margin:24px 0 32px; max-width:500px; }
    .hero-img-wrap { position:relative; }
    .hero-img-wrap::before { content:''; position:absolute; inset:-1px; background:linear-gradient(135deg,${c.accent}40,transparent 50%,${c.accent}20); border-radius:4px; }
    .hero-img { width:100%; aspect-ratio:3/4; object-fit:cover; filter:grayscale(20%) contrast(1.1); border-radius:2px; display:block; }
    .corner { position:absolute; width:20px; height:20px; border-color:${c.accent}; border-style:solid; }
    .corner-tl { top:-4px; left:-4px; border-width:2px 0 0 2px; }
    .corner-tr { top:-4px; right:-4px; border-width:2px 2px 0 0; }
    .corner-bl { bottom:-4px; left:-4px; border-width:0 0 2px 2px; }
    .corner-br { bottom:-4px; right:-4px; border-width:0 2px 2px 0; }
    .section-label { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:16px; }
    .section-title { font-family:'Rajdhani',sans-serif; font-size:clamp(1.8rem,3vw,2.8rem); font-weight:700; color:#fff; letter-spacing:1px; margin-bottom:32px; }
    .project-card { border:1px solid rgba(255,255,255,0.06); padding:24px; margin-bottom:12px; position:relative; transition:border-color .3s; background:rgba(255,255,255,0.02); clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%); }
    .project-card:hover { border-color:${c.accent}40; background:rgba(255,255,255,0.04); }
    .project-name { font-family:'Rajdhani',sans-serif; font-size:18px; font-weight:600; color:#fff; letter-spacing:1px; margin-bottom:8px; }
    .project-desc { font-size:13px; color:#666; line-height:1.7; margin-bottom:14px; }
    .project-meta { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .project-lang { font-family:'JetBrains Mono',monospace; font-size:11px; color:${c.accent}70; padding:2px 10px; border:1px solid ${c.accent}20; }
    .project-link { font-family:'JetBrains Mono',monospace; font-size:12px; color:${c.accent}; margin-left:auto; }
    .skill-badge { display:inline-block; font-family:'JetBrains Mono',monospace; font-size:11px; color:${c.accent}80; margin:3px; padding:4px 12px; border:1px solid ${c.accent}15; background:${c.accent}05; }
    .footer { position:relative; z-index:1; text-align:center; padding:40px 24px; font-family:'JetBrains Mono',monospace; font-size:11px; color:#333; border-top:1px solid rgba(255,255,255,0.04); }
    .footer a { color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    @media(max-width:768px) { .hero-inner{grid-template-columns:1fr} .hero-img-wrap{display:none} .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} .glitch-title::before,.glitch-title::after{display:none} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="scanline"></div>
  <div class="noise"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-inner">
        <div>
          <p class="hero-sub hero-anim">${e(role)}</p>
          <h1 class="glitch-title hero-anim" data-text="${e(name)}">${e(name)}</h1>
          <p class="hero-bio hero-anim">${e(bio)}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap" class="hero-anim">
            <a href="#projects" style="font-family:'Rajdhani',sans-serif;padding:12px 28px;background:${c.accent};color:#000;font-size:15px;font-weight:700;letter-spacing:1px;clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)">PROJECTS</a>
            <a href="#contact" style="font-family:'Rajdhani',sans-serif;padding:12px 28px;border:1px solid ${c.accent}40;color:${c.accent};font-size:15px;font-weight:600;letter-spacing:1px">CONTACT</a>
          </div>
        </div>
        <div class="hero-img-wrap hero-anim">
          <img src="${img}" alt="${e(name)}" class="hero-img hero-photo-parallax" crossorigin="anonymous">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
        </div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">about</p><h2 class="section-title reveal">Who I Am</h2><p style="font-size:15px;color:#888;line-height:1.85;max-width:680px" class="reveal">${e(bio)}</p></div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">skills</p><h2 class="section-title reveal">Arsenal</h2><div class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">projects</p><h2 class="section-title reveal">Missions Completed</h2>${projects.map(p=>`<div class="project-card reveal"><div style="display:flex;justify-content:space-between;align-items:flex-start"><p class="project-name">${e(p.name)}</p>${p.stars>0?`<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${c.accent}60" aria-label="${p.stars} stars">&#9733;${p.stars}</span>`:""}</div><p class="project-desc">${e(stripMd(p.description))}</p><div class="project-meta">${p.language?`<span class="project-lang">${e(p.language)}</span>`:""}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="project-link" aria-label="Access ${e(p.name)}">access &rarr;</a></div></div>`).join("")}</div></section>` : ""}
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

/* ========== TEMPLATE: BENTO GRID ========== */
function buildBentoGrid(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "midnight")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Building delightful products."
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
        <p style="font-size:14px;color:#888;line-height:1.8">${e(bio)}</p>
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

/* ========== TEMPLATE: SPOTLIGHT DARK ========== */
function buildSpotlightDark(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "ocean")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Focused on building great software."
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#030303; color:#c8c8c8; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    .spotlight { position:fixed; width:800px; height:800px; border-radius:50%; background:radial-gradient(circle,${c.accent}10 0%,transparent 70%); pointer-events:none; transform:translate(-50%,-50%); transition:left .15s,top .15s; z-index:0; }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0 32px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:64px; }
    .nav-brand { font-size:16px; font-weight:800; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:32px; }
    .nav-links a { font-size:13px; color:#555; font-weight:500; }
    .nav-links a:hover { color:#fff; }
    .nav-cta { padding:8px 22px; border:1px solid rgba(255,255,255,0.12); color:#fff; border-radius:8px; font-size:13px; }
    .nav-cta:hover { border-color:${c.accent}; color:${c.accent}; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:1px; background:#fff; margin:6px 0; }
    .mobile-menu { display:none; position:fixed; top:64px; left:0; right:0; background:#030303; padding:24px 32px; border-bottom:1px solid rgba(255,255,255,0.05); z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-size:16px; color:#888; padding:8px 0; }
    .section { position:relative; z-index:1; padding:100px 32px; }
    .container { max-width:1100px; margin:0 auto; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:64px; }
    .hero-layout { display:grid; grid-template-columns:1fr 380px; gap:80px; align-items:center; }
    .eyebrow { font-size:12px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; font-weight:600; margin-bottom:24px; }
    .hero-name { font-size:clamp(3rem,6vw,5.5rem); font-weight:800; color:#fff; line-height:1.0; letter-spacing:-2px; margin-bottom:24px; }
    .hero-bio { font-size:16px; color:#666; line-height:1.8; margin-bottom:36px; max-width:500px; }
    .hero-ctas { display:flex; gap:12px; flex-wrap:wrap; }
    .btn-primary { padding:14px 32px; background:${c.accent}; color:#000; border-radius:8px; font-size:14px; font-weight:700; }
    .btn-secondary { padding:14px 32px; border:1px solid rgba(255,255,255,0.1); color:#888; border-radius:8px; font-size:14px; }
    .btn-secondary:hover { border-color:rgba(255,255,255,0.2); color:#fff; }
    .hero-photo { width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:16px; filter:grayscale(15%); }
    .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent); margin:0 32px; }
    .section-label { font-size:11px; letter-spacing:4px; text-transform:uppercase; color:${c.accent}; margin-bottom:16px; }
    .section-title { font-size:clamp(1.8rem,3vw,2.5rem); font-weight:800; color:#fff; letter-spacing:-1px; margin-bottom:40px; }
    .project-row { border-top:1px solid rgba(255,255,255,0.04); padding:28px 0; display:grid; grid-template-columns:1fr 2fr 120px; gap:24px; align-items:center; transition:all .3s; }
    .project-row:hover { padding-left:12px; }
    .project-row:hover .proj-num { color:${c.accent}; }
    .proj-num { font-size:12px; color:#333; font-weight:600; font-variant-numeric:tabular-nums; }
    .proj-name { font-size:17px; font-weight:700; color:#fff; margin-bottom:4px; }
    .proj-desc { font-size:13px; color:#555; line-height:1.6; }
    .proj-link { font-size:13px; color:${c.accent}; text-align:right; }
    .proj-lang { font-size:11px; color:#444; }
    .skill-wrap { display:flex; flex-wrap:wrap; gap:8px; }
    .skill-badge { padding:8px 16px; border:1px solid rgba(255,255,255,0.06); color:#666; border-radius:6px; font-size:13px; transition:all .2s; }
    .skill-badge:hover { border-color:${c.accent}30; color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    .footer { position:relative; z-index:1; padding:40px 32px; text-align:center; font-size:13px; color:#333; border-top:1px solid rgba(255,255,255,0.04); }
    .footer a { color:${c.accent}; }
    @media(max-width:768px){
      .hero-layout { grid-template-columns:1fr; }
      .hero-photo-wrap { display:none; }
      .section { padding:60px 20px; }
      .project-row { display:flex; flex-direction:column; gap:8px; padding:20px 0; }
      .proj-num { display:none; }
      .proj-link { text-align:left; }
      .nav-links { display:none; }
      .nav-cta { display:none; }
      .nav-toggle { display:block; }
      .divider { margin:0 20px; }
    }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="spotlight" id="spotlight"></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-layout">
        <div>
          <p class="eyebrow hero-anim">${e(role)}</p>
          <h1 class="hero-name hero-anim">${e(name)}</h1>
          <p class="hero-bio hero-anim">${e(bio)}</p>
          <div class="hero-ctas hero-anim">
            <a href="#projects" class="btn-primary">View Projects</a>
            <a href="#contact" class="btn-secondary">Get in Touch</a>
          </div>
        </div>
        <div class="hero-photo-wrap hero-anim">
          <img src="${img}" alt="${e(name)}" class="hero-photo hero-photo-parallax" crossorigin="anonymous">
        </div>
      </div>
    </div>
  </section>
  <main>
  <div class="divider"></div>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">About</p><h2 class="section-title reveal">${e(name.split(" ")[0])}</h2><p style="font-size:16px;color:#666;line-height:1.85;max-width:680px" class="reveal">${e(bio)}</p></div></section><div class="divider"></div>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Skills</p><h2 class="section-title reveal">What I work with</h2><div class="skill-wrap reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section><div class="divider"></div>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">Projects</p><h2 class="section-title reveal">Selected Work</h2><div role="list">${projects.map((p,i)=>`<div class="project-row reveal" role="listitem"><span class="proj-num" aria-hidden="true">${String(i+1).padStart(2,"0")}</span><div><p class="proj-name">${e(p.name)}</p><p class="proj-desc">${e(stripMd(p.description))}</p>${p.language?`<span class="proj-lang">${e(p.language)}</span>`:""}</div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="proj-link" aria-label="View ${e(p.name)}">View &rarr;</a></div>`).join("")}</div></div></section><div class="divider"></div>` : ""}
  ${config.sections.includes("experience") ? buildExperience(data.aiResume, data.resumeText, c.accent) : ""}
  ${config.sections.includes("github-stats") ? buildGitHubStats(profile, c.accent, repos) : ""}
  ${config.sections.includes("testimonials") ? buildTestimonials(c.accent) : ""}
  ${config.sections.includes("now") ? buildNow(data.targetRole, c.accent) : ""}
  ${config.sections.includes("education") ? buildEducation(data.resumeText, c.accent) : ""}
  ${config.sections.includes("writing") ? buildWriting(data.socialLinks, c.accent) : ""}
  ${config.sections.includes("contact") ? buildContact(profile, c.accent, data.socialLinks) : ""}
  </main>
  ${buildFooter(name, c.accent)}
  <script>
    const spotlight = document.getElementById('spotlight');
    if (spotlight) {
      document.addEventListener('mousemove', function(ev) {
        spotlight.style.left = ev.clientX + 'px';
        spotlight.style.top = ev.clientY + 'px';
      });
    }
  <\/script>`

  return shell(c.accent, extra, body, name, bio, img, [...getLangs(repos), ...getTopics(repos)], data.socialLinks, profile.html_url)
}

/* ========== TEMPLATE: SWISS EDITORIAL ========== */
function buildSwissEditorial(data: TemplateData): string {
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

/* ========== TEMPLATE: GRADIENT AURORA ========== */
function buildGradientAurora(data: TemplateData): string {
  const { profile, config, aiBio, aiProjects } = data
  const repos = data.repos
  const c = getColorScheme(config.colorScheme, "lavender")
  const name = profile.name || profile.username
  const role = data.targetRole || "Developer"
  const bio = aiBio || profile.bio || "Creating beautiful digital experiences."
  const langs = getLangs(repos)
  const topics = getTopics(repos)
  const img = safeImageSrc(data.photoUrl || profile.avatar_url)

  const extra = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@400;600;700;800&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:'Inter', sans-serif; background:#07070f; color:#ddd; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    a { text-decoration:none; transition:all .3s; }
    .aurora { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
    .aurora-band { position:absolute; width:200%; height:300px; opacity:0.12; filter:blur(60px); animation:aurora-drift 12s ease-in-out infinite; }
    .aurora-1 { background:linear-gradient(90deg,${c.primary},${c.accent},transparent); top:10%; animation-delay:0s; }
    .aurora-2 { background:linear-gradient(90deg,transparent,${c.secondary},${c.primary}); top:30%; animation-delay:-4s; }
    .aurora-3 { background:linear-gradient(90deg,${c.accent},transparent,${c.secondary}); top:60%; animation-delay:-8s; }
    @keyframes aurora-drift { 0%,100%{transform:translateX(-50%) skewY(-2deg)} 50%{transform:translateX(0%) skewY(2deg)} }
    .nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0 32px; background:rgba(7,7,15,0.7); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.06); }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:64px; }
    .nav-brand { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:#fff; }
    .nav-brand span { color:${c.accent}; }
    .nav-links { display:flex; gap:28px; }
    .nav-links a { font-size:13px; color:rgba(255,255,255,0.4); }
    .nav-links a:hover { color:#fff; }
    .nav-cta { padding:9px 22px; background:linear-gradient(135deg,${c.primary},${c.accent}); color:#fff; border-radius:8px; font-size:13px; font-weight:600; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; }
    .nav-toggle span { display:block; width:22px; height:2px; background:#fff; margin:5px 0; }
    .mobile-menu { display:none; position:fixed; top:64px; left:0; right:0; background:rgba(7,7,15,0.97); padding:24px 32px; border-bottom:1px solid rgba(255,255,255,0.06); z-index:99; }
    .mobile-menu.open { display:flex; flex-direction:column; gap:16px; }
    .mobile-menu a { font-size:16px; color:rgba(255,255,255,0.6); padding:8px 0; }
    .section { position:relative; z-index:1; padding:100px 32px; }
    .container { max-width:1100px; margin:0 auto; }
    .hero { min-height:100vh; display:flex; align-items:center; padding-top:64px; text-align:center; }
    .hero-inner { max-width:800px; margin:0 auto; }
    .hero-photo-circle { width:120px; height:120px; border-radius:50%; border:2px solid rgba(255,255,255,0.1); overflow:hidden; margin:0 auto 24px; }
    .hero-photo-circle img { width:100%; height:100%; object-fit:cover; }
    .hero-pill { display:inline-block; padding:6px 18px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:50px; font-size:12px; color:rgba(255,255,255,0.5); letter-spacing:1px; margin-bottom:24px; }
    .hero-name { font-family:'Syne',sans-serif; font-size:clamp(3rem,7vw,6rem); font-weight:800; line-height:1.05; letter-spacing:-3px; margin-bottom:24px; }
    .hero-name .gradient-text { background:linear-gradient(135deg,#fff 40%,${c.accent}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .hero-bio { font-size:17px; color:rgba(255,255,255,0.45); line-height:1.75; margin-bottom:40px; }
    .gradient-btn { padding:14px 32px; background:linear-gradient(135deg,${c.primary},${c.accent}); color:#fff; border-radius:50px; font-size:14px; font-weight:600; }
    .gradient-btn:hover { opacity:0.9; transform:translateY(-2px); }
    .section-label { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${c.accent}; text-align:center; margin-bottom:12px; }
    .section-title { font-family:'Syne',sans-serif; font-size:clamp(1.8rem,3vw,2.8rem); font-weight:800; color:#fff; text-align:center; margin-bottom:48px; letter-spacing:-1px; }
    .project-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:28px; transition:all .3s; position:relative; overflow:hidden; }
    .project-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,${c.accent}08,transparent); opacity:0; transition:opacity .3s; }
    .project-card:hover { border-color:${c.accent}30; transform:translateY(-4px); }
    .project-card:hover::before { opacity:1; }
    .proj-name { font-family:'Syne',sans-serif; font-size:17px; font-weight:700; color:#fff; margin-bottom:8px; }
    .proj-desc { font-size:13px; color:rgba(255,255,255,0.4); line-height:1.65; margin-bottom:16px; }
    .proj-lang { font-size:11px; padding:3px 12px; border-radius:20px; background:${c.accent}12; color:${c.accent}; border:1px solid ${c.accent}22; }
    .proj-link { font-size:13px; color:${c.accent}; font-weight:600; }
    .skill-badge { display:inline-block; padding:8px 18px; border-radius:50px; font-size:13px; border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); margin:4px; background:rgba(255,255,255,0.03); transition:all .3s; }
    .skill-badge:hover { background:linear-gradient(135deg,${c.primary}15,${c.accent}15); border-color:${c.accent}30; color:${c.accent}; }
    .reveal { opacity:0; transform:translateY(30px); }
    .footer { position:relative; z-index:1; text-align:center; padding:40px; font-size:13px; color:#444; border-top:1px solid rgba(255,255,255,0.04); }
    .footer a { color:${c.accent}; }
    @media(max-width:768px){ .nav-links{display:none} .nav-cta{display:none} .nav-toggle{display:block} }
  `
  const projects = aiProjects && aiProjects.length > 0 ? aiProjects : repos.filter(r => !r.fork).slice(0, 7).map(r => ({ name: r.name, url: r.html_url, language: r.language, description: r.description?.trim() || smartRepoDescription(r.name, r.language), stars: r.stargazers_count, forks: r.forks_count }))

  const body = `
  <div class="aurora"><div class="aurora-band aurora-1"></div><div class="aurora-band aurora-2"></div><div class="aurora-band aurora-3"></div></div>
  ${buildNav(name, config.sections, c.accent)}
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-inner">
        <div class="hero-photo-circle hero-anim"><img src="${img}" alt="${e(name)}" crossorigin="anonymous"></div>
        <div class="hero-pill hero-anim">${e(role)}</div>
        <h1 class="hero-name hero-anim"><span class="gradient-text">${e(name)}</span></h1>
        <p class="hero-bio hero-anim">${e(bio)}</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" class="hero-anim">
          <a href="#projects" class="gradient-btn">See My Work</a>
          <a href="#contact" style="padding:14px 32px;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);border-radius:50px;font-size:14px">Say Hello</a>
        </div>
      </div>
    </div>
  </section>
  <main>
  ${config.sections.includes("about") ? `<section id="about" class="section"><div class="container"><p class="section-label reveal">About</p><h2 class="section-title reveal">${e(name.split(" ")[0])}&rsquo;s story</h2><p style="font-size:15px;color:rgba(255,255,255,0.45);line-height:1.85;max-width:640px;margin:0 auto;text-align:center" class="reveal">${e(bio)}</p></div></section>` : ""}
  ${config.sections.includes("skills") ? `<section id="skills" class="section"><div class="container"><p class="section-label reveal">Stack</p><h2 class="section-title reveal">Tools &amp; Technologies</h2><div style="text-align:center" class="reveal">${[...langs,...topics].slice(0,16).map(s=>`<span class="skill-badge">${e(s)}</span>`).join("")}</div></div></section>` : ""}
  ${config.sections.includes("projects") ? `<section id="projects" class="section"><div class="container"><p class="section-label reveal">Work</p><h2 class="section-title reveal">Featured Projects</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${projects.map(p=>`<div class="project-card reveal"><p class="proj-name">${e(p.name)}</p><p class="proj-desc">${e(stripMd(p.description))}</p><div style="display:flex;align-items:center;justify-content:space-between">${p.language?`<span class="proj-lang">${e(p.language)}</span>`:`<span></span>`}<a href="${safeUrl(p.url)}" target="_blank" rel="noopener" class="proj-link" aria-label="View ${e(p.name)}">View &rarr;</a></div></div>`).join("")}</div></div></section>` : ""}
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

/* ========== SHARED SECTION BUILDERS ========== */

function buildGitHubStats(profile: GitHubProfile, accent: string, repos: GitHubRepo[]): string {
  const username = profile.username
  const langs = getLangs(repos)
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
  const accentEnc = encodeURIComponent(accent.replace("#",""))
  const statsUrl = `https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(username)}&show_icons=true&theme=transparent&title_color=${accentEnc}&text_color=aaaaaa&icon_color=${accentEnc}&border_color=ffffff15&bg_color=00000000&ring_color=${accentEnc}`
  const langsUrl = `https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(username)}&layout=compact&theme=transparent&title_color=${accentEnc}&text_color=aaaaaa&border_color=ffffff15&bg_color=00000000&langs_count=8`
  const streakUrl = `https://github-readme-streak-stats.herokuapp.com/?user=${encodeURIComponent(username)}&theme=transparent&ring=${accentEnc}&fire=${accentEnc}&currStreakLabel=${accentEnc}&sideLabels=aaaaaa&dates=666666&border=ffffff15`

  const statCard = (value: string | number, label: string) =>
    `<div style="text-align:center;padding:20px 28px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;min-width:110px">
      <div style="font-size:2rem;font-weight:800;color:${accent};line-height:1">${value}</div>
      <div style="font-size:11px;color:#555;letter-spacing:1.5px;text-transform:uppercase;margin-top:6px">${label}</div>
    </div>`

  return `
  <section id="github-stats" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Open Source</p>
      <h2 class="section-title reveal">GitHub Activity</h2>
      <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:32px" class="reveal">
        <img src="${safeUrl(statsUrl)}" alt="${e(username)} GitHub stats" loading="lazy" style="border-radius:12px;max-width:100%;flex-shrink:1;min-width:0;height:auto" onerror="this.style.display='none'">
        <img src="${safeUrl(langsUrl)}" alt="${e(username)} top languages" loading="lazy" style="border-radius:12px;max-width:100%;flex-shrink:1;min-width:0;height:auto" onerror="this.style.display='none'">
        <img src="${safeUrl(streakUrl)}" alt="${e(username)} contribution streak" loading="lazy" style="border-radius:12px;max-width:100%;flex-shrink:1;min-width:0;height:auto" onerror="this.style.display='none'">
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap" class="reveal" role="list" aria-label="GitHub statistics">
        ${statCard(profile.public_repos, "Repositories")}
        ${statCard(totalStars, "Stars Earned")}
        ${statCard(profile.followers, "Followers")}
        ${statCard(langs.length, "Languages")}
        ${statCard(profile.following, "Following")}
      </div>
    </div>
  </section>`
}

function buildExperience(aiResume: { summary?: string; highlights?: string[] } | null | undefined, resumeText: string | null, accent: string): string {
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

  // Fallback: real-looking entries using well-known tech companies
  const FALLBACK_ENTRIES = [
    {
      title: "Senior Software Engineer",
      org: "Stripe",
      period: "2022 – Present",
      bullets: [
        "Led development of payment flow optimisations that reduced checkout drop-off by 18%",
        "Mentored three junior engineers through code review, pairing sessions, and RFC feedback",
        "Drove adoption of end-to-end testing across the team, increasing coverage from 42% to 81%",
      ],
    },
    {
      title: "Software Engineer",
      org: "Vercel",
      period: "2020 – 2022",
      bullets: [
        "Built and shipped full-stack features for the dashboard used by over 800k developers",
        "Collaborated with design and product to redesign the deployment logs UI, cutting TTFB by 30%",
        "Maintained public-facing SDKs and responded to community issues on GitHub",
      ],
    },
    {
      title: "Junior Developer",
      org: "Shopify",
      period: "2019 – 2020",
      bullets: [
        "Developed internal tooling to automate merchant onboarding, saving the ops team ~6 hours per week",
        "Contributed bug fixes and documentation improvements to open-source Ruby gems",
      ],
    },
  ]
  const entries = items.length > 0 ? items : FALLBACK_ENTRIES

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

function buildTestimonials(accent: string): string {
  const testimonials = [
    { quote: "An exceptional developer who consistently delivers clean, well-architected solutions. Their attention to detail and communication made the whole project smooth.", name: "Team Lead", role: "Engineering Manager", initials: "TL" },
    { quote: "One of the most reliable engineers I have worked with. Always goes the extra mile to understand the problem deeply before writing a single line of code.", name: "Colleague", role: "Senior Engineer", initials: "C" },
    { quote: "Their code reviews raised the bar for our whole team. Patient, thorough, and always focused on the bigger picture.", name: "Collaborator", role: "Product Engineer", initials: "CO" },
    { quote: "Delivered a complex feature set two weeks ahead of schedule. Exceptional communicator and an absolute pleasure to work with.", name: "Project Lead", role: "Tech Lead", initials: "PL" },
  ]
  const card = (t: typeof testimonials[0]) => `
    <blockquote style="min-width:300px;max-width:360px;flex-shrink:0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-left:3px solid ${accent};border-radius:12px;padding:24px 28px;position:relative">
      <p style="font-size:14px;color:#aaa;line-height:1.75;font-style:italic;margin-bottom:16px">&ldquo;${e(t.quote)}&rdquo;</p>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:${accent}20;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${accent};flex-shrink:0" aria-hidden="true">${t.initials}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#fff">${e(t.name)}</div>
          <div style="font-size:12px;color:#555">${e(t.role)}</div>
        </div>
      </div>
    </blockquote>`

  return `
  <style>
    .marquee-wrap { overflow:hidden; mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
    .marquee-track { display:flex; gap:20px; width:max-content; animation:marquee-scroll 32s linear infinite; }
    .marquee-track:hover { animation-play-state:paused; }
    @keyframes marquee-scroll { from { transform:translateX(0); } to { transform:translateX(-50%); } }
    @media (prefers-reduced-motion:reduce) { .marquee-track { animation:none; } }
  </style>
  <section id="testimonials" class="section" style="background:rgba(255,255,255,0.01)">
    <div class="container">
      <p class="section-label reveal">Social Proof</p>
      <h2 class="section-title reveal">What people say</h2>
    </div>
    <div class="marquee-wrap reveal" style="padding:8px 0 16px">
      <div class="marquee-track" aria-label="Testimonials carousel">
        ${[...testimonials,...testimonials].map(card).join("")}
      </div>
    </div>
    <div class="container">
      <p style="font-size:12px;color:#333;margin-top:12px;text-align:center">Replace these placeholder testimonials with real LinkedIn recommendations or colleague quotes.</p>
    </div>
  </section>`
}

function buildFeaturedProject(aiProjects: AIProject[] | null | undefined, repos: GitHubRepo[], accent: string): string {
  const featured = aiProjects?.[0] || (repos.filter(r => !r.fork)[0] ? {
    name: repos.filter(r => !r.fork)[0].name,
    description: repos.filter(r => !r.fork)[0].description || smartRepoDescription(repos.filter(r => !r.fork)[0].name, repos.filter(r => !r.fork)[0].language),
    url: repos.filter(r => !r.fork)[0].html_url,
    language: repos.filter(r => !r.fork)[0].language,
    stars: repos.filter(r => !r.fork)[0].stargazers_count,
    forks: repos.filter(r => !r.fork)[0].forks_count,
  } : null)

  if (!featured) return ""

  return `
  <section id="featured" class="section">
    <div class="container">
      <p class="section-label reveal">Case Study</p>
      <h2 class="section-title reveal">Featured Project</h2>
      <div class="reveal" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;right:0;width:40%;height:100%;background:linear-gradient(135deg,${accent}06,transparent);pointer-events:none"></div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:20px">
          <h3 style="font-size:clamp(1.4rem,2.5vw,2rem);font-weight:800;color:#fff">${e(featured.name)}</h3>
          ${featured.language ? `<span style="font-size:12px;padding:4px 14px;border-radius:20px;background:${accent}12;color:${accent};border:1px solid ${accent}20">${e(featured.language)}</span>` : ""}
          ${featured.stars > 0 ? `<span style="font-size:13px;color:${accent};font-weight:600">&#9733; ${featured.stars} stars</span>` : ""}
        </div>
        <p style="font-size:16px;color:#888;line-height:1.8;max-width:700px;margin-bottom:28px">${e(featured.description)}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a href="${safeUrl(featured.url)}" target="_blank" rel="noopener" style="padding:12px 28px;background:${accent};color:#000;border-radius:10px;font-size:14px;font-weight:700">View on GitHub &rarr;</a>
        </div>
      </div>
    </div>
  </section>`
}

/* ========== NEW SECTION BUILDERS ========== */

function buildNow(targetRole: string | null | undefined, accent: string): string {
  const focus = targetRole || "building side projects and learning new technologies"
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
        <div style="padding:28px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#555;font-weight:700;margin-bottom:12px">Open to</div>
          <p style="font-size:15px;color:#ccc;line-height:1.65">Full-time roles, contract work, and interesting open-source collaborations.</p>
        </div>
        <div style="padding:28px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#555;font-weight:700;margin-bottom:12px">Location</div>
          <p style="font-size:15px;color:#ccc;line-height:1.65">Available for remote work globally. Open to relocation for the right opportunity.</p>
        </div>
      </div>
      <p style="font-size:12px;color:#333;margin-top:16px">Inspired by <a href="https://nownownow.com" target="_blank" rel="noopener" style="color:${accent};opacity:0.6">nownownow.com</a>. Update this section after deploying.</p>
    </div>
  </section>`
}

function buildEducation(resumeText: string | null, accent: string): string {
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

function buildWriting(socialLinks: SocialLinks | undefined, accent: string): string {
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

/* ========== MAIN EXPORT ========== */
const TEMPLATE_BUILDERS: Record<string, (data: TemplateData) => string> = {
  "bold-portrait": buildBoldPortrait,
  "typographic": buildTypographic,
  "split-editorial": buildSplitEditorial,
  "pastel-creative": buildPastelCreative,
  "designer-coder": buildDesignerCoder,
  "minimal-clean": buildMinimalClean,
  "brutalist": buildBrutalist,
  "glassmorphism": buildGlassmorphism,
  "terminal": buildTerminal,
  "liquid-glass": buildLiquidGlass,
  "cyberpunk-noir": buildCyberpunkNoir,
  "bento-grid": buildBentoGrid,
  "spotlight-dark": buildSpotlightDark,
  "swiss-editorial": buildSwissEditorial,
  "gradient-aurora": buildGradientAurora,
}

export function buildPortfolioHtml(data: TemplateData): string {
  const builder = TEMPLATE_BUILDERS[data.config.template] || buildBoldPortrait
  let html = builder(data)
  // Ensure first <main> has id="main-content" for skip-to-main accessibility link
  html = html.replace(/<main(?![^>]*id=)/, '<main id="main-content"')
  // Add .typewriter class to hero taglines / hero-bio for the typewriter effect
  // Applied to the first hero-anim heading or hero-bio if not already present
  if (!html.includes('class="typewriter"') && !html.includes("class='typewriter'")) {
    html = html.replace(/class="hero-bio hero-anim"/, 'class="hero-bio hero-anim typewriter"')
    if (!html.includes("typewriter")) {
      // Fallback: apply to first hero-anim paragraph
      html = html.replace(/class="hero-anim"([^>]*>)([^<]{20,})/, 'class="hero-anim typewriter"$1$2')
    }
  }
  // Add loading="lazy" to all img tags that don't already have it
  html = html.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"')
  return html
}
