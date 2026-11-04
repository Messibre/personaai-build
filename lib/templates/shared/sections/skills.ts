import { e } from "../escape"

export function buildSkills(langs: string[], topics: string[], resumeText?: string | null): string {
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
