/** Template sections may render nothing; never leave a navigation link to an absent target. */
export function removeUnavailableSectionLinks(html: string): string {
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  const ids = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
  return html.replace(/<a\b([^>]*\bhref="#([a-z][a-z0-9-]*)"[^>]*)>[\s\S]*?<\/a>/gi, (anchor, _attributes: string, id: string) => ids.has(id) ? anchor : "")
}
