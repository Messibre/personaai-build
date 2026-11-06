import { describe, expect, it } from "vitest"
import { buildPortfolioHtml } from "@/lib/templates"
import { templatePreviewData } from "@/lib/templates/preview"
import { TEMPLATE_OPTIONS } from "@/lib/types"
import { GET } from "@/app/api/tailor/template-preview/route"

describe("template preview catalog", () => {
  for (const template of TEMPLATE_OPTIONS) {
    it(`renders ${template.id} with clearly fictional data`, () => {
      const html = buildPortfolioHtml(templatePreviewData(template.id, "ocean"))
      expect(html).toContain("Your Name")
      expect(html).toContain("layout preview with fictional content")
      expect(html).not.toContain("ui-avatars.com")
      expect(html).not.toContain('src=""')
    })
  }
  it("rejects unknown template and inherited color keys", async () => {
    expect((await GET(new Request("http://localhost/api/tailor/template-preview?template=unknown"))).status).toBe(400)
    expect((await GET(new Request("http://localhost/api/tailor/template-preview?template=terminal&color=toString"))).status).toBe(400)
  })
  it("returns generated HTML without exposing vault data", async () => {
    const response = await GET(new Request("http://localhost/api/tailor/template-preview?template=minimal-clean&color=forest"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    expect(await response.text()).toContain("Your Name")
  })
})
