# PersonaAI

**Tailor one body of work to every job you apply for.**

PersonaAI is a job-tailoring tool. You store your real work once as confirmed facts in a **vault**, paste a job posting, and get a portfolio page, a resume and a short note written for that exact role. Nothing you did not do is ever added.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Messibre/personaai-build)

## How it works

1. **Put your work in once** (`/vault`) — import GitHub repositories and a resume, answer three short questions per project, and confirm each fact. Every fact keeps the evidence it came from.
2. **Paste a job posting** (`/tailor`) — the job is analysed, and the projects that fit it best are picked. If the job asks for something your vault cannot support, you are told.
3. **Get the output** — a portfolio page, resume and short note, written only from facts you confirmed and re-checked against your vault before you see them.

## Principles

- Only confirmed facts ever reach a generation prompt.
- Nothing is invented: no fake metrics, no guessed technologies.
- Evidence is verified in code as a verbatim quote from the source, never by trusting the model.
- Resumes, READMEs and job postings are treated as data, never as instructions.

Contributor rules live in [AGENTS.md](./AGENTS.md).

## The three surfaces

| Surface | Path | What it is | Status |
|---------|------|------------|--------|
| Work vault and tailoring | `/vault`, `/tailor` | The product: confirmed facts in, tailored portfolio, resume and note out | Active |
| Quick fit check | `/job-match` | Paste a GitHub username and a job; get a rules-based fit report and an optional cover letter. No vault needed. Links to the vault for full tailoring | Active, secondary |
| Legacy generator | `/legacy` | Original generic portfolio builder | Frozen, hidden from search |

## Known limitations

- **Quick fit check reports live in server memory.** On serverless they can disappear between requests or after a cold start; re-run the check if a report link stops working.
- **Vault ids are access secrets.** Anyone with a `/vault?id=...` link can read and change that vault. There are no accounts yet.
- **The legacy generator invents content.** It writes bios and project descriptions without fact checking. It is hidden from search and is not part of the tailoring flow.

## Legacy generator

The original generic portfolio builder is still available at `/legacy` (hidden from search engines). It is frozen and is not part of the job-tailoring flow.

### Data Sources
- **GitHub Integration** — Automatically fetches your profile, repositories, README content, contribution stats, and detected technologies
- **Resume Parsing** — Upload a PDF resume and extract skills, experience, education, and professional highlights
- **Notion Import** — Optionally import content from public Notion pages for richer bios and project descriptions

### 14 Premium Templates
Choose from professionally designed, fully responsive templates:

| Template | Style |
|----------|-------|
| **Bold Portrait** | Full-screen photo hero with massive typography overlay and stats counters |
| **Typographic** | Oversized text behind your portrait, minimal white-space driven layout |
| **Split Editorial** | Dark/light split layout with dramatic B&W portrait, editorial magazine feel |
| **Pastel Creative** | Soft color blocks, playful contemporary card-based project showcase |
| **Designer & Coder** | Half design, half code split concept with colorful portrait center-stage |
| **Minimal Clean** | Ultra-clean whitespace, refined typography, subtle grid and elegant details |
| **Brutalist** | Raw, high-contrast, bold borders and oversized typography |
| **Glassmorphism** | Frosted glass cards over vivid blurred gradients |
| **Terminal** | Command-line aesthetic with monospace fonts and syntax-highlighted blocks |
| **Liquid Glass** | Animated floating orbs with ultra-refined backdrop-blur glass cards |
| **Cyberpunk Noir** | Glitch typography, scan lines, corner brackets and neon accents |
| **Bento Grid** | Mosaic of asymmetric cards — photo, bio, stats, and projects in one view |
| **Spotlight Dark** | Cursor-following radial spotlight with numbered project list |
| **Swiss Editorial** | Grid discipline, heavy typography, stark black-and-white with one bold accent |
| **Gradient Aurora** | Animated aurora light bands with centered layout |

### AI-Powered Generation
- Uses **Google Gemini 2.5 Flash** for intelligent content generation
- AI writes personalized bios, project descriptions, and taglines based on your GitHub activity and resume
- Real-time streaming preview — watch your portfolio generate live
- Smart fallbacks with real-looking content when AI is unavailable

### Customization
- **8 Color Schemes** — From professional blues to vibrant gradients
- **Photo Upload** — Add your own portrait photo
- **Section Toggle** — Show/hide About, Skills, Projects, Experience, GitHub Stats, Contact
- **Target Role** — Specify your desired job role for tailored content
- **Light/Dark Mode** — Full theme support with smooth transitions

### One-Click Deploy to Vercel
- **Instant Deployment** — Deploy your generated portfolio to Vercel with a single click
- **Production Ready** — Get a live `.vercel.app` URL immediately
- **No Config Needed** — Zero configuration required, just click deploy

### Export Options
- Copy raw HTML to clipboard
- Download as standalone HTML file
- Continue editing in v0

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash
- **PDF Parsing**: pdf-parse (serverless-compatible)
- **Animations**: tw-animate-css
- **Theme**: next-themes
- **Analytics**: Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Environment Variables

Copy `.env.example` to `.env.local` and fill in what you need. Every variable:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2` | all AI routes | Gemini keys; the second is used for failover |
| `LLM_PROVIDER` | vault, tailor | `gemini` for real calls, `mock` for deterministic offline responses |
| `GEMINI_MODEL` | vault, tailor | Gemini model name (default `gemini-2.5-flash`) |
| `LLM_TIMEOUT_MS` | vault, tailor | Per-call model timeout (default `30000`; lower values cause false "unavailable" results) |
| `AI_ENHANCE` | Quick fit check | `true` lets Gemini refine the rules-based report |
| `VAULT_DATA_DIR` | vault | Folder for the local file-backed vault store (local dev only) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | vault | Persistent vault storage on Vercel; without both, `/api/vault` returns 501 there |
| `GITHUB_TOKEN` | Quick fit check, vault | **Required** for `/job-match` (GitHub GraphQL); optional for vault imports (raises the limit from 60 to 5,000 requests/hour) |
| `BETA_ACCESS_CODE` | all AI routes | Closed-beta code sent as `x-beta-code`; unset keeps routes open |
| `ADMIN_TOKEN` | `/admin` | Bearer token for the metrics page; unset keeps it closed |
| `ENABLE_LEGACY_DEPLOY` | legacy | `/api/deploy` returns 404 unless this is `true` |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID` | legacy | Used only by the legacy one-click deploy |

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
Get your Vercel token from [Vercel Account Settings](https://vercel.com/account/tokens).

### Installation

```bash
# Clone the repository
git clone https://github.com/Messibre/personaai-build.git
cd personaai-build

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Lint, typecheck, test and boundary checks (run before every PR)
pnpm verify
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How It Works

1. **Enter GitHub Username** — We fetch your public profile, top repositories, and README content
2. **Specify Target Role** — Tell us what role you're targeting for tailored AI content
3. **Upload Resume (Optional)** — PDF parsing extracts your professional background
4. **Add Notion URL (Optional)** — Import additional content from public Notion pages
5. **Customize** — Choose a template, color scheme, and toggle sections
6. **Generate** — AI creates a complete, standalone HTML portfolio with personalized content
7. **Deploy** — One-click deploy to Vercel or export as HTML

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── ai-content/    # AI content generation (bio, projects, tagline)
│   │   ├── deploy/        # Vercel deployment endpoint
│   │   ├── generate/      # Portfolio HTML generation
│   │   ├── github/        # GitHub API proxy with README fetching
│   │   ├── notion/        # Notion content fetcher
│   │   └── parse-resume/  # PDF resume parser (serverless-compatible)
│   ├── globals.css        # Tailwind + theme variables
│   ├── layout.tsx         # Root layout with providers + analytics
│   └── page.tsx           # Landing page with wizard shell
├── components/
│   ├── portfolio/         # Portfolio preview and editor
│   ├── ui/                # 50+ shadcn/ui components
│   └── wizard/            # Multi-step wizard components
│       ├── step-start.tsx
│       ├── step-github.tsx
│       ├── step-target-role.tsx
│       ├── step-resume.tsx
│       ├── step-notion.tsx
│       ├── step-customize.tsx
│       ├── step-preview.tsx
│       └── wizard-shell.tsx
├── lib/
│   ├── gemini.ts          # Gemini API client with key rotation
│   ├── github.ts          # GitHub API helpers + repo enrichment
│   ├── templates.ts       # 14 portfolio HTML templates
│   ├── types.ts           # TypeScript definitions
│   └── utils.ts           # Utility functions
└── public/
    └── icon.svg           # App favicon
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/github` | POST | Fetches GitHub profile, repositories, and README content |
| `/api/parse-resume` | POST | Parses PDF resume and extracts text (serverless-compatible) |
| `/api/notion` | POST | Fetches public Notion page content |
| `/api/ai-content` | POST | Generates AI bio, project descriptions, and tagline |
| `/api/generate` | POST | Builds complete portfolio HTML from template |
| `/api/deploy` | POST | Deploys portfolio to Vercel and returns live URL |


## License

MIT

---

