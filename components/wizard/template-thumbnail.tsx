"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { buildPortfolioHtml } from "@/lib/templates"
import type { GitHubProfile, GitHubRepo, PortfolioConfig, TemplateStyle } from "@/lib/types"

const VIEWPORT_WIDTH = 1280
const VIEWPORT_HEIGHT = 800

interface TemplateThumbnailProps {
  templateId: TemplateStyle
  label: string
  profile: GitHubProfile
  repos: GitHubRepo[]
  photoUrl: string | null
  config: PortfolioConfig
}

/** Renders the real template with the user's own data, scaled down to the card width. */
export function TemplateThumbnail({ templateId, label, profile, repos, photoUrl, config }: TemplateThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / VIEWPORT_WIDTH))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const html = useMemo(
    () =>
      buildPortfolioHtml({
        profile,
        repos,
        photoUrl,
        resumeText: null,
        notionContent: null,
        aiBio: null,
        socialLinks: config.socialLinks,
        config: { ...config, template: templateId },
      }),
    [profile, repos, photoUrl, config, templateId],
  )

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" aria-hidden="true">
      {scale > 0 && (
        <iframe
          title={`${label} preview`}
          srcDoc={html}
          // Scripts run only for entrance animations; no same-origin access to the app.
          sandbox="allow-scripts"
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, transform: `scale(${scale})` }}
        />
      )}
    </div>
  )
}
