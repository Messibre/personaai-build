import { ONE_MINUTE_MS, withRateLimit } from "@/lib/security/guard"
import { buildPortfolioHtml } from "@/lib/templates"
import { templatePreviewData } from "@/lib/templates/preview"
import { COLOR_SCHEMES, TEMPLATE_OPTIONS, type ColorScheme } from "@/lib/types"

export const GET = withRateLimit(async (request: Request) => {
  const params = new URL(request.url).searchParams
  const template = TEMPLATE_OPTIONS.find((option) => option.id === params.get("template"))
  const color = params.get("color") ?? "ocean"
  if (!template || !Object.hasOwn(COLOR_SCHEMES, color)) return Response.json({ error: "Unknown template or color." }, { status: 400 })
  const html = buildPortfolioHtml(templatePreviewData(template.id, color as ColorScheme))
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  } })
}, { route: "tailor/template-preview", max: 60, windowMs: ONE_MINUTE_MS })
