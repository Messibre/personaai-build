import { e } from "../escape"

export function buildFooter(name: string, accent: string): string {
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
