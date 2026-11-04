# Template audit: claims the input data does not support

Scope: `lib/templates/templates/*.ts` (15 templates) and `lib/templates/shared/sections/*.ts`.
Rule: a template may only assert a fact about the person if that fact comes from `TemplateData`.
Line numbers refer to the code BEFORE the T1 fixes.

Classification: FIX (unsupported claim, removed or made data-driven), KEEP (decorative or UI label), ASK (ambiguous, not changed; needs a product decision).

## Shared sections

| # | File:line | What it renders | Class | Why / action |
|---|-----------|-----------------|-------|--------------|
| 1 | sections/projects.ts:33,40 | `Active` badge on the first AI project (`isRecent = i === 0`) | FIX | `AIProject` has no activity or date data. Position in a list is not recency, and the picker reorders the list. Badge removed. |
| 2 | sections/projects.ts:21,67,74 | `Active` badge on the first non-fork repo | FIX | `GitHubRepo` has no `pushed_at`. "First in the array" is not "active". Badge removed. |
| 3 | sections/projects.ts:16 | "A <language> project focused on <topics>." | KEEP | Built only from the repo's own language and topics. |
| 4 | sections/projects.ts:41,75 | star count | KEEP | Already gated on `> 0`. |
| 5 | sections/education.ts:23-26 | Fallback entries "B.Sc. Computer Science / Your University / 2022" and "Full-Stack Development Bootcamp / Online / Self-taught / 2021" when the resume has no parsable education | FIX | Invented degrees and years shown as the person's. Section now renders nothing when there is no parsed education. |
| 6 | sections/contact.ts:34,48-52 | "Copy email to clipboard" button that copies `<username>@users.noreply.github.com` | FIX | That address is not the person's email. `TemplateData` has no email field, so the button is removed. |
| 7 | sections/contact.ts:40 | "Let's work together" | ASK | Implies the person is open to work. |
| 8 | sections/contact.ts:41 | "Have a project in mind or just want to say hello? My inbox is open." | ASK | First-person availability statement written for the person. |
| 9 | sections/github-stats.ts:31-35 | Cards for repositories, stars, followers, languages, following, even at 0 | FIX | A vault-synthesized profile has zeros that are "no data", not real counts. Each card now renders only when its value is above 0. |
| 10 | sections/github-stats.ts:26-28 | Three images from github-readme-stats / streak-stats hosts | ASK | Third-party requests at view time. Not a claim, but the generated page depends on external services. |
| 11 | sections/github-stats.ts:23 | "Open Source" label | KEEP | UI label for a GitHub section. |
| 12 | sections/now.ts:9-13 | "Current Status / What I'm doing now / Focused on <targetRole>" | ASK | In the tailoring flow `targetRole` is the job title, so this says the person is currently doing that job's work. |
| 13 | sections/featured-project.ts:20 | "Case Study" label | ASK | Implies a written case study; the data is a project summary. |
| 14 | sections/skills.ts:22 | "Frameworks & Libraries" bucket for every non-language topic | ASK | Topics such as "hacktoberfest" or "cli" are filed as frameworks. |
| 15 | sections/about.ts:12,14 | "N repos", "N followers" pills | KEEP | Already gated on `> 0` and taken from the profile. |
| 16 | sections/experience.ts:10-11 | "Career" / "Experience & Highlights" | KEEP | Headings only; content comes from the resume or AI summary. |
| 17 | sections/footer.ts:9,10 | "Updated <Month Year>", copyright year, "Built with PersonaAI" | KEEP | True at generation time. |
| 18 | sections/testimonials.ts:4 | Renders nothing | KEEP | Already clean. |

## Templates

| # | File:line | What it renders | Class | Why / action |
|---|-----------|-----------------|-------|--------------|
| 19 | designer-coder.ts:11 | "Creative mind with an eye for detail, UX, and visual storytelling." | FIX | Generic tagline presented as the person's own words. Removed. |
| 20 | designer-coder.ts:15 | "Building robust, clean, and performant applications." | FIX | Same. Removed. |
| 21 | designer-coder.ts:10,14 | "designer" and "<coder>" hero headings | ASK | The template concept, but it labels every person a designer. |
| 22 | cyberpunk-noir.ts:116 | "Missions Completed" as the projects heading | FIX | Claims the projects are completed. Now "Projects". |
| 23 | pastel-creative.ts:69 | "Recent Projects" | FIX | Nothing in the data says the projects are recent. Now "Projects". |
| 24 | typographic.ts:43 | `profile.location \|\| "Worldwide"` | FIX | Invented location when none is given. The line is omitted when there is no location. |
| 25 | bento-grid.ts:98-101 | Public Repos and Followers counters, even at 0 | FIX | Rendered only when above 0. |
| 26 | bold-portrait.ts:55-56 | `+N Projects`, `+N Followers`, even at 0 | FIX | Rendered only when above 0. |
| 27 | bold-portrait.ts:55-57 | "+" prefix and "Projects" label for `public_repos` | ASK | "+" reads as "N or more", and public repos include forks. |
| 28 | brutalist.ts:63-65 | Repositories, Followers, Languages counters | FIX | Rendered only when above 0. |
| 29 | bento-grid:23, cyberpunk-noir:23, gradient-aurora:23, liquid-glass:23, spotlight-dark:23, swiss-editorial:18, terminal:23 | `targetRole \|\| "Developer"` as the hero role | ASK | A job title the data does not contain. |
| 30 | brutalist:26, glassmorphism:26, typographic:27 | `<top language> Dev(eloper)` or `Developer` / `Software Developer` as the hero role | ASK | Same: a title derived from language counts. |
| 31 | bold-portrait:52 | "Hello." | KEEP | Greeting, no claim. |
| 32 | bold-portrait:63, glassmorphism:92, split-editorial:59 | "Expertise" heading | KEEP | Section label over the person's own skills. |
| 33 | cyberpunk-noir:114-115 | "Who I Am", "Arsenal" | KEEP | Style labels. |
| 34 | brutalist:74 | "Who Am I" | KEEP | Style label. |
| 35 | bold-portrait:64, glassmorphism:97, gradient-aurora:104, liquid-glass:104 | "Featured Projects" | KEEP | UI label. |
| 36 | spotlight-dark:118, typographic:48 | "Selected Work" | KEEP | UI label. |
| 37 | minimal-clean, split-editorial, pastel-creative, bold-portrait, designer-coder, typographic | `buildNow(targetRole)` | ASK | See #12. |

No template contains invented testimonials, "years of experience" counters, "100%" figures, availability badges, or hardcoded client or award lists (searched for: available, open to, years, 100%, N+, hire, freelance, remote, trusted, award, clients, based in, currently).
