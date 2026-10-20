import { e } from "../escape"

export function buildTestimonials(accent: string): string {
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
