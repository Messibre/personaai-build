function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

/** Safe file name stem like "alex-chen-ux-engineer", never empty. */
export function outputFileStem(personName: string, jobTitle: string): string {
  const parts = [slug(personName), slug(jobTitle)].filter(Boolean)
  return parts.length > 0 ? parts.join("-") : "application"
}
