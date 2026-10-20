// Shared base styles injected into every template
export function baseStyles(accent: string): string {
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
export function gsapScript(): string {
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
